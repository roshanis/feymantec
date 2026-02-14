# Repository Guidelines

## Project Structure

- `index.html`: landing page + interactive demo + waitlist form.
- `styles.css`: global styling (CSS variables live in `:root`).
- `app.js`: demo logic, share-link generation, waitlist + referral submission.
- `lib/feymantec-core.js`: shared, testable utilities (encoding, heuristics, validation).
- `share/`: shareable "Feynman Card" page and renderer.
  - `share/index.html`
  - `share/share.js`
- `tests/`: unit tests (`node:test`).
- `supabase/migrations/`: database migrations for waitlist/referrals.
  - `supabase/migrations/0001_waitlist.sql`
- Config/docs:
  - `config.js`, `config.example.js` (Supabase URL + anon key)
  - `README.md`, `requirements.md`, `development.log.md`

## Build, Test, and Development Commands

This repo is intentionally dependency-free (static HTML/CSS/JS).

- Local preview (recommended):
  - `python3 -m http.server 5173`
  - Visit `http://localhost:5173`
- Run unit tests:
  - `npm test` (or `node --test`)
  - `npm run test:watch` (TDD loop)
- Lint (syntax checks only):
  - `npm run lint`

## Coding Style & Naming Conventions

- Indentation: 2 spaces; keep files ASCII where possible.
- JavaScript: modern vanilla JS (no framework). Prefer small pure helpers and minimal global state.
- CSS: `kebab-case` classes, BEM-ish patterns like `card__head`, `plan--pro`.
- Keep share links deterministic and backwards compatible (avoid breaking old `#card=...` links).

## Testing Guidelines

Unit tests use Node's built-in runner (`node:test`). Follow TDD for core changes:

- Write a failing test in `tests/*.test.js` first (prefer testing `lib/feymantec-core.js`).
- Implement/fix logic, then run `npm test` until green.

Manual QA (still required) for:

- Demo generation (errors, NSFW block, "Use Daily 5", share link, PNG download)
- Share page rendering + PNG export
- Waitlist success/error paths, including `?ref=CODE` attribution

## Supabase, Security & Configuration

- Apply `supabase/migrations/0001_waitlist.sql` in Supabase SQL editor.
- `config.js` must contain only the **anon** key. Never ship service-role keys.
- RLS is designed for **insert-only** from the client; avoid adding client-side reads of `waitlist_signups`.

## Commit & Pull Request Guidelines

There's no Git history in this workspace yet. Use Conventional Commits, e.g. `feat(demo): add PNG export`.

PRs should include:

- What changed + why, and any migration steps
- Screenshots (mobile + desktop) for UI changes
- Verification notes (`npm test` plus demo/share/waitlist flows tested)
