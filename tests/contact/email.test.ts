import { describe, it, expect } from 'vitest';
import { buildContactEmail, escapeHtml, singleLine } from '../../src/contact/email';
import type { ContactInput } from '../../src/contact/validate';

const input: ContactInput = {
  name: 'Jane Recruiter',
  email: 'jane@company.com',
  subject: 'Full stack role',
  message: 'Line one\nLine two',
  turnstileToken: 'token-123',
};
const opts = { from: 'Albert Jordaan <onboarding@resend.dev>', to: 'albert@example.com' };

describe('escapeHtml', () => {
  it('escapes all HTML-significant characters', () => {
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe('&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;');
  });
});

describe('singleLine', () => {
  it('collapses CR and LF runs into single spaces', () => {
    expect(singleLine('Hello\r\nBcc: evil@x.com\nmore')).toBe('Hello Bcc: evil@x.com more');
  });
});

describe('buildContactEmail', () => {
  it('builds a Resend payload with reply_to set to the visitor', () => {
    const email = buildContactEmail(input, opts);
    expect(email.from).toBe(opts.from);
    expect(email.to).toBe(opts.to);
    expect(email.reply_to).toBe('jane@company.com');
    expect(email.subject).toBe('Portfolio: Full stack role');
    expect(email.text).toContain('Line one\nLine two');
  });

  it('renders HTML in the message as visible text, never markup', () => {
    const email = buildContactEmail({ ...input, message: '<script>alert(1)</script>' }, opts);
    expect(email.html).not.toContain('<script>');
    expect(email.html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
  });

  it('escapes the name in HTML', () => {
    const email = buildContactEmail({ ...input, name: '<b>Jane</b>' }, opts);
    expect(email.html).toContain('&lt;b&gt;Jane&lt;/b&gt;');
  });

  it('keeps a newline in the subject from creating extra header lines', () => {
    const email = buildContactEmail({ ...input, subject: 'Hi\r\nBcc: evil@x.com' }, opts);
    expect(email.subject).toBe('Portfolio: Hi Bcc: evil@x.com');
    expect(email.subject).not.toMatch(/[\r\n]/);
  });

  it('uses a default subject when none was given', () => {
    expect(buildContactEmail({ ...input, subject: '' }, opts).subject).toBe('Portfolio: New message');
  });
});
