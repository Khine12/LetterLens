# ✉️ LetterLens — understand any letter

**CS4680 Prompt Engineering · AI Assistant Project · Khine Zar Hein**

LetterLens is an AI assistant that turns confusing official mail — rent notices, medical bills, insurance forms, school notices, and suspicious texts — into plain language, deadlines, a to-do checklist, a reply draft, and a scam check, **in the reader's own language** (Burmese, Spanish, Chinese, Vietnamese, Korean, Tagalog, Arabic, or English).

- **Live app:** _add your Vercel URL here_
- **Demo video:** _add your YouTube Short URL here_

---

## 1. The problem

Millions of people in the U.S. — immigrants, English learners, older adults — get letters they can't fully understand. The words are legal or medical ("Notice to Pay Rent or Quit", "Explanation of Benefits — this is not a bill", "patient responsibility"), the deadlines are hidden in long paragraphs, and scam messages are designed to look official.

Misreading one letter can mean a missed eviction deadline, a bill sent to collections, a child excluded from school, or money lost to a scammer. Translation apps translate words, but they don't tell you **what it means for you and what to do next**.

**Who it's for:** newcomers and English learners, their families who usually do the translating, and community organizations (legal aid, ESL programs, churches/temples) that help people read mail every week.

## 2. What it does (features)

| Feature | What the user sees |
|---|---|
| 📷 Paste text **or** upload a photo/PDF | Gemini reads the image directly (multimodal), photos auto-resized in the browser |
| ⏰ Urgency banner | Act now / Act soon / Low urgency, with a one-line reason |
| 🚨 Scam detector | Red alert with the specific red flags |
| 🗣️ Plain summary + translation | Simple English and the chosen language side by side (summary **and** every next step), plus 🔊 Read aloud |
| 📅 Deadlines & 💵 Money | Each item shows the **exact quote from the letter** it came from |
| ✅ Next-steps checklist | 2–5 ordered steps the reader can tick off |
| 📖 Words explained | Glossary of the confusing terms in that letter |
| ❓ Questions / 🕳️ "The letter doesn't say" | What to ask, and what's missing (so the AI never guesses) |
| ✉️ Reply draft | Copy, or refine into a **formal letter** or **phone script** |
| 💬 Ask about this letter | Follow-up chat grounded in the letter |
| 🧠 How the AI works | In-app panel that shows the prompt patterns and the actual prompts |

## 3. Interaction flow

```
User pastes / photographs letter ─▶ picks language + reading level ─▶ "Decode"
        │
        ▼
/api/decode  ──  system prompt (Persona + Template + grounding rules)
                 + 2 few-shot example turns
                 + user prompt (Audience Persona + letter text/image)
        │   Gemini (JSON mode)
        ▼
UI renders cards  ─▶  user refines:  "Explain simpler" · "Formal letter" · "Phone script" · chat question
                                           │
                                           ▼
                        /api/refine — previous AI output + new instruction (Iterative Refinement)
```

**Role of the LLM:** Gemini does the reading (including OCR of photos), the reasoning (what kind of letter, how urgent, is it a scam), the simplification and translation, and writes the reply. The app's job is to constrain it with prompts and present the structured output clearly.

## 4. Prompt engineering techniques

All prompts live in [`lib/prompts.ts`](lib/prompts.ts). The app uses **six** patterns from the course:

### 1. Persona
The system prompt makes the model *"a patient, warm caseworker who has spent 15 years at a community legal-aid and immigrant resource center."* This sets tone (calm, plain words), priorities (protective about scams), and limits (not a lawyer — refer to 211 / legal aid for eviction or court). **Effect:** consistent, kind, non-jargon answers instead of a generic summarizer voice.

### 2. Audience Persona
Each request tells the model who the reader is and how to write for them: `READER: newcomer or English learner`, `READING LEVEL: about a 5th-grade reading level…`, `TARGET LANGUAGE: Burmese`. The user controls level and language from the UI.

It also adds **language-specific translation rules**: translate meaning not words, keep money/dates/phone numbers exactly as written, and put the original English term in brackets after legal words, e.g. နှင်ထုတ်ခြင်း (eviction), so the reader can match it to the letter and use it on the phone. For **Burmese** there are extra rules: Myanmar Unicode only (no Zawgyi), everyday spoken style (ပါတယ် / ပါမယ်) instead of formal literary style (သည် / ၏), and Western digits for money and dates. **Effect:** the same letter is explained differently for different readers, and translations sound natural instead of machine-literal.

### 3. Few-Shot
Three complete worked examples — a hospital bill (→ Spanish), a fake "IRS" gift-card scam (→ English), and a water shut-off notice (→ Burmese, written in natural spoken Burmese) — are sent as **real prior user/model chat turns** before the real letter. **Effect:** the model copies the exact JSON shape, the tone, the step style, the Burmese writing style, and learns to flip into "don't pay, verify safely" mode for scams.

### 4. Template (structured output)
The system prompt gives an exact JSON template (urgency, deadlines with `source_quote`, action_steps, key_terms, scam_warning, reply_draft, not_stated…) and the API call uses Gemini's JSON response mode. **Effect:** the output can be rendered as reliable UI cards instead of a wall of text; the server also normalizes missing fields so the UI never breaks.

### 5. Fact Check List / grounding
Every date and amount must include the exact phrase it came from (`source_quote`), shown under each fact in the UI. Anything the letter doesn't say goes into `not_stated` instead of being guessed, and the model is told to silently re-check every deadline and amount before answering. **Effect:** reduces hallucinated deadlines/amounts — the most dangerous error for this app — and lets the user verify each fact.

### 6. Iterative Refinement
After decoding, the user can refine: **Explain even simpler** (3rd-grade rewrite), **Make it a formal letter**, **Turn into a phone script**, or **ask follow-up questions**. Each refinement sends the previous AI output back with a new instruction (and recent chat history), keeping the same persona. **Effect:** the user steers the result until it actually works for them.

## 5. Tech stack

- **Next.js 15 (App Router) + React 19 + TypeScript**, plain CSS (light/dark mode, mobile-first)
- **Google Gemini API** (`gemini-2.5-flash` by default, set `GEMINI_MODEL` to change) via REST — no SDK
- **OpenAI fallback:** if `GEMINI_API_KEY` is empty and `OPENAI_API_KEY` is set, the same prompts run on OpenAI (`OPENAI_MODEL`, default `gpt-5-mini`)
- API key stays on the server (`/api/decode`, `/api/refine`); never sent to the browser
- **Demo mode:** without a key the app still runs with canned results for two samples, so the UI can always be shown

```
app/
  page.tsx              UI (input, result cards, refine buttons, chat, prompt inspector)
  api/decode/route.ts   Few-shot + system prompt → Gemini (JSON) → normalized result
  api/refine/route.ts   Iterative refinement + follow-up Q&A
lib/
  prompts.ts            ★ all prompt engineering
  gemini.ts             Gemini REST client + safe JSON parsing
  samples.ts            Fictional sample letters for demos
  mock.ts               Demo-mode responses (no key)
```

## 6. Run it locally

```bash
npm install
cp .env.example .env.local      # then paste your key from https://aistudio.google.com/apikey
npm run dev                     # http://localhost:3000
```

## 7. Deploy (publishing bonus)

1. Push this repo to GitHub.
2. Go to [vercel.com/new](https://vercel.com/new) → import the repo (framework auto-detects Next.js).
3. Add environment variable `GEMINI_API_KEY` → **Deploy**.

## 8. Impact & future work

- **Impact:** helps people act on time (deadlines), avoid losing money (scam check), and speak up for themselves (reply drafts) — without needing a family member or caseworker to translate every letter.
- **Future:** save letters and get deadline reminders (SMS/calendar), a "share with my helper" link for family or caseworkers, voice input/output in the user's language, local-resource lookup by ZIP code, and a partner dashboard for legal-aid and ESL organizations.

## 9. Limitations & safety

LetterLens is not legal, medical, or financial advice; it points users to 211 / legal aid for serious situations. Users are reminded to cover account numbers and SSNs before uploading. All sample letters are fictional.
