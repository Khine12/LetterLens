import { NextResponse } from "next/server";
import { generate, hasKey, MODEL, parseJson, type Content } from "@/lib/gemini";
import { mockDecode } from "@/lib/mock";
import {
  buildDecodePrompt,
  DECODE_PATTERNS,
  DECODE_SYSTEM_PROMPT,
  FEW_SHOT_EXAMPLES,
  type ReadingLevel,
} from "@/lib/prompts";
import type { DecodeResult, PromptTrace } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_TEXT = 12000;
const MAX_FILE_B64 = 5_500_000; // ~4MB file

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const letterText: string = (body.text || "").slice(0, MAX_TEXT);
    const file: { data: string; mimeType: string } | null = body.file || null;
    const language: string = body.language || "English";
    const readingLevel: ReadingLevel = body.readingLevel === "standard" ? "standard" : "simple";

    if (!letterText.trim() && !file) {
      return NextResponse.json({ error: "Paste a letter or upload a photo/PDF first." }, { status: 400 });
    }
    if (file && file.data.length > MAX_FILE_B64) {
      return NextResponse.json({ error: "File is too large (max ~4 MB)." }, { status: 413 });
    }

    const userPrompt = buildDecodePrompt({ letterText, hasFile: !!file, language, readingLevel });
    const trace: PromptTrace = {
      patterns: DECODE_PATTERNS,
      systemPrompt: DECODE_SYSTEM_PROMPT,
      userPrompt,
      model: MODEL,
      demoMode: !hasKey(),
    };

    if (!hasKey()) {
      return NextResponse.json({ result: mockDecode(letterText), trace });
    }

    // Few-shot examples are sent as real prior turns, then the actual letter.
    const contents: Content[] = [];
    for (const ex of FEW_SHOT_EXAMPLES) {
      contents.push({ role: "user", parts: [{ text: ex.input }] });
      contents.push({ role: "model", parts: [{ text: ex.output }] });
    }
    const parts: Content["parts"] = [];
    if (file) parts.push({ inline_data: { mime_type: file.mimeType, data: file.data } });
    parts.push({ text: userPrompt });
    contents.push({ role: "user", parts });

    const raw = await generate({ system: DECODE_SYSTEM_PROMPT, contents, json: true, temperature: 0.2 });
    const result = normalize(parseJson<Partial<DecodeResult>>(raw));
    return NextResponse.json({ result, trace });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Something went wrong";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** Fill any missing fields so the UI never crashes on a partial model response. */
function normalize(r: Partial<DecodeResult>): DecodeResult {
  const urgency = r.urgency === "high" || r.urgency === "low" ? r.urgency : "medium";
  return {
    letter_type: r.letter_type || "Letter",
    sender: r.sender || "Not stated",
    urgency,
    urgency_reason: r.urgency_reason || "",
    summary_simple: r.summary_simple || "",
    summary_translated: r.summary_translated || "",
    deadlines: Array.isArray(r.deadlines) ? r.deadlines : [],
    money: Array.isArray(r.money) ? r.money : [],
    action_steps: Array.isArray(r.action_steps) ? r.action_steps : [],
    key_terms: Array.isArray(r.key_terms) ? r.key_terms : [],
    scam_warning: {
      is_suspicious: Boolean(r.scam_warning?.is_suspicious),
      reasons: Array.isArray(r.scam_warning?.reasons) ? r.scam_warning!.reasons : [],
    },
    reply_draft: r.reply_draft || "",
    questions_to_ask: Array.isArray(r.questions_to_ask) ? r.questions_to_ask : [],
    not_stated: Array.isArray(r.not_stated) ? r.not_stated : [],
  };
}
