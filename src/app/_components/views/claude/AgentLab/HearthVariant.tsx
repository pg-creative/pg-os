"use client";

/**
 * V1 — Hearth
 * Stripe single-metric-first + Linear progressive disclosure + PG Ghibli warmth.
 * Vertical stack of large agent cards. Information first. Beauty earned through restraint.
 *
 * Bet: PG values being able to glance at one card and immediately know
 * "what's CEREBRUM doing right now and how active has it been."
 */

import { useEffect, useState } from "react";
import {
  useAgentStream,
  type AgentSnapshot,
  type ToolCategory,
} from "./useAgentStream";

const CATEGORY_COLORS: Record<ToolCategory, string> = {
  read: "#7C9A6E", // sage
  write: "#D6A367", // gold
  bash: "#9B6B47", // warm brown
  search: "#7C3AED", // royal purple
  task: "#E07A5F", // coral
  plan: "#B19CD9", // muted lavender
  ask: "#D9C589", // pale gold
  other: "#A89F8E", // warm grey
};

const STATUS_COLORS = {
  idle: "#A89F8E",
  active: "#D6A367",
  waiting: "#B19CD9",
  permission: "#7C3AED",
};

const STATUS_LABELS = {
  idle: "idle",
  active: "working",
  waiting: "needs you",
  permission: "permission",
};

function relativeTime(then: number, now: number): string {
  const sec = Math.floor((now - then) / 1000);
  if (sec < 5) return "just now";
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  return `${hr}h ago`;
}

function Sparkline({ history }: { history: AgentSnapshot["toolHistory"] }) {
  const slots = 30;
  const padded: (AgentSnapshot["toolHistory"][number] | null)[] = [
    ...Array(Math.max(0, slots - history.length)).fill(null),
    ...history.slice(-slots),
  ];
  return (
    <div
      style={{ display: "flex", gap: 3, alignItems: "flex-end", height: 24 }}
    >
      {padded.map((entry, i) => (
        <div
          key={i}
          title={entry ? `${entry.toolName}: ${entry.toolStatus}` : "empty"}
          style={{
            width: 8,
            height: entry ? 24 : 4,
            background: entry ? CATEGORY_COLORS[entry.category] : "#E8DDC9",
            borderRadius: 1,
            opacity: entry ? (entry.doneAt ? 0.55 : 1) : 0.5,
            transition: "all 200ms ease-out",
          }}
        />
      ))}
    </div>
  );
}

function AgentCard({ agent, now }: { agent: AgentSnapshot; now: number }) {
  const statusColor = STATUS_COLORS[agent.status];
  const statusLabel = STATUS_LABELS[agent.status];

  return (
    <article
      style={{
        background: "#FFFCF5",
        border: "1px solid #E8DDC9",
        borderRadius: 6,
        padding: "28px 32px",
        boxShadow:
          "0 1px 0 rgba(42, 36, 28, 0.04), 0 4px 12px rgba(42, 36, 28, 0.06)",
        position: "relative",
      }}
    >
      {/* Header row: project + status */}
      <header
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          marginBottom: 4,
        }}
      >
        <h2
          style={{
            margin: 0,
            fontFamily: "'Iowan Old Style', Palatino, Georgia, serif",
            fontSize: 28,
            fontWeight: 500,
            color: "#2A241C",
            letterSpacing: "-0.01em",
          }}
        >
          {agent.projectName}
        </h2>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
            fontSize: 11,
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            color: "#6B5F4F",
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: statusColor,
              animation:
                agent.status === "active" || agent.status === "permission"
                  ? "hearth-pulse 1.6s ease-in-out infinite"
                  : undefined,
            }}
          />
          {statusLabel}
        </div>
      </header>

      {/* Subhead: session age */}
      <div
        style={{
          fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
          fontSize: 12,
          color: "#A89F8E",
          marginBottom: 22,
        }}
      >
        joined {relativeTime(agent.joinedAt, now)} · last activity{" "}
        {relativeTime(agent.lastActivityAt, now)}
      </div>

      {/* Current activity */}
      <div
        style={{
          fontSize: 16,
          color: agent.currentTool ? "#2A241C" : "#A89F8E",
          marginBottom: 20,
          fontStyle: agent.currentTool ? "normal" : "italic",
          minHeight: 22,
        }}
      >
        {agent.currentTool ? agent.currentTool.toolStatus : "no tool running"}
      </div>

      {/* Footer row: sparkline + count */}
      <footer
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          gap: 24,
        }}
      >
        <div style={{ flex: 1 }}>
          <Sparkline history={agent.toolHistory} />
          <div
            style={{
              marginTop: 6,
              fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
              fontSize: 10,
              color: "#A89F8E",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
            }}
          >
            last {Math.min(agent.toolHistory.length, 30)} calls
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div
            style={{
              fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
              fontSize: 38,
              fontWeight: 500,
              color: "#2A241C",
              lineHeight: 1,
            }}
          >
            {agent.toolCallCount}
          </div>
          <div
            style={{
              fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
              fontSize: 10,
              color: "#A89F8E",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              marginTop: 2,
            }}
          >
            tool calls
          </div>
        </div>
      </footer>
    </article>
  );
}

export function HearthVariant() {
  const { agents, connected } = useAgentStream();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div
      style={{
        background: "#FAF6EE",
        color: "#2A241C",
        padding: "48px 32px",
        minHeight: "100%",
        fontFamily:
          "-apple-system, 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif",
      }}
    >
      <style>{`
        @keyframes hearth-pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.6); opacity: 0.5; }
        }
      `}</style>

      <header style={{ marginBottom: 32, maxWidth: 760 }}>
        <div
          style={{
            fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
            fontSize: 11,
            textTransform: "uppercase",
            letterSpacing: "0.18em",
            color: "#6B5F4F",
            marginBottom: 8,
          }}
        >
          Hearth · V1 · {connected ? "live" : "reconnecting…"}
        </div>
        <h1
          style={{
            margin: 0,
            fontFamily: "'Iowan Old Style', Palatino, Georgia, serif",
            fontSize: 40,
            fontWeight: 500,
            letterSpacing: "-0.02em",
            color: "#2A241C",
          }}
        >
          The hearth.
        </h1>
        <p
          style={{
            margin: "8px 0 0",
            fontSize: 16,
            color: "#6B5F4F",
            maxWidth: 560,
          }}
        >
          Every active Claude Code session, gathered around the fire. One card
          per agent. What it's doing. How hard it's working. How long it's been
          here.
        </p>
      </header>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 20,
          maxWidth: 760,
        }}
      >
        {agents.length === 0 ? (
          <div
            style={{
              padding: "64px 32px",
              textAlign: "center",
              border: "1px dashed #D8C9AE",
              borderRadius: 6,
              color: "#A89F8E",
              fontStyle: "italic",
              fontSize: 16,
            }}
          >
            The hearth is cold. No Claude Code sessions running.
          </div>
        ) : (
          agents.map((a) => <AgentCard key={a.id} agent={a} now={now} />)
        )}
      </div>
    </div>
  );
}
