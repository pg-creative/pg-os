"use client";
import { useCallback, useEffect, useState } from "react";

type OverviewData = {
  proposalCount: number;
  proposalsByType: Record<string, number>;
  recentCorrections: number;
  recentConfirmations: number;
  sessionsAnalyzed: number;
  agentSummary: { total: number; healthy: number; errored: number };
  archiveSize: { conversations: number; messages: number } | null;
  lastReviewDate: string | null;
};

function relDate(iso: string | null): string {
  if (!iso) return "never";
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

export function ClaudeOverview() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [launching, setLaunching] = useState(false);

  const fetchOverview = useCallback(async () => {
    try {
      const res = await fetch("/api/claude/overview", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load overview");
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    }
  }, []);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  const launchClaude = useCallback(async () => {
    setLaunching(true);
    try {
      const res = await fetch("/api/launch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: "claude-config" }),
      });
      const j = await res.json();
      if (!j.autoLaunched && j.command) {
        try {
          await navigator.clipboard.writeText(j.command);
        } catch {
          /* clipboard may be blocked */
        }
      }
    } finally {
      setLaunching(false);
    }
  }, []);

  if (error) return <div className="card cl-card"><span className="flow-error">{error}</span></div>;
  if (!data) return <div className="card cl-card cl-loading">Loading overview…</div>;

  const totalSignals = data.recentCorrections + data.recentConfirmations;
  const corrPct = totalSignals ? (data.recentCorrections / totalSignals) * 100 : 0;
  const confPct = totalSignals ? (data.recentConfirmations / totalSignals) * 100 : 0;

  return (
    <section id="cl-overview" className="card cl-card cl-overview">
      <div className="card-label">
        <span>00 // OVERVIEW</span>
        <span className="cl-tag-muted">last 7 days</span>
      </div>

      <div className="cl-overview-grid">
        <div className="cl-stat-block">
          <div className="cl-stat-label">SIGNAL RATIO</div>
          <div className="cl-ratio-bar" aria-label={`${data.recentConfirmations} confirmations, ${data.recentCorrections} corrections`}>
            <div className="cl-ratio-conf" style={{ width: `${confPct}%` }} />
            <div className="cl-ratio-corr" style={{ width: `${corrPct}%` }} />
          </div>
          <div className="cl-stat-row">
            <span className="cl-conf-text">{data.recentConfirmations} wins</span>
            <span className="cl-corr-text">{data.recentCorrections} corrections</span>
          </div>
        </div>

        <div className="cl-stat-block">
          <div className="cl-stat-label">SESSIONS ANALYZED</div>
          <div className="cl-stat-value">{data.sessionsAnalyzed}</div>
          <div className="cl-stat-sub">across all surfaces</div>
        </div>

        <div className="cl-stat-block">
          <div className="cl-stat-label">PENDING PROPOSALS</div>
          <div className="cl-stat-value">{data.proposalCount}</div>
          <div className="cl-stat-types">
            {Object.entries(data.proposalsByType).map(([type, count]) => (
              <span key={type} className={`cl-mini-badge cl-badge-${badgeKind(type)}`}>
                {type.replace(/_/g, " ").toLowerCase()} · {count}
              </span>
            ))}
          </div>
        </div>

        <div className="cl-stat-block">
          <div className="cl-stat-label">AGENT HEALTH</div>
          <div className="cl-agent-dots">
            {Array.from({ length: data.agentSummary.total }).map((_, i) => (
              <span
                key={i}
                className={
                  i < data.agentSummary.healthy
                    ? "cl-dot ok"
                    : i < data.agentSummary.healthy + data.agentSummary.errored
                    ? "cl-dot err"
                    : "cl-dot unknown"
                }
              />
            ))}
          </div>
          <div className="cl-stat-sub">
            {data.agentSummary.healthy} healthy · {data.agentSummary.errored} errored
          </div>
        </div>

        <div className="cl-stat-block">
          <div className="cl-stat-label">ARCHIVE</div>
          <div className="cl-stat-value">
            {data.archiveSize ? data.archiveSize.conversations.toLocaleString() : "—"}
          </div>
          <div className="cl-stat-sub">
            {data.archiveSize ? `${data.archiveSize.messages.toLocaleString()} messages` : "no archive"}
          </div>
        </div>

        <div className="cl-stat-block">
          <div className="cl-stat-label">LAST REVIEW</div>
          <div className="cl-stat-value cl-stat-small">{relDate(data.lastReviewDate)}</div>
          <div className="cl-stat-sub">{data.lastReviewDate ?? "no review log"}</div>
        </div>
      </div>

      <div className="cl-overview-actions">
        <button className="cl-btn cl-btn-primary" onClick={launchClaude} disabled={launching}>
          {launching ? "Opening…" : "Open Claude Code →"}
        </button>
      </div>
    </section>
  );
}

function badgeKind(type: string): string {
  const t = type.toLowerCase();
  if (t.includes("rule_promotion")) return "gold";
  if (t.includes("config")) return "sapphire";
  if (t.includes("rule_add")) return "emerald";
  if (t.includes("skill")) return "coral";
  return "muted";
}
