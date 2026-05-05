"use client";
import { useCallback, useEffect, useState } from "react";

type Proposal = {
  description: string;
  category?: string;
  type?: string;
  occurrences?: number;
  source?: string;
};

export function PendingApprovals() {
  const [proposals, setProposals] = useState<Proposal[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState<number | null>(null);

  const fetchProposals = useCallback(async () => {
    try {
      const res = await fetch("/api/claude/proposals", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setProposals(data.proposals ?? []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "load failed");
    }
  }, []);

  useEffect(() => {
    fetchProposals();
    const i = setInterval(fetchProposals, 60_000);
    return () => clearInterval(i);
  }, [fetchProposals]);

  const decide = useCallback(async (index: number, action: "approve" | "dismiss") => {
    setActing(index);
    try {
      await fetch("/api/claude/proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, index }),
      });
      await fetchProposals();
    } finally {
      setActing(null);
    }
  }, [fetchProposals]);

  if (proposals === null) {
    return (
      <div className="bridge-widget bridge-widget-loading">
        <div className="bridge-widget-label">PENDING</div>
        <div className="bridge-widget-body bridge-widget-skel">scanning…</div>
      </div>
    );
  }

  if (proposals.length === 0) {
    return (
      <div className="bridge-widget">
        <div className="bridge-widget-label">PENDING</div>
        <div className="bridge-widget-body bridge-widget-empty">queue clear</div>
      </div>
    );
  }

  const top = proposals[0];

  return (
    <div className="bridge-widget bridge-widget-pending">
      <div className="bridge-widget-label">
        PENDING
        <span className="bridge-widget-count">{proposals.length}</span>
      </div>
      {error && <div className="bridge-widget-error">{error}</div>}
      <div className="bridge-widget-body">
        <p className="bridge-widget-pending-text" title={top.description}>
          {top.description}
        </p>
        {top.category && (
          <span className="bridge-widget-tag">{top.category}</span>
        )}
      </div>
      <div className="bridge-widget-actions">
        <button
          type="button"
          className="bridge-btn bridge-btn-approve"
          onClick={() => decide(0, "approve")}
          disabled={acting === 0}
        >
          {acting === 0 ? "…" : "Approve"}
        </button>
        <button
          type="button"
          className="bridge-btn bridge-btn-dismiss"
          onClick={() => decide(0, "dismiss")}
          disabled={acting === 0}
        >
          Skip
        </button>
      </div>
    </div>
  );
}
