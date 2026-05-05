"use client";
import { useCallback, useEffect, useState } from "react";
import { useIsCloud } from "../useIsCloud";

export type AgentHealth = {
  name: string;
  description: string;
  model: string;
  schedule: string;
  lastRun: string | null;
  lastStatus: "ok" | "error" | "timeout" | "unknown";
  lastError?: string;
  budget: string;
};

type LiveSession = {
  id: string;
  project: string;
  lastActivity: string;
  lastActivityMs: number;
  status: "running" | "idle";
  lastUserMsg?: string;
  currentTool?: string;
};

function relTime(iso: string | null): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const diffMs = Date.now() - d.getTime();
    const m = Math.floor(diffMs / 60_000);
    if (m < 1) return "now";
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    const days = Math.floor(h / 24);
    if (days < 7) return `${days}d`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return iso;
  }
}

const RUNNABLE = new Set([
  "session-review",
  "morning-briefing",
  "weekly-meta-audit",
  "memory-hygiene",
  "description-optimizer",
]);

export function CrewRail() {
  const [agents, setAgents] = useState<AgentHealth[]>([]);
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const isCloud = useIsCloud();

  const fetchAll = useCallback(async () => {
    try {
      const [a, s] = await Promise.all([
        fetch("/api/claude/agents", { cache: "no-store" }),
        fetch("/api/sessions", { cache: "no-store" }),
      ]);
      if (a.ok) setAgents((await a.json()).agents ?? []);
      if (s.ok) setSessions((await s.json()).sessions ?? []);
    } catch { /* swallow — header will say scanning */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchAll();
    const i = setInterval(fetchAll, 30_000);
    return () => clearInterval(i);
  }, [fetchAll]);

  const dispatch = useCallback(async (name: string) => {
    if (!RUNNABLE.has(name) || isCloud) return;
    setRunning(name);
    try {
      const res = await fetch("/api/claude/run-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent: name }),
      });
      const j = await res.json();
      const msg = j.alreadyRunning
        ? `${name} · running`
        : j.spawned
          ? `${name} · launched`
          : `${name} · ${j.error ?? "failed"}`;
      setFeedback(msg);
      setTimeout(() => setFeedback(null), 5_000);
      setTimeout(fetchAll, 2_000);
    } finally { setRunning(null); }
  }, [isCloud, fetchAll]);

  const sessionCount = sessions.length;
  const liveAgents = agents.filter((a) => a.lastStatus === "ok").length;

  const toggle = (key: string) => setExpanded((cur) => (cur === key ? null : key));

  return (
    <aside className="bridge-crew" aria-label="Agent crew">
      <div className="bridge-rail-header">
        <span className="bridge-rail-title">CREW</span>
        <span className="bridge-rail-meta">
          {loading
            ? "scanning"
            : sessionCount > 0
              ? `${sessionCount}● · ${liveAgents}/${agents.length}`
              : `${liveAgents}/${agents.length}`}
        </span>
      </div>
      {feedback && <div className="bridge-crew-feedback">{feedback}</div>}

      {sessionCount > 0 && (
        <ul className="bridge-crew-list" aria-label="Live sessions">
          {sessions.map((s) => {
            const k = `s:${s.id}`;
            const isOpen = expanded === k;
            return (
              <li
                key={s.id}
                className={`bridge-crew-row bridge-session-${s.status}${isOpen ? " is-open" : ""}`}
                onClick={() => toggle(k)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), toggle(k))}
                title={s.lastUserMsg ?? s.project}
              >
                <span className="bridge-crew-dot" aria-hidden="true" />
                <span className="bridge-crew-name">⏵ {s.project}</span>
                <span className="bridge-crew-status">{relTime(s.lastActivity)}</span>
                {isOpen && (
                  <span className="bridge-crew-detail">
                    {s.currentTool && <span className="bridge-crew-tool">{s.currentTool}</span>}
                    {s.lastUserMsg && <span className="bridge-crew-msg">{s.lastUserMsg}</span>}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <ul className="bridge-crew-list" aria-label="Scheduled agents">
        {agents.map((a) => {
          const runnable = RUNNABLE.has(a.name) && !isCloud;
          const isRunning = running === a.name;
          const k = `a:${a.name}`;
          const isOpen = expanded === k;
          return (
            <li
              key={a.name}
              className={`bridge-crew-row bridge-crew-${a.lastStatus}${runnable ? " is-runnable" : ""}${isRunning ? " is-running" : ""}${isOpen ? " is-open" : ""}`}
              onClick={(e) => {
                if (e.shiftKey && runnable) { dispatch(a.name); return; }
                toggle(k);
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  toggle(k);
                }
              }}
              title={runnable ? "Click to expand · ⇧Click to run" : a.description || a.name}
            >
              <span className="bridge-crew-dot" aria-hidden="true" />
              <span className="bridge-crew-name">{a.name}</span>
              <span className="bridge-crew-status">{isRunning ? "…" : relTime(a.lastRun)}</span>
              {isOpen && (
                <span className="bridge-crew-detail">
                  {a.description && <span className="bridge-crew-desc">{a.description}</span>}
                  <span className="bridge-crew-meta-row">
                    <span>{a.schedule}</span>
                    <span>·</span>
                    <span>{a.budget}</span>
                  </span>
                  {runnable && (
                    <button
                      type="button"
                      className="bridge-btn bridge-btn-approve bridge-crew-run"
                      onClick={(e) => { e.stopPropagation(); dispatch(a.name); }}
                      disabled={isRunning}
                    >
                      {isRunning ? "…" : "Run now"}
                    </button>
                  )}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
