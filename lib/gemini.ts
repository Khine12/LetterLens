/** Minimal Gemini REST client (no SDK needed). Server-side only. */

export const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

export function hasKey() {
  return Boolean(process.env.GEMINI_API_KEY);
}

type Part = { text: string } | { inline_data: { mime_type: string; data: string } };
export type Content = { role: "user" | "model"; parts: Part[] };

export async function generate(opts: {
  system: string;
  contents: Content[];
  json?: boolean;
  temperature?: number;
}): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not set");

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: opts.system }] },
        contents: opts.contents,
        generationConfig: {
          temperature: opts.temperature ?? 0.3,
          ...(opts.json ? { responseMimeType: "application/json" } : {}),
        },
      }),
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini error ${res.status}: ${errText.slice(0, 300)}`);
  }

  const data = await res.json();
  const text: string =
    data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || "").join("") || "";
  if (!text) {
    const reason = data?.candidates?.[0]?.finishReason || data?.promptFeedback?.blockReason || "empty response";
    throw new Error(`Gemini returned no text (${reason})`);
  }
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
