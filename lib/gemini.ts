/**
 * LLM client (server-side only). Uses Gemini if GEMINI_API_KEY is set,
 * otherwise OpenAI if OPENAI_API_KEY is set, otherwise the app runs in demo mode.
 * Both are called over REST, no SDK needed.
 */

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-5-mini";

export const PROVIDER: "gemini" | "openai" | "none" = process.env.GEMINI_API_KEY
  ? "gemini"
  : process.env.OPENAI_API_KEY
    ? "openai"
    : "none";

export const MODEL = PROVIDER === "openai" ? OPENAI_MODEL : GEMINI_MODEL;

export function hasKey() {
  return PROVIDER !== "none";
}

/** Retry once on rate-limit / overload errors, so one hiccup doesn't break a live demo. */
async function fetchWithRetry(url: string, init: RequestInit): Promise<Response> {
  const res = await fetch(url, init);
  if (![429, 500, 503].includes(res.status)) return res;
  await new Promise((r) => setTimeout(r, 2000));
  return fetch(url, init);
}

type Part = { text: string } | { inline_data: { mime_type: string; data: string } };
export type Content = { role: "user" | "model"; parts: Part[] };

type GenerateOpts = {
  system: string;
  contents: Content[];
  json?: boolean;
  temperature?: number;
  /** give up after this long so the UI never hangs (default 50s, under the 60s route limit) */
  timeoutMs?: number;
};

export async function generate(opts: GenerateOpts): Promise<string> {
  if (PROVIDER === "gemini") return generateGemini(opts);
  if (PROVIDER === "openai") return generateOpenAI(opts);
  throw new Error("No API key set (GEMINI_API_KEY or OPENAI_API_KEY)");
}

async function generateGemini(opts: GenerateOpts) {
  const res = await fetchWithRetry(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
    {
      method: "POST",
      signal: AbortSignal.timeout(opts.timeoutMs ?? 50_000),
      headers: { "Content-Type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY! },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: opts.system }] },
        contents: opts.contents,
        generationConfig: {
          temperature: opts.temperature ?? 0.3,
          ...(opts.json ? { responseMimeType: "application/json" } : {}),
          // Gemini 3 models think a lot by default, which makes calls slow. Reading a letter doesn't need deep thinking.
          ...(GEMINI_MODEL.startsWith("gemini-3") ? { thinkingConfig: { thinkingLevel: "low" } } : {}),
        },
      }),
    }
  );
  if (!res.ok) throw new Error(`Gemini error ${res.status}: ${(await res.text()).slice(0, 300)}`);

  const data = await res.json();
  const text: string =
    data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || "").join("") || "";
  if (!text) {
    const reason = data?.candidates?.[0]?.finishReason || data?.promptFeedback?.blockReason || "empty response";
    throw new Error(`Gemini returned no text (${reason})`);
  }
  return text;
}

async function generateOpenAI(opts: GenerateOpts) {
  // Convert Gemini-style turns to OpenAI chat messages (same prompts, same few-shot turns).
  const messages = [
    { role: "system", content: opts.system },
    ...opts.contents.map((c) => ({
      role: c.role === "model" ? "assistant" : "user",
      content: c.parts.map((p) => {
        if ("text" in p) return { type: "text", text: p.text };
        const { mime_type, data } = p.inline_data;
        return mime_type === "application/pdf"
          ? { type: "file", file: { filename: "letter.pdf", file_data: `data:${mime_type};base64,${data}` } }
          : { type: "image_url", image_url: { url: `data:${mime_type};base64,${data}` } };
      }),
    })),
  ];

  const res = await fetchWithRetry("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    signal: AbortSignal.timeout(opts.timeoutMs ?? 50_000),
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages,
      // temperature is omitted on purpose: newer OpenAI models only accept the default
      ...(opts.json ? { response_format: { type: "json_object" } } : {}),
    }),
  });
  if (!res.ok) throw new Error(`OpenAI error ${res.status}: ${(await res.text()).slice(0, 300)}`);

  const data = await res.json();
  const text: string = data?.choices?.[0]?.message?.content || "";
  if (!text) throw new Error(`OpenAI returned no text (${data?.choices?.[0]?.finish_reason || "empty response"})`);
  return text;
}

/** Parse JSON even if the model wraps it in ```json fences or adds stray text. */
export function parseJson<T>(raw: string): T {
  const cleaned = raw.replace(/```json|```/g, "").trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1)) as T;
    throw new Error("Could not parse AI response as JSON");
  }
}
