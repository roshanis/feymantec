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
  - `requirements.md`
  - `favicon.svg`

Notes:
- Package installs are unavailable in this environment (npm registry DNS blocked), so the first pass is static HTML/CSS/JS. Next.js migration is planned once installs are possible.
- Running a local HTTP server may be restricted in this sandbox. Opening `index.html` directly still works for UI validation; Supabase inserts require serving from an origin allowed by your Supabase project settings.

Next steps:
1. Configure Supabase and verify inserts from the waitlist form.
2. Decide on `siteUrl` and update `config.js` so referral links are correct.
3. (Optional) Add an Edge Function for a real AI demo (rate-limited) once ready.

