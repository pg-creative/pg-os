"use client";

/**
 * CockpitOffice — the "living office" view: each live session rendered as a
 * Ghibli character in its current state, inside an environment. This is the
 * CSS-motion v1 of the locked state contract (see public/cockpit-motion-proto.html);
 * when a Rive character asset lands, swap <Character> for the .riv — the state
 * inputs (idle/active/waiting/permission) already match.
 *
 * State is derived from live data:
 *   currentTool present        → active (lean-in, prop in hand, amber rim)
 *   waiting/permission status  → waiting / permission ring
 *   running, no tool           → idle (gentle drift)
 */

import type { CSSProperties } from "react";

export type OfficeState = "idle" | "active" | "waiting" | "permission";

export interface OfficeAgent {
  id: string;
  label: string;
  state: OfficeState;
  tool?: string;
  controllable: boolean;
}

// Tool → class archetype → prop glyph (matches the MJ portrait class mapping).
function propFor(tool?: string): string {
  if (!tool) return "🏮";
  const t = tool.toLowerCase();
  if (/(write|edit|notebook)/.test(t)) return "🪶";
  if (/(bash|run|build)/.test(t)) return "🔨";
  if (/(read|grep|glob|search|fetch|web)/.test(t)) return "📖";
  if (/(task|plan|think)/.test(t)) return "🗺️";
  return "🏮";
}

export function CockpitOffice({
  agents,
  onSelect,
  selectedId,
}: {
  agents: OfficeAgent[];
  onSelect: (id: string) => void;
  selectedId: string | null;
}) {
  return (
    <div
      style={{
        position: "relative",
        borderRadius: 12,
        overflow: "hidden",
        border: "1px solid rgba(214,163,103,0.18)",
        // Atelier-ish golden-hour gradient until MJ environment backdrops land
        // (swap this for url(/agent-office/environments/<pick>.png)).
        background:
          "radial-gradient(900px 380px at 50% -20%, #2C3E50 0%, transparent 60%), radial-gradient(700px 320px at 50% 120%, #3a2a1c 0%, transparent 55%), #15120D",
        minHeight: 300,
        padding: "44px 24px 36px",
      }}
    >
      <style>{`
        @keyframes office-drift { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-2px)} }
        @keyframes office-breathe { 0%,100%{opacity:.66} 50%{opacity:1} }
        @keyframes office-alert { 0%,100%{transform:scale(1);opacity:.4} 50%{transform:scale(1.07);opacity:1} }
      `}</style>
      {agents.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            color: "#9C8B70",
            fontStyle: "italic",
            padding: "48px 0",
          }}
        >
          the atelier is quiet — no sessions at work
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 34,
            justifyContent: "center",
            alignItems: "flex-end",
          }}
        >
          {agents.map((a) => (
            <Figure
              key={a.id}
              agent={a}
              selected={a.id === selectedId}
              onClick={() => onSelect(a.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Figure({
  agent,
  selected,
  onClick,
}: {
  agent: OfficeAgent;
  selected: boolean;
  onClick: () => void;
}) {
  const s = agent.state;
  const figureStyle: CSSProperties = {
    position: "relative",
    width: 78,
    height: 96,
    transition: "transform .3s ease, filter .5s ease",
    transform: s === "active" ? "translateY(-8px) scale(1.05)" : "none",
    filter:
      s === "active"
        ? "saturate(1.25)"
        : s === "waiting"
          ? "saturate(.55) brightness(.9)"
          : "none",
    animation:
      s === "idle"
        ? "office-drift 4s ease-in-out infinite"
        : s === "waiting"
          ? "office-breathe 2s ease-in-out infinite"
          : "none",
  };
  return (
    <button
      onClick={onClick}
      style={{
        background: "transparent",
        border: "none",
        cursor: "pointer",
        padding: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        outline: selected ? "2px solid #D6A367" : "none",
        outlineOffset: 6,
        borderRadius: 10,
      }}
    >
      <div style={figureStyle}>
        {/* body */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: "50%",
            transform: "translateX(-50%)",
            width: 62,
            height: 78,
            background: "linear-gradient(160deg, #7C9A6E 0%, #4f6a47 100%)",
            borderRadius: "32px 32px 14px 14px / 46px 46px 14px 14px",
            boxShadow:
              s === "active"
                ? "inset -6px -8px 14px rgba(0,0,0,.3), 0 0 16px rgba(214,163,103,.55)"
                : "inset -6px -8px 14px rgba(0,0,0,.35), inset 6px 6px 12px rgba(255,255,255,.12)",
          }}
        />
        {/* head */}
        <div
          style={{
            position: "absolute",
            top: 4,
            left: "50%",
            transform: "translateX(-50%)",
            width: 34,
            height: 34,
            borderRadius: "50%",
            background: "radial-gradient(circle at 40% 35%, #f3dcc0, #d9b58c)",
            boxShadow: "inset -3px -3px 6px rgba(0,0,0,.25)",
          }}
        />
        {/* prop in hand (active only) */}
        {s === "active" && (
          <div
            style={{
              position: "absolute",
              right: 0,
              bottom: 26,
              fontSize: "var(--text-base)",
              filter: "drop-shadow(0 0 6px #D6A367)",
            }}
          >
            {propFor(agent.tool)}
          </div>
        )}
        {/* permission alert ring */}
        {s === "permission" && (
          <div
            style={{
              position: "absolute",
              inset: -8,
              borderRadius: 40,
              border: "2px solid #B8536F",
              animation: "office-alert 1s ease-in-out infinite",
            }}
          />
        )}
      </div>
      <div
        style={{
          fontFamily: '"Iowan Old Style", Palatino, Georgia, serif',
          fontSize: "var(--text-sm)",
          color: "#FFF8E7",
          textShadow: "0 1px 4px rgba(0,0,0,.5)",
          maxWidth: 130,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {agent.label}
      </div>
      <div
        style={{
          fontFamily: "ui-monospace, monospace",
          fontSize: "var(--text-2xs)",
          letterSpacing: ".1em",
          textTransform: "uppercase",
          color:
            s === "active"
              ? "#D6A367"
              : s === "permission"
                ? "#B8536F"
                : s === "waiting"
                  ? "#5B7BA1"
                  : "#9C8B70",
        }}
      >
        {agent.tool && s === "active" ? agent.tool.slice(0, 22) : s}
      </div>
    </button>
  );
}
