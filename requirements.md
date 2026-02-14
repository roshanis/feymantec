# Requirements

## Overview

Build a high-conversion webpage for **Feymantec**, an iOS app that helps anyone learn any concept in **5 minutes** using the **Feynman technique**.

This web artifact is the "web-first" validation layer:
- Explain the product clearly.
- Provide an interactive demo that feels like the app.
- Capture a TestFlight waitlist with referrals.
- Provide shareable assets (Card pages and PNG export) that seed organic growth.

## Product Decisions (Locked)

- Audience: **Anyone**
- AI: **Required** in the iOS product
- Monetization: **Freemium**
- Topic policy: All topics allowed **except NSFW**
- Social: **Shareable card images** + **public profiles/leaderboards** (initially marketing-only, product later)
- Daily prompts: **Random + Trending + For you**

## Web MVP Scope

### Pages
- Landing page with sections and CTA to waitlist
- Demo: concept + explanation input produces a "Feynman Card" preview
- Share page: renders a shared card from a URL and supports PNG export

### Waitlist + Referrals
- Email capture with a unique `ref_code`
- Support `?ref=CODE` query param for attribution (`referred_by`)
- After signup, show the user's referral link for sharing

## Functional Requirements

### Landing
- FR-001: Clear headline promise: "Learn any concept in 5 minutes."
- FR-002: Explain the 5-step loop (pick, explain, find gap, rewrite/analogy, quick check).
- FR-003: Include CTA(s) that lead to waitlist signup.
- FR-004: Include pricing section: Free vs Pro (provisional pricing acceptable).
- FR-005: Include social proof hooks (public cards, profiles, leaderboards) even if mocked.

### Demo (Web Preview)
- FR-010: User can enter a concept and an explanation (v1).
- FR-011: System blocks NSFW topics in the demo.
- FR-012: System generates a structured card preview containing:
  - Concept title
  - "Clarity score" (heuristic for web preview)
  - "Gaps" questions (2-4)
  - A simpler version (short)
  - One analogy
  - Two quick-check questions
- FR-013: User can generate a share link for the card.
- FR-014: User can export the card as a PNG.

### Daily Prompt Modes
- FR-020: User can switch between Random, Trending, For you prompt modes.
- FR-021: User can shuffle prompts within a mode.
- FR-022: "Try demo with this" should carry the chosen prompt into the demo concept field.

### Share Page
- FR-030: Page loads from a URL hash payload and renders a card.
- FR-031: User can download a PNG from the share page.
- FR-032: User can copy the share link.

### Waitlist (Supabase)
- FR-040: Form validates email format before submission.
- FR-041: On success, show a referral link and quick share actions.
- FR-042: When arriving with `?ref=...`, persist attribution for later signup.
- FR-043: If email already exists, show a helpful message.

## Non-Functional Requirements

- NFR-001: Static-hostable (no server required for the first version).
- NFR-002: Mobile-first, fast load, minimal JS.
- NFR-003: Accessible basics: keyboard navigation, focus states, readable contrast, skip link.
- NFR-004: No secret keys shipped to the client.
- NFR-005: Safe topic policy: block NSFW and provide disclaimers for sensitive topics (health/legal/finance).
- NFR-006: TDD: add/update unit tests for core logic and bug fixes. Tests live in `tests/**/*.test.js` and must pass via `node --test` (or `npm test`).

## Data Requirements (Supabase)

### Table: `public.waitlist_signups`

Fields:
- `id` uuid primary key
- `created_at` timestamptz
- `email` citext unique
- `ref_code` text unique
- `referred_by` text nullable
- `utm_source` text nullable
- `utm_medium` text nullable
- `utm_campaign` text nullable
- `utm_term` text nullable
- `utm_content` text nullable

Constraints:
- Unique on `email`
- Unique on `ref_code`

RLS:
- Allow `anon` inserts only
- Disallow selects for `anon` by default

## Out Of Scope (Web MVP)

- Real AI calls from the webpage
- Auth/login
- Public profile pages backed by a database
- Real leaderboards backed by a database
- Payments

## Future Requirements (Planned)

- Replace demo heuristics with a real AI endpoint (via Supabase Edge Function).
- Add public profile pages and leaderboards (server-backed).
- Add referral reward tracking (free sessions at launch; streak freeze earn rules).
- Migrate static site to Next.js when installs/network are available.

## Open Questions

1. Branding: do we want a different public-facing name than "Feymantec"?
2. Domain: what domain should `siteUrl` use for referrals?
3. AI provider: OpenAI vs Anthropic vs others (cost/latency/quality tradeoffs).
4. Legal: what disclaimer text is acceptable for sensitive topics?
