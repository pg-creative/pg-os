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

function relTime(iso: string | null): string {
  if (!iso) return "never";
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const isCloud = useIsCloud();

  const fetchAgents = useCallback(async () => {
    try {
      const res = await fetch("/api/claude/agents", { cache: "no-store" });
      if (!res.ok) throw new Error("agents fetch failed");
      const data = await res.json();
      setAgents(data.agents ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAgents();
    const i = setInterval(fetchAgents, 60_000);
    return () => clearInterval(i);
  }, [fetchAgents]);

  const dispatch = useCallback(async (name: string) => {
    if (!RUNNABLE.has(name) || isCloud) return;
    setRunning(name);
    setFeedback(null);
    try {
      const res = await fetch("/api/claude/run-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent: name }),
      });
      const j = await res.json();
      if (j.alreadyRunning) {
        setFeedback(`${name} · running (pid ${j.pid})`);
      } else if (j.spawned) {
        setFeedback(`${name} · started (pid ${j.pid})`);
      } else {
        setFeedback(`${name} · ${j.error ?? "failed"}`);
      }
      setTimeout(() => setFeedback(null), 6_000);
      // Refresh agent list shortly after spawn so the dot/status update.
      setTimeout(fetchAgents, 2_000);
    } catch (e) {
      setFeedback(`${name} · ${e instanceof Error ? e.message : "error"}`);
      setTimeout(() => setFeedback(null), 6_000);
    } finally {
      setRunning(null);
    }
  }, [isCloud, fetchAgents]);

  return (
    <aside className="bridge-crew" aria-label="Agent crew">
      <div className="bridge-rail-header">
        <span className="bridge-rail-title">CREW</span>
        <span className="bridge-rail-meta">
          {loading ? "scanning…" : `${agents.length} configured`}
        </span>
      </div>

      {error && (
        <div className="bridge-crew-error">{error}</div>
      )}
      {feedback && (
        <div className="bridge-crew-feedback">{feedback}</div>
      )}

      <ul className="bridge-crew-list">
        {agents.map((a) => {
          const runnable = RUNNABLE.has(a.name) && !isCloud;
          const isRunning = running === a.name;
          return (
            <li
              key={a.name}
              className={`bridge-crew-row bridge-crew-${a.lastStatus}${runnable ? " is-runnable" : ""}${isRunning ? " is-running" : ""}`}
              onClick={() => runnable && dispatch(a.name)}
              role={runnable ? "button" : undefined}
              tabIndex={runnable ? 0 : undefined}
              onKeyDown={(e) => {
                if (runnable && (e.key === "Enter" || e.key === " ")) {
                  e.preventDefault();
                  dispatch(a.name);
                }
              }}
              title={a.description || a.name}
            >
              <span className="bridge-crew-dot" aria-hidden="true" />
              <span className="bridge-crew-body">
                <span className="bridge-crew-name">{a.name}</span>
                {a.description && (
                  <span className="bridge-crew-desc">{a.description}</span>
                )}
              </span>
              <span className="bridge-crew-status">
                {isRunning ? "…" : relTime(a.lastRun)}
              </span>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
