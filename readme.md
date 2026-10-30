# Portfolio Site

Built using Node.js - ExpressJS, TypeScript, EJS, and Nodemailer.

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
