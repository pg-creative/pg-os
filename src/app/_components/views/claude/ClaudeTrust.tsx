"use client";
import { useCallback, useEffect, useState } from "react";
import { TrustToggle } from "../../Claude/TrustToggle";
import { EmptyState } from "../../EmptyState";

type TrustCategory = {
  approvals: number;
  rejections: number;
  auto_execute: boolean;
  threshold: number;
  history: Array<{ date: string; action: string; proposal: string; by: string }>;
};

type TrustState = {
  categories: Record<string, TrustCategory>;
  last_updated: string;
};

function fillClass(approvals: number, threshold: number): string {
  const ratio = approvals / Math.max(threshold, 1);
  if (ratio >= 1) return "cl-trust-fill ember";
  if (ratio >= 0.6) return "cl-trust-fill gold";
  if (ratio > 0) return "cl-trust-fill amber";
  return "cl-trust-fill muted";
}

export function ClaudeTrust() {
  const [trust, setTrust] = useState<TrustState | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchTrust = useCallback(async () => {
    try {
      const res = await fetch("/api/claude/trust", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load trust state");
      const data = await res.json();
      setTrust(data.trust);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    }
  }, []);

  useEffect(() => {
    fetchTrust();
  }, [fetchTrust]);

  const cats = trust?.categories ? Object.entries(trust.categories) : [];

  return (
    <section id="cl-trust" className="card cl-card cl-trust-card-section">
      <div className="card-label">
        <span>02 // TRUST STATE</span>
        <span className="cl-tag-muted">{cats.length} categories</span>
      </div>

      {error && <span className="flow-error">{error}</span>}

      {!error && cats.length === 0 && (
        <EmptyState
          verb="Seed"
          explanation="Claude hasn't seen <em>enough</em> sessions to model your trust map yet."
          glyph="○"
          variant="small"
        />
      )}

      {cats.length > 0 && (
        <ul className="cl-trust-list">
          {cats.map(([name, cat]) => {
            const pct = Math.min(100, (cat.approvals / Math.max(cat.threshold, 1)) * 100);
            return (
              <li key={name} className="cl-trust-card">
                <div className="cl-trust-head">
                  <span className="cl-trust-name">{name.replace(/-/g, " ")}</span>
                  <span className="cl-trust-meta">
                    {cat.approvals} / {cat.threshold}
                    <TrustToggle
                      category={name}
                      autoExecute={cat.auto_execute}
                      approvals={cat.approvals}
                      threshold={cat.threshold}
                      onToggle={fetchTrust}
                    />
                  </span>
                </div>
                <div className="cl-trust-bar">
                  <div className={fillClass(cat.approvals, cat.threshold)} style={{ width: `${pct}%` }} />
                </div>
                {cat.history.length > 0 && (
                  <ul className="cl-trust-history">
                    {cat.history.slice(-3).reverse().map((h, idx) => (
                      <li key={idx} className="cl-trust-event">
                        <span className="cl-trust-date">{h.date}</span>
                        <span className={`cl-trust-action cl-${h.action}`}>{h.action}</span>
                        <span className="cl-trust-prop">{h.proposal}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
