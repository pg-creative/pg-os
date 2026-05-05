"use client";
import { useCallback, useEffect, useState } from "react";

type Proposal = {
  description: string;
  category?: string;
};

export function PendingApprovals() {
  const [proposals, setProposals] = useState<Proposal[] | null>(null);
  const [open, setOpen] = useState(false);
  const [acting, setActing] = useState<number | null>(null);

  const fetchProposals = useCallback(async () => {
    try {
      const res = await fetch("/api/claude/proposals", { cache: "no-store" });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setProposals(data.proposals ?? []);
    } catch { /* leave loading state */ }
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
      <div className="bridge-widget">
        <div className="bridge-widget-label">PENDING</div>
        <div className="bridge-widget-headline bridge-widget-skel">…</div>
      </div>
    );
  }

  if (proposals.length === 0) {
    return (
      <div className="bridge-widget bridge-widget-clear">
        <div className="bridge-widget-label">PENDING</div>
        <div className="bridge-widget-headline">— clear —</div>
      </div>
    );
  }

  return (
    <div
      className={`bridge-widget bridge-widget-pending${open ? " is-open" : ""}`}
      onClick={() => setOpen((v) => !v)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setOpen((v) => !v))}
      aria-expanded={open}
    >
      <div className="bridge-widget-label">
        PENDING
        <span className="bridge-widget-count">{proposals.length}</span>
      </div>
      <div className="bridge-widget-headline">
        {proposals.length === 1 ? "1 decision waiting" : `${proposals.length} decisions waiting`}
      </div>
      {open && (
        <div className="bridge-widget-drilldown" onClick={(e) => e.stopPropagation()}>
          {proposals.slice(0, 3).map((p, i) => (
            <div key={i} className="bridge-widget-pending-item">
              <p className="bridge-widget-pending-text" title={p.description}>{p.description}</p>
              {p.category && <span className="bridge-widget-tag">{p.category}</span>}
              <div className="bridge-widget-actions">
                <button
                  type="button"
                  className="bridge-btn bridge-btn-approve"
                  onClick={() => decide(i, "approve")}
                  disabled={acting === i}
                >
                  {acting === i ? "…" : "Approve"}
                </button>
                <button
                  type="button"
                  className="bridge-btn bridge-btn-dismiss"
                  onClick={() => decide(i, "dismiss")}
                  disabled={acting === i}
                >
                  Skip
                </button>
              </div>
            </div>
          ))}
          {proposals.length > 3 && (
            <p className="bridge-widget-more">+ {proposals.length - 3} more</p>
          )}
        </div>
      )}
    </div>
  );
}
