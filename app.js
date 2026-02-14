/* global window, document, globalThis */

function qs(sel, el = document) {
  return el.querySelector(sel);
}

function qsa(sel, el = document) {
  return Array.from(el.querySelectorAll(sel));
}

const Core = globalThis.FeymantecCore;
if (!Core) {
  throw new Error("Missing FeymantecCore. Load lib/feymantec-core.js before app.js.");
}

const { safeTrim, wordCount, isLikelyNSFW, randomId, escapeHtml, buildPreviewCard, encodeJsonToBase64Url, toSharePayload } =
  Core;
const AI = globalThis.FeymantecAI || null;

function getParams() {
  const u = new URL(window.location.href);
  const params = Object.fromEntries(u.searchParams.entries());
  return params;
}

function setTopbarElevate() {
  const bar = qs(".topbar");
  if (!bar) return;
  const on = window.scrollY > 10;
  bar.setAttribute("data-elevate", on ? "on" : "off");
}

function getDailyPools() {
  const randomPool = [
    "Bayes’ theorem",
    "TCP handshake",
    "Inflation",
    "The placebo effect",
    "Opportunity cost",
    "Backpropagation",
    "The carbon cycle",
    "How a bill becomes a law",
    "Reinforcement learning",
    "Why encryption works",
    "Photosynthesis",
    "The immune system",
  ];

  const trendingPool = [
    "What is a zero-knowledge proof?",
    "Why do interest rates matter?",
    "How do LLMs ‘predict the next token’?",
    "What is a heat pump, really?",
    "What is a supply chain shock?",
    "How does an ETF work?",
    "What is CRISPR?",
    "What is a GPU used for?",
  ];

  const forYouPool = [
    "Compound interest (teach it with an example)",
    "Decision fatigue",
    "How APIs work",
    "Why habits stick",
    "What a budget really is",
    "How antibiotics work (and don’t)",
    "Why sleep affects memory",
    "What ‘risk’ means in everyday life",
  ];

  return { randomPool, trendingPool, forYouPool };
}

function setDailyConcept(mode, concept) {
  const title = qs("#dailyConcept");
  const micro = qs("#dailyMicro");
  if (title) title.textContent = concept;
  if (micro) {
    micro.textContent =
      mode === "trending"
        ? "A topic people are arguing about right now. Teach it without hot air."
        : mode === "for-you"
          ? "A prompt tuned for everyday usefulness. Teach it with one example."
          : "A random prompt. The habit is the point.";
  }
}

function initDaily5() {
  const pools = getDailyPools();
  let mode = "random";

  function pick(modeKey) {
    const pool =
      modeKey === "trending" ? pools.trendingPool : modeKey === "for-you" ? pools.forYouPool : pools.randomPool;
    const idx = Math.floor(Math.random() * pool.length);
    return pool[idx];
  }

  function applyMode(nextMode) {
    mode = nextMode;
    qsa("[data-daily-mode]").forEach((b) => b.classList.toggle("is-on", b.getAttribute("data-daily-mode") === mode));
    const concept = pick(mode);
    setDailyConcept(mode, concept);
  }

  qsa("[data-daily-mode]").forEach((btn) => {
    btn.addEventListener("click", () => applyMode(btn.getAttribute("data-daily-mode")));
  });

  const shuffle = qs("#dailyShuffle");
  if (shuffle) shuffle.addEventListener("click", () => setDailyConcept(mode, pick(mode)));

  const toDemo = qs("#dailyToDemo");
  if (toDemo) {
    toDemo.addEventListener("click", () => {
      try {
        sessionStorage.setItem("feym_demo_concept", safeTrim(qs("#dailyConcept")?.textContent || ""));
      } catch {
        // ignore
      }
    });
  }

  // First render
  applyMode("random");

  return {
    getDaily: () => safeTrim(qs("#dailyConcept")?.textContent || ""),
  };
}

function renderCard(card) {
  qs("#cardTitle").textContent = card.concept || "Untitled";
  qs("#clarityScore").textContent = String(card.score);

  const blocks = [];

  blocks.push(`
    <div class="block">
      <p class="block__t">Your Explanation (v1)</p>
      <p class="block__p">${escapeHtml(card.v1 || "") || "<span class='muted'>No text provided.</span>"}</p>
    </div>
  `);

  if (card.jargon?.length) {
    blocks.push(`
      <div class="block">
        <p class="block__t">Spiky Words</p>
        <p class="block__p">These often hide missing steps. Define each in a clean sentence.</p>
        <div class="jargon">
          ${card.jargon.map((w) => `<span class="pill">${escapeHtml(w)}</span>`).join("")}
        </div>
      </div>
    `);
  }

  blocks.push(`
    <div class="block">
      <p class="block__t">Gaps The Coach Would Ask</p>
      <ol class="block__list">
        ${card.gaps.map((g) => `<li>${escapeHtml(g)}</li>`).join("")}
      </ol>
    </div>
  `);

  blocks.push(`
    <div class="block">
      <p class="block__t">Simpler Version (Preview)</p>
      <p class="block__p">${card.simple.map((s) => escapeHtml(s)).join(" ")}</p>
    </div>
  `);

  blocks.push(`
    <div class="block">
      <p class="block__t">Analogy</p>
      <p class="block__p">${escapeHtml(card.analogy)}</p>
    </div>
  `);

  blocks.push(`
    <div class="block">
      <p class="block__t">Quick Check</p>
      <ol class="block__list">
        ${card.quiz
          .map((q) => `<li><strong>${escapeHtml(q.q)}</strong><br/><span class="muted">Answer:</span> ${escapeHtml(q.a)}</li>`)
          .join("")}
      </ol>
    </div>
  `);

  qs("#cardBody").innerHTML = blocks.join("");
  qs("#cardFoot").hidden = false;
}

function setConceptSuggestions(setConcept) {
  const el = qs("#conceptSuggest");
  if (!el) return;
  const suggestions = [
    "Bayes’ theorem",
    "What is inflation?",
    "Why do planes fly?",
    "The three-body problem",
    "How a database index works",
    "The placebo effect",
    "What is an ETF?",
    "Why do we sleep?",
  ];
  el.innerHTML = "";
  for (const s of suggestions) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "sugBtn";
    b.textContent = s;
    b.addEventListener("click", () => setConcept(s));
    el.appendChild(b);
  }
}

function updateExplainMeta() {
  const t = qs("#explain")?.value || "";
  const meta = qs("#explainMeta");
  if (!meta) return;
  meta.textContent = `${wordCount(t)} words`;
}

function buildShareHref(card) {
  const b64 = encodeJsonToBase64Url(toSharePayload(card));
  return `share/index.html#card=${b64}`;
}

async function copyText(s) {
  try {
    await navigator.clipboard.writeText(s);
    return true;
  } catch {
    return false;
  }
}

function drawCardToCanvas(card) {
  const canvas = document.createElement("canvas");
  const scale = 2;
  const w = 1200;
  const pad = 64;
  const lineH = 44;
  const smallH = 34;

  canvas.width = w * scale;
  canvas.height = 860 * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.scale(scale, scale);

  // Background
  ctx.fillStyle = "#fbf5e6";
  ctx.fillRect(0, 0, w, canvas.height / scale);

  // Gradient wash
  const g = ctx.createLinearGradient(0, 0, w, 860);
  g.addColorStop(0, "rgba(0,203,184,0.12)");
  g.addColorStop(0.55, "rgba(255,227,90,0.14)");
  g.addColorStop(1, "rgba(255,77,115,0.10)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, 860);

  // Ruled lines
  ctx.strokeStyle = "rgba(11,14,19,0.06)";
  ctx.lineWidth = 1;
  for (let y = 0; y < 860; y += 24) {
    ctx.beginPath();
    ctx.moveTo(0, y + 1);
    ctx.lineTo(w, y + 1);
    ctx.stroke();
  }

  // Title block
  ctx.fillStyle = "rgba(11,14,19,0.88)";
  ctx.font = "800 44px 'Fraunces', serif";
  ctx.fillText(card.concept || "Feynman Card", pad, 112);

  // Highlighter strip behind score
  const score = String(card.score ?? "—");
  ctx.font = "700 20px 'IBM Plex Mono', monospace";
  const scoreText = `CLARITY ${score}`;
  const tw = ctx.measureText(scoreText).width;
  ctx.fillStyle = "rgba(255,227,90,0.75)";
  ctx.fillRect(w - pad - tw - 22, 78, tw + 22, 40);
  ctx.fillStyle = "rgba(11,14,19,0.9)";
  ctx.fillText(scoreText, w - pad - tw - 11, 106);

  // Helper: wrapped text
  function wrap(text, x, y, maxW, font, fillStyle, lh) {
    ctx.font = font;
    ctx.fillStyle = fillStyle;
    const words = safeTrim(text).split(" ").filter(Boolean);
    let line = "";
    let yy = y;
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxW && line) {
        ctx.fillText(line, x, yy);
        line = word;
        yy += lh;
      } else {
        line = test;
      }
    }
    if (line) ctx.fillText(line, x, yy);
    return yy + lh;
  }

  // Sections
  let y = 170;
  const colW = w - pad * 2;

  ctx.fillStyle = "rgba(11,14,19,0.65)";
  ctx.font = "700 14px 'IBM Plex Mono', monospace";
  ctx.fillText("GAPS TO FIX", pad, y);
  y += 16;

  ctx.strokeStyle = "rgba(11,14,19,0.12)";
  ctx.beginPath();
  ctx.moveTo(pad, y);
  ctx.lineTo(w - pad, y);
  ctx.stroke();
  y += 26;

  ctx.fillStyle = "rgba(11,14,19,0.82)";
  ctx.font = "600 20px 'Source Sans 3', sans-serif";
  const gaps = (card.gaps || []).slice(0, 3);
  for (let i = 0; i < gaps.length; i++) {
    y = wrap(`${i + 1}. ${gaps[i]}`, pad, y, colW, ctx.font, "rgba(11,14,19,0.82)", smallH);
  }
  y += 10;

  ctx.fillStyle = "rgba(11,14,19,0.65)";
  ctx.font = "700 14px 'IBM Plex Mono', monospace";
  ctx.fillText("ONE-SENTENCE ANALOGY", pad, y);
  y += 16;
  ctx.beginPath();
  ctx.moveTo(pad, y);
  ctx.lineTo(w - pad, y);
  ctx.stroke();
  y += 26;
  y = wrap(card.analogy || "", pad, y, colW, "600 20px 'Source Sans 3', sans-serif", "rgba(11,14,19,0.82)", lineH);
  y += 6;

  ctx.fillStyle = "rgba(11,14,19,0.65)";
  ctx.font = "700 14px 'IBM Plex Mono', monospace";
  ctx.fillText("SIMPLER VERSION (PREVIEW)", pad, y);
  y += 16;
  ctx.beginPath();
  ctx.moveTo(pad, y);
  ctx.lineTo(w - pad, y);
  ctx.stroke();
  y += 26;
  y = wrap((card.simple || []).join(" "), pad, y, colW, "600 20px 'Source Sans 3', sans-serif", "rgba(11,14,19,0.82)", lineH);

  // Footer mark
  ctx.fillStyle = "rgba(11,14,19,0.55)";
  ctx.font = "700 14px 'IBM Plex Mono', monospace";
  ctx.fillText("feymantec.com  •  teach it back in 60s", pad, 830);

  return canvas;
}

async function downloadPngFromCard(card) {
  const canvas = drawCardToCanvas(card);
  const a = document.createElement("a");
  a.download = `${(card.concept || "feynman-card").replace(/[^\w]+/g, "-").slice(0, 40)}.png`;
  a.href = canvas.toDataURL("image/png");
  a.click();
}

function initDemo(daily) {
  const conceptEl = qs("#concept");
  const explainEl = qs("#explain");
  const genBtn = qs("#genCard");
  const fillDaily = qs("#fillDaily");

  function setConcept(v, options = {}) {
    if (!conceptEl) return;
    const { readyForUse = false } = options;
    conceptEl.value = v;
    if (readyForUse && explainEl) {
      explainEl.focus();
      // Place cursor at the end so users can start typing immediately.
      const end = explainEl.value.length;
      explainEl.setSelectionRange(end, end);
      return;
    }
    conceptEl.focus();
  }
  setConceptSuggestions(setConcept);

  if (fillDaily) fillDaily.addEventListener("click", () => setConcept(daily.getDaily(), { readyForUse: true }));

  try {
    const fromHero = safeTrim(sessionStorage.getItem("feym_demo_concept") || "");
    if (fromHero) {
      sessionStorage.removeItem("feym_demo_concept");
      setConcept(fromHero, { readyForUse: true });
    }
  } catch {
    // ignore
  }

  if (explainEl) explainEl.addEventListener("input", updateExplainMeta);
  updateExplainMeta();

  let lastCard = null;

  function makeCard() {
    const concept = safeTrim(conceptEl?.value || "");
    const v1 = safeTrim(explainEl?.value || "");

    if (!concept) throw new Error("Add a concept first.");
    if (!v1) throw new Error("Add your explanation (v1) first.");
    if (isLikelyNSFW(`${concept} ${v1}`)) throw new Error("NSFW topics are not supported.");
    if (wordCount(v1) < 12) throw new Error("Write at least a few sentences so the coach can find gaps.");

    const card = buildPreviewCard(concept, v1);
    lastCard = card;
    renderCard(card);

    const href = buildShareHref(card);
    const shareA = qs("#shareLink");
    if (shareA) shareA.href = href;
    qs("#copyShare")?.setAttribute("data-share-href", new URL(href, window.location.href).toString());
  }

  function renderAiCoachResult(aiResult) {
    const out = qs("#cardBody");
    if (!out || !aiResult) return;

    const resultText = safeTrim(aiResult.resultText || "");
    const suggestions = Array.isArray(aiResult.suggestions) ? aiResult.suggestions.map((s) => safeTrim(String(s))).filter(Boolean) : [];
    const scoreNum = Number(aiResult.score);
    const hasScore = Number.isFinite(scoreNum);

    if (!resultText && suggestions.length === 0) return;

    const scoreHint = hasScore
      ? `<p class="block__p"><span class="muted">AI clarity score:</span> ${Math.max(0, Math.min(100, Math.round(scoreNum)))}</p>`
      : "";
    const suggestionsHtml = suggestions.length
      ? `<ol class="block__list">${suggestions.map((s) => `<li>${escapeHtml(s)}</li>`).join("")}</ol>`
      : "";

    out.insertAdjacentHTML(
      "beforeend",
      `
      <div class="block">
        <p class="block__t">AI Coach (OpenAI)</p>
        <p class="block__p">${escapeHtml(resultText) || "<span class='muted'>No coach text returned.</span>"}</p>
        ${scoreHint}
        ${suggestionsHtml}
      </div>
      `
    );

    if (hasScore) {
      const scoreEl = qs("#clarityScore");
      if (scoreEl) scoreEl.textContent = String(Math.max(0, Math.min(100, Math.round(scoreNum))));
    }
  }

  async function runAiCoach({ concept, v1 }) {
    const client = getAiClient();
    if (!client) return null;
    return await client.explain({
      topic: concept,
      inputText: v1,
      mode: "daily5",
    });
  }

  if (genBtn) {
    genBtn.addEventListener("click", async () => {
      const originalLabel = genBtn.textContent;
      genBtn.disabled = true;
      genBtn.textContent = "Generating…";
      try {
        makeCard();
        const concept = safeTrim(conceptEl?.value || "");
        const v1 = safeTrim(explainEl?.value || "");
        try {
          const aiResult = await runAiCoach({ concept, v1 });
          renderAiCoachResult(aiResult);
        } catch {
          // Keep local card output if AI call fails.
        }
      } catch (e) {
        qs("#cardTitle").textContent = "Fix one thing";
        qs("#clarityScore").textContent = "—";
        qs("#cardBody").innerHTML = `<p class="muted">${escapeHtml(e?.message || "Couldn’t generate a card.")}</p>`;
        qs("#cardFoot").hidden = true;
      } finally {
        genBtn.disabled = false;
        genBtn.textContent = originalLabel || "Generate card";
      }
    });
  }

  const copyShare = qs("#copyShare");
  if (copyShare) {
    copyShare.addEventListener("click", async () => {
      const href = copyShare.getAttribute("data-share-href") || "";
      if (!href) return;
      const ok = await copyText(href);
      copyShare.textContent = ok ? "Copied" : "Copy failed";
      window.setTimeout(() => (copyShare.textContent = "Copy share link"), 1200);
    });
  }

  const dl = qs("#downloadPng");
  if (dl) {
    dl.addEventListener("click", async () => {
      if (!lastCard) return;
      dl.textContent = "Rendering…";
      try {
        await downloadPngFromCard(lastCard);
      } finally {
        dl.textContent = "Download PNG";
      }
    });
  }
}

function getConfig() {
  const cfg = window.__FEYNMAN_CONFIG__ || {};
  return {
    supabaseUrl: safeTrim(cfg.supabaseUrl),
    supabaseAnonKey: safeTrim(cfg.supabaseAnonKey),
    aiFunctionName: safeTrim(cfg.aiFunctionName || "ai-explain"),
    waitlistTable: safeTrim(cfg.waitlistTable || "waitlist_signups"),
    siteUrl: safeTrim(cfg.siteUrl) || safeTrim(window.location.origin),
  };
}

function getAiClient() {
  if (!AI) return null;
  const cfg = getConfig();
  if (!cfg.supabaseUrl || !cfg.supabaseAnonKey) return null;
  return AI.createAiClient({
    supabaseUrl: cfg.supabaseUrl,
    anonKey: cfg.supabaseAnonKey,
    functionName: cfg.aiFunctionName || "ai-explain",
    fetchFn: fetch,
  });
}

async function supabaseInsertWaitlist({ email, refCode, referredBy, utm }) {
  const cfg = getConfig();
  if (!cfg.supabaseUrl || !cfg.supabaseAnonKey) {
    throw new Error("Supabase is not configured (see config.js and README.md).");
  }

  const url = `${cfg.supabaseUrl}/rest/v1/${encodeURIComponent(cfg.waitlistTable)}`;
  const body = {
    email,
    ref_code: refCode,
    referred_by: referredBy || null,
    utm_source: utm.utm_source || null,
    utm_medium: utm.utm_medium || null,
    utm_campaign: utm.utm_campaign || null,
    utm_term: utm.utm_term || null,
    utm_content: utm.utm_content || null,
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      apikey: cfg.supabaseAnonKey,
      Authorization: `Bearer ${cfg.supabaseAnonKey}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    let j = null;
    try {
      j = txt ? JSON.parse(txt) : null;
    } catch {
      // ignore
    }
    const msg = safeTrim(String(j?.message || j?.details || j?.hint || txt));
    const err = new Error(`Supabase insert failed (${res.status}). ${msg || "Unknown error."}`.slice(0, 240));
    err.status = res.status;
    err.body = txt;
    err.json = j;
    throw err;
  }

  return true;
}

function initWaitlist() {
  const form = qs("#waitlistForm");
  if (!form) return;

  const cfg = getConfig();
  const params = getParams();
  let storedRef = "";
  try {
    storedRef = safeTrim(localStorage.getItem("feym_ref") || "");
  } catch {
    // Private browsing - ignore
  }
  const urlRef = safeTrim(params.ref || "");
  const referredBy = urlRef || storedRef;
  if (urlRef) {
    try {
      localStorage.setItem("feym_ref", urlRef);
    } catch {
      // Private browsing - ignore
    }
  }

  const submit = qs("#waitlistSubmit");
  const result = qs("#waitlistResult");
  const errBox = qs("#waitlistErr");
  const errMsg = qs("#waitlistErrMsg");
  const refLink = qs("#refLink");

  function showErr(message) {
    if (errBox) errBox.hidden = false;
    if (result) result.hidden = true;
    if (errMsg) errMsg.textContent = message;
  }

  function showOk(link) {
    if (errBox) errBox.hidden = true;
    if (result) result.hidden = false;
    if (refLink) refLink.value = link;

    qs("#shareX")?.setAttribute(
      "href",
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(
        `I’m on the Feymantec waitlist. Join me: ${link}`
      )}`
    );
  }

  qs("#copyRef")?.addEventListener("click", async () => {
    const link = refLink?.value || "";
    if (!link) return;
    const ok = await copyText(link);
    qs("#copyRef").textContent = ok ? "Copied" : "Copy failed";
    window.setTimeout(() => (qs("#copyRef").textContent = "Copy"), 1200);
  });

  qs("#shareText")?.addEventListener("click", async () => {
    const link = refLink?.value || "";
    if (!link) return;
    const text = `Join my Feymantec waitlist link: ${link}`;
    const ok = await copyText(text);
    qs("#shareText").textContent = ok ? "Copied" : "Copy failed";
    window.setTimeout(() => (qs("#shareText").textContent = "Copy text"), 1200);
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (submit) {
      submit.disabled = true;
      submit.textContent = "Adding…";
    }

    let email = "";
    try {
      const fd = new FormData(form);
      email = safeTrim(String(fd.get("email") || "")).toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Please use a valid email.");
      if (isLikelyNSFW(email)) throw new Error("Please use a normal email address.");

      // Generate client-side ref code so we don't need SELECT/RETURN privileges.
      const refCode = randomId(8);

      const params = getParams();
      const utm = {
        utm_source: params.utm_source || "",
        utm_medium: params.utm_medium || "",
        utm_campaign: params.utm_campaign || "",
        utm_term: params.utm_term || "",
        utm_content: params.utm_content || "",
      };

      // Retry on rare ref_code collisions (unique constraint).
      let ok = false;
      let attempts = 0;
      let code = refCode;
      while (!ok && attempts < 3) {
        attempts++;
        try {
          await supabaseInsertWaitlist({ email, refCode: code, referredBy, utm });
          ok = true;
        } catch (err) {
          if (err?.status === 409) {
            const body = String(err?.body || "");
            if (/waitlist_signups_ref_code_uq|ref_code/i.test(body)) {
              code = randomId(10);
              continue;
            }
            if (/waitlist_signups_email_uq|email/i.test(body)) {
              throw new Error("Looks like you're already on the waitlist.");
            }
            code = randomId(10);
            continue;
          }
          throw err;
        }
      }
      if (!ok) throw new Error("Could not generate a unique referral code. Try again.");

      try {
        localStorage.setItem("feym_waitlist_ref", code);
        localStorage.setItem("feym_waitlist_email", email);
      } catch {
        // Private browsing or storage full - continue anyway
      }

      const link = `${cfg.siteUrl.replace(/\/+$/, "")}/?ref=${encodeURIComponent(code)}`;
      showOk(link);
      form.hidden = true;
    } catch (err) {
      const msg = err?.message || "Could not add you. Try again.";
      if (msg.includes("already on the waitlist")) {
        let storedEmail = "";
        let storedCode = "";
        try {
          storedEmail = safeTrim(localStorage.getItem("feym_waitlist_email") || "").toLowerCase();
          storedCode = safeTrim(localStorage.getItem("feym_waitlist_ref") || "");
        } catch {
          // Private browsing - ignore
        }
        if (storedEmail && storedEmail === email && storedCode) {
          const link = `${cfg.siteUrl.replace(/\/+$/, "")}/?ref=${encodeURIComponent(storedCode)}`;
          showOk(link);
          form.hidden = true;
        } else {
          showErr(`${msg} If you signed up on a different device, your referral link isn’t available here.`);
        }
      } else {
        showErr(msg);
      }
    } finally {
      if (submit) {
        submit.disabled = false;
        submit.textContent = "Join waitlist";
      }
    }
  });
}

function initMobileNav() {
  const toggle = qs("#navToggle");
  const mobileNav = qs("#navMobile");
  if (!toggle || !mobileNav) return;

  function closeNav() {
    toggle.setAttribute("aria-expanded", "false");
    mobileNav.classList.remove("is-open");
  }

  function openNav() {
    toggle.setAttribute("aria-expanded", "true");
    mobileNav.classList.add("is-open");
  }

  toggle.addEventListener("click", () => {
    const isOpen = toggle.getAttribute("aria-expanded") === "true";
    if (isOpen) {
      closeNav();
    } else {
      openNav();
    }
  });

  // Close nav when clicking a link
  qsa(".nav-mobile__link").forEach((link) => {
    link.addEventListener("click", closeNav);
  });

  // Close nav on escape key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && mobileNav.classList.contains("is-open")) {
      closeNav();
      toggle.focus();
    }
  });

  // Close nav when clicking outside
  document.addEventListener("click", (e) => {
    if (
      mobileNav.classList.contains("is-open") &&
      !mobileNav.contains(e.target) &&
      !toggle.contains(e.target)
    ) {
      closeNav();
    }
  });
}

function initSmoothScroll() {
  qsa('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const href = a.getAttribute("href") || "";
      if (href.length < 2) return;
      const target = qs(href);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      history.replaceState(null, "", href);
    });
  });
}

function initYear() {
  const y = qs("#year");
  if (y) y.textContent = String(new Date().getFullYear());
}

window.addEventListener("scroll", setTopbarElevate, { passive: true });
setTopbarElevate();

window.addEventListener("DOMContentLoaded", () => {
  initMobileNav();
  initSmoothScroll();
  initYear();
  const daily = initDaily5();
  initDemo(daily);
  initWaitlist();
});
