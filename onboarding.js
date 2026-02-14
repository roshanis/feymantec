/* global window, document, globalThis */

const Core = globalThis.FeymantecCore;
const Supa = globalThis.FeymantecSupabase;

if (!Core) {
  throw new Error("Missing FeymantecCore. Load lib/feymantec-core.js before onboarding.js.");
}

const { safeTrim, wordCount, escapeHtml, buildPreviewCard, DAILY_PROMPTS } = Core;

function qs(sel, el = document) {
  return el.querySelector(sel);
}

function qsa(sel, el = document) {
  return Array.from(el.querySelectorAll(sel));
}

// State
let currentStep = 1;
let selectedConcept = "";
let explanation = "";
let generatedCard = null;

// Suggested topics
const SUGGESTIONS = DAILY_PROMPTS?.slice(0, 5) || [
  "Compound Interest",
  "The Scientific Method",
  "Supply and Demand",
  "How DNS Works",
  "The Water Cycle",
];

// Step Navigation
function showStep(step) {
  currentStep = step;

  // Update progress bar
  const progress = qs("#progressBar");
  if (progress) {
    progress.style.width = (step / 5) * 100 + "%";
  }

  // Show/hide steps
  qsa(".onboard__step").forEach((el) => {
    const stepNum = parseInt(el.dataset.step, 10);
    el.classList.toggle("onboard__step--hidden", stepNum !== step);
  });

  // Save state
  try {
    localStorage.setItem("feym_onboarding_step", String(step));
    localStorage.setItem("feym_onboarding_state", JSON.stringify({
      step,
      concept: selectedConcept,
      explanation,
    }));
  } catch {
    // localStorage unavailable
  }
}

// Step 2: Choose Topic
function initStep2() {
  const container = qs("#suggestions");
  const customInput = qs("#customConcept");
  const nextBtn = qs("#next2");
  const backBtn = qs("#back2");

  if (!container) return;

  // Render suggestion radio buttons
  const html = SUGGESTIONS.map((s, i) => 
    '<label class="suggestion-radio">' +
    '<input type="radio" name="concept" value="' + escapeHtml(s) + '"' + (i === 0 ? ' checked' : '') + ' />' +
    '<span class="suggestion-radio__text">' + escapeHtml(s) + '</span>' +
    '</label>'
  ).join("");
  container.innerHTML = html;

  // Handle selection
  function updateSelection() {
    const selected = qs('input[name="concept"]:checked');
    const custom = safeTrim(customInput?.value || "");

    if (custom) {
      selectedConcept = custom;
      qsa('input[name="concept"]').forEach((r) => (r.checked = false));
    } else if (selected) {
      selectedConcept = selected.value;
    }

    qsa(".suggestion-radio").forEach((label) => {
      const radio = qs("input", label);
      label.classList.toggle("is-selected", radio?.checked);
    });

    if (nextBtn) {
      nextBtn.disabled = !selectedConcept;
    }
  }

  container.addEventListener("change", () => {
    if (customInput) customInput.value = "";
    updateSelection();
  });

  customInput?.addEventListener("input", updateSelection);

  backBtn?.addEventListener("click", () => showStep(1));
  nextBtn?.addEventListener("click", () => {
    if (selectedConcept) {
      const display = qs("#conceptDisplay");
      if (display) display.textContent = selectedConcept;
      showStep(3);
    }
  });

  updateSelection();
}

// Step 3: Write Explanation
function initStep3() {
  const textareaEl = qs("#explanation");
  const wordCountEl = qs("#wordCount");
  const nextBtn = qs("#next3");
  const backBtn = qs("#back3");

  function updateWordCount() {
    const text = textareaEl?.value || "";
    const count = wordCount(text);
    if (wordCountEl) {
      wordCountEl.textContent = count + " words";
    }
    explanation = text;

    if (nextBtn) {
      nextBtn.disabled = count < 20;
    }
  }

  textareaEl?.addEventListener("input", updateWordCount);

  backBtn?.addEventListener("click", () => showStep(2));
  nextBtn?.addEventListener("click", async () => {
    if (wordCount(explanation) >= 20) {
      await generateCard();
      showStep(4);
    }
  });

  updateWordCount();
}

// Card Generation
async function generateCard() {
  const titleEl = qs("#cardTitle");
  const scoreEl = qs("#clarityScore");
  const bodyEl = qs("#cardBody");

  if (titleEl) titleEl.textContent = "Generating...";
  if (scoreEl) scoreEl.textContent = "--";
  if (bodyEl) bodyEl.innerHTML = '<p class="muted">Analyzing your explanation...</p>';

  generatedCard = buildPreviewCard(selectedConcept, explanation);

  if (titleEl) titleEl.textContent = generatedCard.concept;
  if (scoreEl) scoreEl.textContent = String(generatedCard.score);

  const blocks = [];

  blocks.push(
    '<div class="block">' +
    '<p class="block__t">Gaps to Explore</p>' +
    '<ol class="block__list">' +
    generatedCard.gaps.map((g) => '<li>' + escapeHtml(g) + '</li>').join("") +
    '</ol></div>'
  );

  blocks.push(
    '<div class="block">' +
    '<p class="block__t">Analogy</p>' +
    '<p class="block__p">' + escapeHtml(generatedCard.analogy) + '</p>' +
    '</div>'
  );

  blocks.push(
    '<div class="block">' +
    '<p class="block__t">Quick Check</p>' +
    '<ol class="block__list">' +
    generatedCard.quiz.map((q) => 
      '<li><strong>' + escapeHtml(q.q) + '</strong><br/>' +
      '<span class="muted">Answer:</span> ' + escapeHtml(q.a) + '</li>'
    ).join("") +
    '</ol></div>'
  );

  if (bodyEl) bodyEl.innerHTML = blocks.join("");

  await saveCardToDatabase();
}

async function saveCardToDatabase() {
  if (!Supa?.supabase || !generatedCard) return;

  try {
    const { data: { user } } = await Supa.supabase.auth.getUser();
    if (!user) return;

    await Supa.supabase.from("cards").insert({
      user_id: user.id,
      concept: generatedCard.concept,
      explanation: generatedCard.v1,
      clarity_score: generatedCard.score,
      gaps: generatedCard.gaps,
      analogy: generatedCard.analogy,
      simple_version: generatedCard.simple,
      quiz: generatedCard.quiz,
      jargon_words: generatedCard.jargon,
      word_count: wordCount(generatedCard.v1),
      next_review_at: new Date(Date.now() + 86400000).toISOString(),
    });

    await Supa.supabase.from("user_profiles").update({
      onboarding_completed_at: new Date().toISOString(),
      onboarding_step: "complete",
    }).eq("id", user.id);

    await Supa.supabase.from("user_activation_events").insert({
      user_id: user.id,
      event_name: "first_card_created",
    });

  } catch (e) {
    console.error("Failed to save card:", e);
  }
}

// Step 4: Review Card
function initStep4() {
  const nextBtn = qs("#next4");
  const backBtn = qs("#back4");

  backBtn?.addEventListener("click", () => showStep(3));
  nextBtn?.addEventListener("click", () => showStep(5));
}

// Step 5: Celebration
function initStep5() {
  const confettiEl = qs(".onboard__confetti");
  if (confettiEl) {
    const emojis = ["🎉", "✨", "🎊", "⭐"];
    let html = "";
    for (let i = 0; i < 30; i++) {
      const left = Math.random() * 100;
      const delay = Math.random() * 2;
      const duration = 2 + Math.random() * 2;
      const emoji = emojis[Math.floor(Math.random() * emojis.length)];
      html += '<span style="position:absolute;left:' + left + '%;top:-20px;font-size:24px;animation:confetti-fall ' + duration + 's ease-out ' + delay + 's forwards;">' + emoji + '</span>';
    }
    confettiEl.innerHTML = html;

    const style = document.createElement("style");
    style.textContent = "@keyframes confetti-fall { 0% { transform: translateY(0) rotate(0deg); opacity: 1; } 100% { transform: translateY(100vh) rotate(720deg); opacity: 0; } }";
    document.head.appendChild(style);
  }
}

// Initialize
function init() {
  let savedStep = 1;
  try {
    const saved = localStorage.getItem("feym_onboarding_state");
    if (saved) {
      const state = JSON.parse(saved);
      savedStep = state.step || 1;
      selectedConcept = state.concept || "";
      explanation = state.explanation || "";
    }
  } catch {
    // Start fresh
  }

  initStep2();
  initStep3();
  initStep4();
  initStep5();

  qs("#startBtn")?.addEventListener("click", () => showStep(2));

  showStep(savedStep);

  if (selectedConcept) {
    const display = qs("#conceptDisplay");
    if (display) display.textContent = selectedConcept;
  }
  if (explanation) {
    const textarea = qs("#explanation");
    if (textarea) {
      textarea.value = explanation;
      textarea.dispatchEvent(new Event("input"));
    }
  }
}

window.addEventListener("DOMContentLoaded", init);
