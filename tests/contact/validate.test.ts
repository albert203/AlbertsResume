import { describe, it, expect } from 'vitest';
import { validateContact, LIMITS } from '../../src/contact/validate';

const valid = {
  name: 'Jane Recruiter',
  email: 'jane@company.com',
  subject: 'Full stack role',
  message: 'Hi Albert, are you free for a call?',
  'cf-turnstile-response': 'token-123',
};

describe('validateContact', () => {
  it('accepts a complete message and trims fields', () => {
    const result = validateContact({ ...valid, name: '  Jane Recruiter  ' });
    expect(result).toEqual({
      ok: true,
      value: {
        name: 'Jane Recruiter',
        email: 'jane@company.com',
        subject: 'Full stack role',
        message: 'Hi Albert, are you free for a call?',
        turnstileToken: 'token-123',
      },
    });
  });

  it('allows an empty subject', () => {
    const result = validateContact({ ...valid, subject: '' });
    expect(result.ok).toBe(true);
  });

  it('rejects non-object bodies', () => {
    expect(validateContact(null)).toEqual({ ok: false, error: 'Invalid request body' });
    expect(validateContact('hello')).toEqual({ ok: false, error: 'Invalid request body' });
  });

  it('rejects missing required fields', () => {
    expect(validateContact({ ...valid, name: '   ' })).toEqual({ ok: false, error: 'Missing required fields' });
    expect(validateContact({ ...valid, message: undefined })).toEqual({ ok: false, error: 'Missing required fields' });
  });

  it('rejects non-string field values', () => {
    expect(validateContact({ ...valid, email: ['jane@company.com'] })).toEqual({ ok: false, error: 'Missing required fields' });
  });

  it('rejects a malformed email', () => {
    expect(validateContact({ ...valid, email: 'not-an-email' })).toEqual({ ok: false, error: 'Invalid email format' });
  });

  it('rejects fields over their limits', () => {
    expect(validateContact({ ...valid, message: 'x'.repeat(LIMITS.message + 1) })).toEqual({ ok: false, error: 'Field too long' });
    expect(validateContact({ ...valid, subject: 'x'.repeat(LIMITS.subject + 1) })).toEqual({ ok: false, error: 'Field too long' });
  });

  it('rejects a missing Turnstile token', () => {
    const { 'cf-turnstile-response': _omit, ...noToken } = valid;
    expect(validateContact(noToken)).toEqual({ ok: false, error: 'Missing spam check' });
  });
});
