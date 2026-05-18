"use client";

/**
 * V2 — Bridge Rail
 * btop/htop/k9s terminal density applied to web. Dark Laputa Midnight base,
 * golden-amber accents, JetBrains Mono throughout. Every agent = one row.
 * Glanceable at 2am from across the room.
 */

import { useEffect, useState } from "react";
import {
  useAgentStream,
  type AgentSnapshot,
  type ToolCategory,
} from "./useAgentStream";

// ── Palette ──────────────────────────────────────────────────────────────────

const BG = "#0F0E13";
const CARD = "#1A1822";
const BORDER = "#2A2733";
const GOLD = "#D6A367";
const GOLD_DIM = "#7A5A35";
const MUTED = "#5A5468";
const TEXT = "#C8C0D8";
const TEXT_DIM = "#7A7090";

const CATEGORY_CHAR: Record<ToolCategory, string> = {
  read: "r",
  write: "w",
  bash: "$",
  search: "?",
  task: "T",
  plan: "P",
  ask: "!",
  other: "·",
};

// Using distinct monochrome-ish terminal colors per category
const CATEGORY_COLOR: Record<ToolCategory, string> = {
  read: "#5F9EA0", // cadet blue
  write: "#D6A367", // gold
  bash: "#8FBC8F", // pale green
  search: "#9B7FD4", // muted violet
  task: "#E07A5F", // coral
  plan: "#7BA7BC", // steel blue
  ask: "#F0D080", // pale amber
  other: "#6B6080", // grey-violet
};

const STATUS_GLYPH: Record<string, string> = {
  idle: "○",
  active: "●",
  waiting: "◐",
  permission: "⚠",
};

const STATUS_COLOR: Record<string, string> = {
  idle: MUTED,
  active: GOLD,
  waiting: "#9B7FD4",
  permission: "#E07A5F",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function relativeTime(then: number, now: number): string {
  const sec = Math.floor((now - then) / 1000);
  if (sec < 5) return "now";
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m`;
  return `${Math.floor(min / 60)}h`;
}

/** Trim a tool status string to ~40 chars for the dense row. */
function trimTool(status: string): string {
  if (!status) return "—";
  // Collapse repeated whitespace
  const s = status.replace(/\s+/g, " ").trim();
  return s.length > 40 ? s.slice(0, 38) + "…" : s;
}

// ── Sparkline (UTF-8 block chars) ─────────────────────────────────────────────

const BLOCKS = ["▁", "▂", "▃", "▄", "▅", "▆", "▇", "█"];

function Sparkline({ history }: { history: AgentSnapshot["toolHistory"] }) {
  const slots = 30;
  const padded: (AgentSnapshot["toolHistory"][number] | null)[] = [
    ...Array(Math.max(0, slots - history.length)).fill(null),
    ...history.slice(-slots),
  ];

  return (
    <span
      style={{
        fontFamily: "'JetBrains Mono', ui-monospace, 'SF Mono', monospace",
        fontSize: 10,
        lineHeight: 1,
        letterSpacing: 0,
        whiteSpace: "nowrap",
        display: "inline-flex",
        alignItems: "flex-end",
        gap: 0,
      }}
      aria-hidden="true"
    >
      {padded.map((entry, i) => {
        if (!entry) {
          return (
            <span key={i} style={{ color: BORDER }}>
              ▁
            </span>
          );
        }
        // Height: done tools are shorter (▃), in-flight taller (▇)
        const block = entry.doneAt ? BLOCKS[2] : BLOCKS[6];
        const color = CATEGORY_COLOR[entry.category];
        const opacity = entry.doneAt ? 0.6 : 1;
        return (
          <span
            key={i}
            title={`${entry.toolName}: ${entry.toolStatus}`}
            style={{ color, opacity, transition: "opacity 200ms linear" }}
          >
            {block}
          </span>
        );
      })}
    </span>
  );
}

// ── Agent Row ─────────────────────────────────────────────────────────────────

function AgentRow({
  agent,
  now,
  isLast,
}: {
  agent: AgentSnapshot;
  now: number;
  isLast: boolean;
}) {
  const glyph = STATUS_GLYPH[agent.status] ?? "○";
  const glyphColor = STATUS_COLOR[agent.status] ?? MUTED;
  const isActive = agent.status === "active" || agent.status === "permission";
  const toolText = agent.currentTool
    ? trimTool(agent.currentTool.toolStatus)
    : agent.status === "waiting"
      ? "waiting for input"
      : "—";

  return (
    <div
      role="row"
      style={{
        display: "grid",
        gridTemplateColumns: "18px 1fr auto",
        alignItems: "center",
        gap: 0,
        height: 48,
        padding: "0 16px",
        borderBottom: isLast ? "none" : `1px solid ${BORDER}`,
        background: isActive ? "rgba(214,163,103,0.04)" : "transparent",
        transition: "background 200ms linear",
      }}
    >
      {/* Col 1: status glyph */}
      <span
        aria-label={agent.status}
        style={{
          fontFamily: "'JetBrains Mono', ui-monospace, monospace",
          fontSize: 13,
          color: glyphColor,
          animation: isActive ? "br-pulse 1.4s step-start infinite" : undefined,
          display: "inline-block",
          width: 14,
          userSelect: "none",
        }}
      >
        {glyph}
      </span>

      {/* Col 2: project + tool activity */}
      <div style={{ overflow: "hidden", paddingLeft: 10, paddingRight: 12 }}>
        {/* Line 1: project name */}
        <div
          style={{
            fontFamily: "'JetBrains Mono', ui-monospace, monospace",
            fontSize: 11,
            fontWeight: 700,
            color: isActive ? GOLD : TEXT,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            lineHeight: 1.25,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            transition: "color 200ms linear",
          }}
        >
          {agent.projectName}
          <span
            style={{
              fontWeight: 400,
              color: MUTED,
              marginLeft: 8,
              letterSpacing: 0,
              fontSize: 10,
              textTransform: "none",
            }}
          >
            +{relativeTime(agent.joinedAt, now)}
          </span>
        </div>
        {/* Line 2: current tool + sparkline */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginTop: 2,
          }}
        >
          <span
            style={{
              fontFamily: "'JetBrains Mono', ui-monospace, monospace",
              fontSize: 10,
              color: agent.currentTool ? TEXT : TEXT_DIM,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              flex: "0 1 auto",
              minWidth: 0,
              fontStyle: agent.currentTool ? "normal" : "italic",
              transition: "color 200ms linear",
            }}
          >
            {toolText}
          </span>
          <span style={{ flex: "0 0 auto" }}>
            <Sparkline history={agent.toolHistory} />
          </span>
        </div>
      </div>

      {/* Col 3: tool call count (right-aligned) */}
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <span
          style={{
            fontFamily: "'JetBrains Mono', ui-monospace, monospace",
            fontSize: 16,
            fontWeight: 700,
            color: isActive ? GOLD : MUTED,
            lineHeight: 1,
            transition: "color 200ms linear",
          }}
        >
          {agent.toolCallCount}
        </span>
        <div
          style={{
            fontFamily: "'JetBrains Mono', ui-monospace, monospace",
            fontSize: 8,
            color: MUTED,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            marginTop: 1,
          }}
        >
          calls
        </div>
      </div>
    </div>
  );
}

// ── Main Export ───────────────────────────────────────────────────────────────

export function BridgeRailVariant() {
  const { agents, connected } = useAgentStream();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const activeCount = agents.filter(
    (a) => a.status === "active" || a.status === "permission",
  ).length;

  return (
    <div
      style={{
        background: BG,
        color: TEXT,
        minHeight: "100%",
        fontFamily: "'JetBrains Mono', ui-monospace, 'SF Mono', monospace",
      }}
    >
      <style>{`
        @keyframes br-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.25; }
        }
      `}</style>

      {/* ── Header bar ── */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
          borderBottom: `1px solid ${GOLD_DIM}`,
          background: CARD,
        }}
      >
        {/* Left: title */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: GOLD,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
            }}
          >
            BRIDGE.RAIL
          </span>
          <span
            style={{
              fontSize: 9,
              color: MUTED,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            v2
          </span>
        </div>

        {/* Right: connection + agent count */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            fontSize: 10,
          }}
        >
          {/* active count badge */}
          {activeCount > 0 && (
            <span
              style={{
                background: "rgba(214,163,103,0.15)",
                border: `1px solid ${GOLD_DIM}`,
                color: GOLD,
                borderRadius: 2,
                padding: "2px 7px",
                fontSize: 10,
                letterSpacing: "0.08em",
              }}
            >
              {activeCount} active
            </span>
          )}
          {/* total */}
          <span style={{ color: MUTED }}>
            {agents.length} agent{agents.length !== 1 ? "s" : ""}
          </span>
          {/* connection dot */}
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              color: connected ? "#8FBC8F" : "#E07A5F",
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: connected ? "#8FBC8F" : "#E07A5F",
                display: "inline-block",
                animation: connected
                  ? "br-pulse 2.4s step-start infinite"
                  : undefined,
              }}
            />
            {connected ? "live" : "disconnected"}
          </span>
        </div>
      </header>

      {/* ── Column headers ── */}
      {agents.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "18px 1fr auto",
            gap: 0,
            padding: "5px 16px",
            borderBottom: `1px solid ${BORDER}`,
            background: CARD,
          }}
        >
          <span />
          <span
            style={{
              paddingLeft: 10,
              fontSize: 9,
              color: MUTED,
              textTransform: "uppercase",
              letterSpacing: "0.12em",
            }}
          >
            PROJECT · ACTIVITY · HISTORY
          </span>
          <span
            style={{
              fontSize: 9,
              color: MUTED,
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              textAlign: "right",
            }}
          >
            CALLS
          </span>
        </div>
      )}

      {/* ── Agent list or empty state ── */}
      <div style={{ background: CARD }}>
        {agents.length === 0 ? (
          <div
            style={{
              padding: "48px 16px",
              textAlign: "center",
              fontFamily: "'JetBrains Mono', ui-monospace, monospace",
              fontSize: 12,
              color: MUTED,
              letterSpacing: "0.05em",
            }}
          >
            // no agents on the bridge
          </div>
        ) : (
          agents.map((agent, i) => (
            <AgentRow
              key={agent.id}
              agent={agent}
              now={now}
              isLast={i === agents.length - 1}
            />
          ))
        )}
      </div>

      {/* ── Footer: category legend ── */}
      <footer
        style={{
          padding: "8px 16px",
          borderTop: `1px solid ${BORDER}`,
          display: "flex",
          gap: 14,
          flexWrap: "wrap",
        }}
      >
        {(Object.entries(CATEGORY_CHAR) as [ToolCategory, string][]).map(
          ([cat, char]) => (
            <span
              key={cat}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                fontSize: 9,
                color: TEXT_DIM,
                letterSpacing: "0.06em",
              }}
            >
              <span style={{ color: CATEGORY_COLOR[cat], fontSize: 11 }}>
                {char}
              </span>
              {cat}
            </span>
          ),
        )}
      </footer>
    </div>
  );
}
