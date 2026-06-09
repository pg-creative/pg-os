"use client";

/**
 * /morning — Morning Pages (Brick 1 of the PG OS rebuild).
 *
 * Aesthetic LOCKED: V1 Emaki Scroll (painted golden-hour world, floating
 * parchment, drifting foxfire, Noto Serif JP ink + gold). PG pick 2026-06-09.
 *
 * Surface is UPLOAD-FIRST. Morning pages are handwritten longhand, so the hero
 * is "lay this morning's pages here" — photograph the pages, Claude transcribes
 * them, you confirm, and the surface reveals the sentiment + keeps a scroll of
 * past mornings. Write / Speak are secondary input modes.
 *
 * Flow:  compose(photo|write|speak) → transcribe → review → reveal → history
 *
 * Wired to the spine (all live):
 *   POST /api/journal/transcribe  (Claude vision handwriting OCR)
 *   POST /api/journal/analyze     (sentiment: score + mood + tags + themes + reflection; persists)
 *   GET  /api/journal/history     (past mornings)
 *   POST /api/journal/save        (plain save)
 *
 * Storage today = HC journal_entries (works; flagged to migrate to PG OS Supabase).
 */

import { useCallback, useEffect, useRef, useState } from "react";

type Stage = "compose" | "transcribing" | "review" | "analyzing" | "reveal";
type InputMode = "photo" | "write" | "speak";

type Sentiment = {
  score: number; // -1..1
  mood: string;
  tags: string[];
  themes: string[];
  reflection: string;
};

type HistoryEntry = {
  entry_date: string;
  raw_text: string;
  cleaned_text: string | null;
  sentiment_score: number | null;
  energy_level: number | null;
  tags: string[];
};

const WORDS_PER_PAGE = 250;
const GOAL_PAGES = 3;

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function friendlyDate(iso?: string): string {
  const d = iso ? new Date(`${iso}T00:00:00`) : new Date();
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}
function wordCount(s: string): number {
  return s.trim() ? s.trim().split(/\s+/).length : 0;
}

/* score (-1..1) → a warm/cool wash + a label, never red=bad/green=good */
function moodWash(score: number): { from: string; to: string; glow: string } {
  // warm amber for positive, cool indigo for low, soft gold neutral
  if (score >= 0.25)
    return {
      from: "rgba(240,192,96,0.30)",
      to: "rgba(216,124,82,0.22)",
      glow: "rgba(240,192,96,0.55)",
    };
  if (score <= -0.25)
    return {
      from: "rgba(74,90,140,0.28)",
      to: "rgba(40,40,70,0.30)",
      glow: "rgba(120,140,200,0.45)",
    };
  return {
    from: "rgba(201,162,76,0.20)",
    to: "rgba(245,239,224,0.18)",
    glow: "rgba(201,162,76,0.4)",
  };
}

async function fileToImagePayload(
  file: File,
): Promise<{ mediaType: string; dataBase64: string; previewUrl: string }> {
  const dataUrl: string = await new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = () => rej(new Error("read failed"));
    r.readAsDataURL(file);
  });
  const [head, b64] = dataUrl.split(",");
  const mediaType =
    head.slice(head.indexOf(":") + 1, head.indexOf(";")) ||
    file.type ||
    "image/jpeg";
  return { mediaType, dataBase64: b64, previewUrl: dataUrl };
}

export function MorningView({ embedded = false }: { embedded?: boolean }) {
  const [stage, setStage] = useState<Stage>("compose");
  const [mode, setMode] = useState<InputMode>("photo");
  const [date] = useState(todayIso());

  const [photos, setPhotos] = useState<
    { mediaType: string; dataBase64: string; previewUrl: string }[]
  >([]);
  const [text, setText] = useState("");
  const [sentiment, setSentiment] = useState<Sentiment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[] | null>(null);

  const fileInput = useRef<HTMLInputElement | null>(null);

  /* ── photo handling ── */
  const addFiles = useCallback(async (files: FileList | File[]) => {
    const imgs = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (!imgs.length) return;
    const payloads = await Promise.all(imgs.map(fileToImagePayload));
    setPhotos((p) => [...p, ...payloads]);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer?.files?.length) void addFiles(e.dataTransfer.files);
    },
    [addFiles],
  );

  /* ── transcribe ── */
  const transcribe = useCallback(async () => {
    if (!photos.length) return;
    setError(null);
    setStage("transcribing");
    try {
      const res = await fetch("/api/journal/transcribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          images: photos.map((p) => ({
            mediaType: p.mediaType,
            dataBase64: p.dataBase64,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "transcription failed");
      setText(data.text || "");
      setStage("review");
    } catch (e) {
      setError(e instanceof Error ? e.message : "transcription failed");
      setStage("compose");
    }
  }, [photos]);

  /* ── save + analyze ── */
  const finalize = useCallback(async () => {
    if (!text.trim()) return;
    setError(null);
    setStage("analyzing");
    try {
      const res = await fetch("/api/journal/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ date, text, persist: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "analysis failed");
      setSentiment(data as Sentiment);
      setStage("reveal");
    } catch (e) {
      setError(e instanceof Error ? e.message : "analysis failed");
      setStage("review");
    }
  }, [date, text]);

  /* ── history ── */
  const loadHistory = useCallback(async () => {
    setShowHistory(true);
    if (history) return;
    try {
      const res = await fetch("/api/journal/history?days=60");
      const data = await res.json();
      setHistory((data?.entries as HistoryEntry[]) ?? []);
    } catch {
      setHistory([]);
    }
  }, [history]);

  const reset = useCallback(() => {
    setStage("compose");
    setMode("photo");
    setPhotos([]);
    setText("");
    setSentiment(null);
    setError(null);
  }, []);

  return (
    <main className={`mp-root${embedded ? " mp-embedded" : ""}`}>
      <MorningStyles />
      <div className="mp-sky" aria-hidden />
      <div className="mp-scrim" aria-hidden />
      <Foxfire />

      <header className="mp-head">
        <div className="mp-title">
          <span className="mp-kanji">Morning Pages</span>
          <span className="mp-sub">{friendlyDate(date)}</span>
        </div>
        <button className="mp-history-btn" onClick={loadHistory}>
          ◷ your mornings
        </button>
      </header>

      {error && <div className="mp-error">{error}</div>}

      <div className="mp-stage">
        {stage === "compose" && (
          <Compose
            mode={mode}
            setMode={setMode}
            photos={photos}
            setPhotos={setPhotos}
            text={text}
            setText={setText}
            fileInput={fileInput}
            addFiles={addFiles}
            onDrop={onDrop}
            onTranscribe={transcribe}
            onWriteContinue={() => setStage("review")}
          />
        )}

        {stage === "transcribing" && (
          <Working
            label="Reading your hand…"
            sub="Kitsu is making out the words"
          />
        )}
        {stage === "analyzing" && (
          <Working
            label="Sitting with it…"
            sub="finding what this morning held"
          />
        )}

        {stage === "review" && (
          <Review
            photos={photos}
            text={text}
            setText={setText}
            onBack={() => setStage("compose")}
            onFinalize={finalize}
          />
        )}

        {stage === "reveal" && sentiment && (
          <Reveal
            sentiment={sentiment}
            text={text}
            onDone={reset}
            onHistory={loadHistory}
          />
        )}
      </div>

      {showHistory && (
        <HistoryPanel entries={history} onClose={() => setShowHistory(false)} />
      )}
    </main>
  );
}

/* ════ COMPOSE ════ */
function Compose({
  mode,
  setMode,
  photos,
  setPhotos,
  text,
  setText,
  fileInput,
  addFiles,
  onDrop,
  onTranscribe,
  onWriteContinue,
}: {
  mode: InputMode;
  setMode: (m: InputMode) => void;
  photos: { previewUrl: string }[];
  setPhotos: React.Dispatch<
    React.SetStateAction<
      { mediaType: string; dataBase64: string; previewUrl: string }[]
    >
  >;
  text: string;
  setText: (s: string) => void;
  fileInput: React.RefObject<HTMLInputElement | null>;
  addFiles: (f: FileList | File[]) => void;
  onDrop: (e: React.DragEvent) => void;
  onTranscribe: () => void;
  onWriteContinue: () => void;
}) {
  const modes: { id: InputMode; glyph: string; label: string }[] = [
    { id: "photo", glyph: "❏", label: "Photograph" },
    { id: "write", glyph: "✎", label: "Type" },
    { id: "speak", glyph: "◗", label: "Speak" },
  ];
  return (
    <div className="mp-compose">
      <nav className="mp-modes">
        {modes.map((m) => (
          <button
            key={m.id}
            className={`mp-mode${mode === m.id ? " on" : ""}`}
            onClick={() => setMode(m.id)}
          >
            <span className="mp-mode-glyph">{m.glyph}</span>
            {m.label}
          </button>
        ))}
      </nav>

      {mode === "photo" && (
        <div className="mp-photo">
          {photos.length === 0 ? (
            <div
              className="mp-drop"
              onDragOver={(e) => e.preventDefault()}
              onDrop={onDrop}
              onClick={() => fileInput.current?.click()}
              role="button"
              tabIndex={0}
            >
              <div className="mp-drop-glyph">❏</div>
              <div className="mp-drop-title">
                Lay this morning&apos;s pages here
              </div>
              <div className="mp-drop-sub">
                Photograph or drop your handwritten pages. Kitsu reads the hand
                and writes them out.
              </div>
            </div>
          ) : (
            <div className="mp-thumbs">
              {photos.map((p, i) => (
                <div key={i} className="mp-thumb">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.previewUrl} alt={`page ${i + 1}`} />
                  <button
                    className="mp-thumb-x"
                    onClick={() =>
                      setPhotos((ps) => ps.filter((_, j) => j !== i))
                    }
                    aria-label="remove"
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                className="mp-thumb-add"
                onClick={() => fileInput.current?.click()}
              >
                + page
              </button>
            </div>
          )}
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => e.target.files && addFiles(e.target.files)}
          />
          {photos.length > 0 && (
            <button className="mp-go" onClick={onTranscribe}>
              Transcribe {photos.length} page{photos.length > 1 ? "s" : ""} →
            </button>
          )}
        </div>
      )}

      {mode === "write" && (
        <div className="mp-write-wrap">
          <textarea
            className="mp-write"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Three pages. Don't stop, don't steer. Just let the morning out…"
            spellCheck={false}
          />
          <div className="mp-write-foot">
            <span className="mp-pagecount">
              {(wordCount(text) / WORDS_PER_PAGE).toFixed(1)} / {GOAL_PAGES}{" "}
              pages
            </span>
            <button
              className="mp-go"
              disabled={!text.trim()}
              onClick={onWriteContinue}
            >
              Done writing →
            </button>
          </div>
        </div>
      )}

      {mode === "speak" && (
        <SpeakMode text={text} setText={setText} onContinue={onWriteContinue} />
      )}
    </div>
  );
}

/* ════ SPEAK (Web Speech API, graceful) ════ */
function SpeakMode({
  text,
  setText,
  onContinue,
}: {
  text: string;
  setText: (s: string) => void;
  onContinue: () => void;
}) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const recRef = useRef<any>(null);
  const baseRef = useRef("");

  useEffect(() => {
    const SR =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SR) {
      setSupported(false);
      return;
    }
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";
    rec.onresult = (e: any) => {
      let interim = "";
      let final = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += t;
        else interim += t;
      }
      if (final) baseRef.current = `${baseRef.current}${final} `;
      setText(`${baseRef.current}${interim}`);
    };
    rec.onend = () => setListening(false);
    recRef.current = rec;
    return () => {
      try {
        rec.stop();
      } catch {}
    };
  }, [setText]);

  const toggle = () => {
    const rec = recRef.current;
    if (!rec) return;
    if (listening) {
      rec.stop();
      setListening(false);
    } else {
      baseRef.current = text ? `${text} ` : "";
      try {
        rec.start();
        setListening(true);
      } catch {}
    }
  };

  return (
    <div className="mp-speak">
      {!supported ? (
        <div className="mp-speak-unsupported">
          Voice isn&apos;t available in this browser. Try Type or Photograph.
        </div>
      ) : (
        <button
          className={`mp-orb${listening ? " on" : ""}`}
          onClick={toggle}
          aria-pressed={listening}
        >
          <span className="mp-orb-core" />
          <span className="mp-orb-label">
            {listening
              ? "listening — tap to pause"
              : "tap and speak your morning"}
          </span>
        </button>
      )}
      {text && (
        <>
          <div className="mp-speak-transcript">{text}</div>
          <button className="mp-go" onClick={onContinue}>
            Done speaking →
          </button>
        </>
      )}
    </div>
  );
}

/* ════ WORKING (loading) ════ */
function Working({ label, sub }: { label: string; sub: string }) {
  return (
    <div className="mp-working">
      <div className="mp-shimmer">
        <span />
        <span />
        <span />
        <span />
      </div>
      <div className="mp-working-label">{label}</div>
      <div className="mp-working-sub">{sub}</div>
    </div>
  );
}

/* ════ REVIEW (photo | transcription) ════ */
function Review({
  photos,
  text,
  setText,
  onBack,
  onFinalize,
}: {
  photos: { previewUrl: string }[];
  text: string;
  setText: (s: string) => void;
  onBack: () => void;
  onFinalize: () => void;
}) {
  return (
    <div className="mp-review">
      {photos.length > 0 && (
        <div className="mp-review-photos">
          {photos.map((p, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={p.previewUrl} alt={`page ${i + 1}`} />
          ))}
        </div>
      )}
      <div className="mp-review-text">
        <div className="mp-review-label">
          {photos.length > 0
            ? "Kitsu read it like this. Fix anything she misheard."
            : "Read it back before you let it go."}
        </div>
        <textarea
          className="mp-review-area"
          value={text}
          onChange={(e) => setText(e.target.value)}
          spellCheck={false}
        />
        <div className="mp-review-foot">
          <button className="mp-ghost" onClick={onBack}>
            ← back
          </button>
          <button
            className="mp-go"
            disabled={!text.trim()}
            onClick={onFinalize}
          >
            This is right — keep it →
          </button>
        </div>
      </div>
    </div>
  );
}

/* ════ REVEAL (sentiment) ════ */
function Reveal({
  sentiment,
  text,
  onDone,
  onHistory,
}: {
  sentiment: Sentiment;
  text: string;
  onDone: () => void;
  onHistory: () => void;
}) {
  const wash = moodWash(sentiment.score);
  const pages = (wordCount(text) / WORDS_PER_PAGE).toFixed(1);
  return (
    <div
      className="mp-reveal"
      style={{
        ["--wash-from" as string]: wash.from,
        ["--wash-to" as string]: wash.to,
        ["--wash-glow" as string]: wash.glow,
      }}
    >
      <div className="mp-reveal-wash" aria-hidden />
      <div className="mp-reveal-mood">{sentiment.mood || "steady"}</div>
      {sentiment.reflection && (
        <p className="mp-reveal-reflection">{sentiment.reflection}</p>
      )}

      {sentiment.tags?.length > 0 && (
        <div className="mp-chips">
          {sentiment.tags.map((t, i) => (
            <span
              key={t}
              className="mp-chip"
              style={{ animationDelay: `${0.15 + i * 0.09}s` }}
            >
              {t}
            </span>
          ))}
        </div>
      )}

      {sentiment.themes?.length > 0 && (
        <div className="mp-themes">
          <span className="mp-themes-label">what kept circling</span>
          {sentiment.themes.map((t) => (
            <span key={t} className="mp-theme">
              {t}
            </span>
          ))}
        </div>
      )}

      <div className="mp-reveal-meta">
        {pages} pages · kept for {friendlyDate()}
      </div>

      <div className="mp-reveal-foot">
        <button className="mp-ghost" onClick={onHistory}>
          ◷ see your mornings
        </button>
        <button className="mp-go" onClick={onDone}>
          done
        </button>
      </div>
    </div>
  );
}

/* ════ HISTORY ════ */
function HistoryPanel({
  entries,
  onClose,
}: {
  entries: HistoryEntry[] | null;
  onClose: () => void;
}) {
  return (
    <div className="mp-history" role="dialog" aria-label="Your mornings">
      <div className="mp-history-inner">
        <div className="mp-history-head">
          <span>Your mornings</span>
          <button className="mp-ghost" onClick={onClose}>
            close ×
          </button>
        </div>

        {entries === null && (
          <div className="mp-history-empty">opening the scroll…</div>
        )}
        {entries && entries.length === 0 && (
          <div className="mp-history-empty">
            No mornings yet. Today is page one.
          </div>
        )}

        {entries && entries.length > 0 && (
          <>
            <SentimentRibbon entries={entries} />
            <div className="mp-history-list">
              {entries.map((e) => {
                const wash = moodWash(e.sentiment_score ?? 0);
                return (
                  <article
                    key={e.entry_date}
                    className="mp-entry"
                    style={{ ["--dot" as string]: wash.glow }}
                  >
                    <div className="mp-entry-head">
                      <span className="mp-entry-dot" />
                      <span className="mp-entry-date">
                        {friendlyDate(e.entry_date)}
                      </span>
                      {e.tags?.length > 0 && (
                        <span className="mp-entry-tags">
                          {e.tags.slice(0, 3).join(" · ")}
                        </span>
                      )}
                    </div>
                    <p className="mp-entry-text">
                      {(e.cleaned_text || e.raw_text || "").slice(0, 240)}
                      {(e.cleaned_text || e.raw_text || "").length > 240
                        ? "…"
                        : ""}
                    </p>
                  </article>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function SentimentRibbon({ entries }: { entries: HistoryEntry[] }) {
  // oldest → newest, left → right
  const ordered = [...entries].reverse();
  return (
    <div className="mp-ribbon" title="sentiment over time">
      {ordered.map((e) => {
        const s = e.sentiment_score ?? 0;
        const h = 8 + Math.round(((s + 1) / 2) * 28); // 8..36px
        const wash = moodWash(s);
        return (
          <span
            key={e.entry_date}
            className="mp-ribbon-bar"
            style={{ height: `${h}px`, background: wash.glow }}
            title={`${e.entry_date}: ${s.toFixed(2)}`}
          />
        );
      })}
    </div>
  );
}

/* ════ FOXFIRE ════ */
function Foxfire() {
  return (
    <div className="mp-foxfire" aria-hidden>
      {Array.from({ length: 14 }).map((_, i) => (
        <span
          key={i}
          style={{
            left: `${(i * 7.1 + 3) % 100}%`,
            animationDelay: `${i * 1.3}s`,
            animationDuration: `${13 + (i % 5) * 2}s`,
          }}
        />
      ))}
    </div>
  );
}

/* ════ STYLES ════ */
function MorningStyles() {
  return (
    <style>{`
@import url('https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@400;500;600&family=DM+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');

.mp-root {
  --gold:#C9A24C; --gold-deep:#8B6E2A; --amber:#F0C060; --ember:#D87C52;
  --ink:#221a0d; --ink-soft:#4a3f2c; --parchment:#FBF6EA;
  --serif:'Noto Serif JP','Iowan Old Style',Georgia,serif;
  --sans:'DM Sans',system-ui,sans-serif; --mono:'JetBrains Mono',ui-monospace,monospace;
  position:relative; min-height:100vh; overflow-x:hidden; font-family:var(--sans); color:var(--ink);
}
.mp-sky { position:fixed; inset:0; background-image:url('/art/tabs/home-day.webp'); background-size:cover; background-position:center; z-index:0; }
.mp-scrim { position:fixed; inset:0; z-index:1; background:
  radial-gradient(ellipse at 50% 18%, rgba(255,236,200,0.20), transparent 60%),
  linear-gradient(180deg, rgba(245,239,224,0.30) 0%, rgba(245,239,224,0.50) 45%, rgba(40,30,16,0.34) 100%); }
.mp-foxfire { position:fixed; inset:0; z-index:2; pointer-events:none; }
.mp-foxfire span { position:absolute; bottom:-6px; width:4px; height:4px; border-radius:50%;
  background:radial-gradient(circle, rgba(240,192,96,0.95), rgba(240,192,96,0)); animation:mpdrift linear infinite; }
@keyframes mpdrift { 0%{transform:translateY(0);opacity:0} 12%{opacity:.9} 80%{opacity:.45} 100%{transform:translateY(-96vh) translateX(26px);opacity:0} }

.mp-head { position:relative; z-index:5; display:flex; justify-content:space-between; align-items:flex-start; padding:26px 34px; }
/* embedded = rendered inside the OS shell as the Morning tab: clear the top shell bar */
.mp-embedded .mp-head { padding-top: 80px; }
.mp-title { display:flex; flex-direction:column; gap:4px; }
.mp-kanji { font-family:var(--serif); font-size:26px; font-weight:600; color:var(--ink); text-shadow:0 1px 14px rgba(251,246,234,0.9); }
.mp-sub { font-family:var(--mono); font-size:11px; letter-spacing:0.14em; text-transform:uppercase; color:var(--gold-deep); text-shadow:0 1px 10px rgba(251,246,234,0.9); }
.mp-history-btn { font-family:var(--mono); font-size:11px; letter-spacing:0.1em; text-transform:uppercase; color:var(--ink-soft);
  background:rgba(251,246,234,0.6); border:1px solid rgba(201,162,76,0.5); border-radius:999px; padding:9px 15px; cursor:pointer; backdrop-filter:blur(8px); transition:all 200ms ease; }
.mp-history-btn:hover { background:var(--amber); color:#1a160f; }

.mp-error { position:relative; z-index:5; margin:0 34px 8px; padding:10px 14px; border-radius:10px; background:rgba(181,86,75,0.16); border:1px solid rgba(181,86,75,0.4); color:#7a2b22; font-size:13px; }

.mp-stage { position:relative; z-index:4; max-width:1000px; margin:0 auto; padding:2vh 24px 12vh; }

/* compose */
.mp-compose { display:flex; flex-direction:column; align-items:center; gap:26px; }
.mp-modes { display:inline-flex; gap:6px; background:rgba(20,14,6,0.28); border:1px solid rgba(240,192,96,0.3); border-radius:999px; padding:5px; backdrop-filter:blur(8px); }
.mp-mode { display:inline-flex; align-items:center; gap:8px; font-family:var(--mono); font-size:11px; letter-spacing:0.08em; text-transform:uppercase; color:rgba(255,247,230,0.8); background:transparent; border:none; border-radius:999px; padding:9px 16px; cursor:pointer; transition:all 200ms ease; }
.mp-mode-glyph { font-size:14px; }
.mp-mode.on { background:var(--amber); color:#1a160f; }

/* photo drop */
.mp-photo { width:100%; max-width:720px; display:flex; flex-direction:column; align-items:center; gap:20px; }
.mp-drop { width:100%; min-height:340px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:14px; text-align:center;
  background:linear-gradient(180deg, rgba(251,246,234,0.72), rgba(251,246,234,0.58)); border:2px dashed rgba(201,162,76,0.6); border-radius:18px; cursor:pointer;
  box-shadow:0 20px 60px rgba(60,44,18,0.16); transition:all 240ms ease; padding:40px; backdrop-filter:blur(4px); }
.mp-drop:hover { border-color:var(--amber); background:linear-gradient(180deg, rgba(251,246,234,0.82), rgba(251,246,234,0.66)); transform:translateY(-2px); }
.mp-drop-glyph { font-size:54px; color:var(--gold); }
.mp-drop-title { font-family:var(--serif); font-size:26px; font-weight:500; color:var(--ink); }
.mp-drop-sub { font-size:14px; line-height:1.5; color:var(--ink-soft); max-width:42ch; }
.mp-thumbs { display:flex; flex-wrap:wrap; gap:14px; justify-content:center; }
.mp-thumb { position:relative; width:150px; height:200px; border-radius:10px; overflow:hidden; border:1px solid rgba(201,162,76,0.5); box-shadow:0 8px 24px rgba(60,44,18,0.2); }
.mp-thumb img { width:100%; height:100%; object-fit:cover; }
.mp-thumb-x { position:absolute; top:6px; right:6px; width:24px; height:24px; border-radius:50%; border:none; background:rgba(20,14,6,0.7); color:#fff; cursor:pointer; font-size:15px; line-height:1; }
.mp-thumb-add { width:150px; height:200px; border-radius:10px; border:2px dashed rgba(201,162,76,0.6); background:rgba(251,246,234,0.5); color:var(--gold-deep); font-family:var(--mono); font-size:12px; cursor:pointer; }

.mp-go { font-family:var(--mono); font-size:12px; letter-spacing:0.1em; text-transform:uppercase; color:#1a160f; background:var(--amber); border:none; border-radius:999px; padding:13px 26px; cursor:pointer; box-shadow:0 6px 20px rgba(240,192,96,0.45); transition:all 200ms ease; }
.mp-go:hover:not(:disabled) { transform:translateY(-2px); box-shadow:0 10px 28px rgba(240,192,96,0.6); }
.mp-go:disabled { opacity:0.4; cursor:default; }
.mp-ghost { font-family:var(--mono); font-size:11px; letter-spacing:0.1em; text-transform:uppercase; color:var(--ink-soft); background:transparent; border:1px solid rgba(139,110,42,0.4); border-radius:999px; padding:11px 18px; cursor:pointer; }

/* write */
.mp-write-wrap { width:100%; max-width:680px; }
.mp-write { width:100%; min-height:58vh; resize:none; border:none; outline:none; background:rgba(251,246,234,0.6); border-radius:14px; padding:30px 34px;
  font-family:var(--serif); font-size:20px; line-height:1.9; color:var(--ink); caret-color:var(--ember); box-shadow:0 20px 60px rgba(60,44,18,0.14); backdrop-filter:blur(4px); }
.mp-write::placeholder { color:rgba(74,63,44,0.55); font-style:italic; }
.mp-write-foot { display:flex; justify-content:space-between; align-items:center; margin-top:16px; }
.mp-pagecount { font-family:var(--mono); font-size:12px; color:var(--gold-deep); }

/* speak */
.mp-speak { display:flex; flex-direction:column; align-items:center; gap:24px; padding-top:20px; }
.mp-orb { display:flex; flex-direction:column; align-items:center; gap:16px; background:none; border:none; cursor:pointer; }
.mp-orb-core { width:120px; height:120px; border-radius:50%; background:radial-gradient(circle at 40% 35%, rgba(255,238,196,0.95), rgba(240,192,96,0.5) 55%, rgba(216,124,82,0.3)); box-shadow:0 0 40px rgba(240,192,96,0.5); transition:transform 600ms ease; }
.mp-orb.on .mp-orb-core { animation:mpbreathe 2.4s ease-in-out infinite; }
@keyframes mpbreathe { 0%,100%{transform:scale(1)} 50%{transform:scale(1.12)} }
.mp-orb-label { font-family:var(--mono); font-size:11px; letter-spacing:0.1em; text-transform:uppercase; color:var(--ink-soft); text-shadow:0 1px 10px rgba(251,246,234,0.9); }
.mp-speak-transcript { width:100%; max-width:620px; background:rgba(251,246,234,0.62); border-radius:14px; padding:24px 28px; font-family:var(--serif); font-size:19px; line-height:1.8; color:var(--ink); }
.mp-speak-unsupported { font-size:14px; color:var(--ink-soft); background:rgba(251,246,234,0.6); padding:18px 22px; border-radius:12px; }

/* working */
.mp-working { display:flex; flex-direction:column; align-items:center; gap:14px; padding:14vh 0; }
.mp-shimmer { display:flex; flex-direction:column; gap:10px; width:min(420px,80vw); }
.mp-shimmer span { height:14px; border-radius:6px; background:linear-gradient(90deg, rgba(251,246,234,0.4), rgba(240,192,96,0.55), rgba(251,246,234,0.4)); background-size:200% 100%; animation:mpsh 1.4s ease-in-out infinite; }
.mp-shimmer span:nth-child(2){width:88%} .mp-shimmer span:nth-child(3){width:72%} .mp-shimmer span:nth-child(4){width:90%}
@keyframes mpsh { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
.mp-working-label { font-family:var(--serif); font-size:24px; font-style:italic; color:var(--ink); text-shadow:0 1px 12px rgba(251,246,234,0.9); margin-top:10px; }
.mp-working-sub { font-family:var(--mono); font-size:11px; letter-spacing:0.1em; text-transform:uppercase; color:var(--gold-deep); }

/* review */
.mp-review { display:grid; grid-template-columns:minmax(0,300px) 1fr; gap:24px; align-items:start; }
.mp-review-photos { position:sticky; top:24px; display:flex; flex-direction:column; gap:12px; }
.mp-review-photos img { width:100%; border-radius:10px; border:1px solid rgba(201,162,76,0.5); box-shadow:0 8px 24px rgba(60,44,18,0.2); }
.mp-review-label { font-family:var(--mono); font-size:11px; letter-spacing:0.1em; text-transform:uppercase; color:var(--gold-deep); margin-bottom:12px; }
.mp-review-area { width:100%; min-height:54vh; resize:none; border:none; outline:none; background:rgba(251,246,234,0.66); border-radius:14px; padding:26px 30px;
  font-family:var(--serif); font-size:19px; line-height:1.85; color:var(--ink); caret-color:var(--ember); box-shadow:0 20px 60px rgba(60,44,18,0.14); }
.mp-review-foot { display:flex; justify-content:space-between; align-items:center; margin-top:16px; }

/* reveal */
.mp-reveal { position:relative; max-width:600px; margin:5vh auto 0; text-align:center; padding:48px 44px;
  background:linear-gradient(180deg, rgba(251,246,234,0.82), rgba(251,246,234,0.7));
  border-radius:22px; box-shadow:0 24px 70px rgba(60,44,18,0.26); backdrop-filter:blur(6px);
  border:1px solid rgba(201,162,76,0.4); }
.mp-reveal-wash { position:absolute; inset:-50px; z-index:-1; border-radius:50px;
  background:radial-gradient(ellipse at 50% 40%, var(--wash-from), var(--wash-to) 70%, transparent); filter:blur(26px); animation:mpfade 1.2s ease both; }
@keyframes mpfade { from{opacity:0} to{opacity:1} }
.mp-reveal-mood { font-family:var(--serif); font-size:42px; font-weight:600; color:var(--ink); text-shadow:0 2px 24px var(--wash-glow); animation:mprise 0.8s ease both; }
.mp-reveal-reflection { font-family:var(--serif); font-size:21px; font-style:italic; line-height:1.6; color:var(--ink-soft); max-width:34ch; margin:18px auto 26px; animation:mprise 0.9s 0.15s ease both; }
@keyframes mprise { from{opacity:0; transform:translateY(14px)} to{opacity:1; transform:translateY(0)} }
.mp-chips { display:flex; flex-wrap:wrap; gap:9px; justify-content:center; margin-bottom:22px; }
.mp-chip { font-family:var(--sans); font-size:13px; font-weight:500; color:#1a160f; background:rgba(255,255,255,0.66); border:1px solid var(--gold); border-radius:999px; padding:7px 14px; animation:mprise 0.6s ease both; }
.mp-themes { display:flex; flex-wrap:wrap; gap:10px; justify-content:center; align-items:center; margin-bottom:28px; }
.mp-themes-label { font-family:var(--mono); font-size:10px; letter-spacing:0.14em; text-transform:uppercase; color:var(--gold-deep); width:100%; }
.mp-theme { font-family:var(--serif); font-size:16px; font-style:italic; color:var(--ink-soft); }
.mp-theme:not(:last-child)::after { content:" ·"; color:var(--gold); }
.mp-reveal-meta { font-family:var(--mono); font-size:11px; letter-spacing:0.1em; text-transform:uppercase; color:var(--gold-deep); margin-bottom:24px; }
.mp-reveal-foot { display:flex; gap:14px; justify-content:center; }

/* history */
.mp-history { position:fixed; inset:0; z-index:30; background:rgba(20,14,6,0.5); backdrop-filter:blur(6px); display:flex; justify-content:flex-end; }
.mp-history-inner { width:min(560px,100%); height:100%; overflow-y:auto; background:linear-gradient(180deg, #FBF6EA, #F2E9D2); box-shadow:-20px 0 60px rgba(0,0,0,0.3); padding:26px 30px; }
.mp-history-head { display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; font-family:var(--serif); font-size:20px; color:var(--ink); }
.mp-history-empty { font-family:var(--serif); font-style:italic; color:var(--ink-soft); padding:30px 0; }
.mp-ribbon { display:flex; align-items:flex-end; gap:3px; height:40px; padding:8px 0 14px; border-bottom:1px solid rgba(139,110,42,0.2); margin-bottom:18px; }
.mp-ribbon-bar { flex:1; min-width:2px; border-radius:2px 2px 0 0; opacity:0.85; }
.mp-history-list { display:flex; flex-direction:column; gap:4px; }
.mp-entry { padding:16px 4px; border-bottom:1px solid rgba(139,110,42,0.14); }
.mp-entry-head { display:flex; align-items:center; gap:10px; margin-bottom:7px; }
.mp-entry-dot { width:9px; height:9px; border-radius:50%; background:var(--dot); box-shadow:0 0 8px var(--dot); }
.mp-entry-date { font-family:var(--mono); font-size:11px; letter-spacing:0.08em; text-transform:uppercase; color:var(--gold-deep); }
.mp-entry-tags { font-family:var(--mono); font-size:10px; color:var(--ink-soft); opacity:0.7; margin-left:auto; }
.mp-entry-text { font-family:var(--serif); font-size:15px; line-height:1.6; color:var(--ink-soft); margin:0; }

@media (max-width:768px) {
  .mp-head { padding:18px 18px; }
  .mp-review { grid-template-columns:1fr; }
  .mp-review-photos { position:static; flex-direction:row; overflow-x:auto; }
  .mp-review-photos img { width:140px; }
}
@media (prefers-reduced-motion: reduce) {
  .mp-foxfire span, .mp-orb.on .mp-orb-core, .mp-shimmer span { animation:none; }
}
    `}</style>
  );
}
