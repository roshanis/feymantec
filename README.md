# Feymantec Web

Feymantec Web is the landing, onboarding, waitlist, and share-card surface for the Feymantec learning product. The current repo ships as a lightweight static web app with optional Supabase-backed waitlist flows and a server-side AI explanation function.

## What this repo includes

- Marketing landing page
- Waitlist and referral flow
- Login and onboarding screens
- Shareable Feynman Card experience
- Optional Supabase-backed AI explanation endpoint

## Current product shape

This repo is best understood as the public web companion to the Feymantec app, not as the full product itself. Its job is to explain the value proposition, capture interest, and let users share learning artifacts.

## Local development

### Quick preview

Open `index.html` directly in a browser, or run a static server:

```bash
python3 -m http.server 5173
```

Open `http://localhost:5173`.

### Project scripts

```bash
npm test
npm run test:e2e
npm run lint
npm run serve
```

## Configuration

### Waitlist and auth

Copy and fill the client config:

```bash
cp config.example.js config.js
```

Set:

- `supabaseUrl`
- `supabaseAnonKey`

### Supabase setup

Run these migrations in order:

- `supabase/migrations/0001_waitlist.sql`
- `supabase/migrations/0002_waitlist_auth.sql`
- `supabase/migrations/0003_waitlist_referral_count.sql`

### AI explanation endpoint

This repo includes a Supabase Edge Function at `supabase/functions/ai-explain/index.ts`.

Deploy it with:

```bash
supabase functions deploy ai-explain
supabase secrets set OPENAI_API_KEY=replace-me
supabase secrets set OPENAI_MODEL=gpt-5.2
```

## Important files

- `index.html`: main landing page
- `create.html`: card creation flow
- `share/index.html`: shared-card rendering and export
- `app.js`: landing page behavior
- `lib/`: client-side helpers and feature modules
- `tests/`: Vitest coverage for core browser logic

## Status

Current status: active web surface for the Feymantec concept, with real tests and a staged path toward a fuller application stack.

## License

MIT
