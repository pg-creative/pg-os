"use client";
import { useEffect } from "react";
import type { Tier } from "./types";

/**
 * Full-screen rank-up ceremony. Shown when the season tier letter increases
 * mid-session. Auto-dismisses after ~4s.
 */
export function RankUpModal({
  from,
  to,
  onDone,
}: {
  from: Tier;
  to: Tier;
  onDone: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onDone, 4200);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className="ht-rankup-overlay" role="dialog" aria-live="assertive" aria-label={`Rank up: ${from} to ${to}`}>
      <div className={`ht-rankup-burst tier-${to.toLowerCase()}`} aria-hidden="true">
        {Array.from({ length: 24 }).map((_, i) => (
          <span key={i} className="ht-rankup-spark" style={{ ['--i' as string]: i } as React.CSSProperties} />
        ))}
      </div>
      <div className="ht-rankup-content">
        <span className="ht-rankup-eyebrow">RANK UP</span>
        <div className={`ht-rankup-letters tier-${to.toLowerCase()}`}>
          <span className="ht-rankup-from">{from}</span>
          <span className="ht-rankup-arrow">→</span>
          <span className="ht-rankup-to">{to}</span>
        </div>
        <button
          type="button"
          className="ht-rankup-dismiss"
          onClick={onDone}
          aria-label="Dismiss rank up"
        >
          continue
        </button>
      </div>
    </div>
  );
}
