"use client";

/**
 * Morning Pages — Design Lab (Brick 1).
 *
 * Section-by-section bake-off, ROUND 1 = THE WRITING CANVAS (highest visual
 * leverage). Four radically different paradigms over the locked Emaki × Laputa
 * DNA (cream/parchment + amber/gold + deep ink, Noto Serif JP display + sans body,
 * real painted golden-hour backdrops). All four share ONE editor engine
 * (useMorningEditor) so the ONLY variable PG judges is the aesthetic paradigm.
 *
 * V1 EMAKI SCROLL        Painted dawn sanctuary. Floating cream parchment column
 *                        over a real golden-hour painting, drifting foxfire,
 *                        Noto Serif JP ink, typewriter focus-fade, hover-only
 *                        3-page progress arc. The contemplative painted world.
 *
 * V2 INK & PAPER         A real handmade-paper notebook. No photo backdrop — warm
 *                        paper grain, a single hairline gold margin rule, ruled
 *                        baseline, page-sheets-filling progress. "It's an actual
 *                        journal, not a screen."
 *
 * V3 DAWN HORIZON        Light responds to you. The painted sky IS the surface and
 *                        the sun RISES as you write — pre-dawn twilight brightens to
 *                        full golden morning as you near 3 pages. Most experiential.
 *
 * V4 FALSIFIER · CLEAN   Anti-style control (design-anti-generic rule 9). Crisp
 *                        modern notes editor: near-white, system sans, visible
 *                        chrome, linear progress. Credible but soulless. If this
 *                        wins, the painterly direction is the problem.
 *
 * Sources: ~/.claude/research/pgos-aesthetic-lock-2026-05.md + visual-style.md +
 * 5 section-research agents (canvas / sentiment / history / handwriting / voice).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type VariantId = "v1-emaki" | "v2-paper" | "v3-dawn" | "v4-falsifier";

const ORDER: VariantId[] = ["v1-emaki", "v2-paper", "v3-dawn", "v4-falsifier"];

const META: Record<
  VariantId,
  { num: string; name: string; tagline: string; tradeoffs: string }
> = {
  "v1-emaki": {
    num: "V1",
    name: "Emaki Scroll",
    tagline:
      "painted dawn sanctuary · floating parchment · foxfire · serif ink",
    tradeoffs:
      "The locked DNA at full strength. A real golden-hour painting carries the surface; a floating cream parchment column holds the writing. Typewriter focus-fade, drifting foxfire, hover-only 3-page arc. Bets the morning ritual should feel like stepping into a painted world.",
  },
  "v2-paper": {
    num: "V2",
    name: "Ink & Paper",
    tagline: "real notebook · paper grain · gold margin rule · sheets filling",
    tradeoffs:
      "No photo. A warm handmade-paper sheet with a hairline gold margin rule and a faint ruled baseline — the analog morning-pages notebook, digitized. Progress is three sheets filling, not a number. Bets that quiet realism beats spectacle for a daily writing habit.",
  },
  "v3-dawn": {
    num: "V3",
    name: "Dawn Horizon",
    tagline: "light responds to you · the sun rises as you write · kinetic",
    tradeoffs:
      "The painted sky IS the page, and it brightens as you write — pre-dawn twilight at word one, full golden morning by page three. Light as the reward. Bets that tying the scene to your effort makes showing up feel earned. Most motion, most ambitious.",
  },
  "v4-falsifier": {
    num: "V4",
    name: "Falsifier · Clean Desk",
    tagline: "zero painting · system sans · visible chrome · linear progress",
    tradeoffs:
      "Mandatory anti-style control. A crisp modern notes editor — near-white, system sans, toggles always visible, a normal progress bar. Genuinely usable, totally soulless. If this wins, the painterly direction was wrong and the real fix is less, not more.",
  },
};

/* Morning pages = 3 longhand pages. ~250 words per handwritten page. */
const WORDS_PER_PAGE = 250;
const GOAL_PAGES = 3;
const GOAL_WORDS = WORDS_PER_PAGE * GOAL_PAGES;

const SEED =
  "Woke before the alarm again. The light was doing that thing through the blinds where it lands in stripes across the floor and I just watched it for a while instead of reaching for the phone.\n\nThere's a knot about the launch I keep circling. Not the work itself. The work is fine, the work is almost done. It's the part where I have to tell people it exists.";

function useMorningEditor(seed = "") {
  const [text, setText] = useState(seed);
  const ref = useRef<HTMLTextAreaElement | null>(null);

  const words = useMemo(
    () => (text.trim() ? text.trim().split(/\s+/).length : 0),
    [text],
  );
  const pages = words / WORDS_PER_PAGE;
  const progress = Math.min(1, words / GOAL_WORDS);
  const done = words >= GOAL_WORDS;

  return { text, setText, ref, words, pages, progress, done };
}

/* Auto-fading chrome: visible while idle / on mouse move, fades while typing. */
function useChromeFade() {
  const [visible, setVisible] = useState(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wake = useCallback(() => {
    setVisible(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setVisible(false), 2400);
  }, []);
  useEffect(() => {
    wake();
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [wake]);
  return { visible, wake };
}

export default function MorningLabPage() {
  const [active, setActive] = useState<VariantId>("v1-emaki");

  // URL ?v= sync (deep-linkable, matches repo lab convention)
  useEffect(() => {
    const v = new URLSearchParams(window.location.search).get("v");
    const map: Record<string, VariantId> = {
      "1": "v1-emaki",
      "2": "v2-paper",
      "3": "v3-dawn",
      "4": "v4-falsifier",
    };
    if (v && map[v]) setActive(map[v]);
  }, []);

  const pick = (id: VariantId) => {
    setActive(id);
    const n = String(ORDER.indexOf(id) + 1);
    const url = new URL(window.location.href);
    url.searchParams.set("v", n);
    window.history.replaceState(null, "", url.toString());
  };

  return (
    <main className={`ml-root ml-${active}`}>
      <MorningStyles />
      <header className="ml-bar">
        <div className="ml-brand">
          <span className="ml-brand-dot" />
          <span>朝のページ · morning pages · design lab</span>
        </div>
        <nav className="ml-switch" role="tablist" aria-label="Variants">
          {ORDER.map((id) => {
            const v = META[id];
            const on = active === id;
            return (
              <button
                key={id}
                role="tab"
                aria-selected={on}
                className={`ml-tab${on ? " on" : ""}`}
                onClick={() => pick(id)}
              >
                <span className="ml-tab-num">{v.num}</span>
                <span className="ml-tab-name">{v.name}</span>
              </button>
            );
          })}
        </nav>
      </header>

      <section className="ml-tradeoff">
        <div className="ml-tradeoff-tag">{META[active].tagline}</div>
        <p className="ml-tradeoff-body">{META[active].tradeoffs}</p>
      </section>

      <div className="ml-stage">
        {active === "v1-emaki" && <V1Emaki />}
        {active === "v2-paper" && <V2Paper />}
        {active === "v3-dawn" && <V3Dawn />}
        {active === "v4-falsifier" && <V4Falsifier />}
      </div>
    </main>
  );
}

/* ─── shared input-mode rail (Type / Voice / Photo) ─── */
function ModeRail({ tone = "warm" }: { tone?: "warm" | "ink" | "clean" }) {
  const [mode, setMode] = useState<"type" | "voice" | "photo">("type");
  const items: { id: typeof mode; glyph: string; label: string }[] = [
    { id: "type", glyph: "✎", label: "Write" },
    { id: "voice", glyph: "◗", label: "Speak" },
    { id: "photo", glyph: "❏", label: "Photo" },
  ];
  return (
    <div className={`ml-modes ml-modes-${tone}`}>
      {items.map((it) => (
        <button
          key={it.id}
          className={`ml-mode${mode === it.id ? " on" : ""}`}
          onClick={() => setMode(it.id)}
          title={it.label}
        >
          <span className="ml-mode-glyph">{it.glyph}</span>
          <span className="ml-mode-label">{it.label}</span>
        </button>
      ))}
    </div>
  );
}

const TODAY_LABEL = "Tuesday · June 9";

/* ════════════════════════════════════════════════
   V1 — EMAKI SCROLL
   ════════════════════════════════════════════════ */
function V1Emaki() {
  const ed = useMorningEditor(SEED);
  const chrome = useChromeFade();

  return (
    <div
      className="v1-shell"
      onMouseMove={chrome.wake}
      data-chrome={chrome.visible ? "on" : "off"}
    >
      <div className="v1-sky" aria-hidden />
      <div className="v1-scrim" aria-hidden />
      <div className="v1-foxfire" aria-hidden>
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

      <div className="v1-chrome v1-top">
        <div className="v1-eyebrow">
          朝のページ · <span>{TODAY_LABEL}</span>
        </div>
        <ModeRail tone="warm" />
      </div>

      <div className="v1-column">
        <textarea
          ref={ed.ref}
          className="v1-write"
          value={ed.text}
          onChange={(e) => {
            ed.setText(e.target.value);
            chrome.wake();
          }}
          spellCheck={false}
          placeholder="Three pages. Don't stop, don't steer. Just let the morning out…"
        />
      </div>

      <div className="v1-chrome v1-foot">
        <PageArc progress={ed.progress} pages={ed.pages} />
      </div>
    </div>
  );
}

/* hover-only 3-page progress arc (SVG) */
function PageArc({ progress, pages }: { progress: number; pages: number }) {
  const R = 26;
  const C = 2 * Math.PI * R;
  return (
    <div className="arc" title={`${pages.toFixed(1)} / ${GOAL_PAGES} pages`}>
      <svg width="64" height="64" viewBox="0 0 64 64">
        <circle className="arc-track" cx="32" cy="32" r={R} />
        <circle
          className="arc-fill"
          cx="32"
          cy="32"
          r={R}
          strokeDasharray={C}
          strokeDashoffset={C * (1 - progress)}
          transform="rotate(-90 32 32)"
        />
      </svg>
      <div className="arc-read">
        {pages.toFixed(1)}
        <span> / {GOAL_PAGES} pages</span>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════
   V2 — INK & PAPER
   ════════════════════════════════════════════════ */
function V2Paper() {
  const ed = useMorningEditor(SEED);
  const filled = Math.min(
    GOAL_PAGES,
    Math.floor(ed.pages) + (ed.pages % 1 > 0.05 ? 0 : 0),
  );

  return (
    <div className="v2-shell">
      <div className="v2-sheet">
        <div className="v2-sheet-head">
          <span className="v2-date">{TODAY_LABEL}</span>
          <div
            className="v2-sheets"
            title={`${ed.pages.toFixed(1)} of 3 pages`}
          >
            {Array.from({ length: GOAL_PAGES }).map((_, i) => {
              const fill = Math.max(0, Math.min(1, ed.pages - i));
              return (
                <span key={i} className="v2-sheetdot">
                  <span
                    className="v2-sheetfill"
                    style={{ height: `${fill * 100}%` }}
                  />
                </span>
              );
            })}
          </div>
        </div>
        <textarea
          ref={ed.ref}
          className="v2-write"
          value={ed.text}
          onChange={(e) => ed.setText(e.target.value)}
          spellCheck={false}
          placeholder="Three longhand pages. Whatever's there when you wake…"
        />
        <div className="v2-foot">
          <ModeRail tone="ink" />
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════
   V3 — DAWN HORIZON (light responds to you)
   ════════════════════════════════════════════════ */
function V3Dawn() {
  const ed = useMorningEditor(SEED);
  // Sun rises with progress: 0 = pre-dawn twilight, 1 = full golden morning.
  const dayOpacity = ed.progress;
  const sunLift = 1 - ed.progress; // 1 = below horizon, 0 = risen

  return (
    <div className="v3-shell" style={{ ["--day" as string]: dayOpacity }}>
      <div className="v3-twilight" aria-hidden />
      <div className="v3-day" aria-hidden style={{ opacity: dayOpacity }} />
      <div
        className="v3-sun"
        aria-hidden
        style={{
          transform: `translateY(${sunLift * 120}px)`,
          opacity: 0.35 + dayOpacity * 0.65,
        }}
      />
      <div
        className="v3-glow"
        aria-hidden
        style={{ opacity: 0.25 + dayOpacity * 0.6 }}
      />

      <div className="v3-top">
        <div className="v3-eyebrow">朝 · {TODAY_LABEL}</div>
        <div className="v3-phase">
          {ed.progress < 0.34
            ? "before dawn"
            : ed.progress < 0.67
              ? "first light"
              : ed.progress < 1
                ? "the sun is climbing"
                : "golden morning"}
        </div>
      </div>

      <div className="v3-column">
        <textarea
          ref={ed.ref}
          className="v3-write"
          value={ed.text}
          onChange={(e) => ed.setText(e.target.value)}
          spellCheck={false}
          placeholder="Write the sun up…"
        />
      </div>

      <div className="v3-foot">
        <div className="v3-horizon">
          <div
            className="v3-horizon-fill"
            style={{ width: `${ed.progress * 100}%` }}
          />
        </div>
        <ModeRail tone="warm" />
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════
   V4 — FALSIFIER · CLEAN DESK
   ════════════════════════════════════════════════ */
function V4Falsifier() {
  const ed = useMorningEditor(SEED);
  return (
    <div className="v4-shell">
      <div className="v4-bar">
        <div className="v4-title">Morning Pages</div>
        <div className="v4-bar-right">
          <ModeRail tone="clean" />
          <div className="v4-count">
            {ed.words} / {GOAL_WORDS} words
          </div>
        </div>
      </div>
      <div className="v4-progress">
        <div
          className="v4-progress-fill"
          style={{ width: `${ed.progress * 100}%` }}
        />
      </div>
      <div className="v4-body">
        <div className="v4-date">{TODAY_LABEL}</div>
        <textarea
          ref={ed.ref}
          className="v4-write"
          value={ed.text}
          onChange={(e) => ed.setText(e.target.value)}
          spellCheck={false}
          placeholder="Start writing…"
        />
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════
   STYLES
   ════════════════════════════════════════════════ */
function MorningStyles() {
  return (
    <style>{`
@import url('https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@400;500;600&family=DM+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');

:root {
  --cream: #F5EFE0;
  --cream-soft: #FAF4E6;
  --parchment: #FBF6EA;
  --gold: #C9A24C;
  --gold-deep: #8B6E2A;
  --amber: #F0C060;
  --ember: #D87C52;
  --ink: #221a0d;
  --ink-soft: #4a3f2c;
  --emerald: #1a5c3a;
  --serif: 'Noto Serif JP', 'Iowan Old Style', Georgia, serif;
  --sans: 'DM Sans', system-ui, sans-serif;
  --mono: 'JetBrains Mono', ui-monospace, monospace;
}
* { box-sizing: border-box; }
.ml-root { min-height: 100vh; background: #1a160f; color: var(--ink); font-family: var(--sans); }

/* ── lab chrome ── */
.ml-bar {
  display: flex; justify-content: space-between; align-items: center; gap: 16px;
  padding: 12px 22px; background: #14110b; border-bottom: 1px solid rgba(201,162,76,0.22);
  position: sticky; top: 0; z-index: 50;
}
.ml-brand { font-family: var(--mono); font-size: 11px; letter-spacing: 0.12em; text-transform: lowercase; color: #d8c79a; display: flex; align-items: center; gap: 10px; }
.ml-brand-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--amber); box-shadow: 0 0 12px var(--amber); }
.ml-switch { display: flex; gap: 4px; background: rgba(255,255,255,0.04); border: 1px solid rgba(201,162,76,0.2); border-radius: 10px; padding: 4px; }
.ml-tab { font-family: var(--mono); font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; background: transparent; border: none; cursor: pointer; padding: 7px 12px; border-radius: 6px; color: #b7a979; display: inline-flex; gap: 7px; align-items: center; transition: all 180ms ease; }
.ml-tab:hover { color: #f3e7c4; }
.ml-tab.on { background: var(--gold); color: #1a160f; }
.ml-tab-num { opacity: 0.7; }
.ml-tab-name { font-weight: 600; }
.ml-tradeoff { padding: 13px 22px; background: #100d08; border-bottom: 1px solid rgba(201,162,76,0.12); }
.ml-tradeoff-tag { font-family: var(--mono); font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--amber); margin-bottom: 6px; }
.ml-tradeoff-body { font-size: 13px; line-height: 1.55; color: #cdbf98; max-width: 92ch; margin: 0; }
.ml-stage { position: relative; }

/* ── shared mode rail ── */
.ml-modes { display: inline-flex; gap: 6px; }
.ml-mode { display: inline-flex; align-items: center; gap: 7px; font-family: var(--mono); font-size: 10.5px; letter-spacing: 0.08em; text-transform: uppercase; padding: 7px 12px; border-radius: 999px; cursor: pointer; transition: all 200ms ease; border: 1px solid transparent; }
.ml-mode-glyph { font-size: 13px; }
.ml-modes-warm .ml-mode { color: rgba(255,247,230,0.72); background: rgba(20,14,6,0.34); border-color: rgba(240,192,96,0.28); backdrop-filter: blur(8px); }
.ml-modes-warm .ml-mode.on { color: #1a160f; background: var(--amber); border-color: var(--amber); }
.ml-modes-ink .ml-mode { color: var(--ink-soft); background: transparent; border-color: rgba(139,110,42,0.3); }
.ml-modes-ink .ml-mode.on { color: var(--cream); background: var(--gold-deep); border-color: var(--gold-deep); }
.ml-modes-clean .ml-mode { color: #555; background: #fff; border-color: #e3e3e0; border-radius: 7px; }
.ml-modes-clean .ml-mode.on { color: #fff; background: #2b2b2b; border-color: #2b2b2b; }
.ml-mode-label { font-weight: 500; }

/* ════ V1 EMAKI SCROLL ════ */
.v1-shell { position: relative; min-height: calc(100vh - 116px); overflow: hidden; }
.v1-sky { position: absolute; inset: 0; background-image: url('/art/tabs/home-day.webp'); background-size: cover; background-position: center; }
.v1-scrim { position: absolute; inset: 0; background:
  radial-gradient(ellipse at 50% 22%, rgba(255,236,200,0.18), transparent 60%),
  linear-gradient(180deg, rgba(245,239,224,0.28) 0%, rgba(245,239,224,0.52) 45%, rgba(40,30,16,0.30) 100%); }
.v1-foxfire { position: absolute; inset: 0; pointer-events: none; }
.v1-foxfire span { position: absolute; bottom: -6px; width: 4px; height: 4px; border-radius: 50%;
  background: radial-gradient(circle, rgba(240,192,96,0.95), rgba(240,192,96,0)); animation: v1drift linear infinite; }
@keyframes v1drift { 0% { transform: translateY(0) translateX(0); opacity: 0; } 12% { opacity: 0.9; } 80% { opacity: 0.45; } 100% { transform: translateY(-92vh) translateX(26px); opacity: 0; } }

.v1-chrome { position: absolute; left: 0; right: 0; z-index: 6; transition: opacity 600ms ease; padding: 22px 32px; display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.v1-top { top: 0; }
.v1-foot { bottom: 0; justify-content: center; }
.v1-shell[data-chrome="off"] .v1-chrome { opacity: 0.12; }
.v1-eyebrow { font-family: var(--mono); font-size: 11px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--gold-deep); text-shadow: 0 1px 10px rgba(255,247,230,0.9); }
.v1-eyebrow span { color: var(--ink-soft); }

.v1-column { position: relative; z-index: 4; max-width: 64ch; margin: 0 auto; padding: 8vh 24px 12vh; min-height: calc(100vh - 116px); }
.v1-write {
  width: 100%; min-height: 76vh; resize: none; border: none; outline: none; background: transparent;
  font-family: var(--serif); font-size: 21px; line-height: 1.95; color: var(--ink);
  caret-color: var(--ember);
  text-shadow: 0 1px 16px rgba(251,246,234,0.95), 0 0 2px rgba(251,246,234,0.9);
  -webkit-mask-image: linear-gradient(180deg, transparent 0, #000 16%, #000 78%, transparent 100%);
  mask-image: linear-gradient(180deg, transparent 0, #000 16%, #000 78%, transparent 100%);
}
.v1-write::placeholder { color: rgba(74,63,44,0.6); font-style: italic; }

.arc { position: relative; display: grid; place-items: center; }
.arc svg { display: block; }
.arc-track { fill: none; stroke: rgba(40,30,16,0.18); stroke-width: 3; }
.arc-fill { fill: none; stroke: var(--amber); stroke-width: 3; stroke-linecap: round; transition: stroke-dashoffset 500ms ease; filter: drop-shadow(0 0 5px rgba(240,192,96,0.7)); }
.arc-read { position: absolute; font-family: var(--mono); font-size: 12px; color: var(--gold-deep); opacity: 0; transition: opacity 220ms ease; text-shadow: 0 1px 8px rgba(251,246,234,0.95); white-space: nowrap; transform: translateY(40px); }
.arc-read span { opacity: 0.6; }
.arc:hover .arc-read { opacity: 1; }

/* ════ V2 INK & PAPER ════ */
.v2-shell { min-height: calc(100vh - 116px); display: grid; place-items: start center;
  background:
   radial-gradient(ellipse at 50% 0, rgba(201,162,76,0.10), transparent 60%),
   linear-gradient(180deg, #ece3cf 0%, #e2d7bd 100%);
  padding: 40px 20px 80px; }
.v2-sheet { position: relative; width: min(720px, 100%); min-height: 80vh; background: var(--parchment);
  background-image:
   linear-gradient(rgba(120,98,52,0.07) 1px, transparent 1px);
  background-size: 100% 38px; background-position: 0 64px;
  border-radius: 3px;
  box-shadow: 0 1px 0 rgba(255,255,255,0.8) inset, 0 18px 50px rgba(60,44,18,0.22), 0 2px 6px rgba(60,44,18,0.14);
  padding: 30px 44px 30px 78px; }
.v2-sheet::before { /* gold margin rule */
  content: ""; position: absolute; top: 0; bottom: 0; left: 58px; width: 1px;
  background: linear-gradient(180deg, transparent, rgba(201,162,76,0.55) 12%, rgba(201,162,76,0.55) 88%, transparent); }
.v2-sheet-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
.v2-date { font-family: var(--mono); font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--gold-deep); }
.v2-sheets { display: inline-flex; gap: 6px; }
.v2-sheetdot { position: relative; width: 13px; height: 17px; border: 1px solid rgba(139,110,42,0.5); border-radius: 1px; overflow: hidden; background: rgba(255,255,255,0.4); display: inline-block; }
.v2-sheetfill { position: absolute; left: 0; right: 0; bottom: 0; background: linear-gradient(180deg, var(--amber), var(--gold)); transition: height 400ms ease; }
.v2-write { width: 100%; min-height: 66vh; resize: none; border: none; outline: none; background: transparent;
  font-family: var(--serif); font-size: 19px; line-height: 38px; color: var(--ink); caret-color: var(--ember); }
.v2-write::placeholder { color: rgba(74,63,44,0.5); font-style: italic; }
.v2-foot { margin-top: 18px; display: flex; justify-content: flex-end; }

/* ════ V3 DAWN HORIZON ════ */
.v3-shell { position: relative; min-height: calc(100vh - 116px); overflow: hidden; }
.v3-twilight { position: absolute; inset: 0; background-image: url('/art/tabs/home-twilight.webp'); background-size: cover; background-position: center; }
.v3-day { position: absolute; inset: 0; background-image: url('/art/tabs/home-day.webp'); background-size: cover; background-position: center; transition: opacity 700ms ease; }
.v3-sun { position: absolute; left: 50%; top: 34%; width: 220px; height: 220px; margin-left: -110px; border-radius: 50%;
  background: radial-gradient(circle, rgba(255,238,196,0.95) 0%, rgba(240,192,96,0.55) 40%, transparent 72%);
  filter: blur(2px); transition: transform 700ms ease, opacity 700ms ease; pointer-events: none; }
.v3-glow { position: absolute; inset: 0; pointer-events: none; background:
  linear-gradient(180deg, transparent 30%, rgba(255,228,170,0.18) 62%, rgba(255,200,120,0.30) 100%); transition: opacity 700ms ease; }
.v3-top { position: absolute; top: 0; left: 0; right: 0; z-index: 5; display: flex; justify-content: space-between; padding: 22px 32px; }
.v3-eyebrow { font-family: var(--mono); font-size: 11px; letter-spacing: 0.16em; text-transform: uppercase; color: #5a4422; text-shadow: 0 1px 12px rgba(255,247,230,0.9); }
.v3-phase { font-family: var(--serif); font-size: 15px; font-style: italic; color: #6b4f24; text-shadow: 0 1px 12px rgba(255,247,230,0.9); }
.v3-column { position: relative; z-index: 4; max-width: 60ch; margin: 0 auto; padding: 12vh 24px 14vh; }
.v3-write { width: 100%; min-height: 64vh; resize: none; border: none; outline: none; background: transparent; text-align: center;
  font-family: var(--serif); font-size: 23px; line-height: 1.9; color: #2a1f0f; caret-color: var(--ember);
  text-shadow: 0 1px 18px rgba(255,247,230,0.95), 0 0 3px rgba(255,247,230,0.9); }
.v3-write::placeholder { color: rgba(80,60,30,0.55); font-style: italic; }
.v3-foot { position: absolute; bottom: 0; left: 0; right: 0; z-index: 5; padding: 20px 32px; display: flex; flex-direction: column; gap: 14px; align-items: center; }
.v3-horizon { width: min(420px, 80%); height: 3px; border-radius: 3px; background: rgba(80,60,30,0.2); overflow: hidden; }
.v3-horizon-fill { height: 100%; background: linear-gradient(90deg, var(--ember), var(--amber)); box-shadow: 0 0 8px var(--amber); transition: width 500ms ease; }

/* ════ V4 FALSIFIER · CLEAN DESK ════ */
.ml-v4-falsifier { background: #f4f4f2; }
.v4-shell { min-height: calc(100vh - 116px); background: #f4f4f2; color: #1d1d1f; }
.v4-bar { display: flex; justify-content: space-between; align-items: center; padding: 14px 26px; background: #fff; border-bottom: 1px solid #e6e6e3; }
.v4-title { font-family: var(--sans); font-weight: 600; font-size: 15px; letter-spacing: -0.01em; }
.v4-bar-right { display: flex; align-items: center; gap: 18px; }
.v4-count { font-family: var(--sans); font-size: 12.5px; color: #8a8a8a; }
.v4-progress { height: 3px; background: #e6e6e3; }
.v4-progress-fill { height: 100%; background: #3b82f6; transition: width 300ms ease; }
.v4-body { max-width: 720px; margin: 0 auto; padding: 40px 26px; }
.v4-date { font-family: var(--sans); font-size: 13px; color: #9a9a9a; margin-bottom: 16px; }
.v4-write { width: 100%; min-height: 66vh; resize: none; border: none; outline: none; background: transparent;
  font-family: var(--sans); font-size: 17px; line-height: 1.7; color: #1d1d1f; }
.v4-write::placeholder { color: #b4b4b4; }

@media (max-width: 768px) {
  .ml-bar { flex-direction: column; align-items: stretch; gap: 10px; }
  .ml-switch { flex-wrap: wrap; }
  .v1-column, .v3-column { padding-left: 18px; padding-right: 18px; }
  .v2-sheet { padding: 24px 24px 24px 54px; }
  .v2-sheet::before { left: 38px; }
}
@media (prefers-reduced-motion: reduce) {
  .v1-foxfire span { display: none; }
  .arc-fill, .v3-day, .v3-sun, .v3-glow, .v3-horizon-fill, .v4-progress-fill { transition: none; }
}
    `}</style>
  );
}
