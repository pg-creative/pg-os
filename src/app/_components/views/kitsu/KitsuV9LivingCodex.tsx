"use client";

/**
 * KitsuV9LivingCodex — TEMPORAL SCROLL.
 *
 * The Kitsu tab as Kitsu's running diary. One continuous vellum scroll
 * where TIME is the structural axis. Today's vellum page sits at the top,
 * scroll DOWN to enter history (yesterday, the day before, last week).
 * No rails. No drawers. No bento cards. The page itself is the composition.
 *
 * - SOUL: four illuminated drop-cap incipits (魂 心 人 記) crown each day's
 *   page, Book-of-Hours style. Tap one to expand its inscription inline
 *   inside the page; tap again to fold it back. Soul is not a sidebar.
 *   It is the literal opening of the page.
 * - TODAY: an auto-summarized entry in Kitsu's voice woven from the day's
 *   decision-log, with the day's chat turns quoted inline as marginalia
 *   inside the journal entry.
 * - TOOLS: every tool call today appears as a small icon tile inside the
 *   margin of today's entry — not stacked in a separate panel, but
 *   sprinkled into the running text where it happened.
 * - HISTORY: each previous day is its own vellum page below today's,
 *   separated by a kintsugi seam. Older pages have less detail (the
 *   journal compresses as it ages).
 * - COMPOSER: sits at the very TOP of today's page. Type a line, hit
 *   send, and it appends to today's entry in real time as a quoted bubble.
 */

import { useEffect, useMemo, useRef, type CSSProperties } from "react";
import { useMarvis } from "../cockpit/useMarvis";
import { useMode } from "../../ModeProvider";
import { phaseForMode } from "../../bento/emakiContext";
import { PHASES } from "../../emaki/theme";
import {
  ChatComposer,
  StatePill,
  useSoul,
  type SoulKey,
} from "./KitsuShared";
import { useState } from "react";

const INCIPITS: Array<{ key: SoulKey; glyph: string; label: string }> = [
  { key: "IDENTITY", glyph: "魂", label: "Identity" },
  { key: "SOUL",     glyph: "心", label: "Soul" },
  { key: "USER",     glyph: "人", label: "User" },
  { key: "MEMORY",   glyph: "記", label: "Memory" },
];

function toolGlyph(tool: string): string {
  if (tool.startsWith("read_")) return "◇";
  if (tool === "monitor_fleet") return "◎";
  if (tool.startsWith("control_")) return "◈";
  if (tool.startsWith("propose_")) return "△";
  if (tool.startsWith("add_")) return "✦";
  if (tool.startsWith("launch_")) return "▷";
  if (tool.startsWith("kill_")) return "▽";
  if (tool === "remember") return "記";
  if (tool === "update_user") return "人";
  if (tool === "update_soul") return "心";
  if (tool === "complete_habit") return "✓";
  return "○";
}

interface ParsedLog {
  date: string; // YYYY-MM-DD
  pretty: string; // "Saturday, May 23"
  entries: Array<{ ts: string; line: string; tool?: string }>;
}

// Parse the decision-log into bucketed pages by day. The log is line-based;
// each line typically looks like "[2026-05-23 15:42] launched personal-os
// session. PG corrected: …" We bucket by YYYY-MM-DD prefix.
function parseLog(raw: string): ParsedLog[] {
  const lines = raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const buckets = new Map<string, ParsedLog>();
  for (const line of lines) {
    const m = line.match(/^\[(\d{4}-\d{2}-\d{2})\s+([\d:]+)\]\s*(.*)$/);
    const date = m ? m[1] : "undated";
    const ts = m ? m[2] : "";
    const text = m ? m[3] : line;
    const toolMatch = text.match(/(?:^|\s)((?:read_|control_|propose_|add_|launch_|kill_|monitor_)[a-z_]+|remember|update_user|update_soul|complete_habit)/);
    const tool = toolMatch ? toolMatch[1] : undefined;
    if (!buckets.has(date)) {
      let pretty = date;
      try {
        const d = new Date(date);
        if (!Number.isNaN(d.getTime())) {
          pretty = d.toLocaleDateString(undefined, {
            weekday: "long",
            month: "long",
            day: "numeric",
          });
        }
      } catch { /* fall through */ }
      buckets.set(date, { date, pretty, entries: [] });
    }
    buckets.get(date)!.entries.push({ ts, line: text, tool });
  }
  // Newest day first; entries within a day newest first.
  const pages = Array.from(buckets.values()).sort((a, b) =>
    a.date < b.date ? 1 : -1,
  );
  pages.forEach((p) => p.entries.reverse());
  return pages;
}

export function KitsuV9LivingCodex() {
  const marvis = useMarvis();
  const { mode } = useMode();
  const phase = phaseForMode(mode);
  const tk = PHASES[phase];
  const soul = useSoul();
  const [openIncipit, setOpenIncipit] = useState<SoulKey | null>(null);

  // Parse the decision-log into dated pages.
  const pages = useMemo(
    () => parseLog(soul.files?.["decision-log"] ?? ""),
    [soul.files],
  );

  // Today's date as YYYY-MM-DD for matching against the top page.
  const todayDate = useMemo(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  }, []);

  const todayPretty = useMemo(() => {
    return new Date().toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  }, []);

  // Ensure today's page exists at the top even if no log entries yet.
  const codex: ParsedLog[] = useMemo(() => {
    if (pages.length === 0 || pages[0].date !== todayDate) {
      return [{ date: todayDate, pretty: todayPretty, entries: [] }, ...pages];
    }
    return pages;
  }, [pages, todayDate, todayPretty]);

  // The vellum cream shifts a hair with phase; the painted desk shows at margins.
  const vellumBg =
    phase === "day"
      ? "linear-gradient(180deg, #faf3df 0%, #f0e6cb 100%)"
      : phase === "twilight"
        ? "linear-gradient(180deg, #f0e6e0 0%, #e0d2cc 100%)"
        : "linear-gradient(180deg, #ede1c4 0%, #d8c8a4 100%)";
  const vellumInk =
    phase === "day" ? "#1f1409" : phase === "twilight" ? "#241420" : "#22180a";
  const vellumGold = phase === "day" ? "#8c5c08" : phase === "twilight" ? "#7a4868" : "#a86810";
  const vellumMuted =
    phase === "day" ? "#5a4014" : phase === "twilight" ? "#54344e" : "#5e4818";

  return (
    <div
      style={{
        position: "relative",
        minHeight: "calc(100dvh - 56px)",
        color: tk.textPrimary,
        background: tk.bg,
        fontFamily: "'DM Sans', system-ui, sans-serif",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@300;400;700&family=DM+Sans:wght@400;500;600;700&display=swap');

        .v9-desk {
          position: absolute;
          inset: 0;
          background-image: url('/kitsu/den-${phase === "day" ? "day" : phase === "twilight" ? "twilight" : "night"}.webp');
          background-size: cover;
          background-position: center;
          opacity: 0.35;
          pointer-events: none;
        }
        .v9-desk-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, rgba(10,8,6,0.65) 0%, rgba(10,8,6,0.40) 100%);
          pointer-events: none;
        }

        .v9-shell {
          position: relative;
          z-index: 2;
          padding: 32px 24px 80px;
          max-width: 880px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        @media (min-width: 1024px) {
          .v9-shell { padding: 40px 32px 100px; max-width: 940px; }
        }

        /* Hero: the codex title + state pill */
        .v9-hero {
          display: flex;
          align-items: flex-end;
          gap: 16px;
          padding-bottom: 12px;
          border-bottom: 1px solid ${tk.divider};
        }
        .v9-hero-kanji {
          font-family: 'Noto Serif JP', serif;
          font-weight: 700;
          font-size: clamp(34px, 4vw, 54px);
          line-height: 1;
          color: ${tk.foxfire};
          text-shadow: 0 0 16px ${tk.foxfireGlow}, 0 2px 6px rgba(0,0,0,0.7);
        }
        .v9-hero-stack { display: flex; flex-direction: column; gap: 3px; }
        .v9-hero-title {
          font-family: 'Noto Serif JP', serif;
          font-size: clamp(20px, 2.6vw, 28px);
          font-weight: 700;
          color: ${tk.textPrimary};
          text-shadow: 0 1px 4px rgba(0,0,0,0.6);
        }
        .v9-hero-sub {
          font-family: 'DM Sans', sans-serif;
          font-size: 12px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: ${tk.textSub};
        }

        /* Vellum page */
        .v9-page {
          position: relative;
          background: ${vellumBg};
          color: ${vellumInk};
          border: 1px solid ${vellumGold}66;
          border-radius: 6px;
          padding: 28px 32px 32px;
          box-shadow:
            0 6px 24px rgba(0,0,0,0.45),
            inset 0 0 0 1px rgba(255,255,255,0.18),
            inset 1.5px 0 0 ${vellumGold}88;
        }
        /* Kintsugi gold edge at the top */
        .v9-page::before {
          content: '';
          position: absolute;
          top: -1px; left: -1px; right: -1px;
          height: 2px;
          background: linear-gradient(90deg,
            transparent 0%, ${vellumGold}aa 30%, ${vellumGold} 50%,
            ${vellumGold}aa 70%, transparent 100%);
        }
        .v9-page-today {
          box-shadow:
            0 10px 40px rgba(0,0,0,0.6),
            inset 0 0 0 1px rgba(255,255,255,0.22),
            inset 1.5px 0 0 ${vellumGold}aa,
            0 0 0 1px ${vellumGold}55;
        }

        .v9-page-head {
          display: flex;
          align-items: baseline;
          gap: 12px;
          margin-bottom: 18px;
          padding-bottom: 12px;
          border-bottom: 1px dashed ${vellumGold}66;
        }
        .v9-page-day {
          font-family: 'Noto Serif JP', serif;
          font-size: 18px;
          font-weight: 700;
          color: ${vellumInk};
          letter-spacing: 0.04em;
        }
        .v9-page-meta {
          font-family: 'DM Sans', sans-serif;
          font-size: 11px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: ${vellumMuted};
          opacity: 0.85;
        }

        /* Incipits: drop-cap kanji row */
        .v9-incipits {
          display: flex;
          gap: 18px;
          margin-bottom: 16px;
          flex-wrap: wrap;
        }
        .v9-incipit {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          cursor: pointer;
          background: transparent;
          border: none;
          padding: 0;
          font-family: inherit;
          color: ${vellumInk};
          touch-action: manipulation;
        }
        .v9-incipit-glyph {
          font-family: 'Noto Serif JP', serif;
          font-size: 42px;
          line-height: 1;
          color: ${vellumGold};
          padding: 6px 12px;
          border: 1.5px solid ${vellumGold}55;
          border-radius: 6px;
          background:
            radial-gradient(circle at 30% 25%, ${vellumGold}22, transparent 70%),
            linear-gradient(180deg, transparent 0%, ${vellumGold}10 100%);
          transition: background 200ms ease, color 200ms ease, transform 200ms ease;
        }
        .v9-incipit:hover .v9-incipit-glyph,
        .v9-incipit:focus-visible .v9-incipit-glyph {
          background: ${vellumGold}22;
          transform: translateY(-1px);
        }
        .v9-incipit-glyph[data-open="true"] {
          background: ${vellumGold}33;
          color: ${vellumInk};
        }
        .v9-incipit-label {
          font-family: 'DM Sans', sans-serif;
          font-size: 9px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: ${vellumMuted};
        }

        /* Inline incipit inscription */
        .v9-inscription {
          margin: 0 0 18px;
          padding: 14px 18px;
          background: ${vellumGold}10;
          border-left: 3px solid ${vellumGold};
          border-radius: 0 4px 4px 0;
          font-family: 'Noto Serif JP', serif;
          font-size: 14px;
          line-height: 1.7;
          color: ${vellumInk};
          white-space: pre-wrap;
        }

        /* Journal prose */
        .v9-prose {
          font-family: 'Noto Serif JP', serif;
          font-size: 16px;
          line-height: 1.7;
          color: ${vellumInk};
        }
        .v9-prose p { margin: 0 0 12px; }

        /* Tool tile sprinkled inline in margin */
        .v9-tool {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 1px 8px;
          margin: 0 2px;
          background: ${vellumGold}1a;
          border: 1px solid ${vellumGold}55;
          border-radius: 999px;
          font-family: 'DM Sans', sans-serif;
          font-size: 11px;
          letter-spacing: 0.05em;
          color: ${vellumMuted};
          vertical-align: 1px;
          white-space: nowrap;
        }
        .v9-tool-glyph {
          font-family: 'Noto Serif JP', serif;
          color: ${vellumGold};
          font-size: 12px;
        }

        /* Chat turns quoted inline */
        .v9-quote {
          margin: 12px 0;
          padding: 10px 16px;
          border-left: 2px solid ${vellumGold}66;
          background: ${vellumGold}08;
          font-family: 'Noto Serif JP', serif;
          font-size: 14px;
          line-height: 1.6;
          color: ${vellumInk};
        }
        .v9-quote[data-role="user"] {
          border-left-color: ${vellumMuted}66;
          background: ${vellumMuted}0d;
          color: ${vellumInk};
        }
        .v9-quote-tag {
          display: block;
          font-family: 'DM Sans', sans-serif;
          font-size: 10px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: ${vellumMuted};
          margin-bottom: 4px;
          opacity: 0.85;
        }

        /* Composer mounted at the very top of today's page */
        .v9-composer-row {
          margin-bottom: 22px;
          padding: 0;
        }
        /* Chat composer comes with its own dark bg; override visually */
        .v9-composer-row form {
          background: ${vellumGold}10 !important;
          border-top: none !important;
          border: 1px solid ${vellumGold}55 !important;
          border-radius: 8px !important;
        }
        .v9-composer-row input {
          background: rgba(255,255,255,0.45) !important;
          color: ${vellumInk} !important;
          border-color: ${vellumGold}88 !important;
        }
        .v9-composer-row input::placeholder { color: ${vellumMuted}aa !important; }
        .v9-composer-row button {
          background: rgba(255,255,255,0.55) !important;
        }

        /* History (older pages compress) */
        .v9-page-history {
          opacity: 0.92;
          transform: scale(0.985);
        }
        .v9-page-history .v9-prose { font-size: 14px; }
        .v9-page-history .v9-incipits { display: none; }

        /* Kintsugi seam between days */
        .v9-seam {
          height: 2px;
          margin: 6px 0;
          background: linear-gradient(90deg,
            transparent 0%, ${tk.gold}aa 30%, ${tk.goldBright} 50%,
            ${tk.gold}aa 70%, transparent 100%);
          clip-path: polygon(0% 50%, 6% 15%, 13% 72%, 21% 28%, 29% 65%, 37% 8%, 45% 78%, 53% 22%, 61% 62%, 69% 32%, 77% 58%, 85% 12%, 93% 68%, 100% 50%);
          opacity: 0.7;
        }
      `}</style>

      <div className="v9-desk" aria-hidden />
      <div className="v9-desk-overlay" aria-hidden />

      <div className="v9-shell">
        {/* Hero */}
        <div className="v9-hero">
          <span className="v9-hero-kanji">記</span>
          <div className="v9-hero-stack">
            <span className="v9-hero-title">Kitsu's Codex</span>
            <span className="v9-hero-sub">
              {tk.eyebrowLabel} · conservative
            </span>
          </div>
          <span style={{ flex: 1 }} />
          <StatePill state={marvis.state} />
        </div>

        {/* Today's vellum page */}
        {codex.length > 0 && (
          <TodayPage
            page={codex[0]}
            todayPretty={todayPretty}
            marvis={marvis}
            soul={soul}
            openIncipit={openIncipit}
            setOpenIncipit={setOpenIncipit}
            vellumInk={vellumInk}
            vellumGold={vellumGold}
            vellumMuted={vellumMuted}
          />
        )}

        {/* History pages */}
        {codex.slice(1).map((p, i) => (
          <div key={p.date + i}>
            <div className="v9-seam" aria-hidden />
            <article className="v9-page v9-page-history">
              <header className="v9-page-head">
                <span className="v9-page-day">{p.pretty}</span>
                <span className="v9-page-meta">
                  {p.entries.length} {p.entries.length === 1 ? "entry" : "entries"}
                </span>
              </header>
              <div className="v9-prose">
                {p.entries.length === 0 && (
                  <p style={{ fontStyle: "italic", color: vellumMuted }}>
                    (the page is blank)
                  </p>
                )}
                {p.entries.slice(0, 5).map((e, k) => (
                  <p key={k}>
                    <span
                      style={{
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: 11,
                        letterSpacing: "0.05em",
                        color: vellumMuted,
                        marginRight: 8,
                      }}
                    >
                      {e.ts}
                    </span>
                    {e.line}
                    {e.tool && (
                      <span className="v9-tool" title={e.tool}>
                        <span className="v9-tool-glyph">{toolGlyph(e.tool)}</span>
                        {e.tool}
                      </span>
                    )}
                  </p>
                ))}
                {p.entries.length > 5 && (
                  <p style={{ color: vellumMuted, fontStyle: "italic" }}>
                    + {p.entries.length - 5} more, faded into the binding.
                  </p>
                )}
              </div>
            </article>
          </div>
        ))}

        {codex.length === 0 && (
          <div
            style={{
              padding: 60,
              textAlign: "center",
              fontFamily: "'Noto Serif JP', serif",
              fontSize: 16,
              color: tk.textSub,
              fontStyle: "italic",
            }}
          >
            The codex is fresh. Write Kitsu a line above to begin today's page.
          </div>
        )}
      </div>
    </div>
  );
}

// ── Today page ─────────────────────────────────────────────────────────────

interface TodayPageProps {
  page: ParsedLog;
  todayPretty: string;
  marvis: ReturnType<typeof useMarvis>;
  soul: ReturnType<typeof useSoul>;
  openIncipit: SoulKey | null;
  setOpenIncipit: (k: SoulKey | null) => void;
  vellumInk: string;
  vellumGold: string;
  vellumMuted: string;
}

function TodayPage({
  page,
  todayPretty,
  marvis,
  soul,
  openIncipit,
  setOpenIncipit,
  vellumInk,
  vellumGold,
  vellumMuted,
}: TodayPageProps) {
  // Scroll-to-top on send (composer at top, transcript flows below).
  const topRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [marvis.turns.length]);

  return (
    <article className="v9-page v9-page-today" ref={topRef}>
      <header className="v9-page-head">
        <span className="v9-page-day">Today · {todayPretty}</span>
        <span className="v9-page-meta">
          {page.entries.length} {page.entries.length === 1 ? "decision" : "decisions"}
          {marvis.turns.length > 0 ? ` · ${marvis.turns.length} exchanges` : ""}
        </span>
      </header>

      {/* Incipits: drop-cap row */}
      <div className="v9-incipits" role="tablist" aria-label="Soul facets">
        {INCIPITS.map(({ key, glyph, label }) => {
          const isOpen = openIncipit === key;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={isOpen}
              className="v9-incipit"
              onClick={() => setOpenIncipit(isOpen ? null : key)}
              title={label}
            >
              <span className="v9-incipit-glyph" data-open={isOpen ? "true" : "false"}>
                {glyph}
              </span>
              <span className="v9-incipit-label">{label}</span>
            </button>
          );
        })}
      </div>

      {openIncipit && (
        <div className="v9-inscription" role="dialog" aria-label="Incipit inscription">
          {soul.loading
            ? "…"
            : (soul.files?.[openIncipit] || "(this incipit has not been written yet)")
                .split("\n")
                .slice(0, 16)
                .join("\n")}
        </div>
      )}

      {/* Composer at the top of today's page */}
      <div className="v9-composer-row">
        <ChatComposer
          marvis={marvis}
          placeholder="append to today's page…"
        />
      </div>

      {/* Live state: thinking / listening */}
      {marvis.state === "thinking" && marvis.activeTool && (
        <div
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 11,
            letterSpacing: "0.06em",
            color: vellumMuted,
            opacity: 0.85,
            marginBottom: 12,
          }}
        >
          <span className="v9-tool" title={marvis.activeTool}>
            <span className="v9-tool-glyph">{toolGlyph(marvis.activeTool)}</span>
            {marvis.activeTool}
          </span>{" "}
          (writing into the page)
        </div>
      )}

      {/* Today's transcript woven into the journal */}
      <div className="v9-prose">
        {marvis.turns.length === 0 && page.entries.length === 0 && (
          <p style={{ fontStyle: "italic", color: vellumMuted }}>
            A blank page. Nothing has been written today yet.
          </p>
        )}

        {/* Quoted chat turns (most recent first so today's page reads top-down freshest) */}
        {marvis.turns.slice().reverse().map((t, i) => (
          <div key={`turn-${i}`} className="v9-quote" data-role={t.role}>
            <span className="v9-quote-tag">
              {t.role === "user" ? "PG" : "Kitsu"}
            </span>
            {t.text}
          </div>
        ))}
        {(marvis.state === "thinking" || marvis.state === "speaking") &&
          marvis.reply && (
            <div className="v9-quote" data-role="assistant" style={{ opacity: 0.85 }}>
              <span className="v9-quote-tag">Kitsu</span>
              {marvis.reply}
            </div>
          )}

        {/* Today's decision-log entries */}
        {page.entries.length > 0 && (
          <p
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 11,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: vellumMuted,
              margin: "16px 0 6px",
            }}
          >
            What I did today
          </p>
        )}
        {page.entries.map((e, k) => (
          <p key={k}>
            <span
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 11,
                letterSpacing: "0.05em",
                color: vellumMuted,
                marginRight: 8,
              }}
            >
              {e.ts}
            </span>
            {e.line}
            {e.tool && (
              <span className="v9-tool" title={e.tool}>
                <span className="v9-tool-glyph">{toolGlyph(e.tool)}</span>
                {e.tool}
              </span>
            )}
          </p>
        ))}
      </div>
    </article>
  );
}
