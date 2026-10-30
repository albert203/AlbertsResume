import { validateContact } from './validate';
import { buildContactEmail } from './email';
import { verifyTurnstile } from './turnstile';

export interface ContactEnv {
  RESEND_API_KEY: string;
  EMAIL_TO: string;
  EMAIL_FROM: string;
  TURNSTILE_SECRET_KEY: string;
}

export const MAX_BODY_CHARS = 16_384;
export const RESEND_URL = 'https://api.resend.com/emails';

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

export async function handleContact(
  request: Request,
  env: ContactEnv,
  fetchFn: typeof fetch = fetch,
): Promise<Response> {
  if (request.method !== 'POST') return json(405, { error: 'Method not allowed' });

  const raw = await request.text();
  if (raw.length > MAX_BODY_CHARS) return json(413, { error: 'Message too large' });

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return json(400, { error: 'Invalid request body' });
  }

  const result = validateContact(body);
  if (!result.ok) return json(400, { error: result.error });

  const ip = request.headers.get('cf-connecting-ip');
  const human = await verifyTurnstile(result.value.turnstileToken, env.TURNSTILE_SECRET_KEY, ip, fetchFn);
  if (!human) return json(403, { error: 'Spam check failed, please try again' });

  const email = buildContactEmail(result.value, { from: env.EMAIL_FROM, to: env.EMAIL_TO });
  try {
    const res = await fetchFn(RESEND_URL, {
      method: 'POST',
      headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify(email),
    });
    if (!res.ok) {
      console.error('Resend error', res.status, await res.text());
      return json(502, { error: 'Failed to send email' });
    }
  } catch (err) {
    console.error('Resend error', err);
    return json(502, { error: 'Failed to send email' });
  }

  return json(200, { success: true });
}
