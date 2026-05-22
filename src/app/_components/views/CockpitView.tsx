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
import { TabShell } from "../bento/TabShell";
import { BentoBox } from "../bento/BentoBox";
import { useEmaki } from "../bento/emakiContext";

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
  // Deep-link target: when the Projects tab launches/links a session it stashes
  // the id here, then switches to this tab. We select it once it shows up in the
  // fleet (telemetry can lag a fresh launch by a refresh tick).
  const [pendingSelect, setPendingSelect] = useState<string | null>(null);

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

  // Pick up a deep-link selection from the Projects tab (sessionStorage), then clear it.
  useEffect(() => {
    try {
      const id = sessionStorage.getItem("pg-os-cockpit-select");
      if (id) {
        setPendingSelect(id);
        sessionStorage.removeItem("pg-os-cockpit-select");
      }
    } catch {
      /* sessionStorage unavailable (SSR / private mode) */
    }
  }, []);

  useEffect(() => {
    if (pendingSelect && cards.some((c) => c.sessionId === pendingSelect)) {
      setSelected(pendingSelect);
      setPendingSelect(null);
    }
  }, [pendingSelect, cards]);

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

  const eyebrow = `FLEET // ${cards.length} live · ${controllableCount} controllable`;

  return (
    <TabShell
      title="Cockpit"
      eyebrow={eyebrow}
      actions={
        <LaunchControls
          daemon={daemon}
          newCwd={newCwd}
          setNewCwd={setNewCwd}
          launching={launching}
          launch={launch}
        />
      }
    >
      <SessionGrid
        cards={cards}
        loaded={loaded}
        selected={selected}
        setSelected={setSelected}
      />
      {sel && <TerminalTile sel={sel} daemon={daemon} />}
    </TabShell>
  );
}

// Separated so useEmaki() can run inside EmakiProvider (TabShell wraps it)
function LaunchControls({
  daemon,
  newCwd,
  setNewCwd,
  launching,
  launch,
}: {
  daemon: DaemonInfo | null;
  newCwd: string;
  setNewCwd: (v: string) => void;
  launching: boolean;
  launch: () => void;
}) {
  const { tk } = useEmaki();

  if (!daemon?.running) {
    return <DaemonPill daemon={daemon} tk={tk} />;
  }

  return (
    <>
      <DaemonPill daemon={daemon} tk={tk} />
      <input
        value={newCwd}
        onChange={(e) => setNewCwd(e.target.value)}
        placeholder="project path (default: ~)"
        onKeyDown={(e) => e.key === "Enter" && launch()}
        style={{
          background: "rgba(0,0,0,0.18)",
          border: `1px solid ${tk.divider}`,
          borderRadius: 6,
          padding: "6px 11px",
          color: tk.textPrimary,
          fontFamily: "var(--mono), ui-monospace, monospace",
          fontSize: "var(--text-xs)",
          width: 280,
          outline: "none",
        }}
      />
      <button
        onClick={launch}
        disabled={launching}
        style={{
          background: "transparent",
          border: `1px solid ${tk.accent}`,
          borderRadius: 6,
          color: tk.accent,
          fontFamily: "var(--mono), ui-monospace, monospace",
          fontSize: "var(--text-xs)",
          letterSpacing: "0.08em",
          padding: "6px 14px",
          cursor: launching ? "default" : "pointer",
          opacity: launching ? 0.6 : 1,
          transition: "opacity 160ms ease",
          whiteSpace: "nowrap",
        }}
      >
        {launching ? "launching..." : "+ New session"}
      </button>
    </>
  );
}

function SessionGrid({
  cards,
  loaded,
  selected,
  setSelected,
}: {
  cards: Card[];
  loaded: boolean;
  selected: string | null;
  setSelected: (id: string | null) => void;
}) {
  const { tk } = useEmaki();

  if (!loaded) {
    return (
      <BentoBox cols={12} eyebrow="01 // FLEET">
        <div
          style={{
            color: tk.textMuted,
            fontStyle: "italic",
            padding: "20px 0",
            textAlign: "center",
          }}
        >
          reading sessions...
        </div>
      </BentoBox>
    );
  }

  if (cards.length === 0) {
    return (
      <BentoBox cols={12} eyebrow="01 // FLEET">
        <div
          style={{
            color: tk.textMuted,
            fontStyle: "italic",
            padding: "20px 0",
            textAlign: "center",
          }}
        >
          no live Claude Code sessions. Launch one above, or run claude in a
          terminal — it will appear as telemetry-only.
        </div>
      </BentoBox>
    );
  }

  return (
    <>
      {cards.map((c) => (
        <SessionTile
          key={c.sessionId}
          card={c}
          selected={c.sessionId === selected}
          onSelect={() =>
            setSelected(c.sessionId === selected ? null : c.sessionId)
          }
        />
      ))}
    </>
  );
}

function SessionTile({
  card,
  selected,
  onSelect,
}: {
  card: Card;
  selected: boolean;
  onSelect: () => void;
}) {
  const { tk } = useEmaki();
  const pct = Math.max(0, Math.min(100, Math.round(card.contextUsedPct)));
  const running = card.activityStatus === "running" || card.ageMs < 60_000;

  // Context bar color: green/amber/red gradient using emaki tokens
  const barColor = pct < 60 ? "#7C9A6E" : pct < 85 ? tk.accent : "#B8536F";

  // Running dot glow using emaki foxfire for running, muted for idle
  const dotColor = running ? tk.foxfire : tk.textMuted;
  const dotShadow = running ? `0 0 6px ${tk.foxfireGlow}` : "none";

  return (
    <BentoBox
      cols={4}
      onClick={onSelect}
      style={{
        outline: selected ? `1.5px solid ${tk.accent}` : undefined,
        transition: "outline-color 160ms ease",
      }}
    >
      {/* Title row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 6,
        }}
      >
        <span
          title={running ? "running" : "idle"}
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: dotColor,
            boxShadow: dotShadow,
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontFamily: "var(--serif), Georgia, serif",
            fontSize: "var(--text-base)",
            fontWeight: 500,
            color: tk.textPrimary,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            flex: 1,
          }}
        >
          {card.projectLabel}
        </span>
        {card.controllable ? (
          <ControlTag color={tk.gold}>control</ControlTag>
        ) : (
          <ControlTag color={tk.textMuted}>telemetry</ControlTag>
        )}
      </div>

      {/* Branch */}
      {card.branch && (
        <div
          style={{
            fontFamily: "var(--mono), ui-monospace, monospace",
            fontSize: "var(--text-2xs)",
            color: tk.textMuted,
            marginBottom: 6,
          }}
        >
          {card.worktree || card.branch}
        </div>
      )}

      {/* Context bar */}
      <div style={{ marginBottom: 6 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontFamily: "var(--mono), ui-monospace, monospace",
            fontSize: "var(--text-2xs)",
            color: tk.textMuted,
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
            height: 4,
            background: tk.divider,
            borderRadius: 2,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${pct}%`,
              height: "100%",
              background: barColor,
              transition: "width 600ms ease",
            }}
          />
        </div>
      </div>

      {/* Current tool / last msg */}
      <div
        style={{
          fontSize: "var(--text-xs)",
          color: card.currentTool ? tk.textSub : tk.textMuted,
          minHeight: 16,
          marginBottom: 6,
        }}
      >
        {card.currentTool ? (
          <span>
            <span style={{ color: tk.foxfire }}>▸</span> {card.currentTool}
          </span>
        ) : card.lastUserMsg ? (
          <span style={{ opacity: 0.75 }}>
            "{truncate(card.lastUserMsg, 64)}"
          </span>
        ) : (
          <span style={{ opacity: 0.5 }}>idle</span>
        )}
      </div>

      {/* Footer stats */}
      <div
        style={{
          display: "flex",
          gap: 10,
          fontFamily: "var(--mono), ui-monospace, monospace",
          fontSize: "var(--text-2xs)",
          color: tk.textMuted,
          borderTop: `1px solid ${tk.divider}`,
          paddingTop: 6,
          flexWrap: "wrap",
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
            <span style={{ color: "#7C9A6E" }}>+{card.linesAdded ?? 0}</span>{" "}
            <span style={{ color: "#B8536F" }}>-{card.linesRemoved ?? 0}</span>
          </span>
        )}
        {card.thinking && <span title="extended thinking on">&#10022;</span>}
        {card.fastMode && <span title="fast mode">&#9889;</span>}
      </div>
    </BentoBox>
  );
}

function TerminalTile({
  sel,
  daemon,
}: {
  sel: Card;
  daemon: DaemonInfo | null;
}) {
  const { tk } = useEmaki();

  return (
    <BentoBox
      cols={12}
      eyebrow={`// ${sel.projectLabel}`}
      style={{ height: 420, padding: 0, overflow: "hidden" }}
    >
      {sel.controllable && daemon?.running && daemon.token ? (
        <CockpitTerminal
          sessionId={sel.sessionId}
          wsBase={daemon.wsBase}
          token={daemon.token}
        />
      ) : (
        <div
          style={{
            padding: "28px 24px",
            color: tk.textMuted,
            fontSize: "var(--text-sm)",
          }}
        >
          <strong style={{ color: tk.textPrimary }}>{sel.projectLabel}</strong>{" "}
          is telemetry-only — it was not launched through the cockpit, so there
          is no shared PTY to attach to.{" "}
          {daemon?.running
            ? "Launch a new session here to get two-way control."
            : "Start the daemon to enable two-way control: node scripts/cockpit-daemon.mjs"}
        </div>
      )}
    </BentoBox>
  );
}

function DaemonPill({
  daemon,
  tk,
}: {
  daemon: DaemonInfo | null;
  tk: ReturnType<typeof useEmaki>["tk"];
}) {
  const up = !!daemon?.running;
  const color = up ? "#7C9A6E" : "#B8536F";
  const borderColor = up ? "rgba(124,154,110,0.4)" : "rgba(184,83,111,0.4)";

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
        gap: 5,
        fontFamily: "var(--mono), ui-monospace, monospace",
        fontSize: "var(--text-2xs)",
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        color,
        border: `1px solid ${borderColor}`,
        borderRadius: 999,
        padding: "3px 9px",
        background: "rgba(0,0,0,0.12)",
      }}
    >
      <span
        style={{ width: 6, height: 6, borderRadius: "50%", background: color }}
      />
      daemon {up ? "live" : "down"}
    </span>
  );
}

function ControlTag({
  color,
  children,
}: {
  color: string;
  children: React.ReactNode;
}) {
  return (
    <span
      style={{
        fontFamily: "var(--mono), ui-monospace, monospace",
        fontSize: "var(--text-2xs)",
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color,
        border: `1px solid ${color}`,
        borderRadius: 4,
        padding: "1px 6px",
        opacity: 0.85,
        flexShrink: 0,
      }}
    >
      {children}
    </span>
  );
}

function truncate(s: string, n: number) {
  return s.length > n ? `${s.slice(0, n)}...` : s;
}
