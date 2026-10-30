import { describe, it, expect, vi } from 'vitest';
import worker, { type Env } from '../src/worker';

function makeEnv() {
  return {
    RESEND_API_KEY: 're_test',
    EMAIL_TO: 'albert@example.com',
    EMAIL_FROM: 'Albert Jordaan <onboarding@resend.dev>',
    TURNSTILE_SECRET_KEY: 'secret',
    ASSETS: { fetch: vi.fn(async () => new Response('static page')) },
  } satisfies Env;
}

describe('worker', () => {
  it('serves non-API paths from static assets', async () => {
    const env = makeEnv();
    const res = await worker.fetch(new Request('https://site.test/contact/'), env);
    expect(await res.text()).toBe('static page');
    expect(env.ASSETS.fetch).toHaveBeenCalledOnce();
  });

  it('routes /api/contact to the contact handler', async () => {
    const env = makeEnv();
    const res = await worker.fetch(new Request('https://site.test/api/contact'), env);
    expect(res.status).toBe(405); // GET reaches the handler, which only accepts POST
    expect(env.ASSETS.fetch).not.toHaveBeenCalled();
  });
});
