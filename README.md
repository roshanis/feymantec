# Feymantec (Web)

Landing page + waitlist + shareable "Feynman Card" demo for the iOS app.

## Recommended Stack (When You Move Beyond Static)

- Web: Next.js (App Router) + TypeScript + Tailwind (or CSS Modules if you prefer)
- Backend: Supabase (Postgres + Auth + Edge Functions)
- AI: Supabase Edge Function calling your LLM provider (keeps keys off the client)
- Deploy: Vercel (web) + Supabase (db/functions)
- Analytics: PostHog (optional, later)

This repo currently ships a dependency-free static site because package installs are unavailable in this environment.

## Local Dev

Open `index.html` directly in a browser, or run a tiny static server:

```bash
python3 -m http.server 5173
```

Then visit `http://localhost:5173`.

## Supabase Setup (Waitlist + Referrals)

1. Create a Supabase project.
2. In the SQL editor, run:
   - `supabase/migrations/0001_waitlist.sql`
   - `supabase/migrations/0002_waitlist_auth.sql`
   - `supabase/migrations/0003_waitlist_referral_count.sql`
3. Edit `config.js` and fill in:
   - `supabaseUrl`
   - `supabaseAnonKey`

The waitlist form uses passwordless email OTP (send code, then verify) and inserts rows into `public.waitlist_signups`.

## OpenAI AI Integration (Supabase Edge Function)

This repo now includes a server-side OpenAI proxy at `supabase/functions/ai-explain/index.ts`.

Why: keep your OpenAI key off the client while letting `app.js` call AI safely through Supabase.

### 1) Deploy the Edge Function

```bash
supabase functions deploy ai-explain
```

### 2) Set function secrets

```bash
supabase secrets set OPENAI_API_KEY=your_key_here
supabase secrets set OPENAI_MODEL=gpt-5.2
```

`OPENAI_MODEL` is optional; it defaults to `gpt-5.2`.

### 3) Client config

In `config.js`, keep using only public values and optionally set:

- `aiFunctionName` (defaults to `ai-explain`)

The browser helper is available as `window.FeymantecAI` from `lib/feymantec-ai.js`.

## Pages

- `index.html`: landing + demo + waitlist
- `share/index.html`: renders a shared Card from a URL hash and supports PNG export
