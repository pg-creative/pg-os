"use client";

import { useState } from "react";

/**
 * Design Lab — Four aesthetic variants for PG OS soul-restoration.
 *
 * Locked DNA: cream + painting + gold + anime + painterly.
 * Sources: ~/.claude/rules/visual-style.md + 4 section-research agents (hero/cards/diagrams/tables).
 *
 * V1 ANIME PAINTING MAXIMAL    Most atmosphere. Painted backdrops everywhere, gold-leaf accents,
 *                              hand-painted cel-shading on key surfaces, cream foundation,
 *                              particles tied to real data.
 *
 * V2 EDITORIAL ANIME            Typography-forward (Fraunces + Inter + JetBrains Mono). Painting
 *                              in margins + dividers + login states — NOT behind every surface.
 *                              Cream + gold accents on type only. Negative space carries weight.
 *
 * V3 JRPG OPERATOR CONSOLE      Anime + game UI. Painted parchment textures on cards, ornate
 *                              gold borders on hero panels, jewel-tone status indicators,
 *                              character-portrait avatar treatment. Operating a console, not
 *                              browsing a SaaS.
 *
 * V4 FALSIFIER · CREAM EDITORIAL MINIMALISM
 *                              Mandatory anti-style control (per design-anti-generic rule 9).
 *                              Cream foundation, charcoal type, gold underline accents only,
 *                              zero painting, zero particles, zero anime. If this wins, the
 *                              painterly direction is the problem and we'll know.
 */

type VariantId = "v1-maximal" | "v2-editorial" | "v3-jrpg" | "v4-falsifier";
const ORDER: VariantId[] = [
  "v1-maximal",
  "v2-editorial",
  "v3-jrpg",
  "v4-falsifier",
];

const META: Record<
  VariantId,
  { num: string; name: string; tagline: string; tradeoffs: string }
> = {
  "v1-maximal": {
    num: "V1",
    name: "Anime Painting Maximal",
    tagline: "painted everywhere · gold leaf · particles · most ambitious",
    tradeoffs:
      "Doubles down on the DNA. Every surface has painted depth, gold accents, anime cel-shading. Bets that the OS should feel like a JRPG world more than a productivity tool. Most Midjourney asset load.",
  },
  "v2-editorial": {
    num: "V2",
    name: "Editorial Anime",
    tagline: "Fraunces + Inter · painting in margins · negative space carries",
    tradeoffs:
      "Typography does the heavy lifting. Painting peeks in at section dividers, login states, hero corners. Cream + gold on type. Bets that the OS should feel like an illuminated manuscript — anime accents but composition reads literary.",
  },
  "v3-jrpg": {
    num: "V3",
    name: "JRPG Operator Console",
    tagline:
      "parchment cards · gold borders · jewel tones · character portrait",
    tradeoffs:
      "Game UI energy. Status pills are JRPG rarity tiers. Cards are inventory panels. Character portrait on Home tab. Bets that PG wants to feel like he's operating a console in a JRPG, not browsing a dashboard.",
  },
  "v4-falsifier": {
    num: "V4",
    name: "Falsifier · Cream Editorial Minimalism",
    tagline:
      "zero painting · zero anime · charcoal type · gold underlines only",
    tradeoffs:
      "Anti-style control. Cream paper + charcoal serif + gold underline accents. If this wins, the painterly direction isn't right — the problem was clutter, not lack of warmth. Mandatory falsifier per design-anti-generic rule 9.",
  },
};

export default function DesignLabPage() {
  const [active, setActive] = useState<VariantId>("v1-maximal");
  return (
    <main className={`dl-root dl-${active}`}>
      <DesignLabStyles />
      <header className="dl-topbar">
        <div className="dl-brand">
          <span className="dl-brand-dot" />
          <span>PG OS · design lab</span>
          <span className="dl-brand-ver">// 2026-05-15</span>
        </div>
        <nav className="dl-switcher" role="tablist" aria-label="Variants">
          {ORDER.map((id) => {
            const v = META[id];
            const isActive = active === id;
            return (
              <button
                key={id}
                role="tab"
                aria-selected={isActive}
                className={`dl-switch${isActive ? " active" : ""}`}
                onClick={() => setActive(id)}
              >
                <span className="dl-switch-num">{v.num}</span>
                <span className="dl-switch-name">{v.name}</span>
              </button>
            );
          })}
        </nav>
      </header>

      <section className="dl-tradeoff">
        <div className="dl-tradeoff-tag">{META[active].tagline}</div>
        <p className="dl-tradeoff-body">{META[active].tradeoffs}</p>
      </section>

      <div className="dl-stage">
        {active === "v1-maximal" && <V1Maximal />}
        {active === "v2-editorial" && <V2Editorial />}
        {active === "v3-jrpg" && <V3JRPG />}
        {active === "v4-falsifier" && <V4Falsifier />}
      </div>
    </main>
  );
}

/* ─────────────────────────────────────────────────
   V1 — ANIME PAINTING MAXIMAL
   Painted backdrop fading to cream + gold-leaf borders + cel-shaded silhouette
   + linen overlay + anime display type. Particles tied to data (1 per habit).
   ───────────────────────────────────────────────── */
function V1Maximal() {
  return (
    <div className="v1-shell">
      <div className="v1-backdrop" aria-hidden />
      <div className="v1-particles" aria-hidden>
        {Array.from({ length: 12 }).map((_, i) => (
          <span
            key={i}
            style={{
              left: `${(i * 8.3) % 100}%`,
              animationDelay: `${i * 0.7}s`,
            }}
          />
        ))}
      </div>
      <div className="v1-hero">
        <div className="v1-eyebrow">// PG OS · 2026·05·15 · midnight ember</div>
        <h1 className="v1-headline">
          The day is <em>closing</em>. Five things still want your attention.
        </h1>
        <div className="v1-hero-meta">
          <span className="v1-meta-pill">◐ 11 of 14 habits</span>
          <span className="v1-meta-pill">⚿ 3 ships</span>
          <span className="v1-meta-pill">◆ 1 queue · approve</span>
        </div>
      </div>

      <div className="v1-grid">
        <Card
          variant="v1"
          title="Habits"
          body="11 of 14 — consistent through week 7"
          accent="emerald"
        />
        <Card
          variant="v1"
          title="Projects"
          body="3 active · heros-chronicle, alchmy, pg-os"
          accent="amber"
        />
        <Card
          variant="v1"
          title="Brain queue"
          body="1 candidate ≥13/20 — waiting for you"
          accent="ruby"
        />
        <Card
          variant="v1"
          title="Stack"
          body="14 evals queued — 2 ✓ installed"
          accent="sapphire"
        />
      </div>

      <div className="v1-diagram">
        <div className="v1-diagram-label">Dartboard pipeline</div>
        <PainterlyDiagram />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────
   V2 — EDITORIAL ANIME
   Typography-forward. Fraunces display + Inter body. Painting in margins + corners.
   Negative space dominant.
   ───────────────────────────────────────────────── */
function V2Editorial() {
  return (
    <div className="v2-shell">
      <div className="v2-corner-painting" aria-hidden />
      <div className="v2-margin-stroke" aria-hidden />
      <article className="v2-article">
        <div className="v2-eyebrow">PG OS — May 15, 2026 — Midnight Ember</div>
        <h1 className="v2-headline">
          The day is closing. <span className="v2-italic">Five things</span>{" "}
          still want your attention.
        </h1>
        <p className="v2-deck">
          Habits steady through week seven. Three projects in motion. One brain
          candidate waiting on a yes-or-no.
        </p>
        <div className="v2-divider">
          <span>✦</span>
        </div>
        <div className="v2-list">
          <Row
            label="Habits"
            value="11 / 14"
            detail="week 7 — no broken chain"
          />
          <Row
            label="Projects"
            value="3 active"
            detail="heros-chronicle · alchmy · pg-os"
          />
          <Row
            label="Brain queue"
            value="1"
            detail="candidate scored 14/20 — awaiting decision"
          />
          <Row
            label="Stack"
            value="14 evals"
            detail="2 ✓ installed · 12 pending"
          />
        </div>
        <div className="v2-divider">
          <span>✦</span>
        </div>
        <div className="v2-diagram-frame">
          <PainterlyDiagram subdued />
        </div>
      </article>
    </div>
  );
}

/* ─────────────────────────────────────────────────
   V3 — JRPG OPERATOR CONSOLE
   Parchment cards + ornate gold borders + jewel-tone rarity pills + character portrait.
   ───────────────────────────────────────────────── */
function V3JRPG() {
  return (
    <div className="v3-shell">
      <div className="v3-hero">
        <div className="v3-portrait" aria-hidden>
          <div className="v3-portrait-frame">
            <div className="v3-portrait-art" />
          </div>
          <div className="v3-portrait-name">PG · OPERATOR</div>
          <div className="v3-portrait-stat">LVL 12 · GOLDEN HOUR</div>
        </div>
        <div className="v3-statlines">
          <Statline label="HABITS" current={11} max={14} accent="emerald" />
          <Statline label="SHIPS" current={3} max={5} accent="amber" />
          <Statline label="QUEUE" current={1} max={1} accent="ruby" />
          <Statline label="STACK" current={2} max={14} accent="sapphire" />
        </div>
      </div>

      <div className="v3-panel-grid">
        <V3Panel
          title="ACTIVE PROJECTS"
          rarity="rare"
          rows={[
            {
              name: "heros-chronicle",
              tier: "epic",
              note: "Oct 2 launch · 47 days",
            },
            {
              name: "alchmy",
              tier: "rare",
              note: "brand reset shipped · post velocity",
            },
            {
              name: "pg-os",
              tier: "common",
              note: "stack tab live · this build",
            },
          ]}
        />
        <V3Panel
          title="BRAIN QUEUE"
          rarity="epic"
          rows={[
            {
              name: "refero design.md files",
              tier: "epic",
              note: "14/20 · queue · seedling",
            },
          ]}
        />
      </div>

      <div className="v3-diagram-frame">
        <div className="v3-frame-label">▣ DARTBOARD PIPELINE</div>
        <PainterlyDiagram jrpg />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────
   V4 — FALSIFIER · CREAM EDITORIAL MINIMALISM
   Cream paper + charcoal serif + gold underline accents. Zero painting/anime/particles.
   ───────────────────────────────────────────────── */
function V4Falsifier() {
  return (
    <div className="v4-shell">
      <article className="v4-article">
        <div className="v4-meta">PG · MIDNIGHT EMBER · MAY 15</div>
        <h1 className="v4-headline">
          Five things still want{" "}
          <span className="v4-underline">your attention</span>.
        </h1>
        <p className="v4-deck">
          The day is closing. Habits steady through week seven. Three projects
          in motion. One brain candidate waiting on a yes-or-no.
        </p>
        <ul className="v4-list">
          <li>
            <strong>Habits</strong>{" "}
            <span>11 / 14 · week 7 · no broken chain</span>
          </li>
          <li>
            <strong>Projects</strong>{" "}
            <span>3 active · heros-chronicle, alchmy, pg-os</span>
          </li>
          <li>
            <strong>Brain queue</strong>{" "}
            <span>1 candidate · scored 14 / 20 · awaiting decision</span>
          </li>
          <li>
            <strong>Stack</strong>{" "}
            <span>14 evals · 2 installed · 12 pending</span>
          </li>
        </ul>
        <div className="v4-divider" />
        <h2 className="v4-h2">Dartboard pipeline</h2>
        <p className="v4-prose">
          Filter the resource. Decide reference or candidate. Run the
          three-check reframe. Score on six axes. Route by file type. The
          pipeline is the discipline.
        </p>
      </article>
    </div>
  );
}

/* ───────── shared sub-components ───────── */

function Card({
  variant,
  title,
  body,
  accent,
}: {
  variant: string;
  title: string;
  body: string;
  accent: string;
}) {
  return (
    <div className={`${variant}-card ${variant}-card-${accent}`}>
      <div className={`${variant}-card-title`}>{title}</div>
      <div className={`${variant}-card-body`}>{body}</div>
    </div>
  );
}

function Row({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="v2-row">
      <div className="v2-row-label">{label}</div>
      <div className="v2-row-value">{value}</div>
      <div className="v2-row-detail">{detail}</div>
    </div>
  );
}

function Statline({
  label,
  current,
  max,
  accent,
}: {
  label: string;
  current: number;
  max: number;
  accent: string;
}) {
  const pct = Math.min(100, Math.round((current / max) * 100));
  return (
    <div className={`v3-statline v3-statline-${accent}`}>
      <span className="v3-statline-label">{label}</span>
      <div className="v3-statline-bar">
        <div className="v3-statline-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="v3-statline-num">
        {current}/{max}
      </span>
    </div>
  );
}

function V3Panel({
  title,
  rarity,
  rows,
}: {
  title: string;
  rarity: string;
  rows: { name: string; tier: string; note: string }[];
}) {
  return (
    <div className={`v3-panel v3-panel-${rarity}`}>
      <div className="v3-panel-head">
        <span className="v3-panel-icon" aria-hidden>
          ◆
        </span>
        <span className="v3-panel-title">{title}</span>
      </div>
      <ul className="v3-panel-list">
        {rows.map((r) => (
          <li key={r.name} className={`v3-panel-row v3-tier-${r.tier}`}>
            <span className="v3-row-name">{r.name}</span>
            <span className="v3-row-note">{r.note}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PainterlyDiagram({
  subdued = false,
  jrpg = false,
}: {
  subdued?: boolean;
  jrpg?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 720 200"
      className={`pd-svg${subdued ? " subdued" : ""}${jrpg ? " jrpg" : ""}`}
      aria-hidden
    >
      <defs>
        <filter id="grain" x="0%" y="0%" width="100%" height="100%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.85"
            numOctaves="2"
          />
          <feColorMatrix values="0 0 0 0 0.85 0 0 0 0 0.78 0 0 0 0 0.55 0 0 0 0.08 0" />
        </filter>
      </defs>
      <rect width="720" height="200" fill="url(#grain)" opacity="0.4" />
      {/* 5 nodes painted as soft ovals connected by hand-drawn curves */}
      {[
        { x: 70, label: "DROP", tone: "cream" },
        { x: 200, label: "FILTER", tone: "amber" },
        { x: 340, label: "REFRAME", tone: "gold" },
        { x: 490, label: "SCORE", tone: "ember" },
        { x: 640, label: "ROUTE", tone: "deep" },
      ].map((n) => (
        <g key={n.label} transform={`translate(${n.x},100)`}>
          <ellipse rx="52" ry="34" className={`pd-node pd-node-${n.tone}`} />
          <text textAnchor="middle" dy="5" className="pd-label">
            {n.label}
          </text>
        </g>
      ))}
      {/* connectors — hand-drawn bezier */}
      {[
        "M 122 100 C 145 92, 175 108, 200 100",
        "M 252 100 C 280 90, 312 110, 340 100",
        "M 392 100 C 425 88, 460 112, 490 100",
        "M 542 100 C 575 90, 610 110, 640 100",
      ].map((d) => (
        <path key={d} d={d} className="pd-connector" />
      ))}
    </svg>
  );
}

/* ─────────────────────────────────────────────────
   STYLES — kept inline to keep file count lean
   ───────────────────────────────────────────────── */
function DesignLabStyles() {
  return (
    <style>{`
:root {
  --dl-cream: #F5EFE0;
  --dl-cream-deep: #E8DFC5;
  --dl-gold: #C9A24C;
  --dl-gold-deep: #8B6E2A;
  --dl-ember: #D87C52;
  --dl-emerald: #6B8E5A;
  --dl-ruby: #B5564B;
  --dl-sapphire: #4A6B8C;
  --dl-ink: #2A2218;
  --dl-charcoal: #3A3128;
}
* { box-sizing: border-box; }
body { margin: 0; }
.dl-root {
  min-height: 100vh;
  font-family: 'Inter', system-ui, sans-serif;
  color: var(--dl-ink);
  background: var(--dl-cream);
  transition: background 600ms ease;
}
.dl-topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 24px;
  border-bottom: 1px solid rgba(139, 110, 42, 0.18);
  background: linear-gradient(180deg, rgba(245,239,224,0.94) 0%, rgba(245,239,224,0) 100%);
  position: sticky; top: 0; z-index: 10;
  backdrop-filter: blur(6px);
}
.dl-brand { font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; display: flex; align-items: center; gap: 10px; color: var(--dl-charcoal); }
.dl-brand-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--dl-gold); box-shadow: 0 0 12px var(--dl-gold); }
.dl-brand-ver { opacity: 0.6; }
.dl-switcher { display: flex; gap: 4px; border: 1px solid rgba(139,110,42,0.24); border-radius: 10px; background: rgba(255,255,255,0.45); padding: 4px; }
.dl-switch {
  font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: 10px; letter-spacing: 0.1em;
  text-transform: uppercase; background: transparent; border: none; cursor: pointer;
  padding: 8px 14px; border-radius: 6px; color: var(--dl-charcoal); display: inline-flex; gap: 8px; align-items: center;
  transition: all 200ms ease;
}
.dl-switch:hover { color: var(--dl-ink); }
.dl-switch.active { background: var(--dl-gold); color: #fff; }
.dl-switch-num { opacity: 0.7; }
.dl-switch-name { font-weight: 500; }

.dl-tradeoff { padding: 16px 24px; border-bottom: 1px solid rgba(139,110,42,0.12); background: rgba(255,255,255,0.4); }
.dl-tradeoff-tag { font-family: 'JetBrains Mono', monospace; font-size: 10.5px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--dl-gold-deep); margin-bottom: 6px; }
.dl-tradeoff-body { font-size: 13.5px; line-height: 1.55; color: var(--dl-charcoal); max-width: 80ch; margin: 0; }

.dl-stage { padding: 32px 24px; }

/* shared painterly diagram */
.pd-svg { width: 100%; height: auto; max-height: 240px; }
.pd-node { fill: var(--dl-cream-deep); stroke: var(--dl-gold); stroke-width: 1.5; filter: drop-shadow(0 2px 6px rgba(139,110,42,0.18)); }
.pd-node-cream { fill: #F5EFE0; }
.pd-node-amber { fill: #F2D898; }
.pd-node-gold { fill: #E8C56C; stroke: var(--dl-gold-deep); }
.pd-node-ember { fill: #E8A988; }
.pd-node-deep { fill: #C8B789; stroke: var(--dl-gold-deep); }
.pd-label { font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: 0.12em; fill: var(--dl-ink); }
.pd-connector { stroke: var(--dl-gold); stroke-width: 1.5; fill: none; opacity: 0.7; stroke-linecap: round; }
.pd-svg.subdued .pd-node { fill: var(--dl-cream); stroke: rgba(139,110,42,0.45); }
.pd-svg.subdued .pd-connector { opacity: 0.4; }
.pd-svg.jrpg .pd-node { stroke-width: 2.5; }

/* ───── V1 ANIME PAINTING MAXIMAL ───── */
.dl-v1-maximal { background: linear-gradient(180deg, #F5EFE0 0%, #E8DFC5 100%); }
.v1-shell { position: relative; max-width: 1200px; margin: 0 auto; }
.v1-backdrop {
  position: absolute; inset: 0; pointer-events: none; z-index: 0; border-radius: 18px;
  background:
    radial-gradient(ellipse at top right, rgba(216, 124, 82, 0.4) 0%, transparent 50%),
    radial-gradient(ellipse at bottom left, rgba(201, 162, 76, 0.35) 0%, transparent 55%),
    radial-gradient(ellipse at 50% 50%, rgba(232, 197, 108, 0.18) 0%, transparent 70%);
  filter: blur(12px); opacity: 0.85;
}
.v1-particles { position: absolute; inset: 0; pointer-events: none; z-index: 1; }
.v1-particles span {
  position: absolute; bottom: 0; width: 4px; height: 4px; border-radius: 50%;
  background: radial-gradient(circle, rgba(232,197,108,0.95), rgba(232,197,108,0));
  animation: v1-drift 14s ease-in-out infinite;
}
@keyframes v1-drift {
  0%   { transform: translateY(0) translateX(0); opacity: 0; }
  15%  { opacity: 0.9; }
  85%  { opacity: 0.5; }
  100% { transform: translateY(-380px) translateX(20px); opacity: 0; }
}
.v1-hero { position: relative; z-index: 2; padding: 56px 40px 36px; }
.v1-eyebrow { font-family: 'JetBrains Mono', monospace; font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--dl-gold-deep); margin-bottom: 16px; }
.v1-headline {
  font-family: 'Fraunces', 'Iowan Old Style', Georgia, serif;
  font-size: clamp(32px, 4.5vw, 56px);
  line-height: 1.08; margin: 0 0 24px; color: var(--dl-ink);
  letter-spacing: -0.01em; font-weight: 500;
  max-width: 22ch;
}
.v1-headline em {
  font-style: italic; color: var(--dl-gold-deep);
  position: relative;
}
.v1-headline em::after {
  content: ""; position: absolute; left: 0; right: 0; bottom: -4px; height: 2px;
  background: linear-gradient(90deg, transparent, var(--dl-gold), transparent);
}
.v1-hero-meta { display: flex; gap: 10px; flex-wrap: wrap; }
.v1-meta-pill {
  font-family: 'JetBrains Mono', monospace; font-size: 11px; letter-spacing: 0.08em;
  padding: 6px 12px; border-radius: 999px;
  background: rgba(255,255,255,0.55); border: 1px solid var(--dl-gold);
  color: var(--dl-charcoal); backdrop-filter: blur(8px);
}

.v1-grid { position: relative; z-index: 2; display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; padding: 24px 40px; }
.v1-card {
  position: relative; padding: 20px 22px; border-radius: 14px;
  background: linear-gradient(140deg, rgba(255,255,255,0.78) 0%, rgba(245,239,224,0.92) 100%);
  border: 1px solid var(--dl-gold);
  box-shadow: 0 4px 14px rgba(139,110,42,0.08);
  transition: transform 200ms ease, box-shadow 200ms ease;
}
.v1-card::before {
  content: ""; position: absolute; top: 8px; left: 8px; width: 18px; height: 18px;
  border-top: 1.5px solid var(--dl-gold); border-left: 1.5px solid var(--dl-gold);
  border-radius: 2px 0 0 0;
}
.v1-card::after {
  content: ""; position: absolute; bottom: 8px; right: 8px; width: 18px; height: 18px;
  border-bottom: 1.5px solid var(--dl-gold); border-right: 1.5px solid var(--dl-gold);
  border-radius: 0 0 2px 0;
}
.v1-card:hover { transform: translateY(-2px) scale(1.02); box-shadow: 0 8px 22px rgba(139,110,42,0.16); }
.v1-card-title { font-family: 'Fraunces', serif; font-size: 18px; font-weight: 500; margin-bottom: 6px; color: var(--dl-ink); }
.v1-card-body { font-size: 13px; color: var(--dl-charcoal); line-height: 1.5; }
.v1-card-emerald { border-color: var(--dl-emerald); }
.v1-card-amber { border-color: var(--dl-gold); }
.v1-card-ruby { border-color: var(--dl-ruby); }
.v1-card-sapphire { border-color: var(--dl-sapphire); }

.v1-diagram { position: relative; z-index: 2; padding: 32px 40px; }
.v1-diagram-label { font-family: 'JetBrains Mono', monospace; font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--dl-gold-deep); margin-bottom: 14px; }

/* ───── V2 EDITORIAL ANIME ───── */
.dl-v2-editorial { background: #F8F3E4; }
.v2-shell { position: relative; max-width: 880px; margin: 0 auto; padding: 60px 24px; }
.v2-corner-painting {
  position: absolute; top: 0; right: 0; width: 280px; height: 280px;
  background:
    radial-gradient(circle at 70% 30%, rgba(216,124,82,0.5), transparent 60%),
    radial-gradient(circle at 50% 50%, rgba(201,162,76,0.35), transparent 70%);
  filter: blur(8px); opacity: 0.7; pointer-events: none;
}
.v2-margin-stroke { position: absolute; top: 80px; bottom: 80px; left: 24px; width: 2px; background: linear-gradient(180deg, transparent, var(--dl-gold), transparent); opacity: 0.6; }
.v2-article { position: relative; z-index: 2; padding-left: 40px; }
.v2-eyebrow { font-family: 'JetBrains Mono', monospace; font-size: 10.5px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--dl-gold-deep); margin-bottom: 24px; }
.v2-headline {
  font-family: 'Fraunces', 'Iowan Old Style', Georgia, serif;
  font-size: clamp(34px, 4.8vw, 60px); line-height: 1.04; font-weight: 500;
  letter-spacing: -0.015em; margin: 0 0 24px; color: var(--dl-ink); max-width: 20ch;
}
.v2-italic { font-style: italic; color: var(--dl-gold-deep); }
.v2-deck { font-family: 'Fraunces', serif; font-size: 19px; line-height: 1.5; color: var(--dl-charcoal); margin: 0 0 36px; max-width: 56ch; font-style: italic; opacity: 0.85; }
.v2-divider { display: flex; align-items: center; justify-content: center; gap: 12px; margin: 36px 0; color: var(--dl-gold-deep); font-size: 16px; opacity: 0.6; }
.v2-divider span::before, .v2-divider span::after { content: ""; display: inline-block; width: 80px; height: 1px; background: var(--dl-gold); margin: 0 14px; vertical-align: middle; opacity: 0.6; }
.v2-list { display: flex; flex-direction: column; gap: 0; }
.v2-row { display: grid; grid-template-columns: 140px 100px 1fr; gap: 16px; padding: 14px 0; border-bottom: 1px solid rgba(139,110,42,0.15); align-items: baseline; }
.v2-row:last-child { border-bottom: none; }
.v2-row-label { font-family: 'JetBrains Mono', monospace; font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--dl-gold-deep); }
.v2-row-value { font-family: 'Fraunces', serif; font-size: 22px; font-weight: 500; color: var(--dl-ink); }
.v2-row-detail { font-size: 13.5px; line-height: 1.45; color: var(--dl-charcoal); }
.v2-diagram-frame { padding: 16px 0; }

/* ───── V3 JRPG OPERATOR CONSOLE ───── */
.dl-v3-jrpg {
  background:
    radial-gradient(ellipse at top, rgba(139,110,42,0.18), transparent 60%),
    #2A2218;
  color: #F5EFE0;
}
.v3-shell { max-width: 1200px; margin: 0 auto; padding: 24px; }
.v3-hero { display: grid; grid-template-columns: 200px 1fr; gap: 24px; margin-bottom: 28px; padding: 20px; border: 2px solid var(--dl-gold); border-radius: 8px; background: linear-gradient(135deg, rgba(245,239,224,0.06) 0%, rgba(201,162,76,0.10) 100%); }
.v3-portrait { display: flex; flex-direction: column; align-items: center; gap: 8px; }
.v3-portrait-frame { width: 140px; height: 140px; border: 3px solid var(--dl-gold); border-radius: 6px; padding: 6px; background: rgba(0,0,0,0.3); position: relative; }
.v3-portrait-frame::before, .v3-portrait-frame::after { content: ""; position: absolute; width: 16px; height: 16px; border: 2px solid var(--dl-gold); }
.v3-portrait-frame::before { top: -4px; left: -4px; border-right: none; border-bottom: none; }
.v3-portrait-frame::after { bottom: -4px; right: -4px; border-left: none; border-top: none; }
.v3-portrait-art {
  width: 100%; height: 100%;
  background:
    radial-gradient(circle at 50% 35%, rgba(232,197,108,0.85) 0%, transparent 60%),
    linear-gradient(180deg, rgba(216,124,82,0.45), rgba(74,107,140,0.6));
  border-radius: 3px;
}
.v3-portrait-name { font-family: 'JetBrains Mono', monospace; font-size: 12px; letter-spacing: 0.16em; color: var(--dl-gold); }
.v3-portrait-stat { font-family: 'JetBrains Mono', monospace; font-size: 9.5px; letter-spacing: 0.14em; color: rgba(245,239,224,0.65); }
.v3-statlines { display: flex; flex-direction: column; gap: 10px; justify-content: center; }
.v3-statline { display: grid; grid-template-columns: 80px 1fr 60px; gap: 14px; align-items: center; }
.v3-statline-label { font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: 0.14em; color: rgba(245,239,224,0.75); }
.v3-statline-bar { height: 10px; background: rgba(245,239,224,0.08); border: 1px solid rgba(245,239,224,0.18); border-radius: 2px; overflow: hidden; }
.v3-statline-fill { height: 100%; background: linear-gradient(90deg, currentColor 0%, rgba(245,239,224,0.85) 100%); border-radius: 2px; transition: width 600ms ease; }
.v3-statline-emerald { color: #6BB573; }
.v3-statline-amber { color: var(--dl-gold); }
.v3-statline-ruby { color: var(--dl-ruby); }
.v3-statline-sapphire { color: #6BA3D0; }
.v3-statline-num { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--dl-gold); text-align: right; }

.v3-panel-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 18px; margin-bottom: 28px; }
.v3-panel {
  border: 2px solid var(--dl-gold); border-radius: 6px; padding: 16px;
  background:
    linear-gradient(135deg, rgba(245,239,224,0.04), rgba(245,239,224,0.08)),
    repeating-linear-gradient(45deg, transparent 0, transparent 3px, rgba(245,239,224,0.025) 3px, rgba(245,239,224,0.025) 4px);
  position: relative;
}
.v3-panel::before, .v3-panel::after { content: ""; position: absolute; width: 14px; height: 14px; border: 2px solid var(--dl-gold); }
.v3-panel::before { top: -3px; left: -3px; border-right: none; border-bottom: none; }
.v3-panel::after { bottom: -3px; right: -3px; border-left: none; border-top: none; }
.v3-panel-epic { border-color: #C77BFF; }
.v3-panel-rare { border-color: var(--dl-sapphire); }
.v3-panel-head { display: flex; align-items: center; gap: 8px; padding-bottom: 10px; border-bottom: 1px solid var(--dl-gold); margin-bottom: 12px; }
.v3-panel-icon { color: var(--dl-gold); }
.v3-panel-title { font-family: 'JetBrains Mono', monospace; font-size: 11px; letter-spacing: 0.18em; color: var(--dl-gold); }
.v3-panel-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 6px; }
.v3-panel-row { display: flex; justify-content: space-between; padding: 8px 10px; border-left: 4px solid; border-radius: 3px; background: rgba(245,239,224,0.04); font-size: 12.5px; }
.v3-tier-common { border-left-color: rgba(245,239,224,0.4); }
.v3-tier-rare { border-left-color: var(--dl-sapphire); }
.v3-tier-epic { border-left-color: #C77BFF; text-shadow: 0 0 6px rgba(199,123,255,0.4); }
.v3-row-name { font-family: 'JetBrains Mono', monospace; color: #F5EFE0; }
.v3-row-note { font-size: 11px; color: rgba(245,239,224,0.6); }

.v3-diagram-frame { border: 2px solid var(--dl-gold); padding: 16px; border-radius: 6px; background: rgba(245,239,224,0.03); }
.v3-frame-label { font-family: 'JetBrains Mono', monospace; font-size: 11px; letter-spacing: 0.16em; color: var(--dl-gold); margin-bottom: 10px; }

/* ───── V4 FALSIFIER · CREAM EDITORIAL MINIMALISM ───── */
.dl-v4-falsifier { background: #FAF6EA; }
.v4-shell { max-width: 720px; margin: 0 auto; padding: 80px 24px; }
.v4-article { color: var(--dl-ink); }
.v4-meta { font-family: 'JetBrains Mono', monospace; font-size: 10.5px; letter-spacing: 0.16em; text-transform: uppercase; color: #888; margin-bottom: 28px; }
.v4-headline {
  font-family: 'Iowan Old Style', Georgia, serif;
  font-size: clamp(36px, 5vw, 64px); line-height: 1.04; font-weight: 400;
  letter-spacing: -0.015em; margin: 0 0 28px; color: var(--dl-ink); max-width: 18ch;
}
.v4-underline { text-decoration: underline; text-decoration-color: var(--dl-gold); text-decoration-thickness: 2px; text-underline-offset: 6px; }
.v4-deck { font-family: 'Iowan Old Style', Georgia, serif; font-size: 19px; line-height: 1.55; color: var(--dl-charcoal); margin: 0 0 40px; max-width: 56ch; }
.v4-list { list-style: none; padding: 0; margin: 0 0 40px; }
.v4-list li { display: grid; grid-template-columns: 160px 1fr; gap: 24px; padding: 12px 0; border-bottom: 1px solid rgba(0,0,0,0.08); font-family: 'Iowan Old Style', Georgia, serif; font-size: 16px; }
.v4-list strong { font-weight: 600; }
.v4-list span { color: var(--dl-charcoal); }
.v4-divider { height: 1px; background: rgba(0,0,0,0.12); margin: 40px 0; }
.v4-h2 { font-family: 'Iowan Old Style', Georgia, serif; font-size: 24px; font-weight: 500; margin: 0 0 16px; }
.v4-prose { font-family: 'Iowan Old Style', Georgia, serif; font-size: 16px; line-height: 1.6; color: var(--dl-charcoal); max-width: 60ch; }

@media (max-width: 768px) {
  .dl-topbar { flex-direction: column; gap: 12px; align-items: stretch; }
  .dl-switcher { flex-wrap: wrap; }
  .v3-hero { grid-template-columns: 1fr; }
  .v3-statline { grid-template-columns: 70px 1fr 50px; }
  .v1-hero, .v1-grid, .v1-diagram { padding-left: 20px; padding-right: 20px; }
}
    `}</style>
  );
}
