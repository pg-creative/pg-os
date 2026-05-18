"use client";

/**
 * Shared visual primitives for the agent-office variants.
 *
 * Locked tokens from research/agent-office-character-system-2026-05-16.md:
 *   - Ghibli + golden hour + JRPG accents
 *   - Iowan Old Style display / Inter body / JetBrains Mono labels
 *   - Motion: 200ms ease-out / 300ms with 8px translate-y / nothing else
 *   - Hades color tinting for state
 *   - Prop-in-hand for tool activity
 */

import type {
  AgentSnapshot,
  ToolCategory,
  AgentStatus,
} from "./useAgentStream";

// ---------- Palette tokens ----------

export const tokens = {
  bgCream: "#FAF6EE",
  bgDeepBlue: "#2C3E50",
  bgInk: "#1A1822",
  ink: "#2A241C",
  muted: "#6B5F4F",
  dim: "#A89F8E",
  rule: "#E8DDC9",

  amber: "#D6A367", // primary accent
  coral: "#E8B4A8", // secondary accent
  emerald: "#7C9A6E",
  ruby: "#B8536F",
  sapphire: "#5B7BA1",

  glowAmber: "rgba(214, 163, 103, 0.45)",
  glowCoral: "rgba(232, 180, 168, 0.40)",
  glowSapphire: "rgba(91, 123, 161, 0.35)",
  glowEmerald: "rgba(124, 154, 110, 0.35)",
} as const;

export const fonts = {
  display: "'Iowan Old Style', Palatino, 'Palatino Linotype', Georgia, serif",
  body: "Inter, -apple-system, 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif",
  mono: "'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, monospace",
} as const;

// ---------- Tool → prop mapping (Hades + JRPG) ----------

export interface PropDef {
  glyph: string; // emoji or unicode glyph
  label: string; // human-readable action ("reading", "writing")
  color: string; // background tint for the prop badge
}

export const PROPS: Record<ToolCategory, PropDef> = {
  read: { glyph: "📖", label: "reading", color: tokens.sapphire },
  write: { glyph: "✒️", label: "writing", color: tokens.amber },
  bash: { glyph: "⚒️", label: "forging", color: tokens.ruby },
  search: { glyph: "🌐", label: "searching", color: tokens.emerald },
  task: { glyph: "🗺️", label: "scouting", color: tokens.amber },
  plan: { glyph: "📜", label: "planning", color: tokens.muted },
  ask: { glyph: "⏳", label: "waiting", color: tokens.coral },
  other: { glyph: "✨", label: "working", color: tokens.dim },
};

export function getProp(agent: AgentSnapshot): PropDef | null {
  if (!agent.currentTool) return null;
  return PROPS[agent.currentTool.category] ?? PROPS.other;
}

// ---------- Status → tint mapping (Hades style) ----------

export const STATUS_TINT: Record<AgentStatus, string> = {
  idle: tokens.dim,
  active: tokens.amber,
  waiting: tokens.coral,
  permission: tokens.ruby,
};

export const STATUS_GLOW: Record<AgentStatus, string> = {
  idle: "transparent",
  active: tokens.glowAmber,
  waiting: tokens.glowCoral,
  permission: "rgba(184, 83, 111, 0.45)",
};

export const STATUS_LABEL: Record<AgentStatus, string> = {
  idle: "at rest",
  active: "at work",
  waiting: "calls for you",
  permission: "needs your hand",
};

// ---------- Character class auto-derivation (JRPG) ----------

export type CharacterClass =
  | "scribe"
  | "ranger"
  | "smith"
  | "scout"
  | "sage"
  | "wanderer";

export function deriveClass(agent: AgentSnapshot): CharacterClass {
  // Count tool categories across the recent history
  const counts: Partial<Record<ToolCategory, number>> = {};
  for (const t of agent.toolHistory) {
    counts[t.category] = (counts[t.category] ?? 0) + 1;
  }
  const top = Object.entries(counts).sort(
    (a, b) => (b[1] ?? 0) - (a[1] ?? 0),
  )[0];
  if (!top) return "wanderer";
  const [cat] = top;
  if (cat === "read") return "sage";
  if (cat === "write") return "scribe";
  if (cat === "bash") return "smith";
  if (cat === "search") return "ranger";
  if (cat === "task") return "scout";
  return "wanderer";
}

export const CLASS_PORTRAIT_GRADIENT: Record<CharacterClass, string> = {
  scribe: `linear-gradient(135deg, ${tokens.amber} 0%, ${tokens.coral} 100%)`,
  ranger: `linear-gradient(135deg, ${tokens.emerald} 0%, ${tokens.sapphire} 100%)`,
  smith: `linear-gradient(135deg, ${tokens.ruby} 0%, ${tokens.amber} 100%)`,
  scout: `linear-gradient(135deg, ${tokens.amber} 0%, ${tokens.emerald} 100%)`,
  sage: `linear-gradient(135deg, ${tokens.sapphire} 0%, ${tokens.muted} 100%)`,
  wanderer: `linear-gradient(135deg, ${tokens.muted} 0%, ${tokens.dim} 100%)`,
};

// ---------- Stable per-agent deterministic value (for layout positioning) ----------

export function agentSeed(id: number): number {
  // Simple deterministic hash so agent positions stay stable across renders
  let h = id * 2654435761;
  h = (h ^ (h >>> 16)) >>> 0;
  return h / 0xffffffff;
}

// ---------- Shared time-ticker hook ----------

import { useEffect, useState } from "react";

export function useTicker(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

export function relTime(then: number, now: number): string {
  const sec = Math.floor((now - then) / 1000);
  if (sec < 5) return "just now";
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  return `${hr}h ago`;
}

// ---------- Character portrait (shared, CSS-only placeholder) ----------

export function CharacterPortrait({
  agent,
  size = 72,
}: {
  agent: AgentSnapshot;
  size?: number;
}) {
  const cls = deriveClass(agent);
  const initial = (agent.projectName || "?").slice(0, 1).toUpperCase();
  const glow = STATUS_GLOW[agent.status];
  const breathing = agent.status === "waiting";

  return (
    <div
      style={{
        position: "relative",
        width: size,
        height: size,
        borderRadius: "50%",
        background: CLASS_PORTRAIT_GRADIENT[cls],
        boxShadow: `0 0 ${size / 2}px ${glow}, inset 0 -${size / 8}px ${size / 4}px rgba(0,0,0,0.15)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#FFF8E7",
        fontFamily: fonts.display,
        fontSize: size * 0.4,
        fontWeight: 500,
        letterSpacing: "-0.02em",
        textShadow: "0 1px 2px rgba(0,0,0,0.25)",
        transition: "box-shadow 300ms ease-out, transform 200ms ease-out",
        transform:
          agent.status === "active" ? "translateY(-2px)" : "translateY(0)",
        animation: breathing
          ? "agent-breathe 1.6s ease-in-out infinite"
          : undefined,
      }}
    >
      {initial}
    </div>
  );
}

// ---------- Activity prop badge (the floating tool indicator) ----------

export function ActivityProp({
  agent,
  size = 32,
}: {
  agent: AgentSnapshot;
  size?: number;
}) {
  const prop = getProp(agent);
  if (!prop) return null;
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: prop.color,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.55,
        boxShadow: `0 2px 6px rgba(0,0,0,0.18), 0 0 ${size}px ${tokens.glowAmber}`,
        border: `2px solid ${tokens.bgCream}`,
      }}
      title={`${prop.label}: ${agent.currentTool?.toolStatus ?? ""}`}
    >
      {prop.glyph}
    </div>
  );
}

// ---------- Shared keyframes block ----------

export const SharedKeyframes = () => (
  <style>{`
    @keyframes agent-breathe {
      0%, 100% { opacity: 0.7; transform: scale(1); }
      50% { opacity: 1; transform: scale(1.04); }
    }
    @keyframes agent-pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    @keyframes agent-drift {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-1px); }
    }
    @keyframes agent-shimmer {
      0%, 100% { opacity: 0.45; }
      50% { opacity: 0.7; }
    }
  `}</style>
);
