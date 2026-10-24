/** Turn raw API errors into short messages a user (or a live-demo audience) can understand. */
export function friendlyError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (/\b429\b|RESOURCE_EXHAUSTED|rate limit|quota/i.test(msg))
    return "The AI is busy right now (free usage limit). Please wait about a minute and try again.";
  if (/\b(401|403)\b|API key|PERMISSION_DENIED/i.test(msg))
    return "The AI key is missing or not valid. Check GEMINI_API_KEY in your settings.";
  if (/\b404\b|not found|no longer available/i.test(msg))
    return "The AI model name isn't available. Check GEMINI_MODEL / OPENAI_MODEL in your settings.";
  if (/\b(500|502|503|504)\b|UNAVAILABLE|overloaded/i.test(msg))
    return "The AI service is having a hiccup. Please try again in a few seconds.";
  if (/timeout|timed out|aborted/i.test(msg) || (err instanceof Error && err.name === "TimeoutError"))
    return "The AI took too long to answer. Please try again (shorter letters are faster).";
  if (/parse|JSON/i.test(msg)) return "The AI gave an unexpected answer. Please try again.";
  if (/too large|413/i.test(msg)) return "That file is too large. Try a smaller photo or PDF (max ~3 MB).";
  // unknown error: include a short technical detail so it can be fixed
  return `Something went wrong reading your letter. Please try again. (Details: ${msg.slice(0, 160)})`;
}
