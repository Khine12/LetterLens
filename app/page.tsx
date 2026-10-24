"use client";

import { useRef, useState } from "react";
import { LANGUAGES } from "@/lib/prompts";
import { SAMPLES } from "@/lib/samples";
import type { ChatTurn, DecodeResult, PromptTrace, RefineMode } from "@/lib/types";

type FileData = { data: string; mimeType: string; preview?: string; name: string };

const URGENCY = {
  high: { icon: "⏰", label: "Act now" },
  medium: { icon: "📌", label: "Act soon" },
  low: { icon: "✅", label: "Low urgency" },
} as const;

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
  const fileInput = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  async function decode() {
    setError("");
    setLoading(true);
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
      setTrace(json.trace);
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
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
        if (f.size > 4 * 1024 * 1024) throw new Error("PDF is too large (max 4 MB).");
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

  function speak(t: string) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(t);
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
  const isEnglish = language === "English";

  return (
    <main className="wrap">
      <header className="header">
        <div className="brand">
          <div className="logo" aria-hidden>L</div>
          <div>
            <h1>LetterLens</h1>
            <div className="tag">Official mail, explained like a friend would</div>
          </div>
        </div>
        {trace?.demoMode ? (
          <span className="pill warn">Demo mode · no API key</span>
        ) : (
          <span className="pill">Powered by {trace?.model ?? "AI"}</span>
        )}
      </header>

      <section className="hero">
        <h2>
          Got a letter you <mark>don&apos;t understand</mark>?
        </h2>
        <p>
          Paste it or snap a photo. LetterLens tells you what it means, how urgent it is, what to do next, and whether
          it&apos;s a scam — in plain English and your own language.
        </p>
      </section>

      <div className="grid">
        {/* ---------- INPUT ---------- */}
        <section className="card sticky" aria-label="Your letter">
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
              <div className="skeleton" style={{ width: "70%" }} />
              <div className="skeleton" />
              <div className="skeleton" style={{ width: "85%" }} />
              <div className="skeleton" style={{ width: "60%" }} />
            </div>
          )}

          {result && (
            <>
              <div className={`banner ${result.urgency}`}>
                <div className="icon" aria-hidden>{URGENCY[result.urgency].icon}</div>
                <div>
                  <div className="kicker">{URGENCY[result.urgency].label}</div>
                  <div className="title">{result.letter_type}</div>
                  <div className="sub">From: {result.sender}</div>
                  {result.urgency_reason && <div className="sub" style={{ marginTop: 4 }}>{result.urgency_reason}</div>}
                </div>
              </div>

              {result.scam_warning.is_suspicious && (
                <div className="scam" role="alert">
                  <strong>🚨 This looks like a scam</strong>
                  <ul>
                    {result.scam_warning.reasons.map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                </div>
              )}

              <div className="card summary">
                <h3>2 · What it means</h3>
                <p>{result.summary_simple}</p>
                {!isEnglish && result.summary_translated && (
                  <div className="translated" lang={langCode(language)}>
                    <div className="lang-label">{language}</div>
                    {result.summary_translated}
                  </div>
                )}
                <div className="actions" style={{ marginTop: 12 }}>
                  <button className="btn ghost" onClick={() => speak(result.summary_simple)}>🔊 Read aloud</button>
                  <button className="btn ghost" onClick={() => refine("simpler")} disabled={!!refining}>
                    {refining === "simpler" ? <span className="spinner" /> : "🧒"} Explain even simpler
                  </button>
                </div>
              </div>

              <div className="two">
                <div className="card">
                  <h3>📅 Deadlines</h3>
                  {result.deadlines.length ? (
                    result.deadlines.map((d, i) => (
                      <div className="fact" key={i}>
                        <span className="val">{d.date}</span>
                        <span className="what">{d.what}</span>
                        {d.source_quote && <span className="quote">“{d.source_quote}”</span>}
                      </div>
                    ))
                  ) : (
                    <p className="none">No deadline in this letter.</p>
                  )}
                </div>
                <div className="card">
                  <h3>💵 Money</h3>
                  {result.money.length ? (
                    result.money.map((m, i) => (
                      <div className="fact" key={i}>
                        <span className="val">{m.amount}</span>
                        <span className="what">{m.what}</span>
                        {m.source_quote && <span className="quote">“{m.source_quote}”</span>}
                      </div>
                    ))
                  ) : (
                    <p className="none">No amounts mentioned.</p>
                  )}
                </div>
              </div>

              <div className="card">
                <h3>3 · What to do next</h3>
                <ol className="steps">
                  {result.action_steps.map((s, i) => (
                    <li key={i} className={done[i] ? "done" : ""}>
                      <input
                        type="checkbox"
                        aria-label={`Mark "${s.step}" done`}
                        checked={!!done[i]}
                        onChange={() => setDone((d) => ({ ...d, [i]: !d[i] }))}
                      />
                      <div>
                        <div className="s">{i + 1}. {s.step}</div>
                        <div className="h">{s.how}</div>
                        {!isEnglish && result.action_steps_translated?.[i] && (
                          <div className="tr" lang={langCode(language)}>{result.action_steps_translated[i]}</div>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="two">
                <div className="card">
                  <h3>📖 Words explained</h3>
                  <dl className="terms">
                    {result.key_terms.map((k, i) => (
                      <div key={i}>
                        <dt><span>{k.term}</span></dt>
                        <dd>{k.meaning}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
                <div className="card">
                  <h3>❓ Good questions to ask</h3>
                  <ul className="plain">
                    {result.questions_to_ask.map((q, i) => <li key={i}>{q}</li>)}
                  </ul>
                  {result.not_stated.length > 0 && (
                    <>
                      <h3 style={{ marginTop: 14 }}>🕳️ The letter doesn&apos;t say</h3>
                      <ul className="plain">
                        {result.not_stated.map((q, i) => <li key={i}>{q}</li>)}
                      </ul>
                    </>
                  )}
                </div>
              </div>

              {result.reply_draft && (
                <div className="card reply">
                  <h3>4 · What you can say back</h3>
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

              <div className="card">
                <h3>💬 Ask about this letter</h3>
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

              {trace && (
                <div className="card">
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
                    <div className="lang-label">System prompt</div>
                    <div className="prompt-box">{trace.systemPrompt}</div>
                    <div className="lang-label">User prompt (after 2 few-shot examples)</div>
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
