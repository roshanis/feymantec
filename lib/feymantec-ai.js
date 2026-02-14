/* FeymantecAI: tiny fetch-based AI helper for static sites.
   - Browser: exposes global `FeymantecAI`
   - Node/vitest: `await import("../lib/feymantec-ai.js")`
*/

(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.FeymantecAI = factory();
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function normalizeSupabaseUrl(url) {
    return String(url || "")
      .trim()
      .replace(/\/+$/g, "");
  }

  function toErrorMessage(jsonOrText) {
    if (!jsonOrText) return "";
    if (typeof jsonOrText === "string") return jsonOrText;
    return (
      jsonOrText.message ||
      jsonOrText.error ||
      jsonOrText.details ||
      jsonOrText.hint ||
      JSON.stringify(jsonOrText)
    );
  }

  async function parseErrorBody(res) {
    try {
      const j = await res.json();
      return { json: j, text: "" };
    } catch {
      try {
        const t = await res.text();
        return { json: null, text: t };
      } catch {
        return { json: null, text: "" };
      }
    }
  }

  async function toApiError(res) {
    const { json, text } = await parseErrorBody(res);
    const msg = toErrorMessage(json) || String(text || "");
    const err = new Error(`AI request failed (${res.status}). ${msg}`.slice(0, 280));
    err.status = res.status;
    err.json = json;
    err.body = text;
    return err;
  }

  function createAiClient(opts) {
    const supabaseUrl = normalizeSupabaseUrl(opts?.supabaseUrl);
    const anonKey = String(opts?.anonKey || "").trim();
    const functionName = String(opts?.functionName || "ai-explain")
      .trim()
      .replace(/^\/+|\/+$/g, "");
    const fetchFn = opts?.fetchFn || (typeof fetch !== "undefined" ? fetch : null);

    if (!supabaseUrl) throw new Error("Missing supabaseUrl");
    if (!anonKey) throw new Error("Missing anonKey");
    if (!fetchFn) throw new Error("Missing fetch implementation");
    if (!functionName) throw new Error("Missing functionName");

    const endpoint = `${supabaseUrl}/functions/v1/${encodeURIComponent(functionName)}`;

    return {
      endpoint,
      async explain({ inputText, topic = "", mode = "simplify", conversation = [] } = {}) {
        const res = await fetchFn(endpoint, {
          method: "POST",
          headers: {
            apikey: anonKey,
            Authorization: `Bearer ${anonKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            inputText: String(inputText || ""),
            topic: String(topic || ""),
            mode: String(mode || "simplify"),
            conversation: Array.isArray(conversation) ? conversation : [],
          }),
        });

        if (!res.ok) throw await toApiError(res);
        return await res.json();
      },
    };
  }

  return {
    normalizeSupabaseUrl,
    createAiClient,
  };
});
