"use client";

/**
 * KitsuV1Shrine — THEMATIC, IMMERSIVE.
 *
 * Full-bleed painted shrine background (the Kitsu den). A big Live2D fox
 * stands centre-stage. Around the fox, a ring of glowing kanji "tool runes."
 * Hanging painted scrolls along the edges hold the soul stack snippets
 * (IDENTITY / SOUL / USER / MEMORY). Recent decisions drift upward as foxfire
 * orbs. Chat docks bottom.
 *
 * The most artistic of the 4 variants. Most "this is PG OS, no one else's."
 */

import { useEffect, useRef, useState } from "react";
import { useMarvis } from "../cockpit/useMarvis";
import { CockpitLive2D } from "../cockpit/skins/CockpitLive2D";
import { useMode } from "../../ModeProvider";
import { phaseForMode } from "../../bento/emakiContext";
import { FoxfireLayer } from "../../emaki/materials";
import {
  KITSU_C,
  Transcript,
  ChatComposer,
  StatePill,
  useSoul,
} from "./KitsuShared";

// Tool name → kanji glyph for the rune ring. 12 of the 19 in-process tools.
const RUNES: { name: string; kanji: string; tip: string }[] = [
  { name: "ships", kanji: "船", tip: "ship log" },
  { name: "queue", kanji: "列", tip: "approval queue" },
  { name: "calendar", kanji: "暦", tip: "Google calendar" },
  { name: "vitals", kanji: "脈", tip: "Whoop recovery" },
  { name: "music", kanji: "音", tip: "Spotify" },
  { name: "signals", kanji: "兆", tip: "AI signals" },
  { name: "archive", kanji: "巻", tip: "Claude archive" },
  { name: "fleet", kanji: "艦", tip: "live sessions" },
  { name: "habits", kanji: "習", tip: "Hero's Chronicle" },
  { name: "projects", kanji: "業", tip: "project state" },
  { name: "agents", kanji: "鬼", tip: "agent health" },
  { name: "remember", kanji: "記", tip: "self-memory" },
];

const SCROLLS: {
  key: "IDENTITY" | "SOUL" | "USER" | "MEMORY";
  label: string;
  kanji: string;
  position: { top?: number | string; bottom?: number | string; left?: number | string; right?: number | string };
}[] = [
  { key: "IDENTITY", label: "Identity", kanji: "魂", position: { top: 80, left: 16 } },
  { key: "SOUL",     label: "Soul",     kanji: "心", position: { top: 80, right: 16 } },
  { key: "USER",     label: "User",     kanji: "人", position: { bottom: 280, left: 16 } },
  { key: "MEMORY",   label: "Memory",   kanji: "記", position: { bottom: 280, right: 16 } },
];

export function KitsuV1Shrine() {
  const marvis = useMarvis();
  const { mode } = useMode();
  const phase = phaseForMode(mode);
  const soul = useSoul();
  const [openScroll, setOpenScroll] = useState<null | typeof SCROLLS[number]["key"]>(null);

  // Avatar size scales down on phones.
  const [avatarSize, setAvatarSize] = useState(260);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 480px)");
    setAvatarSize(mq.matches ? 180 : 260);
    const handler = (e: MediaQueryListEvent) =>
      setAvatarSize(e.matches ? 180 : 260);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Count drifting orbs from decision-log length (sparingly — 4 orbs max).
  const orbCount = Math.min(
    4,
    Math.max(1, ((soul.files?.["decision-log"] || "").match(/^- \*\*/gm) || []).length),
  );

  return (
    <div
      style={{
        position: "relative",
        height: "calc(100dvh - 56px)",
        overflow: "hidden",
        color: KITSU_C.cream,
        background: `
          linear-gradient(180deg, rgba(20,17,13,0.20) 0%, rgba(20,17,13,0.42) 60%, rgba(20,17,13,0.78) 100%),
          url('/kitsu/den-${phase}.webp')
        `,
        backgroundColor: KITSU_C.ink,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        fontFamily: "var(--body), system-ui, sans-serif",
      }}
    >
      {/* foxfire particles drifting up over the painting */}
      <div aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.55 }}>
        <FoxfireLayer phase={phase} />
      </div>

      {/* HEADER */}
      <header
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "16px 18px",
          zIndex: 5,
        }}
      >
        <span
          style={{
            fontFamily: "Georgia, serif",
            fontSize: 22,
            color: KITSU_C.cream,
            letterSpacing: "0.08em",
            textShadow: "0 1px 12px rgba(214,163,103,.4)",
          }}
        >
          狐 Kitsu
        </span>
        <span style={{ flex: 1 }} />
        <StatePill state={marvis.state} />
      </header>

      {/* AVATAR + RUNE RING */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "55%",
          transform: "translate(-50%, -50%)",
          width: avatarSize + 140,
          height: avatarSize + 140,
          display: "grid",
          placeItems: "center",
          zIndex: 4,
          pointerEvents: "none",
        }}
      >
        <RuneRing diameter={avatarSize + 110} runes={RUNES} activeTool={marvis.activeTool} />
        <div style={{ pointerEvents: "auto" }}>
          <CockpitLive2D
            state={marvis.state}
            size={avatarSize}
            zoom={1.45}
            align="center"
            modelUrl="/live2d/fox/standard_fox.model3.json"
          />
        </div>
      </div>

      {/* Drifting orbs — one per recent decision */}
      <div aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 3 }}>
        {Array.from({ length: orbCount }).map((_, i) => (
          <span
            key={i}
            style={{
              position: "absolute",
              left: `${15 + i * 18}%`,
              bottom: -20,
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "radial-gradient(circle, #FBE8C8 10%, rgba(214,163,103,0.6) 60%, transparent 80%)",
              filter: "blur(0.5px)",
              animation: `kitsuOrb ${10 + i * 2}s linear ${i * 1.4}s infinite`,
            }}
          />
        ))}
      </div>

      {/* SCROLLS (4, one per soul file) */}
      {SCROLLS.map((s) => (
        <Scroll
          key={s.key}
          label={s.label}
          kanji={s.kanji}
          position={s.position}
          excerpt={
            soul.loading
              ? "…"
              : excerpt(soul.files?.[s.key] || "(empty — Kitsu will populate as she learns.)")
          }
          open={openScroll === s.key}
          onToggle={() => setOpenScroll(openScroll === s.key ? null : s.key)}
        />
      ))}

      {/* CHAT — docked bottom */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          maxHeight: "44%",
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(180deg, transparent 0%, rgba(20,17,13,0.65) 22%, rgba(20,17,13,0.9) 100%)",
          backdropFilter: "blur(2px)",
          zIndex: 6,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            height: "100%",
            maxHeight: "min(280px, 38vh)",
          }}
        >
          <Transcript marvis={marvis} emptyHint="Speak, or type. The shrine is listening." />
          <ChatComposer marvis={marvis} />
        </div>
      </div>

      {/* drifting-orb keyframes */}
      <style>{`
        @keyframes kitsuOrb {
          0%   { transform: translateY(0)      scale(0.8); opacity: 0; }
          15%  { opacity: 0.9; }
          85%  { opacity: 0.7; }
          100% { transform: translateY(-90vh)  scale(1.1); opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes kitsuOrb { 0%,100% { opacity: 0; } }
        }
      `}</style>
    </div>
  );
}

// ── A glowing kanji rune ring around the fox. The active tool (if any) lights up. ─
function RuneRing({
  diameter,
  runes,
  activeTool,
}: {
  diameter: number;
  runes: typeof RUNES;
  activeTool: string | null;
}) {
  const r = diameter / 2;
  return (
    <svg
      width={diameter}
      height={diameter}
      viewBox={`0 0 ${diameter} ${diameter}`}
      style={{ position: "absolute", pointerEvents: "none" }}
    >
      <circle
        cx={r}
        cy={r}
        r={r - 12}
        fill="none"
        stroke="rgba(214,163,103,0.18)"
        strokeWidth={1}
        strokeDasharray="3 6"
      />
      {runes.map((rune, i) => {
        const angle = (i / runes.length) * Math.PI * 2 - Math.PI / 2;
        const x = r + Math.cos(angle) * (r - 12);
        const y = r + Math.sin(angle) * (r - 12);
        const active = activeTool === rune.name;
        return (
          <g key={rune.name}>
            <circle
              cx={x}
              cy={y}
              r={active ? 14 : 11}
              fill={active ? "rgba(214,163,103,0.35)" : "rgba(20,17,13,0.6)"}
              stroke={active ? "#FBE8C8" : "rgba(214,163,103,0.55)"}
              strokeWidth={active ? 1.6 : 1}
              style={{
                transition: "all 180ms ease",
                filter: active
                  ? "drop-shadow(0 0 8px rgba(251,232,200,.9))"
                  : "drop-shadow(0 0 3px rgba(214,163,103,.25))",
              }}
            >
              <title>{rune.tip}</title>
            </circle>
            <text
              x={x}
              y={y + 4}
              textAnchor="middle"
              fontFamily="Georgia, serif"
              fontSize={12}
              fill={active ? "#FBE8C8" : "#D6A367"}
              style={{ userSelect: "none", pointerEvents: "none" }}
            >
              {rune.kanji}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Painted "scroll" tile: small label + expand-on-tap excerpt ──────────────
function Scroll({
  label,
  kanji,
  excerpt,
  position,
  open,
  onToggle,
}: {
  label: string;
  kanji: string;
  excerpt: string;
  position: typeof SCROLLS[number]["position"];
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      aria-label={`${label} scroll, ${open ? "collapse" : "expand"}`}
      aria-expanded={open}
      style={{
        position: "absolute",
        ...position,
        maxWidth: open ? 240 : 70,
        background: "linear-gradient(180deg, rgba(60,42,22,0.88) 0%, rgba(30,22,14,0.92) 100%)",
        border: "1px solid rgba(214,163,103,0.45)",
        borderRadius: 10,
        padding: open ? "12px 14px" : "10px",
        color: KITSU_C.cream,
        fontFamily: "var(--body), system-ui, sans-serif",
        textAlign: "left",
        cursor: "pointer",
        zIndex: 5,
        boxShadow: "0 6px 26px rgba(0,0,0,.55), 0 0 18px rgba(214,163,103,.18) inset",
        transition: "max-width 280ms cubic-bezier(.32,0,.15,1), padding 280ms ease",
        touchAction: "manipulation",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: open ? 6 : 0 }}>
        <span style={{ fontFamily: "Georgia, serif", fontSize: 20, color: KITSU_C.amber }}>
          {kanji}
        </span>
        <span
          style={{
            fontFamily: "ui-monospace,monospace",
            fontSize: "var(--text-2xs)",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: KITSU_C.dim,
          }}
        >
          {label}
        </span>
      </div>
      {open && (
        <div
          style={{
            fontSize: "var(--text-xs)",
            lineHeight: 1.55,
            color: KITSU_C.cream,
            opacity: 0.92,
            whiteSpace: "pre-wrap",
            maxHeight: 200,
            overflowY: "auto",
          }}
        >
          {excerpt}
        </div>
      )}
    </button>
  );
}

// Take the first ~6 lines of meaningful content from a soul file.
function excerpt(text: string): string {
  const lines = text
    .split("\n")
    .filter((l) => l.trim() && !l.startsWith("---") && !l.startsWith("```"))
    .slice(0, 8);
  const joined = lines.join("\n");
  return joined.length > 360 ? joined.slice(0, 357) + "…" : joined;
}
