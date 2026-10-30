# Platform Migration (Plan 1 of 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the existing portfolio off Render (cold starts) onto free Cloudflare hosting. EJS pages are prerendered to static HTML, and the contact form becomes a Turnstile-protected Worker function. The current design stays as it is: the Motion Study redesign is Plan 2.

**Architecture:** A build script renders the EJS views to `dist/site/`. A Cloudflare Worker serves those files as static assets and handles `POST /api/contact`, which validates input, verifies Turnstile, and sends through Resend's REST API with escaped HTML. The contact logic is plain TypeScript taking `Request` and returning `Response`, so the Worker and the local Express dev server share it.

**Tech Stack:** Node 24, TypeScript 6, Express 5 (local dev only), EJS 5, Vitest 3, Wrangler 4, Cloudflare Workers static assets, Cloudflare Turnstile, Resend REST API.

**Spec:** [docs/superpowers/specs/2026-10-30-portfolio-redesign-design.md](../specs/2026-10-30-portfolio-redesign-design.md). This plan implements section 4 (Architecture) only. Sections 2–3 (design and pages) are Plan 2.

## Global Constraints

- Hosting: Cloudflare Workers with static assets, free plan. No always-on server in production.
- Contact endpoint: `POST /api/contact`, JSON body. Field names `name`, `email`, `subject`, `message`, `cf-turnstile-response`.
- Secrets (Worker): `RESEND_API_KEY`, `EMAIL_TO`, `TURNSTILE_SECRET_KEY`. Var: `EMAIL_FROM`, defaulting to `Albert Jordaan <onboarding@resend.dev>` until a domain is verified in Resend.
- Build-time env: `TURNSTILE_SITE_KEY`. Without it the build uses Cloudflare's always-pass test key `1x00000000000000000000AA` and prints a warning.
- All user input is HTML-escaped in the email body. Subject and name are collapsed to one line.
- Fail closed: if Turnstile can't be verified, no email is sent.
- Field limits: name 100, email 254, subject 150, message 5000 characters; whole body 16,384 characters.
- No new runtime dependencies. `resend` and `express-rate-limit` are removed; Resend is called with `fetch`.
- Work on branch `redesign/platform`, never directly on `main`.

## Review Focus

1. A message containing `<script>` or other HTML must arrive in the email as visible text, never as markup (Task 2).
2. A subject containing a newline must not inject extra email headers; it arrives as one line (Task 2).
3. A missing or invalid Turnstile token, or Turnstile being unreachable, must send nothing and return a clear "try again" error (Tasks 3, 4).
4. A non-JSON or oversized request body must return a 4xx JSON error, not crash the Worker (Task 4).
5. If Resend is down or rejects the send, the API must return 502, and the form must re-enable so the visitor can retry (Tasks 4, 7).

---

### Task 1: Test harness and contact input validation

**Files:**
- Modify: `package.json` (scripts, devDependencies)
- Modify: `tsconfig.json` (add `include`)
- Create: `src/contact/validate.ts`
- Test: `tests/contact/validate.test.ts`

**Interfaces:**
- Produces: `interface ContactInput { name: string; email: string; subject: string; message: string; turnstileToken: string }`, `type ValidationResult = { ok: true; value: ContactInput } | { ok: false; error: string }`, `function validateContact(body: unknown): ValidationResult`, `const LIMITS`.

- [ ] **Step 1: Create the branch and install Vitest**

```bash
git checkout -b redesign/platform
npm install -D vitest@3
```

In `package.json`, replace the `"test"` script with:

```json
"test": "vitest run"
```

In `tsconfig.json`, add after `"compilerOptions": { ... }`:

```json
,
"include": ["src"]
```

(Tests live in `tests/` and are run by Vitest, so `tsc` must not try to compile them outside `rootDir`.)

- [ ] **Step 2: Write the failing tests**

Create `tests/contact/validate.test.ts`:

```ts
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
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npx vitest run tests/contact/validate.test.ts`
Expected: FAIL with "Failed to resolve import ../../src/contact/validate"

- [ ] **Step 4: Write the implementation**

Create `src/contact/validate.ts`:

```ts
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
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run tests/contact/validate.test.ts`
Expected: PASS (8 tests)

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json tsconfig.json src/contact/validate.ts tests/contact/validate.test.ts
git commit -m "feat: add contact form validation with vitest"
```

---

### Task 2: Contact email builder with escaping

**Files:**
- Create: `src/contact/email.ts`
- Test: `tests/contact/email.test.ts`

**Interfaces:**
- Consumes: `ContactInput` from `src/contact/validate.ts`.
- Produces: `function escapeHtml(s: string): string`, `function singleLine(s: string): string`, `interface EmailPayload { from: string; to: string; reply_to: string; subject: string; text: string; html: string }`, `function buildContactEmail(input: ContactInput, opts: { from: string; to: string }): EmailPayload`.

- [ ] **Step 1: Write the failing tests**

Create `tests/contact/email.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/contact/email.test.ts`
Expected: FAIL with "Failed to resolve import ../../src/contact/email"

- [ ] **Step 3: Write the implementation**

Create `src/contact/email.ts`:

```ts
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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run tests/contact/email.test.ts`
Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
git add src/contact/email.ts tests/contact/email.test.ts
git commit -m "feat: build contact emails with escaped HTML and single-line subjects"
```

---

### Task 3: Turnstile verification

**Files:**
- Create: `src/contact/turnstile.ts`
- Test: `tests/contact/turnstile.test.ts`

**Interfaces:**
- Produces: `const TURNSTILE_VERIFY_URL`, `const TURNSTILE_TEST_SITE_KEY = '1x00000000000000000000AA'`, `const TURNSTILE_TEST_SECRET_KEY = '1x0000000000000000000000000000000AA'`, `function verifyTurnstile(token: string, secret: string, remoteIp: string | null, fetchFn?: typeof fetch): Promise<boolean>`.

- [ ] **Step 1: Write the failing tests**

Create `tests/contact/turnstile.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/contact/turnstile.test.ts`
Expected: FAIL with "Failed to resolve import ../../src/contact/turnstile"

- [ ] **Step 3: Write the implementation**

Create `src/contact/turnstile.ts`:

```ts
export const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

// Cloudflare's documented always-pass test keys, for local development only.
export const TURNSTILE_TEST_SITE_KEY = '1x00000000000000000000AA';
export const TURNSTILE_TEST_SECRET_KEY = '1x0000000000000000000000000000000AA';

export async function verifyTurnstile(
  token: string,
  secret: string,
  remoteIp: string | null,
  fetchFn: typeof fetch = fetch,
): Promise<boolean> {
  const form = new FormData();
  form.append('secret', secret);
  form.append('response', token);
  if (remoteIp) form.append('remoteip', remoteIp);

  try {
    const res = await fetchFn(TURNSTILE_VERIFY_URL, { method: 'POST', body: form });
    if (!res.ok) return false;
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run tests/contact/turnstile.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/contact/turnstile.ts tests/contact/turnstile.test.ts
git commit -m "feat: verify Turnstile tokens, failing closed"
```

---

### Task 4: Contact request handler

**Files:**
- Create: `src/contact/handler.ts`
- Test: `tests/contact/handler.test.ts`

**Interfaces:**
- Consumes: `validateContact` (Task 1), `buildContactEmail` (Task 2), `verifyTurnstile` and `TURNSTILE_VERIFY_URL` (Task 3).
- Produces: `interface ContactEnv { RESEND_API_KEY: string; EMAIL_TO: string; EMAIL_FROM: string; TURNSTILE_SECRET_KEY: string }`, `const MAX_BODY_CHARS = 16384`, `const RESEND_URL = 'https://api.resend.com/emails'`, `function handleContact(request: Request, env: ContactEnv, fetchFn?: typeof fetch): Promise<Response>`.

Responses are always JSON: `200 {"success":true}`, `400/403/405/413/502 {"error":"<message>"}`.

- [ ] **Step 1: Write the failing tests**

Create `tests/contact/handler.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/contact/handler.test.ts`
Expected: FAIL with "Failed to resolve import ../../src/contact/handler"

- [ ] **Step 3: Write the implementation**

Create `src/contact/handler.ts`:

```ts
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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run tests/contact/handler.test.ts`
Expected: PASS (8 tests)

- [ ] **Step 5: Commit**

```bash
git add src/contact/handler.ts tests/contact/handler.test.ts
git commit -m "feat: contact handler with Turnstile check and Resend REST send"
```

---

### Task 5: Cloudflare Worker entry and Wrangler config

**Files:**
- Create: `src/worker.ts`
- Create: `wrangler.jsonc`
- Modify: `package.json` (devDependency `wrangler`, scripts)
- Test: `tests/worker.test.ts`

**Interfaces:**
- Consumes: `handleContact`, `ContactEnv` (Task 4).
- Produces: `interface Env extends ContactEnv { ASSETS: { fetch(request: Request): Promise<Response> } }`, default export `{ fetch(request: Request, env: Env): Promise<Response> }`.

- [ ] **Step 1: Write the failing tests**

Create `tests/worker.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/worker.test.ts`
Expected: FAIL with "Failed to resolve import ../src/worker"

- [ ] **Step 3: Write the implementation**

Create `src/worker.ts`:

```ts
import { handleContact, type ContactEnv } from './contact/handler';

export interface Env extends ContactEnv {
  ASSETS: { fetch(request: Request): Promise<Response> };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/api/contact') return handleContact(request, env);
    return env.ASSETS.fetch(request);
  },
};
```

Create `wrangler.jsonc`:

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "albert-portfolio",
  "main": "src/worker.ts",
  "compatibility_date": "2026-09-01",
  "assets": {
    "directory": "./dist/site",
    "binding": "ASSETS"
  },
  "vars": {
    "EMAIL_FROM": "Albert Jordaan <onboarding@resend.dev>"
  }
  // Secrets, set with `npx wrangler secret put <NAME>`:
  // RESEND_API_KEY, EMAIL_TO, TURNSTILE_SECRET_KEY
}
```

Install Wrangler and add scripts to `package.json`:

```bash
npm install -D wrangler@4
```

```json
"dev:worker": "npm run build:site && wrangler dev",
"deploy": "npm run build:site && wrangler deploy"
```

(`build:site` is added in Task 6. Both scripts depend on it.)

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run tests/worker.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/worker.ts wrangler.jsonc package.json package-lock.json tests/worker.test.ts
git commit -m "feat: Cloudflare Worker serving static assets and /api/contact"
```

---

### Task 6: Static site build from EJS, and template fixes

**Files:**
- Create: `src/build/renderSite.ts`
- Create: `src/build/cli.ts`
- Modify: `package.json` (script `build:site`)
- Modify: `public/views/partials/header.ejs` (CV link)
- Modify: `public/views/index.ejs` (absolute asset paths)
- Modify: `public/views/resume.ejs` (absolute asset paths)
- Modify: `public/views/contact.ejs` (missing `<head>`, absolute paths, Turnstile widget, error message element)
- Test: `tests/build/renderSite.test.ts`

**Interfaces:**
- Consumes: `TURNSTILE_TEST_SITE_KEY` (Task 3).
- Produces: `interface SitePage { view: string; out: string }`, `const PAGES: SitePage[]`, `const STATIC_DIRS: string[]`, `interface RenderOptions { viewsDir: string; publicDir: string; outDir: string; locals: Record<string, unknown> }`, `function renderSite(opts: RenderOptions): Promise<string[]>`. Templates receive the local `turnstileSiteKey: string`. The contact page contains `#form_error` for Task 7.

- [ ] **Step 1: Write the failing tests**

Create `tests/build/renderSite.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { renderSite, PAGES } from '../../src/build/renderSite';

const root = path.resolve(__dirname, '../..');
let outDir: string;
let written: string[];

beforeAll(async () => {
  outDir = await fs.mkdtemp(path.join(os.tmpdir(), 'site-'));
  written = await renderSite({
    viewsDir: path.join(root, 'public/views'),
    publicDir: path.join(root, 'public'),
    outDir,
    locals: { turnstileSiteKey: 'site-key-xyz' },
  });
});

afterAll(async () => {
  await fs.rm(outDir, { recursive: true, force: true });
});

const read = (rel: string) => fs.readFile(path.join(outDir, rel), 'utf8');

describe('renderSite', () => {
  it('writes every page', () => {
    expect(written).toEqual(PAGES.map((p) => p.out));
  });

  it('leaves no EJS tags in the output', async () => {
    for (const page of PAGES) {
      expect(await read(page.out)).not.toContain('<%');
    }
  });

  it('inlines the header partial with a direct CV download link', async () => {
    const html = await read('index.html');
    expect(html).toContain('href="/assets/files/Albert_Jordaan_CV.pdf" download');
    expect(html).not.toContain('/resume/download');
  });

  it('uses absolute asset paths so nested pages resolve them', async () => {
    for (const page of PAGES) {
      const html = await read(page.out);
      expect(html).toContain('href="/css/styles.css"');
      expect(html).not.toContain('../');
    }
  });

  it('renders the Turnstile widget with the given site key on the contact page', async () => {
    const html = await read('contact/index.html');
    expect(html).toContain('data-sitekey="site-key-xyz"');
    expect(html).toContain('challenges.cloudflare.com/turnstile/v0/api.js');
    expect(html).toContain('id="form_error"');
  });

  it('copies static assets', async () => {
    await expect(fs.stat(path.join(outDir, 'css/styles.css'))).resolves.toBeTruthy();
    await expect(fs.stat(path.join(outDir, 'js/script.js'))).resolves.toBeTruthy();
    await expect(fs.stat(path.join(outDir, 'assets/files/Albert_Jordaan_CV.pdf'))).resolves.toBeTruthy();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/build/renderSite.test.ts`
Expected: FAIL with "Failed to resolve import ../../src/build/renderSite"

- [ ] **Step 3: Write the build implementation**

Create `src/build/renderSite.ts`:

```ts
import ejs from 'ejs';
import { promises as fs } from 'fs';
import path from 'path';

export interface SitePage {
  view: string;
  out: string;
}

export const PAGES: SitePage[] = [
  { view: 'index', out: 'index.html' },
  { view: 'contact', out: 'contact/index.html' },
  { view: 'resume', out: 'resume/index.html' },
];

export const STATIC_DIRS = ['css', 'js', 'assets'];

export interface RenderOptions {
  viewsDir: string;
  publicDir: string;
  outDir: string;
  locals: Record<string, unknown>;
}

export async function renderSite(opts: RenderOptions): Promise<string[]> {
  await fs.rm(opts.outDir, { recursive: true, force: true });

  const written: string[] = [];
  for (const page of PAGES) {
    const html = await ejs.renderFile(path.join(opts.viewsDir, `${page.view}.ejs`), opts.locals);
    const target = path.join(opts.outDir, page.out);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, html, 'utf8');
    written.push(page.out);
  }

  for (const dir of STATIC_DIRS) {
    await fs.cp(path.join(opts.publicDir, dir), path.join(opts.outDir, dir), { recursive: true });
  }
  return written;
}
```

Create `src/build/cli.ts`:

```ts
import path from 'path';
import { renderSite } from './renderSite';
import { TURNSTILE_TEST_SITE_KEY } from '../contact/turnstile';

const root = path.resolve(__dirname, '../..');
const siteKey = process.env.TURNSTILE_SITE_KEY;
if (!siteKey) {
  console.warn('TURNSTILE_SITE_KEY not set: using the always-pass test key. Do not deploy this build.');
}

renderSite({
  viewsDir: path.join(root, 'public/views'),
  publicDir: path.join(root, 'public'),
  outDir: path.join(root, 'dist/site'),
  locals: { turnstileSiteKey: siteKey || TURNSTILE_TEST_SITE_KEY },
})
  .then((pages) => console.log(`Built ${pages.length} pages into dist/site`))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
```

Add to `package.json` scripts:

```json
"build:site": "ts-node src/build/cli.ts"
```

- [ ] **Step 4: Update the templates**

`public/views/partials/header.ejs`: replace

```html
<a href="/resume/download" class="navbar_download" id="resume_download_btn">Download Resume</a>
```

with

```html
<a href="/assets/files/Albert_Jordaan_CV.pdf" download class="navbar_download" id="resume_download_btn">Download Resume</a>
```

`public/views/index.ejs`:
- `href="../css/styles.css"` → `href="/css/styles.css"`
- each `src="../assets/videos/` → `src="/assets/videos/` (3 occurrences)
- `src="../js/script.js"` → `src="/js/script.js"`

`public/views/resume.ejs`:
- `href="../css/styles.css"` → `href="/css/styles.css"`
- `src="../assets/files/Albert_Jordaan_CV.pdf"` → `src="/assets/files/Albert_Jordaan_CV.pdf"`
- `src="../js/script.js"` → `src="/js/script.js"`

`public/views/contact.ejs`:
- Insert `<head>` on the line after `<html lang="en">` (the file currently has `</head>` with no opening tag).
- `href="../css/styles.css"` → `href="/css/styles.css"`
- Before `</head>`, add:

```html
    <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
```

- In the `<style>` block, after the `.form_success { ... }` rule, add:

```css
    .form_error { display: none; padding: 1rem; background: rgba(220,38,38,0.06); border: 1px solid rgba(220,38,38,0.3); border-radius: 8px; color: #b91c1c; font-size: 0.88rem; }
```

- Replace the `form_success` div with the Turnstile widget, the error element, and the success element:

```html
          <div class="cf-turnstile" data-sitekey="<%= turnstileSiteKey %>"></div>
          <div class="form_error" id="form_error" role="alert"></div>
          <div class="form_success" id="form_success" role="status">
            Message Successfully sent, I'll get back to you very soon!
          </div>
```

- Change `action="/contact"` on the form to `action="/api/contact"`.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run tests/build/renderSite.test.ts`
Expected: PASS (6 tests)

Then run: `npm run build:site`
Expected: a warning about the test key, then `Built 3 pages into dist/site`

- [ ] **Step 6: Commit**

```bash
git add src/build tests/build package.json public/views
git commit -m "feat: prerender EJS views to static HTML for Cloudflare"
```

---

### Task 7: Front-end form wiring, Express dev server, cleanup

**Files:**
- Modify: `public/js/script.js:63-96` (contact submit handler)
- Modify: `src/server.ts` (render with locals, `/api/contact` adapter, remove download route and rate limiter)
- Delete: `src/mail.ts`
- Modify: `package.json` (remove `resend`, `express-rate-limit`)
- Modify: `readme.md`

**Interfaces:**
- Consumes: `handleContact`, `ContactEnv` (Task 4); `TURNSTILE_TEST_SITE_KEY`, `TURNSTILE_TEST_SECRET_KEY` (Task 3); `#form_error`, `#form_success` (Task 6).

- [ ] **Step 1: Replace the contact submit handler**

In `public/js/script.js`, replace everything from `const form = document.getElementById('contact_form');` to the end of the file with:

```js
const form = document.getElementById('contact_form');

if (form) {
  const successBox = document.getElementById('form_success');
  const errorBox = document.getElementById('form_error');

  const showError = (message) => {
    errorBox.textContent = message;
    errorBox.style.display = 'block';
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.textContent = 'Sending...';
    submitBtn.disabled = true;
    errorBox.style.display = 'none';
    successBox.style.display = 'none';

    const data = Object.fromEntries(new FormData(form));

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        successBox.style.display = 'block';
        form.reset();
        submitBtn.textContent = 'Sent!';
        return;
      }

      const body = await res.json().catch(() => ({}));
      showError(body.error || 'Something went wrong. Please try again.');
    } catch (err) {
      showError('Could not reach the server. Check your connection and try again.');
    }

    submitBtn.textContent = 'Send message';
    submitBtn.disabled = false;
    if (window.turnstile) window.turnstile.reset();
  });
}
```

- [ ] **Step 2: Rewrite the Express dev server**

Replace `src/server.ts` with:

```ts
import dotenv from 'dotenv';
dotenv.config(); // loads .env file contents

import express from 'express';
import path from 'path';
import { handleContact, type ContactEnv } from './contact/handler';
import { TURNSTILE_TEST_SECRET_KEY, TURNSTILE_TEST_SITE_KEY } from './contact/turnstile';

// Local development only: production is static files + the Cloudflare Worker (src/worker.ts)
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../public/views'));

const locals = { turnstileSiteKey: process.env.TURNSTILE_SITE_KEY || TURNSTILE_TEST_SITE_KEY };

const contactEnv: ContactEnv = {
  RESEND_API_KEY: process.env.RESEND_API_KEY ?? '',
  EMAIL_TO: process.env.EMAIL_TO ?? '',
  EMAIL_FROM: process.env.EMAIL_FROM ?? 'Albert Jordaan <onboarding@resend.dev>',
  TURNSTILE_SECRET_KEY: process.env.TURNSTILE_SECRET_KEY || TURNSTILE_TEST_SECRET_KEY,
};

app.get('/', (req, res) => {
  res.render('index', locals);
});

app.get('/contact', (req, res) => {
  res.render('contact', locals);
});

app.get('/resume', (req, res) => {
  res.render('resume', locals);
});

// same handler the Worker uses, adapted from Express to Request/Response
app.post('/api/contact', async (req, res) => {
  const request = new Request(`http://localhost${req.originalUrl}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'cf-connecting-ip': req.ip ?? '' },
    body: JSON.stringify(req.body ?? {}),
  });
  const response = await handleContact(request, contactEnv);
  res.status(response.status).type('application/json').send(await response.text());
});

app.listen(process.env.PORT, () => {
  console.log(`Server is running: http://localhost:${process.env.PORT}`);
})
.on('error', (err) => {
  console.error('Server error:', err);
});
```

- [ ] **Step 3: Remove the old mail code and dependencies**

```bash
git rm src/mail.ts
npm uninstall resend express-rate-limit
```

- [ ] **Step 4: Verify the build, the type check, and the full test suite**

Run: `npx tsc --noEmit`
Expected: no output (exit 0)

Run: `npm test`
Expected: all test files pass (validate, email, turnstile, handler, worker, renderSite)

- [ ] **Step 5: Manually verify the dev server end to end**

Run: `npm run dev`, then in a second terminal:

```bash
curl -s -X POST http://localhost:$PORT/api/contact -H 'content-type: application/json' -d '{"name":"Test","email":"bad"}'
```

Expected: `{"error":"Missing required fields"}`

Open `http://localhost:$PORT/contact` in a browser. The Turnstile widget shows "Success" (test key). Submit a real message, and it arrives at `EMAIL_TO`. Then stop the dev server, set `RESEND_API_KEY=bad` in `.env`, restart, and submit again. The red error box shows "Failed to send email", and the button re-enables. Restore `.env` afterwards.

- [ ] **Step 6: Update the readme**

Replace the Features and Tech Stack sections of `readme.md` with:

```markdown
## Features

- Static pages prerendered from EJS, hosted on Cloudflare (no cold starts)
- Contact form via a Cloudflare Worker: Turnstile spam check + Resend email
- Downloadable CV

## Tech Stack

| Category | Technologies |
|----------|-------------|
| **Build** | TypeScript, EJS prerender (`npm run build:site`) |
| **Hosting** | Cloudflare Workers + static assets (`npm run deploy`) |
| **Email** | Resend REST API |
| **Local dev** | Express (`npm run dev`) or Wrangler (`npm run dev:worker`) |
| **Tests** | Vitest (`npm test`) |
```

- [ ] **Step 7: Commit**

```bash
git add public/js/script.js src/server.ts package.json package-lock.json readme.md
git commit -m "feat: wire contact form to /api/contact, retire Render-era server code"
```

---

### Task 8: Deploy to Cloudflare and cut over

Steps marked **(Albert)** need Albert's accounts and can't be done by an agent.

- [ ] **Step 1 (Albert): Log in to Cloudflare**

```bash
npx wrangler login
```

- [ ] **Step 2 (Albert): Create the Turnstile widget**

Cloudflare dashboard → Turnstile → Add widget → hostname `albert-portfolio.<your-subdomain>.workers.dev` (add the custom domain too, if one will be used) → mode "Managed". Copy the **site key** and **secret key**.

- [ ] **Step 3 (Albert): Set the Worker secrets**

```bash
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put EMAIL_TO
npx wrangler secret put TURNSTILE_SECRET_KEY
```

- [ ] **Step 4: Deploy with the real site key**

```bash
TURNSTILE_SITE_KEY=<site key from step 2> npm run deploy
```

Expected: Wrangler prints the deployed `https://albert-portfolio.<subdomain>.workers.dev` URL, and the build does **not** print the test-key warning.

- [ ] **Step 5: Verify the deployment**

```bash
URL=https://albert-portfolio.<subdomain>.workers.dev
curl -s -o /dev/null -w "%{http_code} %{time_total}s\n" $URL/
curl -s -o /dev/null -w "%{http_code}\n" $URL/contact/
curl -s -o /dev/null -w "%{http_code} %{content_type}\n" $URL/assets/files/Albert_Jordaan_CV.pdf
curl -s -X POST $URL/api/contact -H 'content-type: application/json' -d '{"name":"x","email":"x@x.co","message":"hi","cf-turnstile-response":"fake"}'
```

Expected:
- `200`, with a time well under 1s, even on the first request (no cold start)
- `200`
- `200 application/pdf`
- `{"error":"Spam check failed, please try again"}`

Then send one real message through the live contact page and confirm it arrives.

- [ ] **Step 6 (Albert): Point the domain and retire Render**

If using a custom domain: Cloudflare dashboard → Workers → `albert-portfolio` → Settings → Domains & Routes → Add custom domain. Once the live site and contact form work there, suspend the Render service.

- [ ] **Step 7: Merge**

Use superpowers:finishing-a-development-branch to merge `redesign/platform` into `main`.
