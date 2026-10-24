# LetterLens — Presentation, Live Demo & Short Video Plan

## A. In-class presentation (~5 min, 30% of grade = mostly the live demo)

**Before class:** open the deployed site in a fresh tab, set language to **Burmese**, have a photo of a printed sample letter on your phone (or a real envelope with personal info covered), and have the README open in another tab as backup.

| # | Time | Slide / screen | What to say |
|---|---|---|---|
| 1 | 0:00–0:40 | **Problem** | "I came here from Myanmar and taught myself English. The hardest English wasn't in class — it was in the mailbox. Rent notices, medical bills, school forms. Miss one deadline and you can lose your home or your money. Translation apps give you words, not *what to do*." |
| 2 | 0:40–0:55 | **Solution** | "LetterLens: paste or snap a letter, and it tells you what it means, how urgent it is, what to do next, and whether it's a scam — in your own language." |
| 3 | 0:55–3:15 | **LIVE DEMO** | See script below |
| 4 | 3:15–4:15 | **Prompt engineering** (open the 🧠 panel in the app) | Walk through the 7 patterns (below) |
| 5 | 4:15–5:00 | **Impact & future** | Deadline reminders, share-with-helper link, voice, partner dashboard for legal-aid/ESL orgs. "Built for my community first, but it works for anyone who's ever stared at a letter and felt lost." |

### Live demo script
1. **Rent notice** (click the 🏠 sample, language = Burmese, "Very simply") → **Decode**.
   - Point at the red **Act now** banner → "it found the 3-business-day deadline hidden in the legal text."
   - Point at a deadline's **"From the letter:"** quote → "every date and dollar amount is quoted from the letter, so it can't make one up."
   - Show the **Burmese summary** → click **🔊 Read aloud**.
   - Click **🧒 Explain even simpler** → summary gets shorter.
   - Under the reply, click **📞 Turn into a phone script**.
   - Ask in chat: *"What happens if I pay one day late?"*
2. **Scam** (click 🚨 Suspicious text, switch language to Spanish) → **Decode** → red **This looks like a scam** box with reasons; steps say *don't click*.
3. **Photo** (the wow moment): switch to **📷 Photo / PDF**, upload/take a photo of a printed letter (the school notice or EOB sample works well) → it reads the image directly.

**If Wi-Fi or the API fails:** the app still runs in demo mode (rent + scam samples work offline from the API), so keep going and explain.

### Prompt engineering talking points (point at the 🧠 panel)
1. **Persona** — "The system prompt makes Gemini a legal-aid caseworker with 15 years helping newcomers: calm, plain words, protective about scams, and it knows it's not a lawyer."
2. **Audience Persona** — "The reader's language and reading level change how it writes."
3. **Few-Shot** — "Two worked examples — a hospital bill and a fake IRS scam — go in as earlier chat turns, so it learns the exact format and how to handle scams."
4. **Template** — "It must return a strict JSON shape, which is why I can render these cards."
5. **Fact Check List** — "Every deadline and amount needs a quote from the letter; anything missing goes into 'the letter doesn't say' instead of a guess."
6. **Iterative Refinement** — "Simpler / formal / phone script / chat all feed the previous answer back with a new instruction."
7. **Self-Refine (native editor)** — "Machine translation sounds robotic, so a second AI call acts as a native Burmese editor and rewrites only the translation to sound human, with the facts locked."

---

## B. Short video (< 2 min, TikTok / YouTube Shorts style, vertical)

Record on your phone (screen recording of the site on mobile + a few shots of you). Add captions (CapCut auto-captions). Upbeat background track from the YouTube Audio Library.

| Time | Shot | Voice-over / caption |
|---|---|---|
| 0:00–0:05 | You holding a letter, confused face | **"POV: you get a letter and have NO idea what it means 😵"** |
| 0:05–0:12 | Close-up of dense legal text | "When I moved here from Myanmar, this was the scariest English." |
| 0:12–0:18 | Open LetterLens on phone | "So I built **LetterLens** with AI." |
| 0:18–0:35 | Screen recording: photo → Decode → red **Act now** banner | "Snap the letter… and it tells you: this is a rent notice, you have 3 days." |
| 0:35–0:45 | Burmese summary + 🔊 Read aloud | "In plain English **and** your language — it even reads it out loud." |
| 0:45–0:58 | Checklist ticking + phone script button | "Exactly what to do next, plus what to say when you call." |
| 0:58–1:12 | Scam text → 🚨 scam box | "And if it's a scam? It catches it. 🚨" |
| 1:12–1:25 | 🧠 panel quick scroll | "Under the hood: Gemini + prompt engineering — persona, few-shot, structured output, fact-checking, refinement." |
| 1:25–1:35 | You smiling, URL on screen | "Try it free: **[your-url]** · Made for CS4680 at Cal Poly Pomona." |

Upload as a **public** YouTube Short (title: *"I built an AI that explains confusing letters 📬 #AI #CalPolyPomona"*), then paste the link in the Google Form along with the GitHub URL.

---

## C. Submission checklist
- [ ] Push repo to GitHub (public) — README has the problem, patterns, and run steps
- [ ] Deploy on Vercel with `GEMINI_API_KEY` (bonus) and paste the URL into the README
- [ ] Record + publish the < 2 min Short, paste link into README
- [ ] Submit GitHub link + video link (+ live URL) at https://forms.gle/nMHp5owwYidszwt58
