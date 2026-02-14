/* FeymantecSupabase: tiny fetch-based Supabase helper for static sites.
   - Browser: exposes global `FeymantecSupabase`
   - Node/vitest: `await import("../lib/feymantec-supabase.js")`
*/

(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.FeymantecSupabase = factory();
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
      jsonOrText.msg ||
      jsonOrText.error_description ||
      jsonOrText.error ||
      jsonOrText.details ||
      jsonOrText.hint ||
      JSON.stringify(jsonOrText)
    );
  }

  async function parseErrorBody(res) {
    // Prefer JSON when available; fall back to plain text.
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

  async function toSupabaseError(res) {
    const { json, text } = await parseErrorBody(res);
    const msg = toErrorMessage(json) || String(text || "");
    const err = new Error(`Supabase request failed (${res.status}). ${msg}`.slice(0, 280));
    err.status = res.status;
    err.json = json;
    err.body = text;
    return err;
  }

  function createSupabaseClient(opts) {
    const supabaseUrl = normalizeSupabaseUrl(opts?.supabaseUrl);
    const anonKey = String(opts?.anonKey || "").trim();
    const fetchFn = opts?.fetchFn || (typeof fetch !== "undefined" ? fetch : null);

    if (!supabaseUrl) throw new Error("Missing supabaseUrl");
    if (!anonKey) throw new Error("Missing anonKey");
    if (!fetchFn) throw new Error("Missing fetch implementation");

    function authHeaders(token) {
      return {
        apikey: anonKey,
        Authorization: `Bearer ${token}`,
      };
    }

    return {
      normalizeSupabaseUrl,

      async sendEmailOtp({ email, createUser = true, captchaToken = null } = {}) {
        const res = await fetchFn(`${supabaseUrl}/auth/v1/otp`, {
          method: "POST",
          headers: {
            ...authHeaders(anonKey),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            create_user: !!createUser,
            gotrue_meta_security: captchaToken ? { captcha_token: captchaToken } : undefined,
          }),
        });

        if (!res.ok) throw await toSupabaseError(res);
        return true;
      },

      async verifyEmailOtp({ email, token, type = "email" } = {}) {
        const res = await fetchFn(`${supabaseUrl}/auth/v1/verify`, {
          method: "POST",
          headers: {
            ...authHeaders(anonKey),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            type,
            email,
            token,
          }),
        });

        if (!res.ok) throw await toSupabaseError(res);
        return await res.json();
      },

      async insertRow({ accessToken, table, row, prefer = "return=minimal" } = {}) {
        const res = await fetchFn(`${supabaseUrl}/rest/v1/${encodeURIComponent(table)}`, {
          method: "POST",
          headers: {
            ...authHeaders(accessToken),
            "Content-Type": "application/json",
            Prefer: prefer,
          },
          body: JSON.stringify(row),
        });

        if (!res.ok) throw await toSupabaseError(res);
        return true;
      },

      async selectFirst({ accessToken, table, select = "*", filters = [], limit = 1 } = {}) {
        const params = new URLSearchParams();
        params.set("select", String(select || "*"));
        params.set("limit", String(limit || 1));

        for (const f of filters || []) {
          if (!f?.col || !f?.op) continue;
          params.append(String(f.col), `${String(f.op)}.${String(f.value ?? "")}`);
        }

        const url = `${supabaseUrl}/rest/v1/${encodeURIComponent(table)}?${params.toString()}`;
        const res = await fetchFn(url, {
          method: "GET",
          headers: {
            ...authHeaders(accessToken),
            Accept: "application/json",
          },
        });

        if (!res.ok) throw await toSupabaseError(res);
        const rows = await res.json();
        if (!Array.isArray(rows) || rows.length === 0) return null;
        return rows[0];
      },
    };
  }

  return {
    normalizeSupabaseUrl,
    createSupabaseClient,
  };
});

