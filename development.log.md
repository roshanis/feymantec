# Development Log

## 2026-02-14

- Created a dependency-free static landing page with a bold "paper notebook" aesthetic and an embedded daily prompt card.
  - `index.html`
  - `styles.css`
  - `app.js`
- Implemented a local demo that generates a structured "Feynman Card" preview (heuristic scoring, gap questions, analogy, quick check).
  - Share link generation using URL-hash encoded JSON
  - PNG export via canvas rendering
- Added a share page that renders a card from a link and supports PNG export.
  - `share/index.html`
  - `share/share.js`
- Added Supabase schema + RLS policy for waitlist signup with referral attribution.
  - `supabase/migrations/0001_waitlist.sql`
- Added Supabase client config placeholders.
  - `config.js`
  - `config.example.js`
- Added docs and assets.
  - `README.md`
  - `AGENTS.md`
  - `requirements.md`
  - `favicon.svg`
- Implemented TDD-friendly core logic + unit tests.
  - Extracted shared utilities into `lib/feymantec-core.js` and refactored `app.js` + `share/share.js` to use it
  - Added `tests/core.test.js` (Node's built-in `node:test`)
  - Added `package.json` scripts for `npm test` / `npm run test:watch` / `npm run lint`

### Agent-Driven Improvements (TDD)

- Set up comprehensive testing infrastructure
  - Added Vitest for unit tests (67 tests passing)
  - Added Playwright config for E2E tests
  - `vitest.config.js`, `playwright.config.js`
  - `tests/feymantec-core.test.js` - comprehensive unit tests
  - `tests/e2e/waitlist.spec.js` - E2E test suite

- Fixed critical bugs
  - Added try-catch to share page hash parsing (prevents crashes)
  - Added error state for invalid share URLs
  - Added `type="email"` to waitlist input
  - Added `aria-describedby` and `aria-live` for form accessibility
  - Wrapped all localStorage calls in try-catch (Safari private mode)

- Fixed accessibility issues
  - Increased color contrast (--muted alpha 0.62 → 0.72)
  - Improved focus states with visible outlines
  - Added mobile hamburger menu with full nav overlay
  - Added FAQ heading for discoverability

- Improved conversion elements
  - Added social proof badge near hero ("Join 2,400+ learners")
  - Added reward badge and referral progress bar post-signup
  - Improved referral visibility with gamified progress

- Added dynamic OG meta tags for share page
  - Open Graph and Twitter Card meta tags
  - JavaScript-based dynamic updates from card data

Notes:
- Package installs now work. Vitest and Playwright are available.
- Running a local HTTP server may be restricted in this sandbox. Opening `index.html` directly still works for UI validation; Supabase inserts require serving from an origin allowed by your Supabase project settings.

Next steps:
1. Configure Supabase and verify inserts from the waitlist form.
2. Decide on `siteUrl` and update `config.js` so referral links are correct.
3. (Optional) Add an Edge Function for a real AI demo (rate-limited) once ready.
4. Run `npm run test:e2e` to verify E2E tests pass with Playwright.
