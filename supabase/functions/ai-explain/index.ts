const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const DEFAULT_MODEL = "gpt-5.2";

type ExplainMode = "simplify" | "critique" | "daily5" | "intro";

type RequestPayload = {
  inputText?: string;
  topic?: string;
  mode?: string;
  conversation?: Array<{ role?: string; content?: string }>;
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/json",
    },
  });
}

function normalizeMode(raw: string): ExplainMode {
  const mode = String(raw || "").trim().toLowerCase();
  if (mode === "critique" || mode === "daily5" || mode === "intro") return mode;
  return "simplify";
}

function buildTaskInstruction(mode: ExplainMode): string {
  if (mode === "intro") {
    return "Give a 2-3 paragraph beginner-friendly introduction to the topic. Cover what it is, why it matters, and one concrete example. Use language a smart 12-year-old could follow. Do NOT explain everything — leave gaps for the learner to discover when they try to teach it back. Keep resultText under 200 words.";
  }
  if (mode === "critique") {
    return "Give focused critique: point out ambiguity, missing steps, and jargon. Then provide a cleaner rewrite.";
  }
  if (mode === "daily5") {
    return "Act like a 5-minute Feynman coach. Give a concise rewrite, 2 gap questions, and one memory-friendly analogy.";
  }
  return "Simplify the explanation for a smart 12-year-old and keep the core meaning intact.";
}

function safeParseJson(text: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed. Use POST." }, 405);
  }

  const apiKey = Deno.env.get("OPENAI_API_KEY") || "";
  const model = Deno.env.get("OPENAI_MODEL") || DEFAULT_MODEL;
  if (!apiKey) {
    return jsonResponse({ error: "Missing OPENAI_API_KEY in function secrets." }, 500);
  }

  let payload: RequestPayload;
  try {
    payload = (await req.json()) as RequestPayload;
  } catch {
    return jsonResponse({ error: "Invalid JSON body." }, 400);
  }

  const inputText = String(payload?.inputText || "").trim();
  const topic = String(payload?.topic || "").trim();
  const mode = normalizeMode(String(payload?.mode || "simplify"));
  const conversation = Array.isArray(payload?.conversation) ? payload.conversation : [];

  if (!inputText) return jsonResponse({ error: "inputText is required." }, 400);
  if (inputText.length > 6000) return jsonResponse({ error: "inputText is too long (max 6000 chars)." }, 400);

  const prompt = {
    topic,
    inputText,
    mode,
    task: buildTaskInstruction(mode),
    conversation: conversation
      .slice(-6)
      .map((turn) => ({ role: String(turn?.role || ""), content: String(turn?.content || "") })),
  };

  const openAiRes = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are Feymantec coach. Always return strict JSON with keys: resultText (string), suggestions (array of strings), score (number 0-100). Keep resultText concise.",
        },
        {
          role: "user",
          content: JSON.stringify(prompt),
        },
      ],
    }),
  });

  const openAiJson = await openAiRes.json().catch(() => null);
  if (!openAiRes.ok) {
    return jsonResponse(
      {
        error: "OpenAI request failed.",
        providerStatus: openAiRes.status,
        providerError: openAiJson,
      },
      502
    );
  }

  const content = String(openAiJson?.choices?.[0]?.message?.content || "").trim();
  const parsed = safeParseJson(content);

  if (!parsed) {
    return jsonResponse({
      resultText: content || "No result returned.",
      suggestions: [],
      score: null,
      model,
    });
  }

  const resultText = String(parsed.resultText || "").trim();
  const suggestionsRaw = Array.isArray(parsed.suggestions) ? parsed.suggestions : [];
  const suggestions = suggestionsRaw.map((s) => String(s || "").trim()).filter(Boolean);
  const scoreNum = Number(parsed.score);
  const score = Number.isFinite(scoreNum) ? Math.max(0, Math.min(100, Math.round(scoreNum))) : null;

  return jsonResponse({
    resultText: resultText || "No result returned.",
    suggestions,
    score,
    model,
  });
});
