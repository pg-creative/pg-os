"use client";

/**
 * CockpitView — the browser GUI for Claude Code.
 *
 * Joins three data layers on session id:
 *   1. /api/cockpit/telemetry  — vitals (model, context %, cost, rate limits) [statusLine sink, AUTHORITATIVE]
 *   2. /api/sessions           — activity (current tool, last user msg)        [jsonl tail]
 *   3. daemon /sessions        — which sessions are tmux-backed = CONTROLLABLE
 *
 * Cockpit-launched sessions get a live two-way terminal (CockpitTerminal).
 * Bare `claude` sessions show as telemetry-only (observable, not controllable) —
 * a PTY can't attach to an already-running process. The agent-office visual layer
 * (Rive characters / voice orchestrator) layers on top once that direction is picked.
 */

import { useCallback, useEffect, useState } from "react";
import { CockpitTerminal } from "./cockpit/CockpitTerminal";
import { MarvisCorner } from "./cockpit/MarvisCorner";

const C = {
  ink: "#13110D",
  panel: "#1B1813",
  cream: "#EFE6D4",
  dim: "#9C8B70",
  amber: "#D6A367",
  emerald: "#7C9A6E",
  ruby: "#B8536F",
  sapphire: "#5B7BA1",
  border: "rgba(214,163,103,0.16)",
};

type Telemetry = {
  sessionId: string;
  live: boolean;
  ageMs: number;
  sessionName: string | null;
  modelName: string | null;
  effort: string | null;
  projectLabel: string;
  worktree: string | null;
  branch: string | null;
  contextUsedPct: number;
  exceeds200k: boolean;
  costUsd: number;
  linesAdded: number | null;
  linesRemoved: number | null;
  fastMode: boolean;
  thinking: boolean;
  fiveHour: { usedPercentage: number; resetsAt: number | null } | null;
  sevenDay: { usedPercentage: number; resetsAt: number | null } | null;
};

type ActivitySession = {
  id: string;
  status: "running" | "idle";
  lastUserMsg?: string;
  currentTool?: string;
};

type DaemonInfo = {
  running: boolean;
  port: number;
  token: string | null;
  wsBase: string;
  httpBase: string;
};

type Card = Telemetry & {
  currentTool?: string;
  lastUserMsg?: string;
  activityStatus?: "running" | "idle";
  controllable: boolean;
};

async function getJSON<T>(url: string, init?: RequestInit): Promise<T | null> {
  try {
    const r = await fetch(url, { cache: "no-store", ...init });
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch {
    return null;
  }
}

export function CockpitView() {
  const [cards, setCards] = useState<Card[]>([]);
  const [daemon, setDaemon] = useState<DaemonInfo | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [newCwd, setNewCwd] = useState("");
  const [launching, setLaunching] = useState(false);

  const refresh = useCallback(async () => {
    const [tele, acts, dinfo] = await Promise.all([
      getJSON<{ sessions: Telemetry[] }>("/api/cockpit/telemetry"),
      getJSON<{ sessions: ActivitySession[] }>("/api/sessions"),
      getJSON<DaemonInfo>("/api/cockpit/daemon"),
    ]);
    setDaemon(dinfo);

    // Which ids are tmux-backed (controllable)? Ask the daemon directly (loopback CORS allowed).
    let controllable = new Set<string>();
    if (dinfo?.running && dinfo.token) {
      const list = await getJSON<{ sessions: { id: string }[] }>(
        `${dinfo.httpBase}/sessions`,
        { headers: { "x-cockpit-token": dinfo.token } },
      );
      if (list) controllable = new Set(list.sessions.map((s) => s.id));
    }

    const actById = new Map((acts?.sessions ?? []).map((s) => [s.id, s]));
    const merged: Card[] = (tele?.sessions ?? []).map((t) => {
      const a = actById.get(t.sessionId);
      return {
        ...t,
        currentTool: a?.currentTool,
        lastUserMsg: a?.lastUserMsg,
        activityStatus: a?.status,
        controllable: controllable.has(t.sessionId),
      };
    });
    merged.sort(
      (x, y) =>
        Number(y.controllable) - Number(x.controllable) || x.ageMs - y.ageMs,
    );
    setCards(merged);
    setLoaded(true);
  }, []);

  useEffect(() => {
    refresh();
    const iv = setInterval(refresh, 3000);
    return () => clearInterval(iv);
  }, [refresh]);

  const launch = useCallback(async () => {
    if (!daemon?.running || !daemon.token) return;
    setLaunching(true);
    const r = await getJSON<{ id: string }>(`${daemon.httpBase}/sessions`, {
      method: "POST",
      headers: {
        "x-cockpit-token": daemon.token,
        "content-type": "application/json",
      },
      body: JSON.stringify({ cwd: newCwd || undefined }),
    });
    setLaunching(false);
    if (r?.id) {
      setNewCwd("");
      await refresh();
      setSelected(r.id);
    }
  }, [daemon, newCwd, refresh]);

  const controllableCount = cards.filter((c) => c.controllable).length;
  const sel = cards.find((c) => c.sessionId === selected) || null;

  return (
    <div
      style={{ padding: "20px 22px 64px", maxWidth: 1320, margin: "0 auto" }}
    >
      {/* HEADER */}
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 14,
          flexWrap: "wrap",
          marginBottom: 4,
        }}
      >
        <h1
          style={{
            margin: 0,
            fontFamily: '"Iowan Old Style", Palatino, Georgia, serif',
            fontSize: 26,
            fontWeight: 500,
            color: C.cream,
            letterSpacing: "-0.01em",
          }}
        >
          Cockpit
        </h1>
        <span
          style={{
            fontFamily: "ui-monospace, monospace",
            fontSize: 11,
            color: C.dim,
          }}
        >
          {cards.length} live · {controllableCount} controllable
        </span>
        <DaemonPill daemon={daemon} />
      </div>
      <p
        style={{
          margin: "2px 0 18px",
          fontSize: 12.5,
          color: C.dim,
          maxWidth: 620,
        }}
      >
        Every live Claude Code session, with status-bar telemetry. Sessions
        launched here are tmux-backed — type into them from the browser or
        attach in Ghostty. The painted agent-office + voice layer arrives once
        the aesthetic is picked.
      </p>

      {/* MARVIS — big corner presence + speech bubble (fixed overlay) */}
      <MarvisCorner />

      {/* LAUNCH */}
      {daemon?.running && (
        <div
          style={{
            display: "flex",
            gap: 8,
            marginBottom: 18,
            flexWrap: "wrap",
          }}
        >
          <input
            value={newCwd}
            onChange={(e) => setNewCwd(e.target.value)}
            placeholder="project path (default: ~)  e.g. /Users/pg/CEREBRUM/personal-os"
            style={{
              flex: "1 1 380px",
              background: C.panel,
              border: `1px solid ${C.border}`,
              borderRadius: 6,
              padding: "8px 11px",
              color: C.cream,
              fontFamily: "ui-monospace, monospace",
              fontSize: 12,
            }}
          />
          <button onClick={launch} disabled={launching} style={btn(C.amber)}>
            {launching ? "launching…" : "+ New session"}
          </button>
        </div>
      )}

      {/* GRID */}
      {!loaded ? (
        <Empty text="reading sessions…" />
      ) : cards.length === 0 ? (
        <Empty text="no live Claude Code sessions. Launch one above (or run claude in a terminal — it'll appear as telemetry-only)." />
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))",
            gap: 12,
          }}
        >
          {cards.map((c) => (
            <SessionCard
              key={c.sessionId}
              card={c}
              selected={c.sessionId === selected}
              onSelect={() =>
                setSelected(c.sessionId === selected ? null : c.sessionId)
              }
            />
          ))}
        </div>
      )}

      {/* TERMINAL PANE */}
      {sel && (
        <div
          style={{
            marginTop: 20,
            border: `1px solid ${C.border}`,
            borderRadius: 10,
            overflow: "hidden",
            background: C.ink,
            height: 420,
          }}
        >
          {sel.controllable && daemon?.running && daemon.token ? (
            <CockpitTerminal
              sessionId={sel.sessionId}
              wsBase={daemon.wsBase}
              token={daemon.token}
            />
          ) : (
            <div style={{ padding: 28, color: C.dim, fontSize: 13 }}>
              <strong style={{ color: C.cream }}>{sel.projectLabel}</strong> is
              telemetry-only — it wasn’t launched through the cockpit, so
              there’s no shared PTY to attach to.{" "}
              {daemon?.running
                ? "Launch a new session here to get two-way control."
                : "Start the daemon to enable two-way control: node scripts/cockpit-daemon.mjs"}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DaemonPill({ daemon }: { daemon: DaemonInfo | null }) {
  const up = !!daemon?.running;
  return (
    <span
      title={
        up
          ? `daemon on :${daemon?.port}`
          : "daemon down — run: node scripts/cockpit-daemon.mjs"
      }
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontFamily: "ui-monospace, monospace",
        fontSize: 10,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        color: up ? C.emerald : C.ruby,
        border: `1px solid ${up ? "rgba(124,154,110,0.4)" : "rgba(184,83,111,0.4)"}`,
        borderRadius: 999,
        padding: "2px 9px",
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: up ? C.emerald : C.ruby,
        }}
      />
      daemon {up ? "live" : "down"}
    </span>
  );
}

function SessionCard({
  card,
  selected,
  onSelect,
}: {
  card: Card;
  selected: boolean;
  onSelect: () => void;
}) {
  const pct = Math.max(0, Math.min(100, Math.round(card.contextUsedPct)));
  const barColor = pct < 60 ? C.emerald : pct < 85 ? C.amber : C.ruby;
  const running = card.activityStatus === "running" || card.ageMs < 60_000;

  return (
    <button
      onClick={onSelect}
      style={{
        textAlign: "left",
        background: selected ? "rgba(214,163,103,0.08)" : C.panel,
        border: `1px solid ${selected ? C.amber : C.border}`,
        borderRadius: 10,
        padding: 14,
        cursor: "pointer",
        color: C.cream,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        transition: "border-color 160ms ease, background 160ms ease",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span
          title={running ? "running" : "idle"}
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: running ? C.emerald : C.dim,
            boxShadow: running ? `0 0 6px ${C.emerald}` : "none",
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontFamily: '"Iowan Old Style", Palatino, Georgia, serif',
            fontSize: 15,
            fontWeight: 500,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {card.projectLabel}
        </span>
        <span style={{ flex: 1 }} />
        {card.controllable ? (
          <Tag color={C.amber}>◆ control</Tag>
        ) : (
          <Tag color={C.dim}>telemetry</Tag>
        )}
      </div>

      {card.branch && (
        <div
          style={{
            fontFamily: "ui-monospace, monospace",
            fontSize: 10,
            color: C.dim,
          }}
        >
          ⌥ {card.worktree || card.branch}
        </div>
      )}

      {/* context bar */}
      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontFamily: "ui-monospace, monospace",
            fontSize: 10,
            color: C.dim,
            marginBottom: 3,
          }}
        >
          <span>{card.modelName || "—"}</span>
          <span>
            {pct}% ctx{card.exceeds200k ? " · 1M" : ""}
          </span>
        </div>
        <div
          style={{
            height: 5,
            background: "rgba(255,255,255,0.06)",
            borderRadius: 3,
            overflow: "hidden",
          }}
        >
          <div
            style={{ width: `${pct}%`, height: "100%", background: barColor }}
          />
        </div>
      </div>

      {/* current tool / last msg */}
      <div
        style={{
          fontSize: 11.5,
          color: card.currentTool ? C.cream : C.dim,
          minHeight: 16,
        }}
      >
        {card.currentTool ? (
          <span>
            <span style={{ color: C.amber }}>▸</span> {card.currentTool}
          </span>
        ) : card.lastUserMsg ? (
          <span style={{ opacity: 0.75 }}>
            “{truncate(card.lastUserMsg, 64)}”
          </span>
        ) : (
          <span style={{ opacity: 0.5 }}>idle</span>
        )}
      </div>

      {/* footer stats */}
      <div
        style={{
          display: "flex",
          gap: 12,
          fontFamily: "ui-monospace, monospace",
          fontSize: 10,
          color: C.dim,
          borderTop: `1px solid ${C.border}`,
          paddingTop: 7,
        }}
      >
        <span title="session cost">${card.costUsd.toFixed(2)}</span>
        {card.fiveHour && (
          <span title="5-hour rate limit">
            5h {Math.round(card.fiveHour.usedPercentage)}%
          </span>
        )}
        {card.sevenDay && (
          <span title="7-day rate limit">
            7d {Math.round(card.sevenDay.usedPercentage)}%
          </span>
        )}
        {(card.linesAdded || card.linesRemoved) && (
          <span title="lines changed">
            <span style={{ color: C.emerald }}>+{card.linesAdded ?? 0}</span>{" "}
            <span style={{ color: C.ruby }}>−{card.linesRemoved ?? 0}</span>
          </span>
        )}
        {card.thinking && <span title="extended thinking on">✦</span>}
        {card.fastMode && <span title="fast mode">⚡</span>}
      </div>
    </button>
  );
}

function Tag({
  color,
  children,
}: {
  color: string;
  children: React.ReactNode;
}) {
  return (
    <span
      style={{
        fontFamily: "ui-monospace, monospace",
        fontSize: 9,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color,
        border: `1px solid ${color}`,
        borderRadius: 4,
        padding: "1px 6px",
        opacity: 0.85,
      }}
    >
      {children}
    </span>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div
      style={{
        padding: "48px 24px",
        textAlign: "center",
        color: C.dim,
        fontSize: 13,
        fontStyle: "italic",
        border: `1px dashed ${C.border}`,
        borderRadius: 10,
      }}
    >
      {text}
    </div>
  );
}

function btn(color: string): React.CSSProperties {
  return {
    background: "transparent",
    border: `1px solid ${color}`,
    borderRadius: 6,
    color,
    fontFamily: "ui-monospace, monospace",
    fontSize: 12,
    letterSpacing: "0.04em",
    padding: "8px 14px",
    cursor: "pointer",
  };
}

function truncate(s: string, n: number) {
  return s.length > n ? `${s.slice(0, n)}…` : s;
}
