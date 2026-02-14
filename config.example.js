// Rename to config.js (or just edit config.js directly).
// This file is safe to commit; do NOT commit secrets.
window.__FEYNMAN_CONFIG__ = {
  // Example: "https://xxxx.supabase.co"
  supabaseUrl: "",
  // Supabase Project Settings -> API -> anon public key
  supabaseAnonKey: "",
  // Supabase Edge Function name for OpenAI proxy
  aiFunctionName: "ai-explain",
  // Table name created by supabase/migrations/0001_waitlist.sql
  waitlistTable: "waitlist_signups",
  // Used to build referral links shown after signup
  siteUrl: "",
};

