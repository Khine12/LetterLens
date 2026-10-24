/** Turn raw API errors into short messages a user (or a live-demo audience) can understand. */
export function friendlyError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (/\b429\b|RESOURCE_EXHAUSTED|rate limit|quota/i.test(msg))
    return "The AI is busy right now (free usage limit). Please wait about a minute and try again.";
  if (/\b(401|403)\b|API key|PERMISSION_DENIED/i.test(msg))
    return "The AI key is missing or not valid. Check GEMINI_API_KEY in your settings.";
  if (/\b404\b|not found|no longer available/i.test(msg))
    return "The AI model name isn't available. Set GEMINI_MODEL to a current model (e.g. gemini-3.8-flash).";
  if (/\b(500|502|503|504)\b|UNAVAILABLE|overloaded/i.test(msg))
    return "The AI service is having a hiccup. Please try again in a few seconds.";
  if (/parse|JSON/i.test(msg)) return "The AI gave an unexpected answer. Please try again.";
  if (/too large|413/i.test(msg)) return "That file is too large. Try a smaller photo or PDF (max ~4 MB).";
  return "Something went wrong reading your letter. Please try again.";
}
