# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Keep Express + EJS (user's choice). Pages are prerendered from the EJS templates to static HTML at build time and hosted free on Cloudflare (no cold start). The contact form becomes a single Cloudflare Worker function calling Resend; Express stays as the local dev server. Replaces the current Render hosting, whose free tier sleeps and delays first load.

## Users

Recruiters and hiring managers filling junior-to-mid full-stack developer roles. They arrive from a CV, LinkedIn, or job application link, usually skimming between other candidates, and decide within a minute whether to shortlist, download the CV, or get in touch. A technical interviewer may come back later to check the work in depth.

## Product Purpose

Personal portfolio and résumé site for Albert Jordaan, full-stack developer in Victoria, Australia. It exists to get Albert shortlisted for a full-time junior–mid full-stack role. Success: a recruiter leaves convinced of real, shipped impact and either downloads the CV or makes contact.

## Positioning

Lead positioning (user-chosen): automation and improvements. Albert takes manual, slow, or clunky processes in production software and makes them automatic, faster, and easier, shown on payroll SaaS used by thousands of people. Existing evidence that fits:
- Automation: Xero and Reckon payroll accounting sync, the Cloudflare Images upload/update/delete pipeline, dynamic onboarding welcome-letter templates.
- Improvement: 10x+ faster load times from query optimisation, workflow overhauls (Skills HR module, Self Managed Super Funds rework), and UI/UX improvements across modules.
Integrations and UI/UX are the supporting strengths, and he is comfortable across the whole stack. AI automation and AI-assisted development extend the same story (user-stated; evidence still to be supplied, see below).

## Operating Context

Recruiters skim on laptops and phones, often from LinkedIn or email links; first load speed matters. Pages: home, case-study page per project, interactive web résumé with PDF download, contact form. No blog.

## Capabilities and Constraints

- Contact form via Resend; spam protection via Cloudflare Turnstile (replaces express-rate-limit).
- CV PDF downloadable; email shown as plain text alongside the form.
- Planned features: case studies with annotated interactive screenshots, interactive web résumé, dark/light theme, ⌘K command menu, a "now" section, an interactive architecture diagram as signature moment, a short personal About section.
- Per-file limit of 25 MiB on Cloudflare static hosting (applies to project videos).
- Microkeeper employment: 2024 to March 2026 (ended; confirmed by Albert). Albert is currently available for full-time roles.

## Brand Commitments

Name: Albert Jordaan. Existing site and CV use a blue accent (#0052ff); not confirmed as binding.

## Evidence on Hand

- Project screen recordings: `public/assets/videos/` (Analytics Dashboard, Skills HR module, E-commerce). User confirmed Microkeeper screens may be shown publicly; scan for customer data before publishing.
- CV: `public/assets/files/Albert_Jordaan_CV.pdf`. Verified claims: 10x+ faster load times from query optimisation; Cloudflare Images pipeline for thousands of users; Xero and Reckon integrations; Chart.js real-time analytics dashboard; Google Maps registration flow; React MUI UI work.
- Further CV projects without media yet: Cost Centre Tracking, Self Managed Super Funds rework, Custom Business Onboarding Welcome Letter, Accounting Suite integration, Profile Picture Support.
- AI automation and AI-assisted development: no project, metric, or artefact on hand yet. Do not present as shipped work until the user supplies examples (workflows, tools, before/after time saved).
- Absent: testimonials, exact before/after timings, user counts beyond "thousands", personal About-me content, and a photo. Do not fabricate. "25+ projects shipped" is unverified and must not be reused.

## Product Principles

1. Prove, don't claim: every claim is backed by a screenshot, a number, or a case study.
2. Respect the skim: the key facts land within one viewport and one minute.
3. Show the joins: integrations and the UX around them are the story.
4. Fast is part of the pitch: the site itself demonstrates performance and craft.

## Accessibility & Inclusion

Target WCAG 2.2 AA. Respect reduced-motion settings for all animation; content is readable with motion disabled.
