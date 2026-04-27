"use client";
import { useCallback, useEffect, useState } from "react";

type AgentHealth = {
  name: string;
  description: string;
  model: string;
  schedule: string;
  lastRun: string | null;
  lastStatus: "ok" | "error" | "timeout" | "unknown";
  lastError?: string;
  budget: string;
};

function relDate(iso: string | null): string {
  if (!iso) return "never run";
  try {
    const d = new Date(iso);
    const diff = Date.now() - d.getTime();
    const days = Math.floor(diff / 86_400_000);
    if (days === 0) return "today";
    if (days === 1) return "yesterday";
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return iso;
  }
}

function statusLabel(s: AgentHealth["lastStatus"]): string {
  if (s === "ok") return "OK";
  if (s === "error") return "ERROR";
  if (s === "timeout") return "TIMEOUT";
  return "UNKNOWN";
}

export function ClaudeAgents() {
  const [agents, setAgents] = useState<AgentHealth[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const fetchAgents = useCallback(async () => {
    try {
      const res = await fetch("/api/claude/agents", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load agents");
      const data = await res.json();
      setAgents(data.agents ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    }
  }, []);

  useEffect(() => { fetchAgents(); }, [fetchAgents]);

  const runAgent = useCallback(async (name: string) => {
    setRunning(name);
    setFeedback(null);
    try {
      const res = await fetch("/api/claude/run-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent: name }),
      });
      const j = await res.json();
      if (j.autoLaunched) {
        setFeedback(`Launched ${name} in Ghostty`);
      } else if (j.command) {
        try {
          await navigator.clipboard.writeText(j.command);
          setFeedback(`Command copied: ${j.command}`);
        } catch {
          setFeedback(`Run manually: ${j.command}`);
        }
      } else {
        setFeedback(j.error ?? "Unknown error");
      }
      setTimeout(() => setFeedback(null), 4000);
    } finally {
      setRunning(null);
    }
  }, []);

  return (
    <section id="cl-agents" className="card cl-card cl-agents-section">
      <div className="card-label">
        <span>03 // AGENTS</span>
        <span className="cl-tag-muted">{agents.length} configured</span>
      </div>

      {error && <span className="flow-error">{error}</span>}
      {feedback && <p className="cl-agent-feedback">{feedback}</p>}

      <ul className="cl-agent-grid">
        {agents.map((a) => (
          <li key={a.name} className="cl-agent-card">
            <div className="cl-agent-head">
              <span className="cl-agent-name">{a.name}</span>
              <span className={`cl-agent-status cl-${a.lastStatus}`}>
                <span className="cl-dot" /> {statusLabel(a.lastStatus)}
              </span>
            </div>
            <p className="cl-agent-desc">{a.description}</p>
            <div className="cl-agent-meta">
              <span>{a.model}</span>
              <span>·</span>
              <span>{a.schedule}</span>
              <span>·</span>
              <span>{a.budget}</span>
            </div>
            <div className="cl-agent-bottom">
              <span className="cl-agent-last">last: {relDate(a.lastRun)}</span>
              <button
                className="cl-btn cl-btn-muted cl-btn-small"
                onClick={() => runAgent(a.name)}
                disabled={running === a.name}
              >
                {running === a.name ? "…" : "Run Now →"}
              </button>
            </div>
            {a.lastError && (
              <p className="cl-agent-error">{a.lastError}</p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
