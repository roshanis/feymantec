import { describe, it, expect } from "vitest";

const AI = await import("../lib/feymantec-ai.js").then((m) => m.default || m);

describe("createAiClient", () => {
  it("calls Supabase Edge Function with anon auth headers", async () => {
    const calls = [];
    const fetchFn = async (url, opts) => {
      calls.push({ url, opts });
      return {
        ok: true,
        status: 200,
        json: async () => ({ resultText: "ok", suggestions: [], score: 80 }),
      };
    };

    const client = AI.createAiClient({
      supabaseUrl: "https://x.supabase.co",
      anonKey: "anon",
      fetchFn,
    });

    const out = await client.explain({
      inputText: "Bayes theorem updates beliefs using new evidence.",
      topic: "Bayes theorem",
      mode: "simplify",
    });

    expect(out.resultText).toBe("ok");
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe("https://x.supabase.co/functions/v1/ai-explain");
    expect(calls[0].opts.method).toBe("POST");
    expect(calls[0].opts.headers.apikey).toBe("anon");
    expect(calls[0].opts.headers.Authorization).toBe("Bearer anon");

    const body = JSON.parse(calls[0].opts.body);
    expect(body.inputText).toContain("Bayes theorem");
    expect(body.topic).toBe("Bayes theorem");
    expect(body.mode).toBe("simplify");
  });

  it("supports custom function name", async () => {
    const fetchFn = async (url) => {
      expect(url).toBe("https://x.supabase.co/functions/v1/coach");
      return {
        ok: true,
        status: 200,
        json: async () => ({ resultText: "ok" }),
      };
    };

    const client = AI.createAiClient({
      supabaseUrl: "https://x.supabase.co",
      anonKey: "anon",
      functionName: "coach",
      fetchFn,
    });

    await client.explain({ inputText: "hello" });
  });
});
