export interface ContactInput {
  name: string;
  email: string;
  subject: string;
  message: string;
  turnstileToken: string;
}

export type ValidationResult = { ok: true; value: ContactInput } | { ok: false; error: string };

export const LIMITS = { name: 100, email: 254, subject: 150, message: 5000 } as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function str(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function validateContact(body: unknown): ValidationResult {
  if (typeof body !== 'object' || body === null) {
    return { ok: false, error: 'Invalid request body' };
  }
  const fields = body as Record<string, unknown>;
  const name = str(fields.name);
  const email = str(fields.email);
  const subject = str(fields.subject);
  const message = str(fields.message);
  const turnstileToken = str(fields['cf-turnstile-response']);

  if (!name || !email || !message) return { ok: false, error: 'Missing required fields' };
  if (!EMAIL_RE.test(email)) return { ok: false, error: 'Invalid email format' };
  if (
    name.length > LIMITS.name ||
    email.length > LIMITS.email ||
    subject.length > LIMITS.subject ||
    message.length > LIMITS.message
  ) {
    return { ok: false, error: 'Field too long' };
  }
  if (!turnstileToken) return { ok: false, error: 'Missing spam check' };

  return { ok: true, value: { name, email, subject, message, turnstileToken } };
}
