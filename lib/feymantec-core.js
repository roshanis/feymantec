/* FeymantecCore: small, testable utilities shared by the landing + share pages.
   - Browser: exposes global `FeymantecCore`
   - Node (tests): `require("./lib/feymantec-core.js")`
*/

(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.FeymantecCore = factory();
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function clamp(n, lo, hi) {
    return Math.min(hi, Math.max(lo, n));
  }

  function safeTrim(s) {
    return (s || "").replace(/\s+/g, " ").trim();
  }

  function wordCount(s) {
    const t = safeTrim(s);
    if (!t) return 0;
    return t.split(" ").length;
  }

  function escapeHtml(s) {
    return (s || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function isLikelyNSFW(s) {
    const t = (s || "").toLowerCase();
    return /\b(porn|xxx|nude|nudes|onlyfans|hardcore|hentai|blowjob|sex tape)\b/i.test(t);
  }

  function getRandomBytes(len) {
    const bytes = new Uint8Array(len);

    // Browser + modern Node (WebCrypto)
    if (typeof crypto !== "undefined" && crypto?.getRandomValues) {
      crypto.getRandomValues(bytes);
      return bytes;
    }

    // Node fallback
    try {
      // eslint-disable-next-line global-require
      const { randomFillSync } = require("node:crypto");
      randomFillSync(bytes);
      return bytes;
    } catch {
      // Non-crypto fallback (should not happen in normal environments)
      for (let i = 0; i < len; i++) bytes[i] = Math.floor(Math.random() * 256);
      return bytes;
    }
  }

  function randomId(len = 10) {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let out = "";
    const bytes = getRandomBytes(len);
    for (let i = 0; i < len; i++) out += chars[bytes[i] % chars.length];
    return out;
  }

  function encodeJsonToBase64Url(obj) {
    const json = JSON.stringify(obj);

    // Node: Buffer path (handles UTF-8 cleanly)
    if (typeof Buffer !== "undefined" && Buffer?.from) {
      return Buffer.from(json, "utf8")
        .toString("base64")
        .replaceAll("+", "-")
        .replaceAll("/", "_")
        .replace(/=+$/g, "");
    }

    // Browser: TextEncoder + btoa path
    const bytes = new TextEncoder().encode(json);
    let bin = "";
    bytes.forEach((b) => (bin += String.fromCharCode(b)));
    return btoa(bin).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
  }

  function decodeBase64UrlToJson(b64url) {
    const b64 = (b64url || "").replaceAll("-", "+").replaceAll("_", "/");
    const padded = b64 + "===".slice((b64.length + 3) % 4);

    // Node: Buffer path
    if (typeof Buffer !== "undefined" && Buffer?.from) {
      const json = Buffer.from(padded, "base64").toString("utf8");
      return JSON.parse(json);
    }

    // Browser: atob + TextDecoder path
    const bin = atob(padded);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const json = new TextDecoder().decode(bytes);
    return JSON.parse(json);
  }

  function extractJargonWords(v1, max = 8) {
    const words = safeTrim(v1).split(" ").filter(Boolean);
    const jargon = [];
    for (const w of words) {
      const clean = w.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g, "");
      if (!clean) continue;
      if (clean.length >= 12) jargon.push(clean);
      else if (/^[A-Z]{2,}$/.test(clean)) jargon.push(clean);
      else if (/[A-Z].*[A-Z]/.test(clean)) jargon.push(clean);
    }
    return Array.from(new Set(jargon)).slice(0, max);
  }

  function buildPreviewCard(concept, v1) {
    const wc = wordCount(v1);
    const lc = safeTrim(v1).length;

    const lower = (v1 || "").toLowerCase();
    const hasExample =
      /\b(for example|e\.g\.|like|such as|imagine|say)\b/.test(lower) || /\d/.test(lower);
    const hasBecause = /\b(because|therefore|so that|which means|as a result)\b/.test(lower);
    const vague = /\b(stuff|things|basically|just|somehow|kind of|sort of)\b/.test(lower);

    const uniqJargon = extractJargonWords(v1, 8);

    let score = 86;
    score -= clamp(uniqJargon.length * 2, 0, 14);
    if (!hasExample) score -= 8;
    if (!hasBecause) score -= 4;
    if (vague) score -= 5;
    if (wc < 25) score -= 8;
    if (wc > 180) score -= 6;
    if (lc < 60) score -= 6;
    score = clamp(score, 42, 96);

    const gaps = [];
    if (uniqJargon.length) gaps.push(`Define "${uniqJargon[0]}" in one sentence, without synonyms.`);
    if (!hasExample) gaps.push("Give one concrete example with numbers or a real situation.");
    if (!hasBecause) gaps.push("Add the missing 'because': what causes what, step-by-step?");
    if (vague) gaps.push("Replace vague words (stuff/things/basically/just) with a specific mechanism.");
    while (gaps.length < 3) gaps.push("What's the smallest version of this that is still true?");
    const gapsOut = gaps.slice(0, 4);

    const simple = [
      `Here's the plain idea: ${concept} is a way to connect cause and effect in a predictable way.`,
      "Start with the pieces. Name what you're trying to predict, and what evidence you have.",
      "Then explain how the evidence changes your belief, not by vibes, but by a rule.",
      "If you can't do it with a tiny example, you don't have it yet.",
      "The goal is a sentence you could say out loud without pausing.",
    ];

    const analogy = `Think of ${concept} like a 'belief thermostat': when new evidence comes in, you turn the dial up or down by a specific amount instead of guessing.`;

    const quiz = [
      {
        q: "If your explanation has no example, what should you add first?",
        a: "A concrete situation with numbers or a specific story.",
      },
      {
        q: "What's a red flag for fake understanding?",
        a: "Using jargon to skip the steps that connect one idea to the next.",
      },
    ];

    return {
      concept,
      v1: safeTrim(v1),
      score,
      jargon: uniqJargon,
      gaps: gapsOut,
      simple,
      analogy,
      quiz,
    };
  }

  function toSharePayload(card) {
    return {
      concept: card.concept,
      score: card.score,
      v1: (card.v1 || "").slice(0, 700),
      gaps: card.gaps,
      simple: card.simple,
      analogy: card.analogy,
      quiz: card.quiz,
    };
  }

  return {
    clamp,
    safeTrim,
    wordCount,
    escapeHtml,
    isLikelyNSFW,
    randomId,
    encodeJsonToBase64Url,
    decodeBase64UrlToJson,
    extractJargonWords,
    buildPreviewCard,
    toSharePayload,
  };
});

