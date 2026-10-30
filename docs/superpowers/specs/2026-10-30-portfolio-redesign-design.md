# Portfolio Redesign: Design Spec

Date: 2026-10-30
Status: Draft for review

Related records:
- Product truth: [PRODUCT.md](../../../PRODUCT.md)
- Visual direction contract: [.impeccable/surfaces/public-views-index-ejs.md](../../../.impeccable/surfaces/public-views-index-ejs.md)

## 1. Goal

Rebuild Albert Jordaan's portfolio so a recruiter hiring a junior–mid full-stack developer is convinced within a minute and either downloads the CV or gets in touch. The site leads on **automation and improvements**: turning slow, manual processes in production software into automatic, faster ones.

Success criteria:
- The name, the positioning line, and both actions (Download CV, Get in touch) are visible in the first viewport on desktop and on a 390px phone.
- Every claim on the site is backed by a screenshot, video, number, or case study. Nothing is invented.
- First load has no cold start. Lighthouse scores are 95+ for performance and 100 for accessibility on the home page (mobile).
- The design passes Impeccable's finish review against the direction contract.

## 2. Visual direction: Motion Study

Chosen through Impeccable's direction round (`seed:e4dc561f178004cc`). It's based on Frank and Lillian Gilbreth's 1910s motion studies: long-exposure photographs of light traces that showed wasted motion, and the flow process charts used to redesign the work.

- **Plates:** warm silver-black photographic panels with white light traces. Used for the hero and the top of each case study.
- **Forms:** pale grey-green process-chart sheets with dark ink. Used for content sections, the résumé and contact.
- **Symbols:** the four process-chart symbols (operation ○, transport →, delay D, inspection □). Each colour means one step type and is never used as decoration.
- **Type:** a condensed industrial grotesque for display and a plain readable face for body text. Exact faces are chosen at build time. Fonts on Impeccable's overused list are excluded: Fraunces, IBM Plex, Space Grotesk, Geist, Inter, DM Sans/Serif and the rest of that list.
- **Signature interaction:** the faint "before" trace fades to an afterimage as the bright "after" trace draws. Numbered callouts on the trace open annotations.
- **Raises carried from the declined challengers:**
  - traces have a lifecycle
  - the plate crops on phones rather than shrinking
  - form states print as chart entries
  - colour is law
  - the nav marks the current section with its chart symbol

Explicit anti-goals:
- no neon glow
- no gradient blobs
- no small uppercase label above the headline
- no hero sentence over a metric row and three equal cards
- no pill tags on everything
- no "∞" or unverifiable stats

## 3. Pages and content

### Home (`/`)
1. **Plate hero:** a short headline, a one-paragraph hook, Download CV (primary) and Get in touch. A trace study of the strongest project with 2–3 numbered callouts, and a plate caption.
2. **Improvements index:** one row per project. Each row has its chart symbol, a one-line before → after, the key number, and a link to the case study. This replaces the equal-card grid.
3. **Experience:** Microkeeper and Brandsmith / Knight Group, set as a dated process chart, not cards.
4. **About:** a short personal section in Albert's voice. Content to come from Albert.
5. **Now:** what Albert is currently building or learning.
6. **Close:** the contact action again, with the email shown as plain text, plus LinkedIn and GitHub.

### Case study (`/work/<slug>`)
Each has the same structure:
- a plate with that project's before/after trace
- the problem
- a flow process chart of the old versus new workflow, with step counts
- annotated screenshots or video (interactive hotspots; on mobile, a tap opens the note)
- the result as a number
- the stack

Launch set, in order of evidence strength:
1. Accounting suite integration (Xero, Reckon)
2. Analytics dashboard and query optimisation (10x+)
3. Cloudflare Images profile pipeline
4. Skills HR module workflow overhaul (video on hand)
5. E-commerce platform (personal, in progress)

Further CV projects can be added later, because each case study is a data file plus screenshots.

### Résumé (`/resume`)
A skimmable web version of the CV in the forms world, with the PDF download. Replaces the iframe viewer.

### Contact (`/contact`)
A form with name, email and message, protected by Cloudflare Turnstile. Sending, sent and error states appear as process-chart entries. The email address is shown as text beside the form.

### Site-wide
- ⌘K command menu: jump to sections or case studies, copy email, download CV.
- Light/dark theme toggle. Plates stay dark in both; the forms invert to dark ink-grey.
- Interactive architecture diagram. In this world it's the process chart of how a project's systems connect, used inside case studies.

## 4. Architecture

Keeps Express + EJS (Albert's choice), but no live server in production.

```
src/content/*.ts         project, experience and site data (typed)
public/views/**/*.ejs    templates and partials (redesigned)
src/build/               renders every view + each case study to dist/site/*.html, copies assets
src/contact/             validation, email escaping, Turnstile check, request handler (shared)
src/worker.ts            Cloudflare Worker: POST /api/contact → Turnstile verify → Resend; else static assets
wrangler.jsonc           Workers static assets (dist/site) + the contact route
src/server.ts            Express, local development only (renders the same EJS + data)
```

- **Hosting:** Cloudflare Workers with static assets, on the free plan. No sleeping, and the current domain is pointed at it. Render is retired after cut-over.
- **Contact:** the Worker validates input, verifies Turnstile, and sends through Resend from a verified domain (not `onboarding@resend.dev`). All user input is HTML-escaped in the email body, which fixes the current unescaped HTML. Secrets: `RESEND_API_KEY`, `EMAIL_TO`, `TURNSTILE_SECRET_KEY`.
- **CV download:** a static PDF linked with the `download` attribute (same-origin, so no server header needed, and the résumé page can still embed it).
- **Motion:** GSAP with ScrollTrigger, loaded only where needed. Traces are SVG paths animated with stroke-dashoffset. Under `prefers-reduced-motion` everything renders in its final state. Content is visible without JavaScript.
- **Media:** the existing videos are 0.5–1.7 MB, well under Cloudflare's 25 MiB per-file limit. Screenshots ship as AVIF/WebP with explicit dimensions, and screenshots are checked for customer data before publishing.
- **SEO:** a title and description per page, Open Graph images, Person JSON-LD, and a sitemap.

## 5. Skills used per phase

| Phase | Skills |
|---|---|
| Design system and build | `impeccable` (lead), `frontend-design` (second opinion), `taste-skill` (anti-generic check) |
| Motion | `gsap-core`, `gsap-scrolltrigger`, `gsap-timeline`, `gsap-performance` |
| Hosting | `wrangler`, `workers-best-practices` |
| Review | Impeccable finish reviewer, `web-design-guidelines`, Playwright screenshots (1440 and 390) |
| SEO | `claude-seo:seo-schema`, `seo-technical`, `seo-performance` |

## 6. Verification

- The build script exits non-zero if any template fails to render or any case study is missing required fields.
- The contact Worker has unit tests for validation, escaping, a Turnstile failure, and a Resend failure.
- Playwright screenshots at 1440 and 390 for every page, plus open/hover/focus/error states.
- Impeccable detector, finish review, and DESIGN.md written at the end.
- Lighthouse run on the deployed preview before cut-over.

## 7. Content Albert must supply

- Before/after numbers per case study: steps, time, or load time. The illustrative "14 steps → 1" in the sketches is not real and will not ship.
- Evidence for AI automation and AI-assisted development (this site's own build is one candidate case study).
- Whether the Microkeeper role is current (the site says "Present"; the CV says "2026").
- About-me notes and an optional photo.
- Fresh high-resolution screenshots for the annotated views.

The build can start without these. Placeholder slots are clearly marked and block launch, not development.

## 8. Out of scope

- Blog.
- Heavy WebGL/3D.
- CMS. Content is typed data files.
- **Follow-up, not this build:** a Network Diagram version of the home hero, built after Motion Study ships, for comparison (Albert's request).
