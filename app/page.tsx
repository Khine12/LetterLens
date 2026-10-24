"use client";

import { useEffect, useRef, useState } from "react";
import { FEW_SHOT_EXAMPLES, LANGUAGES } from "@/lib/prompts";
import { SAMPLES } from "@/lib/samples";
import { label, localLabel } from "@/lib/ui-text";
import type { ChatTurn, DecodeResult, PromptTrace, RefineMode } from "@/lib/types";

type FileData = { data: string; mimeType: string; preview?: string; name: string };

const URGENCY_ICON = { high: "⏰", medium: "📌", low: "✅" } as const;

export default function Home() {
  const [tab, setTab] = useState<"text" | "photo">("text");
  const [text, setText] = useState("");
  const [file, setFile] = useState<FileData | null>(null);
  const [language, setLanguage] = useState<string>(LANGUAGES[1]);
  const [readingLevel, setReadingLevel] = useState<"simple" | "standard">("simple");

  const [loading, setLoading] = useState(false);
  const [refining, setRefining] = useState<RefineMode | null>(null);
  const [error, setError] = useState("");
  const [result, setResult] = useState<DecodeResult | null>(null);
  const [trace, setTrace] = useState<PromptTrace | null>(null);
  const [done, setDone] = useState<Record<number, boolean>>({});
  const [chat, setChat] = useState<ChatTurn[]>([]);
  const [question, setQuestion] = useState("");
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState<{ model: string; demoMode: boolean } | null>(null);
  const [slow, setSlow] = useState(false);
  const [shownLang, setShownLang] = useState("English");
  const fileInput = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/decode")
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => {});
  }, []);

  async function decode() {
    setError("");
    setLoading(true);
    setSlow(false);
    const slowTimer = setTimeout(() => setSlow(true), 15_000);
    setResult(null);
    setChat([]);
    setDone({});
    try {
      const res = await fetch("/api/decode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: tab === "text" ? text : "",
          file: tab === "photo" && file ? { data: file.data, mimeType: file.mimeType } : null,
          language,
          readingLevel,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Request failed");
      setResult(json.result);
      setShownLang(language);
      setTrace(json.trace);
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      clearTimeout(slowTimer);
      setLoading(false);
    }
  }

  async function refine(mode: RefineMode, q?: string) {
    if (!result) return;
    setError("");
    setRefining(mode);
    const history = chat;
    if (mode === "ask" && q) setChat((c) => [...c, { role: "user", text: q }]);
    try {
      const res = await fetch("/api/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, result, text: tab === "text" ? text : "", language, question: q, history }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Request failed");
      if (mode === "ask") setChat((c) => [...c, { role: "assistant", text: json.answer }]);
      else setResult((r) => (r ? { ...r, ...json.patch } : r));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      if (mode === "ask") setChat((c) => c.slice(0, -1));
    } finally {
      setRefining(null);
    }
  }

  async function onFile(f: File | undefined) {
    if (!f) return;
    setError("");
    try {
      if (f.type === "application/pdf") {
        if (f.size > 3 * 1024 * 1024) throw new Error("PDF is too large (max 3 MB). Try a photo of the page instead.");
        const data = await toBase64(f);
        setFile({ data, mimeType: f.type, name: f.name });
      } else if (f.type.startsWith("image/")) {
        const { data, preview } = await compressImage(f);
        setFile({ data, mimeType: "image/jpeg", preview, name: f.name });
      } else {
        throw new Error("Please upload a photo (JPG/PNG) or a PDF.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read that file");
    }
  }

  function speak(t: string, lang = "en") {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    // The voice list can still be loading, so only pick a voice if one is ready; u.lang does the rest.
    const voice = window.speechSynthesis.getVoices().find((v) => v.lang.toLowerCase().startsWith(lang));
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(t);
    u.lang = lang;
    if (voice) u.voice = voice;
    u.rate = 0.9;
    window.speechSynthesis.speak(u);
  }

  async function copyReply() {
    if (!result?.reply_draft) return;
    try {
      await navigator.clipboard.writeText(result.reply_draft);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked; ignore */
    }
  }

  const canDecode = !loading && (tab === "text" ? text.trim().length > 0 : !!file);
  // Results use the language they were decoded in, even if the dropdown changes afterwards.
  const isEnglish = shownLang === "English";
  const bi = { lang: langCode(shownLang), dir: shownLang.startsWith("Arabic") ? ("rtl" as const) : undefined };
  const tr = result?.translated ?? {};
  const shownStatus = trace ?? status;

  return (
    <main className="wrap">
      <header className="header no-print">
        <div className="brand">
          <div className="logo" aria-hidden>L</div>
          <div>
            <h1>LetterLens</h1>
            <div className="tag">Official mail, explained like a friend would</div>
          </div>
        </div>
        {shownStatus?.demoMode ? (
          <span className="pill warn">Demo mode · no API key</span>
        ) : (
          <span className="pill">Powered by {shownStatus?.model ?? "AI"}</span>
        )}
      </header>

      <section className="hero no-print">
        <h2>
          Got a letter you don&apos;t understand?
        </h2>
        <p>
          Paste it or snap a photo. LetterLens tells you what it means, how urgent it is, what to do next, and whether
          it&apos;s a scam — in plain English and your own language.
        </p>
      </section>

      <div className="grid">
        {/* ---------- INPUT ---------- */}
        <section className="card sticky no-print" aria-label="Your letter">
          <h3>1 · Your letter</h3>
          <div className="tabs" role="tablist">
            <button role="tab" aria-selected={tab === "text"} className={tab === "text" ? "on" : ""} onClick={() => setTab("text")}>
              ✍️ Paste text
            </button>
            <button role="tab" aria-selected={tab === "photo"} className={tab === "photo" ? "on" : ""} onClick={() => setTab("photo")}>
              📷 Photo / PDF
            </button>
          </div>

          {tab === "text" ? (
            <>
              <label className="sr" htmlFor="letter">Letter text</label>
              <textarea
                id="letter"
                className="letter"
                placeholder="Paste the letter, bill, notice, email, or text message here…"
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
              <div className="samples" aria-label="Try a sample">
                {SAMPLES.map((s) => (
                  <button key={s.id} className="chip" onClick={() => setText(s.text)}>
                    {s.label}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div
              className={`drop ${file ? "has" : ""}`}
              role="button"
              tabIndex={0}
              onClick={() => fileInput.current?.click()}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && fileInput.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                onFile(e.dataTransfer.files?.[0]);
              }}
            >
              {file?.preview && <img src={file.preview} alt="Your uploaded letter" />}
              {file ? (
                <div>📄 {file.name} — tap to change</div>
              ) : (
                <>
                  <div style={{ fontSize: 34 }}>📷</div>
                  <div><b>Take a photo</b> or upload an image / PDF</div>
                  <div style={{ fontSize: 13 }}>Drag & drop works too</div>
                </>
              )}
              <input
                ref={fileInput}
                type="file"
                accept="image/*,application/pdf"
                capture="environment"
                hidden
                onChange={(e) => onFile(e.target.files?.[0])}
              />
            </div>
          )}

          <div className="row">
            <label className="field">
              My language
              <select value={language} onChange={(e) => setLanguage(e.target.value)}>
                {LANGUAGES.map((l) => (
                  <option key={l}>{l}</option>
                ))}
              </select>
            </label>
            <label className="field">
              Explain it
              <select value={readingLevel} onChange={(e) => setReadingLevel(e.target.value as "simple" | "standard")}>
                <option value="simple">Very simply</option>
                <option value="standard">Normally</option>
              </select>
            </label>
          </div>

          <button className="btn full" onClick={decode} disabled={!canDecode}>
            {loading ? <><span className="spinner" /> Reading your letter…</> : "🔍 Decode my letter"}
          </button>
          <p className="privacy">Tip: cover account numbers or SSNs before uploading. LetterLens is not a lawyer.</p>
          {error && <div className="error" role="alert">{error}</div>}
        </section>

        {/* ---------- RESULTS ---------- */}
        <section className="results" ref={resultsRef} aria-live="polite" aria-label="What it means">
          {!result && !loading && (
            <div className="card empty">
              <div className="big">✉️</div>
              <p>Your plain-language breakdown will appear here.<br />No letter handy? Try a sample on the left.</p>
            </div>
          )}

          {loading && (
            <div className="card">
              <h3>Reading carefully…</h3>
              {slow && <p className="none">Still working: it&apos;s checking every date and amount, then polishing the translation. Long letters can take up to a minute.</p>}
              <div className="skeleton" style={{ width: "70%" }} />
              <div className="skeleton" />
              <div className="skeleton" style={{ width: "85%" }} />
              <div className="skeleton" style={{ width: "60%" }} />
            </div>
          )}

          {result && (
            <>
              <div className={`banner ${result.urgency}`}>
                <div className="icon" aria-hidden>{URGENCY_ICON[result.urgency]}</div>
                <div>
                  <div className="kicker">{label(result.urgency, shownLang)}</div>
                  <div className="title"><Bi local={tr.letter_type} en={result.letter_type} {...bi} /></div>
                  <div className="sub">{localLabel("from", shownLang)}: {result.sender}</div>
                  {result.urgency_reason && (
                    <div className="sub" style={{ marginTop: 4 }}>
                      <Bi local={tr.urgency_reason} en={result.urgency_reason} {...bi} />
                    </div>
                  )}
                </div>
              </div>

              {result.scam_warning.is_suspicious && (
                <div className="scam" role="alert">
                  <strong>🚨 {label("scam", shownLang)}</strong>
                  <ul>
                    {result.scam_warning.reasons.map((r, i) => (
                      <li key={i}><Bi local={tr.scam_reasons?.[i]} en={r} {...bi} /></li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="card summary">
                <h3>2 · {label("means", shownLang)}</h3>
                {!isEnglish && result.summary_translated ? (
                  <>
                    <p className="local" lang={bi.lang} dir={bi.dir}>{result.summary_translated}</p>
                    <div className="translated english">
                      <div className="lang-label">{localLabel("inEnglish", shownLang)}</div>
                      {result.summary_simple}
                    </div>
                  </>
                ) : (
                  <p>{result.summary_simple}</p>
                )}
                <div className="actions" style={{ marginTop: 12 }}>
                  {!isEnglish && result.summary_translated && (
                    <button className="btn ghost" onClick={() => speak(result.summary_translated, bi.lang)}>
                      🔊 Read in {shownLang.split(" ")[0]}
                    </button>
                  )}
                  <button className="btn ghost" onClick={() => speak(result.summary_simple)}>
                    🔊 Read aloud{isEnglish ? "" : " in English"}
                  </button>
                  <button className="btn ghost" onClick={() => refine("simpler")} disabled={!!refining}>
                    {refining === "simpler" ? <span className="spinner" /> : "🧒"} Explain even simpler
                  </button>
                </div>
              </div>

              <div className="two">
                <div className="card">
                  <h3>📅 {label("deadlines", shownLang)}</h3>
                  {result.deadlines.length ? (
                    result.deadlines.map((d, i) => (
                      <div className="fact" key={i}>
                        <span className="val">{d.date}</span>
                        <span className="what"><Bi local={tr.deadlines_what?.[i]} en={d.what} {...bi} /></span>
                        <Quote text={d.source_quote} verified={d.verified} language={shownLang} />
                      </div>
                    ))
                  ) : (
                    <p className="none">{localLabel("noDeadline", shownLang)}</p>
                  )}
                </div>
                <div className="card">
                  <h3>💵 {label("money", shownLang)}</h3>
                  {result.money.length ? (
                    result.money.map((m, i) => (
                      <div className="fact" key={i}>
                        <span className="val">{m.amount}</span>
                        <span className="what"><Bi local={tr.money_what?.[i]} en={m.what} {...bi} /></span>
                        <Quote text={m.source_quote} verified={m.verified} language={shownLang} />
                      </div>
                    ))
                  ) : (
                    <p className="none">{localLabel("noMoney", shownLang)}</p>
                  )}
                </div>
              </div>

              <div className="card">
                <h3>3 · {label("steps", shownLang)}</h3>
                <ol className="steps">
                  {result.action_steps.map((s, i) => (
                    <li key={i} className={done[i] ? "done" : ""}>
                      <input
                        type="checkbox"
                        aria-label={`Mark "${s.step}" done`}
                        checked={!!done[i]}
                        onChange={() => setDone((d) => ({ ...d, [i]: !d[i] }))}
                      />
                      {!isEnglish && result.action_steps_translated?.[i] ? (
                        <div>
                          <div className="s local" lang={bi.lang} dir={bi.dir}>{i + 1}. {result.action_steps_translated[i]}</div>
                          <div className="h">{s.step} — {s.how}</div>
                        </div>
                      ) : (
                        <div>
                          <div className="s">{i + 1}. {s.step}</div>
                          <div className="h">{s.how}</div>
                        </div>
                      )}
                    </li>
                  ))}
                </ol>
              </div>

              <div className="two">
                <div className="card">
                  <h3>📖 {label("words", shownLang)}</h3>
                  <dl className="terms">
                    {result.key_terms.map((k, i) => (
                      <div key={i}>
                        <dt>{k.term}</dt>
                        <dd><Bi local={tr.key_terms_meaning?.[i]} en={k.meaning} {...bi} /></dd>
                      </div>
                    ))}
                  </dl>
                </div>
                <div className="card">
                  <h3>❓ {label("questions", shownLang)}</h3>
                  <ul className="plain">
                    {result.questions_to_ask.map((q, i) => (
                      <li key={i}><Bi local={tr.questions_to_ask?.[i]} en={q} {...bi} /></li>
                    ))}
                  </ul>
                  {result.not_stated.length > 0 && (
                    <>
                      <h3 style={{ marginTop: 14 }}>🕳️ {label("notStated", shownLang)}</h3>
                      <ul className="plain">
                        {result.not_stated.map((q, i) => (
                          <li key={i}><Bi local={tr.not_stated?.[i]} en={q} {...bi} /></li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              </div>

              {result.reply_draft && (
                <div className="card reply">
                  <h3>4 · {label("reply", shownLang)}</h3>
                  <pre>{result.reply_draft}</pre>
                  <div className="actions">
                    <button className="btn ghost" onClick={copyReply}>{copied ? "✓ Copied" : "📋 Copy"}</button>
                    <button className="btn ghost" onClick={() => refine("formal_reply")} disabled={!!refining}>
                      {refining === "formal_reply" ? <span className="spinner" /> : "👔"} Make it a formal letter
                    </button>
                    <button className="btn ghost" onClick={() => refine("friendly_reply")} disabled={!!refining}>
                      {refining === "friendly_reply" ? <span className="spinner" /> : "📞"} Turn into a phone script
                    </button>
                  </div>
                </div>
              )}

              <div className="card no-print">
                <h3>💬 {label("ask", shownLang)}</h3>
                {chat.length > 0 && (
                  <div className="chat">
                    {chat.map((t, i) => (
                      <div key={i} className={`bubble ${t.role}`}>{t.text}</div>
                    ))}
                    {refining === "ask" && <div className="bubble assistant"><span className="spinner" /></div>}
                  </div>
                )}
                <form
                  className="ask"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const q = question.trim();
                    if (!q || refining) return;
                    setQuestion("");
                    refine("ask", q);
                  }}
                >
                  <input
                    className="text"
                    placeholder="e.g. What happens if I pay one day late?"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    aria-label="Your question"
                  />
                  <button className="btn" type="submit" disabled={!question.trim() || !!refining}>Ask</button>
                </form>
              </div>

              <div className="actions no-print">
                <button className="btn ghost" onClick={() => window.print()}>🖨️ Print / save as PDF (to bring to a helper)</button>
              </div>

              {trace && (
                <div className="card no-print">
                  <details className="inspector">
                    <summary>
                      <span>🧠 How the AI works (prompt engineering)</span>
                      <span className="tag">{trace.model}</span>
                    </summary>
                    <div className="patterns">
                      {trace.patterns.map((p) => (
                        <div className="pattern" key={p.name}><b>{p.name}</b><span>{p.where}</span></div>
                      ))}
                      <div className="pattern">
                        <b>Iterative Refinement</b>
                        <span>&ldquo;Explain simpler&rdquo;, &ldquo;formal letter&rdquo;, &ldquo;phone script&rdquo; and chat send the previous answer back with a new instruction</span>
                      </div>
                    </div>
                    {trace.polish && (
                      <>
                        <div className="lang-label">Self-Refine: first translation → after the native-speaker editor</div>
                        <div className="before-after" lang={bi.lang} dir={bi.dir}>
                          <div className="prompt-box"><b>Before</b>{"\n"}{trace.polish.before}</div>
                          <div className="prompt-box"><b>After</b>{"\n"}{trace.polish.after}</div>
                        </div>
                      </>
                    )}
                    <div className="lang-label">System prompt</div>
                    <div className="prompt-box">{trace.systemPrompt}</div>
                    <div className="lang-label">User prompt (sent after {FEW_SHOT_EXAMPLES.length} few-shot examples)</div>
                    <div className="prompt-box">{trace.userPrompt}</div>
                  </details>
                </div>
              )}
            </>
          )}
        </section>
      </div>

      <footer className="footer">
        LetterLens is an AI helper, not legal or medical advice. For eviction, court, or debt issues, call 211 for free local help.
      </footer>
    </main>
  );
}

/** The reader's language first, with the English underneath in smaller text (or just English). */
function Bi({ local, en, lang, dir }: { local?: string; en: string; lang: string; dir?: "rtl" }) {
  if (!local) return <>{en}</>;
  return (
    <>
      <span lang={lang} dir={dir}>{local}</span>
      <span className="en">{en}</span>
    </>
  );
}

function Quote({ text, verified, language }: { text?: string; verified?: boolean; language: string }) {
  if (!text) return null;
  return (
    <>
      <span className="quote">“{text}”</span>
      {verified === true && <span className="check ok">✓ {localLabel("found", language)}</span>}
      {verified === false && <span className="check warn">⚠️ {localLabel("notFound", language)}</span>}
    </>
  );
}

function langCode(l: string) {
  const map: Record<string, string> = { Burmese: "my", Spanish: "es", Chinese: "zh", Vietnamese: "vi", Korean: "ko", Tagalog: "tl", Arabic: "ar" };
  return map[l.split(" ")[0]] || "en";
}

function toBase64(f: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1]);
    r.onerror = () => reject(new Error("Could not read file"));
    r.readAsDataURL(f);
  });
}

/** Resize photos to max 1600px JPEG so uploads stay small and fast. */
function compressImage(f: File): Promise<{ data: string; preview: string }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(f);
    const img = new Image();
    img.onload = () => {
      const max = 1600;
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas not supported"));
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      URL.revokeObjectURL(url);
      resolve({ data: dataUrl.split(",")[1], preview: dataUrl });
    };
    img.onerror = () => reject(new Error("Could not open that image"));
    img.src = url;
  });
}
