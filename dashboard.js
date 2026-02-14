/* dashboard.js — session guard + sign-out for the logged-in dashboard */
(function () {
  "use strict";

  /* ── Session check ───────────────────────────────── */
  var token = sessionStorage.getItem("feym_access_token");

  // If no token and Supabase is configured, redirect to login.
  // In demo mode (no Supabase config), allow access.
  var cfg = window.__FEYNMAN_CONFIG__ || {};
  var supabaseConfigured = !!(cfg.supabaseUrl && cfg.supabaseAnonKey);

  if (!token && supabaseConfigured) {
    window.location.href = "/login.html";
    return;
  }

  /* ── Sign out ────────────────────────────────────── */
  var signOutBtn = document.querySelector("#signOut");
  if (signOutBtn) {
    signOutBtn.addEventListener("click", function () {
      sessionStorage.removeItem("feym_access_token");
      sessionStorage.removeItem("feym_refresh_token");
      window.location.href = "/login.html";
    });
  }

  /* ── Concept suggestion pills ────────────────────── */
  var suggestContainer = document.querySelector("#dashSuggestions");
  var conceptInput = document.querySelector("#concept");

  if (suggestContainer && conceptInput) {
    var suggestions = [
      "Photosynthesis",
      "Bayes' theorem",
      "What is inflation?",
      "Why do planes fly?",
      "How a database index works",
      "The placebo effect",
      "What is an ETF?",
      "Why do we sleep?",
    ];

    suggestions.forEach(function (text) {
      var pill = document.createElement("button");
      pill.type = "button";
      pill.className = "dash-pill";
      pill.textContent = text;
      pill.addEventListener("click", function () {
        conceptInput.value = text;
        conceptInput.focus();
        // highlight active pill
        suggestContainer.querySelectorAll(".dash-pill").forEach(function (p) {
          p.classList.remove("is-on");
        });
        pill.classList.add("is-on");
      });
      suggestContainer.appendChild(pill);
    });
  }
})();
