import { describe, it, expect, vi } from 'vitest';
import { handleContact, MAX_BODY_CHARS, RESEND_URL, type ContactEnv } from '../../src/contact/handler';
import { TURNSTILE_VERIFY_URL } from '../../src/contact/turnstile';

const env: ContactEnv = {
  RESEND_API_KEY: 're_test',
  EMAIL_TO: 'albert@example.com',
  EMAIL_FROM: 'Albert Jordaan <onboarding@resend.dev>',
  TURNSTILE_SECRET_KEY: 'secret',
};

const body = {
  name: 'Jane',
  email: 'jane@company.com',
  subject: 'Role',
  message: 'Hello',
  'cf-turnstile-response': 'tok',
};

function post(payload: string, headers: Record<string, string> = {}) {
  return new Request('https://site.test/api/contact', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: payload,
  });
}

function fakeFetch({ turnstile = true, resend = 200 as number | 'throw' } = {}) {
  return vi.fn(async (url: string | URL | Request) => {
    const target = String(url);
    if (target === TURNSTILE_VERIFY_URL) return Response.json({ success: turnstile });
    if (target === RESEND_URL) {
      if (resend === 'throw') throw new Error('offline');
      return new Response(JSON.stringify({ id: 'email_1' }), { status: resend });
    }
    throw new Error(`unexpected fetch ${target}`);
  }) as unknown as typeof fetch & ReturnType<typeof vi.fn>;
}

const resendCalls = (f: ReturnType<typeof vi.fn>) => f.mock.calls.filter(([u]) => String(u) === RESEND_URL);

describe('handleContact', () => {
  it('sends the email and returns success', async () => {
    const fetchFn = fakeFetch();
    const res = await handleContact(post(JSON.stringify(body), { 'cf-connecting-ip': '1.2.3.4' }), env, fetchFn);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });

    const [, init] = resendCalls(fetchFn)[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer re_test');
    const sent = JSON.parse(init.body as string);
    expect(sent).toMatchObject({ to: env.EMAIL_TO, from: env.EMAIL_FROM, reply_to: 'jane@company.com' });
  });

  it('rejects non-POST methods with 405', async () => {
    const res = await handleContact(new Request('https://site.test/api/contact'), env, fakeFetch());
    expect(res.status).toBe(405);
  });

  it('returns 400 for a non-JSON body without sending', async () => {
    const fetchFn = fakeFetch();
    const res = await handleContact(post('name=Jane&message=hi'), env, fetchFn);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Invalid request body' });
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('returns 413 for an oversized body without sending', async () => {
    const fetchFn = fakeFetch();
    const res = await handleContact(post(JSON.stringify({ ...body, message: 'x'.repeat(MAX_BODY_CHARS) })), env, fetchFn);
    expect(res.status).toBe(413);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('returns 400 with the validation error for invalid input', async () => {
    const res = await handleContact(post(JSON.stringify({ ...body, email: 'nope' })), env, fakeFetch());
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Invalid email format' });
  });

  it('returns 403 and sends nothing when Turnstile fails', async () => {
    const fetchFn = fakeFetch({ turnstile: false });
    const res = await handleContact(post(JSON.stringify(body)), env, fetchFn);
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'Spam check failed, please try again' });
    expect(resendCalls(fetchFn)).toHaveLength(0);
  });

  it('returns 502 when Resend rejects the send', async () => {
    const res = await handleContact(post(JSON.stringify(body)), env, fakeFetch({ resend: 422 }));
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: 'Failed to send email' });
  });

  it('returns 502 when Resend is unreachable', async () => {
    const res = await handleContact(post(JSON.stringify(body)), env, fakeFetch({ resend: 'throw' }));
    expect(res.status).toBe(502);
  });
});
