/**
 * Pattern 7: Self-Refine / Reflection — a second "native-speaker editor" pass.
 *
 * The first call writes the whole decoded result. This second call takes ONLY the
 * translated fields and rewrites them so they sound like a real person wrote them,
 * not a machine. Facts are locked: the English versions are sent as the source of truth.
 * If this pass fails for any reason, the original translation is kept.
 */
import { generate, parseJson } from "./gemini";
import { languageRules } from "./prompts";
import type { DecodeResult } from "./types";

const EDITOR_PERSONA = `You are a native-speaker editor and community interpreter. You grew up speaking the TARGET LANGUAGE at home and you edit translations for immigrant community newsletters.
Your only job: make translated text sound like a warm, real person wrote it for a friend, not like machine translation.`;

type Translated = Pick<DecodeResult, "summary_translated" | "action_steps_translated">;

export async function polishTranslation(result: DecodeResult, language: string): Promise<Translated | null> {
  if (language.startsWith("English") || !result.summary_translated) return null;

  const prompt = `TARGET LANGUAGE: ${language}

ENGLISH SOURCE (facts are correct — do not change any meaning):
summary: ${result.summary_simple}
steps:
${result.action_steps.map((s, i) => `${i + 1}. ${s.step} — ${s.how}`).join("\n")}

CURRENT TRANSLATION (sounds too robotic — please rewrite):
${JSON.stringify({ summary_translated: result.summary_translated, action_steps_translated: result.action_steps_translated })}

${languageRules(language)}

How to edit:
1. Read the current translation and notice what sounds machine-translated (literal word order, stiff formal words, repeated "you", passive voice, every sentence ending the same way).
2. Rewrite it the way you would actually say it to a friend or neighbor. Keep it short and warm.
3. Check: every amount, date, time, phone number, address and name is still EXACTLY the same as in the English source. Nothing added, nothing removed.

Return ONLY JSON: {"summary_translated": "...", "action_steps_translated": ["...", "..."]}
action_steps_translated must have exactly ${result.action_steps.length} items, in the same order.`;

  try {
    const raw = await generate({
      system: EDITOR_PERSONA,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      json: true,
      temperature: 0.6,
    });
    const out = parseJson<Partial<Translated>>(raw);
    const steps = Array.isArray(out.action_steps_translated) ? out.action_steps_translated : [];
    if (!out.summary_translated) return null;
    return {
      summary_translated: out.summary_translated,
      // keep the old steps if the editor returned the wrong number of items
      action_steps_translated: steps.length === result.action_steps.length ? steps : result.action_steps_translated,
    };
  } catch {
    return null; // never break the main result because of the polish step
  }
}
