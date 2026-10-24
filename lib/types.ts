export type Urgency = "high" | "medium" | "low";

export interface Deadline {
  date: string;
  what: string;
  source_quote: string;
}

export interface MoneyItem {
  amount: string;
  what: string;
  source_quote: string;
}

export interface ActionStep {
  step: string;
  how: string;
}

export interface KeyTerm {
  term: string;
  meaning: string;
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
}

export interface PromptTrace {
  patterns: { name: string; where: string }[];
  systemPrompt: string;
  userPrompt: string;
  model: string;
  demoMode: boolean;
}

export interface ChatTurn {
  role: "user" | "assistant";
  text: string;
}

export type RefineMode = "simpler" | "formal_reply" | "friendly_reply" | "ask";
