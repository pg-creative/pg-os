"use client";
import { useCallback, useEffect, useState } from "react";

type Proposal = {
  type: string;
  category: string;
  description: string;
  evidence: string;
  date: string;
  source: string;
  occurrences: number;
};

function badgeKind(type: string): string {
  const t = type.toLowerCase();
  if (t.includes("rule_promotion")) return "gold";
  if (t.includes("config")) return "sapphire";
  if (t.includes("rule_add")) return "emerald";
  if (t.includes("skill")) return "coral";
  return "muted";
}

export function ClaudeProposals() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProposals = useCallback(async () => {
    try {
      const res = await fetch("/api/claude/proposals", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load proposals");
      const data = await res.json();
      setProposals(data.proposals ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProposals();
  }, [fetchProposals]);

  const handleAction = useCallback(async (index: number, action: "approve" | "dismiss") => {
    setProposals((prev) => prev.filter((_, i) => i !== index));
    try {
      const res = await fetch("/api/claude/proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, index }),
      });
      if (!res.ok) throw new Error(`${action} failed`);
    } catch {
      await fetchProposals();
    }
  }, [fetchProposals]);

  return (
    <section id="cl-proposals" className="card cl-card cl-proposals-card">
      <div className="card-label">
        <span>01 // PROPOSALS</span>
        <span className="cl-tag-count">{proposals.length} PENDING</span>
      </div>

      {error && <span className="flow-error">{error}</span>}

      {!loading && proposals.length === 0 && (
        <p className="cl-empty">No pending proposals — the system is running clean. ✓</p>
      )}

      {proposals.length > 0 && (
        <ul className="cl-proposals">
          {proposals.map((p, i) => (
            <li key={`${p.date}-${i}`} className="cl-proposal">
              <div className="cl-prop-row">
                <span className={`cl-proposal-badge cl-badge-${badgeKind(p.type)}`}>
                  {p.type.replace(/_/g, " ")}
                </span>
                <span className="cl-prop-date">{p.date}</span>
                <span className="cl-prop-count">×{p.occurrences}</span>
              </div>
              <p className="cl-prop-desc">{p.description}</p>
              <p className="cl-prop-evidence">{p.evidence}</p>
              <div className="cl-prop-bottom">
                <span className="cl-prop-source">via {p.source}</span>
                <div className="cl-proposal-actions">
                  <button
                    className="cl-btn cl-btn-muted"
                    onClick={() => handleAction(i, "dismiss")}
                  >
                    Dismiss ✕
                  </button>
                  <button
                    className="cl-btn cl-btn-success"
                    onClick={() => handleAction(i, "approve")}
                  >
                    Approve ✓
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
