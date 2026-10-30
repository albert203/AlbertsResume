import { describe, it, expect, vi } from 'vitest';
import { verifyTurnstile, TURNSTILE_VERIFY_URL } from '../../src/contact/turnstile';

function fakeFetch(response: Response | Error) {
  return vi.fn(async () => {
    if (response instanceof Error) throw response;
    return response;
  }) as unknown as typeof fetch & ReturnType<typeof vi.fn>;
}

describe('verifyTurnstile', () => {
  it('returns true when Cloudflare reports success and sends secret, token and IP', async () => {
    const fetchFn = fakeFetch(Response.json({ success: true }));
    await expect(verifyTurnstile('tok', 'sec', '1.2.3.4', fetchFn)).resolves.toBe(true);

    const [url, init] = fetchFn.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(TURNSTILE_VERIFY_URL);
    const form = init.body as FormData;
    expect(form.get('secret')).toBe('sec');
    expect(form.get('response')).toBe('tok');
    expect(form.get('remoteip')).toBe('1.2.3.4');
  });

  it('omits remoteip when the IP is unknown', async () => {
    const fetchFn = fakeFetch(Response.json({ success: true }));
    await verifyTurnstile('tok', 'sec', null, fetchFn);
    const form = (fetchFn.mock.calls[0] as [string, RequestInit])[1].body as FormData;
    expect(form.has('remoteip')).toBe(false);
  });

  it('returns false when Cloudflare reports failure', async () => {
    await expect(verifyTurnstile('bad', 'sec', null, fakeFetch(Response.json({ success: false })))).resolves.toBe(false);
  });

  it('fails closed on a non-200 response', async () => {
    await expect(verifyTurnstile('tok', 'sec', null, fakeFetch(new Response('down', { status: 503 })))).resolves.toBe(false);
  });

  it('fails closed when the network call throws', async () => {
    await expect(verifyTurnstile('tok', 'sec', null, fakeFetch(new Error('offline')))).resolves.toBe(false);
  });
});
