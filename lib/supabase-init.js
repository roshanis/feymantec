/* Supabase client initialization */
(function() {
  "use strict";

  const cfg = window.__FEYNMAN_CONFIG__ || {};
  const supabaseUrl = (cfg.supabaseUrl || "").trim();
  const supabaseKey = (cfg.supabaseAnonKey || "").trim();

  if (!supabaseUrl || !supabaseKey) {
    console.warn("Supabase not configured. Set supabaseUrl and supabaseAnonKey in config.js");
    window.FeymantecSupabase = { supabase: null };
    return;
  }

  try {
    const client = window.supabase.createClient(supabaseUrl, supabaseKey);
    window.FeymantecSupabase = { supabase: client };
  } catch (e) {
    console.error("Failed to initialize Supabase:", e);
    window.FeymantecSupabase = { supabase: null };
  }
})();
