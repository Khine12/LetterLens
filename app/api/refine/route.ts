import { NextResponse } from "next/server";
import { generate, hasKey, parseJson } from "@/lib/gemini";
import { buildRefinePrompt, SYSTEM_PERSONA } from "@/lib/prompts";
import { polishTranslation } from "@/lib/polish";
import { friendlyError } from "@/lib/errors";
import type { ChatTurn, DecodeResult, RefineMode } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const MODES: RefineMode[] = ["simpler", "formal_reply", "friendly_reply", "ask"];

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const mode: RefineMode = MODES.includes(body.mode) ? body.mode : "ask";
    const result: DecodeResult = body.result;
    const letterText: string = (body.text || "").slice(0, 12000);
    const language: string = body.language || "English";
    const question: string = (body.question || "").slice(0, 1000);
    const history: ChatTurn[] = Array.isArray(body.history) ? body.history : [];

    if (!result) return NextResponse.json({ error: "Decode a letter first." }, { status: 400 });
    if (mode === "ask" && !question.trim()) {
      return NextResponse.json({ error: "Type a question first." }, { status: 400 });
    }

    if (!hasKey()) {
      return NextResponse.json(demoRefine(mode, result));
    }

    const { prompt, json } = buildRefinePrompt({ mode, letterText, result, language, question, history });
    const raw = await generate({
      system: SYSTEM_PERSONA,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      json,
      temperature: mode === "ask" ? 0.4 : 0.3,
    });

    if (mode === "ask") return NextResponse.json({ answer: raw.trim() });
    const patch = parseJson<Partial<DecodeResult>>(raw);
    if (mode === "simpler" && patch.summary_translated) {
      // run the native-speaker editor on the simpler translation too
      const polished = await polishTranslation({ ...result, ...patch } as DecodeResult, language);
      if (polished) Object.assign(patch, polished);
    }
    return NextResponse.json({ patch });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: friendlyError(err) }, { status: 500 });
  }
}

function demoRefine(mode: RefineMode, r: DecodeResult) {
  switch (mode) {
    case "simpler":
      return {
        patch: {
          summary_simple: r.summary_simple.split(". ").slice(0, 3).join(". ") + " (Demo mode: add an API key for real rewrites.)",
        },
      };
    case "formal_reply":
      return { patch: { reply_draft: `Dear Sir or Madam,\n\n${r.reply_draft}\n\nSincerely,\n[Your Name]` } };
    case "friendly_reply":
      return { patch: { reply_draft: `Hi! ${r.reply_draft}` } };
    default:
      return { answer: "Demo mode: add GEMINI_API_KEY to get real answers about your letter." };
  }
}
