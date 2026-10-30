import type { ContactInput } from './validate';

export interface EmailPayload {
  from: string;
  to: string;
  reply_to: string;
  subject: string;
  text: string;
  html: string;
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function singleLine(s: string): string {
  return s.replace(/[\r\n]+/g, ' ').trim();
}

export function buildContactEmail(input: ContactInput, opts: { from: string; to: string }): EmailPayload {
  const subject = singleLine(input.subject) || 'New message';
  const name = singleLine(input.name);
  return {
    from: opts.from,
    to: opts.to,
    reply_to: input.email,
    subject: `Portfolio: ${subject}`,
    text: `From: ${name}\nEmail: ${input.email}\nSubject: ${subject}\n\n${input.message}`,
    html:
      `<h2>From: ${escapeHtml(name)}</h2>` +
      `<p>Email: ${escapeHtml(input.email)}</p>` +
      `<p>Subject: ${escapeHtml(subject)}</p>` +
      `<p style="white-space:pre-wrap">${escapeHtml(input.message)}</p>`,
  };
}
