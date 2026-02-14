/* dashboard.js — session guard + guided Feynman wizard */
(function () {
  "use strict";

  /* ── Session check ───────────────────────────────── */
  var token = sessionStorage.getItem("feym_access_token");
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

  /* ── Core library ────────────────────────────────── */
  var Core = typeof FeymantecCore !== "undefined" ? FeymantecCore : {};
  var buildPreviewCard = Core.buildPreviewCard;
  var escapeHtml = Core.escapeHtml;
  var wordCount = Core.wordCount;

  /* ── DOM refs ────────────────────────────────────── */
  var qs = function (s) { return document.querySelector(s); };

  var steps = [
    qs("#wizStep1"),
    qs("#wizStep2"),
    qs("#wizStep3"),
    qs("#wizStep4"),
    qs("#wizStep5"),
    qs("#wizStepCard"),
  ];

  var bar = qs("#wizBar");

  // Step 1
  var conceptInput = qs("#wizConcept");
  var next1 = qs("#wizNext1");
  var suggestContainer = qs("#dashSuggestions");

  // Step 2
  var conceptDisplay2 = qs("#wizConceptDisplay2");
  var explainInput = qs("#wizExplain");
  var wordCountEl = qs("#wizWordCount");
  var next2 = qs("#wizNext2");

  // Step 3
  var gapsEl = qs("#wizGaps");
  var jargonWrap = qs("#wizJargonWrap");
  var jargonEl = qs("#wizJargon");

  // Step 4
  var simpleEl = qs("#wizSimple");
  var analogyEl = qs("#wizAnalogy");

  // Step 5
  var quizEl = qs("#wizQuiz");

  // Card
  var cardTitle = qs("#cardTitle");
  var cardBody = qs("#cardBody");
  var clarityScore = qs("#clarityScore");

  /* ── State ───────────────────────────────────────── */
  var currentStep = 0; // 0-indexed
  var card = null;

  /* ── Navigation ──────────────────────────────────── */
  function goTo(stepIndex) {
    steps.forEach(function (el, i) {
      if (i === stepIndex) {
        el.classList.remove("is-hidden");
      } else {
        el.classList.add("is-hidden");
      }
    });
    currentStep = stepIndex;

    // Update progress bar (5 learning steps + card = 6 panels)
    var pct = stepIndex < 5
      ? Math.round(((stepIndex + 1) / 5) * 100)
      : 100;
    bar.style.width = pct + "%";

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /* ── Step 1: Concept input ───────────────────────── */
  var suggestions = [
    "Photosynthesis",
    "Bayes\u2019 theorem",
    "What is inflation?",
    "Why do planes fly?",
    "How a database index works",
    "The placebo effect",
    "What is an ETF?",
    "Why do we sleep?",
  ];

  if (suggestContainer) {
    suggestions.forEach(function (text) {
      var pill = document.createElement("button");
      pill.type = "button";
      pill.className = "dash-pill";
      pill.textContent = text;
      pill.addEventListener("click", function () {
        conceptInput.value = text;
        next1.disabled = false;
        suggestContainer.querySelectorAll(".dash-pill").forEach(function (p) {
          p.classList.remove("is-on");
        });
        pill.classList.add("is-on");
      });
      suggestContainer.appendChild(pill);
    });
  }

  conceptInput.addEventListener("input", function () {
    next1.disabled = !conceptInput.value.trim();
    // clear pill selection
    if (suggestContainer) {
      suggestContainer.querySelectorAll(".dash-pill").forEach(function (p) {
        p.classList.remove("is-on");
      });
    }
  });

  next1.addEventListener("click", function () {
    if (!conceptInput.value.trim()) return;
    conceptDisplay2.textContent = conceptInput.value.trim();
    goTo(1);
    explainInput.focus();
  });

  /* ── Step 2: Explain ─────────────────────────────── */
  explainInput.addEventListener("input", function () {
    var wc = wordCount ? wordCount(explainInput.value) : explainInput.value.trim().split(/\s+/).filter(Boolean).length;
    wordCountEl.textContent = wc + " word" + (wc === 1 ? "" : "s");
    next2.disabled = wc < 12;
  });

  next2.addEventListener("click", function () {
    var concept = conceptInput.value.trim();
    var v1 = explainInput.value.trim();
    if (!concept || !v1) return;

    // Generate the card
    card = buildPreviewCard(concept, v1);
    populateStep3();
    populateStep4();
    populateStep5();
    goTo(2);
  });

  /* ── Step 3: Gaps ────────────────────────────────── */
  function populateStep3() {
    if (!card) return;
    gapsEl.innerHTML = "";
    card.gaps.forEach(function (gap, i) {
      var div = document.createElement("div");
      div.className = "wiz__gap-item";
      div.innerHTML =
        '<span class="wiz__gap-num">' + (i + 1) + "</span>" +
        '<p class="wiz__gap-text">' + escapeHtml(gap) + "</p>";
      gapsEl.appendChild(div);
    });

    if (card.jargon && card.jargon.length) {
      jargonWrap.classList.remove("is-hidden");
      jargonEl.innerHTML = "";
      card.jargon.forEach(function (w) {
        var span = document.createElement("span");
        span.className = "pill";
        span.textContent = w;
        jargonEl.appendChild(span);
      });
    } else {
      jargonWrap.classList.add("is-hidden");
    }
  }

  /* ── Step 4: Simplify + Analogy ──────────────────── */
  function populateStep4() {
    if (!card) return;
    simpleEl.innerHTML = card.simple.map(function (s) { return escapeHtml(s); }).join("<br><br>");
    analogyEl.textContent = card.analogy;
  }

  /* ── Step 5: Quiz ────────────────────────────────── */
  function populateStep5() {
    if (!card) return;
    quizEl.innerHTML = "";
    card.quiz.forEach(function (q, i) {
      var div = document.createElement("div");
      div.className = "wiz__quiz-item";
      div.innerHTML =
        '<p class="wiz__quiz-q">' + (i + 1) + ". " + escapeHtml(q.q) + "</p>" +
        '<p class="wiz__quiz-a is-hidden" id="quizA' + i + '">' + escapeHtml(q.a) + "</p>" +
        '<button class="wiz__quiz-reveal" type="button" data-reveal="quizA' + i + '">Show answer</button>';
      quizEl.appendChild(div);
    });

    // Reveal buttons
    quizEl.querySelectorAll(".wiz__quiz-reveal").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var target = document.getElementById(btn.getAttribute("data-reveal"));
        if (target) {
          target.classList.remove("is-hidden");
          btn.style.display = "none";
        }
      });
    });
  }

  /* ── Final: Render full card ─────────────────────── */
  function renderFullCard() {
    if (!card) return;
    cardTitle.textContent = card.concept;
    clarityScore.textContent = String(card.score);

    var blocks = [];

    blocks.push(
      '<div class="block">' +
      '<p class="block__t">Your Explanation</p>' +
      '<p class="block__p">' + (escapeHtml(card.v1) || "<span class='muted'>No text provided.</span>") + "</p>" +
      "</div>"
    );

    if (card.jargon && card.jargon.length) {
      blocks.push(
        '<div class="block">' +
        '<p class="block__t">Spiky Words</p>' +
        '<p class="block__p">These often hide missing steps.</p>' +
        '<div class="jargon">' +
        card.jargon.map(function (w) { return '<span class="pill">' + escapeHtml(w) + "</span>"; }).join("") +
        "</div></div>"
      );
    }

    blocks.push(
      '<div class="block">' +
      '<p class="block__t">Gaps</p>' +
      '<ol class="block__list">' +
      card.gaps.map(function (g) { return "<li>" + escapeHtml(g) + "</li>"; }).join("") +
      "</ol></div>"
    );

    blocks.push(
      '<div class="block">' +
      '<p class="block__t">Simpler Version</p>' +
      '<p class="block__p">' + card.simple.map(function (s) { return escapeHtml(s); }).join(" ") + "</p>" +
      "</div>"
    );

    blocks.push(
      '<div class="block">' +
      '<p class="block__t">Analogy</p>' +
      '<p class="block__p">' + escapeHtml(card.analogy) + "</p>" +
      "</div>"
    );

    blocks.push(
      '<div class="block">' +
      '<p class="block__t">Quick Check</p>' +
      '<ol class="block__list">' +
      card.quiz.map(function (q) {
        return "<li><strong>" + escapeHtml(q.q) + "</strong><br/><span class='muted'>Answer:</span> " + escapeHtml(q.a) + "</li>";
      }).join("") +
      "</ol></div>"
    );

    cardBody.innerHTML = blocks.join("");
  }

  /* ── Navigation wiring ───────────────────────────── */
  qs("#wizNext3").addEventListener("click", function () { goTo(3); });
  qs("#wizNext4").addEventListener("click", function () { goTo(4); });

  qs("#wizFinish").addEventListener("click", function () {
    renderFullCard();
    goTo(5);
  });

  // Back buttons
  qs("#wizBack2").addEventListener("click", function () { goTo(0); });
  qs("#wizBack3").addEventListener("click", function () { goTo(1); });
  qs("#wizBack4").addEventListener("click", function () { goTo(2); });
  qs("#wizBack5").addEventListener("click", function () { goTo(3); });

  // Restart
  qs("#wizRestart").addEventListener("click", function () {
    conceptInput.value = "";
    explainInput.value = "";
    next1.disabled = true;
    next2.disabled = true;
    wordCountEl.textContent = "0 words";
    card = null;
    if (suggestContainer) {
      suggestContainer.querySelectorAll(".dash-pill").forEach(function (p) {
        p.classList.remove("is-on");
      });
    }
    goTo(0);
  });
})();
