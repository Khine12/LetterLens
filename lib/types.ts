export type Urgency = "high" | "medium" | "low";

export interface Deadline {
  date: string;
  what: string;
  source_quote: string;
  /** set by lib/verify.ts: true if source_quote was found in the pasted letter text */
  verified?: boolean;
}

export interface MoneyItem {
  amount: string;
  what: string;
  source_quote: string;
  verified?: boolean;
}

export interface ActionStep {
  step: string;
  how: string;
}

export interface KeyTerm {
  term: string;
  meaning: string;
}

/** Everything else the reader sees, in their language. Arrays follow the same order as the English ones. */
export interface TranslatedDetails {
  letter_type?: string;
  urgency_reason?: string;
  deadlines_what?: string[];
  money_what?: string[];
  key_terms_meaning?: string[];
  scam_reasons?: string[];
  questions_to_ask?: string[];
  not_stated?: string[];
}

export interface DecodeResult {
  letter_type: string;
  sender: string;
  urgency: Urgency;
  urgency_reason: string;
  summary_simple: string;
  summary_translated: string;
  deadlines: Deadline[];
  money: MoneyItem[];
  action_steps: ActionStep[];
  action_steps_translated: string[];
  key_terms: KeyTerm[];
  scam_warning: { is_suspicious: boolean; reasons: string[] };
  reply_draft: string;
  questions_to_ask: string[];
  not_stated: string[];
  translated: TranslatedDetails;
}

export interface PromptTrace {
  patterns: { name: string; where: string }[];
  systemPrompt: string;
  userPrompt: string;
  model: string;
  demoMode: boolean;
  /** Self-Refine pass: the first translation and the native editor's rewrite */
  polish?: { before: string; after: string };
}

export interface ChatTurn {
  role: "user" | "assistant";
  text: string;
}

export type RefineMode = "simpler" | "formal_reply" | "friendly_reply" | "ask";
