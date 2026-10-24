/**
 * Pattern 5 (Fact Check List), enforced in code — not just asked for in the prompt.
 *
 * The model must give a source_quote for every deadline and amount. Here the server
 * checks that each quote really appears in the pasted letter, so the UI can show
 * "✓ found in the letter" or warn the reader to double-check it.
 * Photos/PDFs have no text to compare against, so they are left unverified.
 */
import type { DecodeResult } from "./types";

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[“”"‘’'`]/g, "")
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();

/** A quote counts as found if every part of it (split on "..." / "…") appears in the letter. */
function quoteInLetter(quote: string, letter: string): boolean {
  const parts = quote.split(/\.\.\.|…/).map(norm).filter(Boolean);
  return parts.length > 0 && parts.every((p) => letter.includes(p));
}

export function verifyQuotes(result: DecodeResult, letterText: string): DecodeResult {
  if (!letterText.trim()) return result;
  const letter = norm(letterText);
  return {
    ...result,
    deadlines: result.deadlines.map((d) => ({ ...d, verified: quoteInLetter(d.source_quote || "", letter) })),
    money: result.money.map((m) => ({ ...m, verified: quoteInLetter(m.source_quote || "", letter) })),
  };
}
