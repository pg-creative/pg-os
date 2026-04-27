"use client";
import { useCallback, useEffect, useMemo, useState } from "react";

type Signal = {
  signals: string[];
  signal_details: Array<{ type: string; pattern: string }>;
  user_text: string;
  assistant_context: string;
  timestamp: string;
  session_id: string;
  project: string;
  source?: string;
};

type SessionStats = {
  session_id: string;
  project: string;
  user_messages: number;
  assistant_messages: number;
  duration_minutes: number;
  corrections: number;
  confirmations: number;
  frictions: number;
  skill_invocations: number;
  skills_used: string[];
};

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function relTime(iso: string): string {
  try {
    const d = new Date(iso);
    const diff = Date.now() - d.getTime();
    if (diff < 60_000) return "just now";
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`;
    const days = Math.floor(diff / 86_400_000);
    if (days < 7) return `${days}d`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return iso;
  }
}

function projectLabel(p: string): string {
  if (!p) return "—";
  const parts = p.split("-");
  return parts[parts.length - 1] || p;
}

function truncate(s: string, n: number): string {
  if (!s) return "";
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

export function ClaudeSignals() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchSignals = useCallback(async () => {
    try {
      const res = await fetch("/api/claude/signals?days=7", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load signals");
      const data = await res.json();
      setSignals(data.signals ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    }
  }, []);

  useEffect(() => { fetchSignals(); }, [fetchSignals]);

  const chartData = useMemo(() => {
    const days: { day: string; label: string; corr: number; conf: number }[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      days.push({
        day: dayKey(d),
        label: d.toLocaleDateString("en-US", { weekday: "short" }),
        corr: 0,
        conf: 0,
      });
    }
    const map = new Map(days.map((d) => [d.day, d]));
    for (const s of signals) {
      try {
        const dk = new Date(s.timestamp).toISOString().slice(0, 10);
        const bucket = map.get(dk);
        if (!bucket) continue;
        if (s.signals?.includes("correction")) bucket.corr += 1;
        if (s.signals?.includes("confirmation")) bucket.conf += 1;
      } catch {
        /* skip */
      }
    }
    return days;
  }, [signals]);

  const maxBar = Math.max(1, ...chartData.map((d) => d.corr + d.conf));

  const corrections = useMemo(
    () => signals.filter((s) => s.signals?.includes("correction")).slice(-10).reverse(),
    [signals],
  );
  const wins = useMemo(
    () => signals.filter((s) => s.signals?.includes("confirmation")).slice(-10).reverse(),
    [signals],
  );

  return (
    <section id="cl-signals" className="card cl-card cl-signals-section">
      <div className="card-label">
        <span>04 // SIGNALS</span>
        <span className="cl-tag-muted">last 7 days · {signals.length} total</span>
      </div>

      {error && <span className="flow-error">{error}</span>}

      <div className="cl-signal-chart">
        {chartData.map((d) => {
          const corrPct = (d.corr / maxBar) * 100;
          const confPct = (d.conf / maxBar) * 100;
          return (
            <div key={d.day} className="cl-signal-col" title={`${d.day}: ${d.conf} wins, ${d.corr} corrections`}>
              <div className="cl-signal-stack">
                <div className="cl-signal-conf" style={{ height: `${confPct}%` }} />
                <div className="cl-signal-corr" style={{ height: `${corrPct}%` }} />
              </div>
              <span className="cl-signal-label">{d.label}</span>
              <span className="cl-signal-num">{d.corr + d.conf}</span>
            </div>
          );
        })}
      </div>

      <div className="cl-signal-lists">
        <div className="cl-signal-list">
          <div className="cl-list-head">
            <span className="cl-corr-text">Recent Corrections</span>
            <span className="cl-list-count">{corrections.length}</span>
          </div>
          {corrections.length === 0 && <p className="cl-empty-small">None — running clean.</p>}
          <ul>
            {corrections.map((s, i) => (
              <li key={`${s.session_id}-${i}`} className="cl-signal-item">
                <span className="cl-signal-text">{truncate(s.user_text, 80)}</span>
                <span className="cl-signal-meta">
                  <span className="cl-signal-proj">{projectLabel(s.project)}</span>
                  <span>{relTime(s.timestamp)}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="cl-signal-list">
          <div className="cl-list-head">
            <span className="cl-conf-text">Recent Wins</span>
            <span className="cl-list-count">{wins.length}</span>
          </div>
          {wins.length === 0 && <p className="cl-empty-small">No confirmations logged this week.</p>}
          <ul>
            {wins.map((s, i) => (
              <li key={`${s.session_id}-${i}`} className="cl-signal-item">
                <span className="cl-signal-text">{truncate(s.user_text, 80)}</span>
                <span className="cl-signal-meta">
                  <span className="cl-signal-proj">{projectLabel(s.project)}</span>
                  <span>{relTime(s.timestamp)}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
