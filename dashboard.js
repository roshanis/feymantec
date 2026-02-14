/* global window, document, globalThis */

const Core = globalThis.FeymantecCore;
const Supa = globalThis.FeymantecSupabase;

if (!Core) {
  throw new Error("Missing FeymantecCore. Load lib/feymantec-core.js before dashboard.js.");
}

const { safeTrim, escapeHtml, DAILY_PROMPTS } = Core;

function qs(sel, el = document) {
  return el.querySelector(sel);
}

function qsa(sel, el = document) {
  return el.querySelectorAll(sel);
}

// ── State ─────────────────────────────────────────────
let currentUser = null;
let userProfile = null;
let userStreak = null;
let recentCards = [];
let reviewDueCards = [];

// ── UI Helpers ────────────────────────────────────────
function showState(stateId) {
  const states = ["dashLoading", "dashAuth", "dashEmpty", "dashContent"];
  states.forEach((id) => {
    const el = qs(`#${id}`);
    if (el) el.hidden = id !== stateId;
  });
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function formatRelativeTime(date) {
  const now = new Date();
  const diff = now - new Date(date);
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

function formatDueDate(date) {
  const now = new Date();
  const due = new Date(date);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today.getTime() + 86400000);
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());

  if (dueDay <= today) return "Today";
  if (dueDay.getTime() === tomorrow.getTime()) return "Tomorrow";
  const days = Math.ceil((dueDay - today) / 86400000);
  return `In ${days} days`;
}

// ── Render Functions ──────────────────────────────────
function renderStats() {
  // Streak
  const streakVal = qs("#statStreak");
  const streakSub = qs("#statStreakSub");
  if (streakVal && userStreak) {
    streakVal.textContent = userStreak.current_streak || 0;
    streakSub.textContent = `Longest: ${userStreak.longest_streak || 0}`;
  }

  // Cards
  const cardsVal = qs("#statCards");
  const cardsSub = qs("#statCardsSub");
  if (cardsVal && userProfile) {
    cardsVal.textContent = userProfile.total_cards || 0;
    const dueCount = reviewDueCards.length;
    cardsSub.textContent = `${dueCount} due today`;
  }

  // Clarity
  const clarityVal = qs("#statClarity");
  const claritySub = qs("#statClaritySub");
  if (clarityVal && userProfile) {
    const avg = userProfile.average_clarity_score;
    clarityVal.textContent = avg ? Math.round(avg) : "--";
    if (avg) {
      if (avg >= 80) claritySub.textContent = "Excellent!";
      else if (avg >= 60) claritySub.textContent = "Good progress";
      else claritySub.textContent = "Keep improving";
    }
  }
}

function renderDailyPrompt() {
  const textEl = qs("#dailyPromptText");
  const ctaEl = qs("#dailyPromptCta");
  if (!textEl) return;

  const prompts = DAILY_PROMPTS || [
    "Explain how compound interest works",
    "Explain the scientific method",
    "Explain supply and demand",
    "Explain how DNS works",
    "Explain the water cycle"
  ];
  
  const today = new Date().toDateString();
  let stored = null;
  try {
    stored = localStorage.getItem("feym_daily_prompt");
  } catch (e) {
    // localStorage unavailable
  }

  let prompt;
  if (stored) {
    const parsed = JSON.parse(stored);
    if (parsed.date === today) {
      prompt = parsed.prompt;
    }
  }

  if (!prompt) {
    const idx = Math.floor(Math.random() * prompts.length);
    prompt = prompts[idx];
    try {
      localStorage.setItem("feym_daily_prompt", JSON.stringify({ date: today, prompt }));
    } catch (e) {
      // localStorage unavailable
    }
  }

  textEl.textContent = prompt;
  if (ctaEl) {
    ctaEl.href = `create.html?concept=${encodeURIComponent(prompt)}`;
  }
}

function renderReviewQueue() {
  const container = qs("#reviewQueue");
  const emptyEl = qs("#reviewEmpty");
  if (!container) return;

  if (reviewDueCards.length === 0) {
    if (emptyEl) emptyEl.hidden = false;
    return;
  }

  if (emptyEl) emptyEl.hidden = true;

  const cards = reviewDueCards.slice(0, 6).map((card) => `
    <a class="review-card" href="review.html?card=${card.id}">
      <p class="review-card__concept">${escapeHtml(card.concept)}</p>
      <div class="review-card__meta">
        <span class="review-card__score">Score: ${card.clarity_score || "--"}</span>
        <span class="review-card__due">${formatDueDate(card.next_review_at)}</span>
      </div>
    </a>
  `).join("");

  // Replace empty message with cards
  container.innerHTML = cards;
}

function renderRecentCards() {
  const container = qs("#recentCards");
  const emptyEl = qs("#recentEmpty");
  if (!container) return;

  if (recentCards.length === 0) {
    if (emptyEl) emptyEl.hidden = false;
    return;
  }

  if (emptyEl) emptyEl.hidden = true;

  const cards = recentCards.slice(0, 5).map((card) => `
    <a class="recent-card" href="card.html?id=${card.id}">
      <p class="recent-card__concept">${escapeHtml(card.concept)}</p>
      <div class="recent-card__meta">
        <span class="recent-card__score">Score: ${card.clarity_score || "--"}</span>
        <span class="recent-card__time">${formatRelativeTime(card.created_at)}</span>
      </div>
    </a>
  `).join("");

  container.innerHTML = cards;
}

function renderDashboard() {
  // Set greeting
  const greetingEl = qs("#dashGreeting");
  if (greetingEl && userProfile) {
    const name = userProfile.display_name || currentUser?.email?.split("@")[0] || "learner";
    greetingEl.textContent = `${getGreeting()}, ${name}!`;
  }

  // Set avatar
  const avatarEl = qs("#userAvatar");
  const nameEl = qs("#userName");
  if (avatarEl && currentUser) {
    const initial = (userProfile?.display_name || currentUser.email || "U")[0].toUpperCase();
    avatarEl.textContent = initial;
  }
  if (nameEl && currentUser) {
    nameEl.textContent = userProfile?.display_name || currentUser.email?.split("@")[0] || "User";
  }

  renderStats();
  renderDailyPrompt();
  renderReviewQueue();
  renderRecentCards();
}

// ── Data Loading ──────────────────────────────────────
async function loadDashboardData() {
  if (!Supa || !Supa.supabase) {
    console.warn("Supabase not configured, using demo mode");
    showState("dashEmpty");
    return;
  }

  const { data: { user }, error: authError } = await Supa.supabase.auth.getUser();

  if (authError || !user) {
    showState("dashAuth");
    return;
  }

  currentUser = user;

  // Load user profile
  const { data: profile } = await Supa.supabase
    .from("user_profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  userProfile = profile;

  // Load streak
  const { data: streak } = await Supa.supabase
    .from("user_streaks")
    .select("*")
    .eq("id", user.id)
    .single();

  userStreak = streak;

  // Load recent cards
  const { data: cards } = await Supa.supabase
    .from("cards")
    .select("id, concept, clarity_score, created_at, next_review_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10);

  recentCards = cards || [];

  // Load cards due for review
  const today = new Date().toISOString();
  const { data: dueCards } = await Supa.supabase
    .from("cards")
    .select("id, concept, clarity_score, next_review_at")
    .eq("user_id", user.id)
    .lte("next_review_at", today)
    .order("next_review_at", { ascending: true })
    .limit(10);

  reviewDueCards = dueCards || [];

  // Check if user has any cards
  if (recentCards.length === 0 && !profile?.onboarding_completed_at) {
    showState("dashEmpty");
    return;
  }

  renderDashboard();
  showState("dashContent");
}

// ── Event Handlers ────────────────────────────────────
function initEventHandlers() {
  // User menu toggle
  const menuBtn = qs("#userMenuBtn");
  const menu = qs("#userMenu");
  if (menuBtn && menu) {
    menuBtn.addEventListener("click", () => {
      const isOpen = menu.hidden === false;
      menu.hidden = isOpen;
      menuBtn.setAttribute("aria-expanded", String(!isOpen));
    });

    // Close on click outside
    document.addEventListener("click", (e) => {
      if (!menuBtn.contains(e.target) && !menu.contains(e.target)) {
        menu.hidden = true;
        menuBtn.setAttribute("aria-expanded", "false");
      }
    });
  }

  // Sign out
  const signOutBtn = qs("#signOutBtn");
  if (signOutBtn && Supa?.supabase) {
    signOutBtn.addEventListener("click", async () => {
      await Supa.supabase.auth.signOut();
      window.location.href = "index.html";
    });
  }

  // Shuffle daily prompt
  const shuffleBtn = qs("#shuffleDaily");
  if (shuffleBtn) {
    shuffleBtn.addEventListener("click", () => {
      try {
        localStorage.removeItem("feym_daily_prompt");
      } catch (e) {
        // localStorage unavailable
      }
      renderDailyPrompt();
    });
  }

  // Year in footer
  const yearEl = qs("#year");
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }
}

// ── Init ──────────────────────────────────────────────
window.addEventListener("DOMContentLoaded", () => {
  initEventHandlers();
  loadDashboardData();
});
