const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const DEFAULT_MODEL = "gpt-5.2";

type ExplainMode = "simplify" | "critique" | "daily5" | "intro" | "feynman";

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
  if (mode === "critique" || mode === "daily5" || mode === "intro" || mode === "feynman") return mode;
  return "simplify";
}

function isLikelyNSFW(text: string): boolean {
  return /\b(porn|xxx|nude|nudes|onlyfans|hardcore|hentai|blowjob|sex\s+tape)\b/i.test(text);
}

// In-memory per-IP rate limiter. Resets on function cold start, which is
// acceptable for Deno edge functions (short-lived isolates).
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 30; // requests per window
const RATE_WINDOW_MS = 60_000; // 1 minute

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  entry.count++;
  return entry.count <= RATE_LIMIT;
}

function buildTaskInstruction(mode: ExplainMode): string {
  if (mode === "intro") {
    return "Give a 2-3 paragraph beginner-friendly introduction to the topic. Cover what it is, why it matters, and one concrete example. Use language a smart 12-year-old could follow. Do NOT explain everything — leave gaps for the learner to discover when they try to teach it back. Keep resultText under 200 words.";
  }
  if (mode === "critique") {
    return "You are reviewing a learner's explanation of a topic using the Feynman technique. In resultText: (1) State what they got right in 1 sentence. (2) Identify the biggest gap or misconception — explain what's missing and WHY it matters, in 2-3 sentences a beginner would understand. (3) Give a short, improved version of their explanation (3-5 sentences max). In suggestions: list 2-4 specific, actionable next steps the learner should try (e.g. 'Explain what happens when X fails' not 'Add more detail'). Score 0-100 based on clarity, accuracy, and completeness for a beginner audience. Keep resultText under 250 words.";
  }
  if (mode === "daily5") {
    return "Act like a 5-minute Feynman coach. Give a concise rewrite, 2 gap questions, and one memory-friendly analogy.";
  }
  if (mode === "feynman") {
    return "You are Richard Feynman. The user has tried to explain a topic and you are now explaining it the way YOU would — from first principles, in your own voice. Write in resultText as Feynman speaking directly to the learner: warm, curious, conversational. Start from the simplest possible foundation and build up. Use vivid everyday analogies. If something is subtle or commonly misunderstood, pause and say 'Now here's the thing most people get wrong...' or 'Let me show you why that matters.' Never use jargon without immediately unpacking it. Make the learner feel the joy of understanding. Keep it under 300 words. In suggestions, list 1-2 follow-up questions Feynman would challenge the learner with.";
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

  // Rate limit by IP
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!checkRateLimit(ip)) {
    return jsonResponse({ error: "Too many requests. Please wait a moment." }, 429);
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

  // Server-side NSFW check (mirrors client-side TopicPolicy.isLikelyNSFW)
  if (isLikelyNSFW(inputText) || isLikelyNSFW(topic)) {
    return jsonResponse({ error: "That topic isn't allowed." }, 400);
  }

  const prompt = {
    topic,
    inputText,
    mode,
    task: buildTaskInstruction(mode),
    conversation: conversation
      .slice(-6)
      .map((turn) => ({ role: String(turn?.role || ""), content: String(turn?.content || "") })),
  };

  let openAiRes: Response;
  try {
    openAiRes = await fetch(OPENAI_URL, {
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
  } catch (err) {
    return jsonResponse(
      {
        error: "OpenAI request failed.",
        providerStatus: null,
        providerError: String(err),
      },
      502
    );
  }

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
