/* global window, document */

function qs(sel, el = document) {
  return el.querySelector(sel);
}

function safeTrim(s) {
  return (s || "").replace(/\s+/g, " ").trim();
}

function escapeHtml(s) {
  return (s || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function fromBase64Url(b64url) {
  const b64 = (b64url || "").replaceAll("-", "+").replaceAll("_", "/");
  const padded = b64 + "===".slice((b64.length + 3) % 4);
  const bin = atob(padded);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const json = new TextDecoder().decode(bytes);
  return JSON.parse(json);
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
  const h = 860;
  const pad = 64;
  const lineH = 44;
  const smallH = 34;

  canvas.width = w * scale;
  canvas.height = h * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.scale(scale, scale);

  ctx.fillStyle = "#fbf5e6";
  ctx.fillRect(0, 0, w, h);

  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, "rgba(0,203,184,0.12)");
  g.addColorStop(0.55, "rgba(255,227,90,0.14)");
  g.addColorStop(1, "rgba(255,77,115,0.10)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = "rgba(11,14,19,0.06)";
  ctx.lineWidth = 1;
  for (let y = 0; y < h; y += 24) {
    ctx.beginPath();
    ctx.moveTo(0, y + 1);
    ctx.lineTo(w, y + 1);
    ctx.stroke();
  }

  // Title
  ctx.fillStyle = "rgba(11,14,19,0.88)";
  ctx.font = "800 44px 'Fraunces', serif";
  ctx.fillText(card.concept || "Feynman Card", pad, 112);

  // Score highlight
  const score = String(card.score ?? "—");
  ctx.font = "700 20px 'IBM Plex Mono', monospace";
  const scoreText = `CLARITY ${score}`;
  const tw = ctx.measureText(scoreText).width;
  ctx.fillStyle = "rgba(255,227,90,0.75)";
  ctx.fillRect(w - pad - tw - 22, 78, tw + 22, 40);
  ctx.fillStyle = "rgba(11,14,19,0.9)";
  ctx.fillText(scoreText, w - pad - tw - 11, 106);

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

  ctx.fillStyle = "rgba(11,14,19,0.55)";
  ctx.font = "700 14px 'IBM Plex Mono', monospace";
  ctx.fillText("Feymantec  •  teach it back in 60s", pad, 830);

  return canvas;
}

function renderShare(card) {
  qs("#shareTitle").textContent = card.concept || "Untitled";
  qs("#shareScore").textContent = String(card.score ?? "—");

  const blocks = [];
  blocks.push(`
    <div class="block">
      <p class="block__t">Gaps</p>
      <ol class="block__list">
        ${(card.gaps || []).slice(0, 4).map((g) => `<li>${escapeHtml(g)}</li>`).join("")}
      </ol>
    </div>
  `);

  blocks.push(`
    <div class="block">
      <p class="block__t">Analogy</p>
      <p class="block__p">${escapeHtml(card.analogy || "")}</p>
    </div>
  `);

  blocks.push(`
    <div class="block">
      <p class="block__t">Simpler Version (Preview)</p>
      <p class="block__p">${escapeHtml((card.simple || []).join(" "))}</p>
    </div>
  `);

  blocks.push(`
    <div class="block">
      <p class="block__t">Quick Check</p>
      <ol class="block__list">
        ${(card.quiz || [])
          .slice(0, 2)
          .map((q) => `<li><strong>${escapeHtml(q.q || "")}</strong><br/><span class="muted">Answer:</span> ${escapeHtml(q.a || "")}</li>`)
          .join("")}
      </ol>
    </div>
  `);

  qs("#shareBody").innerHTML = blocks.join("");
}

function getCardFromHash() {
  const hash = window.location.hash || "";
  const m = hash.match(/card=([A-Za-z0-9_-]+)/);
  if (!m) return null;
  return fromBase64Url(m[1]);
}

window.addEventListener("DOMContentLoaded", () => {
  const card = getCardFromHash();
  if (!card) return;
  renderShare(card);

  qs("#copyLink")?.addEventListener("click", async () => {
    const ok = await copyText(window.location.href);
    qs("#copyLink").textContent = ok ? "Copied" : "Copy failed";
    window.setTimeout(() => (qs("#copyLink").textContent = "Copy link"), 1200);
  });

  qs("#dlPng")?.addEventListener("click", async () => {
    qs("#dlPng").textContent = "Rendering…";
    try {
      const canvas = drawCardToCanvas(card);
      const a = document.createElement("a");
      a.download = `${(card.concept || "feynman-card").replace(/[^\w]+/g, "-").slice(0, 40)}.png`;
      a.href = canvas.toDataURL("image/png");
      a.click();
    } finally {
      qs("#dlPng").textContent = "Download PNG";
    }
  });
});

