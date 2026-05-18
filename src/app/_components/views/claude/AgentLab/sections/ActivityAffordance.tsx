"use client";

/**
 * Activity affordance section primitive — 4 variants. Same agent data, four
 * different ways to communicate WHAT the agent is doing right now.
 *
 * V1 prop-hand       Tool icon as if held by character (book/quill/hammer)
 * V2 color-tint      Hades-style character tint shifts per state (no extra UI)
 * V3 kinetic-label   Persona 5 floating text bubble above character
 * V4 status-stack    FALSIFIER — corner JRPG icon stack
 *
 * All variants wrap a character node (you pass <Character/> as children) and
 * overlay/decorate it with the chosen affordance. The character itself is
 * variant-agnostic.
 */

import type { ReactNode } from "react";
import type { AgentSnapshot, ActivityVariant } from "./types";
import {
  tokens,
  fonts,
  getProp,
  PROPS,
  STATUS_TINT,
  STATUS_LABEL,
} from "../primitives";

export interface ActivityAffordanceProps {
  agent: AgentSnapshot;
  variant: ActivityVariant;
  children: ReactNode; // the Character node
}

export function ActivityAffordance({
  agent,
  variant,
  children,
}: ActivityAffordanceProps) {
  switch (variant) {
    case "prop-hand":
      return <PropInHand agent={agent}>{children}</PropInHand>;
    case "color-tint":
      return <ColorTint agent={agent}>{children}</ColorTint>;
    case "kinetic-label":
      return <KineticLabel agent={agent}>{children}</KineticLabel>;
    case "status-stack":
      return <StatusStack agent={agent}>{children}</StatusStack>;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// V1 — Prop in Hand
// Tool icon as a small floating disc beside the character (book / quill /
// hammer / globe / map / hourglass). Strongest at-a-glance signal of WHAT.

function PropInHand({
  agent,
  children,
}: {
  agent: AgentSnapshot;
  children: ReactNode;
}) {
  const prop = getProp(agent);
  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      {children}
      {prop && (
        <div
          style={{
            position: "absolute",
            right: -10,
            top: -8,
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: prop.color,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 20,
            boxShadow: `0 2px 8px rgba(0,0,0,0.2), 0 0 24px ${tokens.glowAmber}`,
            border: `2px solid ${tokens.bgCream}`,
            animation: "agent-prop-pop 200ms ease-out",
          }}
          title={`${prop.label}: ${agent.currentTool?.toolStatus ?? ""}`}
        >
          {prop.glyph}
        </div>
      )}
      <style>{`
        @keyframes agent-prop-pop {
          from { transform: scale(0.7); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// V2 — Color Tint
// No extra UI chrome. The character itself shifts color per state (Hades
// philosophy: the character IS the status). Lowest visual noise, requires
// character to be vivid enough to read the tint at a glance.

function ColorTint({
  agent,
  children,
}: {
  agent: AgentSnapshot;
  children: ReactNode;
}) {
  const tint = STATUS_TINT[agent.status];
  const filter = (() => {
    switch (agent.status) {
      case "idle":
        return "saturate(0.5) brightness(0.85)";
      case "active":
        return `saturate(1.15) brightness(1.05) drop-shadow(0 0 12px ${tint})`;
      case "waiting":
        return `saturate(0.9) drop-shadow(0 0 16px ${tokens.glowCoral})`;
      case "permission":
        return `saturate(1.2) brightness(1.1) drop-shadow(0 0 18px ${tint})`;
    }
  })();

  return (
    <div
      style={{
        position: "relative",
        display: "inline-block",
        filter,
        transition: "filter 300ms ease-out",
      }}
    >
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// V3 — Kinetic Label
// Persona 5 inspired — floating text bubble above the character with the
// current activity status. High specificity (the actual file/command),
// medium visual noise (text overlay).

function KineticLabel({
  agent,
  children,
}: {
  agent: AgentSnapshot;
  children: ReactNode;
}) {
  const prop = getProp(agent);
  const statusText =
    agent.currentTool?.toolStatus ?? STATUS_LABEL[agent.status];
  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      {children}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: -32,
          transform: "translateX(-50%)",
          padding: "4px 12px 5px",
          background: tokens.ink,
          color: "#FFF8E7",
          fontFamily: fonts.mono,
          fontSize: 11,
          letterSpacing: "0.04em",
          whiteSpace: "nowrap",
          maxWidth: 200,
          overflow: "hidden",
          textOverflow: "ellipsis",
          border: `1.5px solid ${tokens.amber}`,
          boxShadow: `0 2px 8px rgba(0,0,0,0.3)`,
          transition: "all 200ms ease-out",
          animation: agent.currentTool
            ? "agent-label-in 200ms ease-out"
            : undefined,
        }}
      >
        <span style={{ marginRight: 6 }}>{prop?.glyph ?? "·"}</span>
        {statusText}
        {/* Pointer down to character */}
        <span
          aria-hidden
          style={{
            position: "absolute",
            left: "50%",
            bottom: -6,
            transform: "translateX(-50%)",
            width: 0,
            height: 0,
            borderLeft: "5px solid transparent",
            borderRight: "5px solid transparent",
            borderTop: `5px solid ${tokens.amber}`,
          }}
        />
      </div>
      <style>{`
        @keyframes agent-label-in {
          from { transform: translateX(-50%) translateY(-4px); opacity: 0; }
          to { transform: translateX(-50%) translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// V4 — Status Stack (FALSIFIER)
// Corner JRPG icon stack — vertical stack of status icons in the top-right.
// Highest info density per character (can show multiple concurrent states),
// least character-expressive (UI chrome overrules the figure). Tests whether
// you actually need the character-as-status fusion or if dense data wins.

function StatusStack({
  agent,
  children,
}: {
  agent: AgentSnapshot;
  children: ReactNode;
}) {
  const prop = getProp(agent);
  // Build the stack: prop glyph (if active) + status glyph + permission badge
  const icons: { glyph: string; bg: string; title: string }[] = [];
  if (prop)
    icons.push({ glyph: prop.glyph, bg: prop.color, title: prop.label });
  icons.push({
    glyph:
      agent.status === "active"
        ? "●"
        : agent.status === "waiting"
          ? "◐"
          : agent.status === "permission"
            ? "⚠"
            : "○",
    bg: STATUS_TINT[agent.status],
    title: STATUS_LABEL[agent.status],
  });
  if (agent.toolCallCount > 0) {
    icons.push({
      glyph: String(Math.min(99, agent.toolCallCount)),
      bg: tokens.muted,
      title: `${agent.toolCallCount} tool calls`,
    });
  }

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      {children}
      <div
        style={{
          position: "absolute",
          right: -6,
          top: -6,
          display: "flex",
          flexDirection: "column",
          gap: 3,
        }}
      >
        {icons.map((icon, i) => (
          <div
            key={i}
            title={icon.title}
            style={{
              width: 22,
              height: 22,
              borderRadius: 4,
              background: icon.bg,
              color: "#FFF8E7",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: fonts.mono,
              fontSize: 11,
              fontWeight: 600,
              border: `1px solid ${tokens.bgCream}`,
              boxShadow: "0 1px 3px rgba(0,0,0,0.25)",
            }}
          >
            {icon.glyph}
          </div>
        ))}
      </div>
    </div>
  );
}
