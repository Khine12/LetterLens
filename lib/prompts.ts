/**
 * All prompt engineering for LetterLens lives in this file.
 *
 * Patterns used (see README "Prompt Engineering" section):
 *  1. Persona                 — SYSTEM_PERSONA
 *  2. Audience Persona        — reader profile + reading level in buildDecodePrompt
 *  3. Few-Shot                — FEW_SHOT_EXAMPLES sent as prior user/model turns
 *  4. Template (structured output) — OUTPUT_TEMPLATE JSON schema
 *  5. Fact Check List / grounding  — every date & amount must carry a source_quote,
 *                                    unknowns go to "not_stated" instead of guessed
 *  6. Iterative Refinement    — buildRefinePrompt (Simpler / Formal / Friendly / Ask)
 */

import type { ChatTurn, DecodeResult, RefineMode } from "./types";

export const LANGUAGES = [
  "English",
  "Burmese (မြန်မာ)",
  "Spanish (Español)",
  "Chinese (中文)",
  "Vietnamese (Tiếng Việt)",
  "Korean (한국어)",
  "Tagalog",
  "Arabic (العربية)",
] as const;

export const READING_LEVELS = {
  simple: "about a 5th-grade reading level, very short sentences, no jargon",
  standard: "about an 8th-grade reading level, clear and direct",
} as const;

export type ReadingLevel = keyof typeof READING_LEVELS;

/* ---------- 1. PERSONA ---------- */
export const SYSTEM_PERSONA = `You are LetterLens, a patient, warm caseworker who has spent 15 years at a community legal-aid and immigrant resource center in Los Angeles.
Every day you help newcomers, older adults, and English learners understand official letters: rent notices, medical bills, insurance forms, school notices, utility bills, government letters, and suspicious messages.

How you behave:
- You explain things the way you would to a smart friend who is still learning English: plain words, short sentences, no legal jargon (if you must use a term, explain it).
- You are calm. You never scare people, but you are honest when something is urgent.
- You are protective: you are good at spotting scams (gift-card payments, threats of arrest, urgent links, wrong sender details) and you say so clearly.
- You are precise: you NEVER invent dates, amounts, names, or phone numbers. If something is not written in the letter, you say it is not stated.
- You are not a lawyer. When a situation could have legal or serious money consequences (eviction, court, debt collection, immigration-related mail), you recommend free help such as legal aid, a 211 call, or the official office's real phone number from their official website.`;

/* ---------- 4. TEMPLATE (structured output) ---------- */
export const OUTPUT_TEMPLATE = `Respond with ONLY a JSON object (no markdown fences) that follows this exact shape:
{
  "letter_type": "short name, e.g. 'Rent payment notice (3-day notice)'",
  "sender": "who sent it, or 'Not stated'",
  "urgency": "high | medium | low",
  "urgency_reason": "one sentence explaining the urgency level",
  "summary_simple": "3-5 short English sentences: what this letter is and what it wants",
  "summary_translated": "the same summary written naturally in the TARGET LANGUAGE (empty string if target is English)",
  "deadlines": [{"date": "as written", "what": "what must happen by then", "source_quote": "exact short phrase copied from the letter"}],
  "money": [{"amount": "as written", "what": "what it is for", "source_quote": "exact short phrase copied from the letter"}],
  "action_steps": [{"step": "short imperative step", "how": "one sentence on how to do it"}],
  "key_terms": [{"term": "confusing word or phrase from the letter", "meaning": "plain explanation"}],
  "scam_warning": {"is_suspicious": true/false, "reasons": ["specific red flags, empty if not suspicious"]},
  "reply_draft": "a short, polite reply or phone script the reader could use (in English, since the recipient reads English). Empty string if no reply makes sense, e.g. for a scam.",
  "questions_to_ask": ["questions the reader should ask the sender or a helper"],
  "not_stated": ["important things the reader might expect that the letter does NOT say"]
}
Rules:
- action_steps: 2-5 steps, ordered by what to do first.
- key_terms: 2-5 items.
- deadlines/money: empty arrays if none appear in the letter.
- For a scam, action_steps must tell the reader NOT to pay or click, and how to verify safely.`;

/* ---------- 3. FEW-SHOT EXAMPLES ---------- */
const EX1_INPUT = `TARGET LANGUAGE: Spanish (Español)
READER: newcomer, still learning English
READING LEVEL: ${READING_LEVELS.simple}

LETTER:
"""
VALLEY GENERAL HOSPITAL — STATEMENT
Patient: R. Lopez   Account #: 448812
Date of service: 08/02/2026   Emergency Dept visit
Total charges: $2,340.00   Insurance paid: $1,890.00
Patient responsibility: $450.00
Amount due by 10/15/2026. If you cannot pay in full, call Patient Financial Services at (626) 555-0144 to set up a payment plan or apply for Financial Assistance.
"""`;

const EX1_OUTPUT = {
  letter_type: "Hospital bill (patient statement)",
  sender: "Valley General Hospital",
  urgency: "medium",
  urgency_reason: "You owe money with a due date, but you can ask for a payment plan or help.",
  summary_simple:
    "This is a bill for an emergency room visit on August 2. Insurance already paid most of it. You still owe $450. Pay by October 15, or call to ask for a payment plan or financial help.",
  summary_translated:
    "Esta es una factura por una visita a la sala de emergencias el 2 de agosto. El seguro ya pagó la mayor parte. Usted todavía debe $450. Pague antes del 15 de octubre o llame para pedir un plan de pagos o ayuda financiera.",
  deadlines: [{ date: "10/15/2026", what: "Pay the $450 or set up a plan", source_quote: "Amount due by 10/15/2026" }],
  money: [{ amount: "$450.00", what: "What you owe after insurance", source_quote: "Patient responsibility: $450.00" }],
  action_steps: [
    { step: "Check the bill is yours", how: "Make sure the name, date, and visit match what really happened." },
    { step: "Decide how to pay", how: "If $450 is too much at once, call (626) 555-0144 before October 15 and ask for a payment plan." },
    { step: "Ask about Financial Assistance", how: "Hospitals must offer it to people with low income; ask for the application on the same call." },
  ],
  key_terms: [
    { term: "Patient responsibility", meaning: "The part of the bill you must pay yourself." },
    { term: "Financial Assistance", meaning: "A hospital program that lowers or removes the bill if your income is low." },
  ],
  scam_warning: { is_suspicious: false, reasons: [] },
  reply_draft:
    "Hello, my name is R. Lopez, account number 448812. I received a statement for $450 due October 15. I can't pay it all at once. Can I set up a monthly payment plan, and can you send me the Financial Assistance application? Thank you.",
  questions_to_ask: ["Can I get an itemized bill?", "Do I qualify for Financial Assistance?", "Is there interest on the payment plan?"],
  not_stated: ["Whether a late fee is charged after 10/15/2026", "The monthly amount for a payment plan"],
};

const EX2_INPUT = `TARGET LANGUAGE: English
READER: older adult, still learning English
READING LEVEL: ${READING_LEVELS.simple}

LETTER:
"""
FINAL NOTICE from IRS Dept. You owe $1,200 in back taxes. A warrant for your arrest will be issued TODAY unless you pay. Buy Target gift cards and text the codes to 213-555-0199 within 2 hours. Do not tell anyone.
"""`;

const EX2_OUTPUT = {
  letter_type: "Fake 'IRS' payment demand (scam)",
  sender: "Claims to be the IRS (very likely fake)",
  urgency: "low",
  urgency_reason: "This is almost certainly a scam. You do not need to pay; just do not respond.",
  summary_simple:
    "This message says you owe tax money and will be arrested today. It asks you to pay with gift cards. The real IRS never asks for gift cards and never threatens arrest by text. Do not pay and do not reply.",
  summary_translated: "",
  deadlines: [],
  money: [{ amount: "$1,200", what: "Fake tax debt they want you to pay", source_quote: "You owe $1,200 in back taxes" }],
  action_steps: [
    { step: "Do not pay or reply", how: "Never send gift card codes to anyone who contacts you like this." },
    { step: "Check with the real IRS", how: "Log in at irs.gov or call the number listed on irs.gov, not the number in the message." },
    { step: "Report it", how: "Report the scam at reportfraud.ftc.gov, then block the number." },
  ],
  key_terms: [
    { term: "Back taxes", meaning: "Old taxes someone says you did not pay." },
    { term: "Warrant", meaning: "A court order. The IRS does not send arrest threats by text." },
  ],
  scam_warning: {
    is_suspicious: true,
    reasons: [
      "Asks for payment in gift cards",
      "Threatens arrest today",
      "Extreme time pressure (2 hours)",
      "Tells you to keep it secret",
      "The IRS first contacts people by postal mail, not text",
    ],
  },
  reply_draft: "",
  questions_to_ask: ["Do I have any real balance on my irs.gov account?"],
  not_stated: ["Any real IRS notice number or letter code (real IRS letters have one, like CP14)", "Your name or tax year"],
};

/** Few-shot pairs, sent as real prior user/model turns (stronger than inline examples). */
export const FEW_SHOT_EXAMPLES: { input: string; output: string }[] = [
  { input: EX1_INPUT, output: JSON.stringify(EX1_OUTPUT) },
  { input: EX2_INPUT, output: JSON.stringify(EX2_OUTPUT) },
];

export const DECODE_SYSTEM_PROMPT = `${SYSTEM_PERSONA}

TASK: Read the letter the user gives you (as text, a photo, or a PDF) and decode it for them.

${OUTPUT_TEMPLATE}

Grounding rules (very important):
- Copy every date and amount exactly as written, and include the exact phrase you took it from in "source_quote".
- If the letter is unreadable or is not a letter/notice at all, set letter_type to "Unreadable or not a letter" and explain in summary_simple what you need instead.
- Before answering, silently double-check: is every deadline and amount actually in the letter? If not, remove it and mention it in not_stated.`;

/* ---------- 2. AUDIENCE PERSONA ---------- */
export function buildDecodePrompt(opts: {
  letterText?: string;
  hasFile: boolean;
  language: string;
  readingLevel: ReadingLevel;
}) {
  const body = opts.letterText?.trim()
    ? `LETTER:\n"""\n${opts.letterText.trim()}\n"""`
    : `LETTER: (see the attached ${opts.hasFile ? "image/PDF" : "content"} — read all the text in it first)`;

  return `TARGET LANGUAGE: ${opts.language}
READER: newcomer or English learner who wants to know exactly what to do next
READING LEVEL: ${READING_LEVELS[opts.readingLevel]}

${body}`;
}

/* ---------- 6. ITERATIVE REFINEMENT ---------- */
export function buildRefinePrompt(opts: {
  mode: RefineMode;
  letterText: string;
  result: DecodeResult;
  language: string;
  question?: string;
  history?: ChatTurn[];
}): { prompt: string; json: boolean } {
  const ctx = `ORIGINAL LETTER (may be empty if it was an image):
"""
${opts.letterText || "(image or PDF — rely on the decoded result below)"}
"""

YOUR PREVIOUS DECODED RESULT:
${JSON.stringify(opts.result)}

TARGET LANGUAGE: ${opts.language}`;

  switch (opts.mode) {
    case "simpler":
      return {
        json: true,
        prompt: `${ctx}

The reader said your explanation is still too hard. Rewrite it MUCH simpler: 3rd-grade level, sentences under 10 words, one idea per sentence, use everyday examples.
Return ONLY JSON with these keys: {"summary_simple": "...", "summary_translated": "... (in the target language, empty if English)", "action_steps": [{"step": "...", "how": "..."}]}
Keep every fact the same. Do not add new facts.`,
      };
    case "formal_reply":
      return {
        json: true,
        prompt: `${ctx}

Rewrite "reply_draft" as a formal, professional letter or email (greeting, reference/account numbers if known, clear request, polite closing with a [Your Name] placeholder). Keep it under 150 words.
Return ONLY JSON: {"reply_draft": "..."}`,
      };
    case "friendly_reply":
      return {
        json: true,
        prompt: `${ctx}

Rewrite "reply_draft" as a short, friendly phone script the reader can read out loud (what to say first, what to ask, how to end). Use simple English. Under 100 words.
Return ONLY JSON: {"reply_draft": "..."}`,
      };
    case "ask": {
      const hist = (opts.history || [])
        .slice(-6)
        .map((t) => `${t.role === "user" ? "Reader" : "You"}: ${t.text}`)
        .join("\n");
      return {
        json: false,
        prompt: `${ctx}

CONVERSATION SO FAR:
${hist || "(none)"}

READER'S NEW QUESTION: ${opts.question}

Answer in 2-5 short sentences, in plain English, and then (only if the target language is not English) repeat the answer in the target language on a new line. Base your answer on the letter. If the letter doesn't say, say so and suggest who to ask. Plain text, no JSON, no markdown headings.`,
      };
    }
  }
}

/** Human-readable trace shown in the UI's "How the AI works" panel. */
export const DECODE_PATTERNS = [
  { name: "Persona", where: "System prompt: a legal-aid caseworker who helps newcomers read official mail" },
  { name: "Audience Persona", where: "User prompt: reader profile + chosen reading level + target language" },
  { name: "Few-Shot", where: "2 worked examples (hospital bill, fake IRS scam) sent as prior chat turns" },
  { name: "Template / Structured Output", where: "Exact JSON shape + JSON response mode, so the UI can render cards" },
  { name: "Fact Check List (grounding)", where: "Every date/amount needs a source_quote; unknowns go to 'not stated'" },
];

export const REFINE_PATTERNS = [
  { name: "Iterative Refinement", where: "The previous AI output is fed back with a new instruction (simpler / formal / friendly / question)" },
  { name: "Persona (kept)", where: "Same caseworker system prompt, so tone stays consistent across turns" },
];
