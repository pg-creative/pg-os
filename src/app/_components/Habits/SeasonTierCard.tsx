"use client";
import type { SeasonStatus, Tier } from "./types";

/**
 * Hero card showing season-level tier + XP progress.
 * Tier letter colors map to a JRPG-style scale, and SSS unlocks a rainbow
 * gradient + extra particle density (the easter-egg state).
 */
export function SeasonTierCard({ season }: { season: SeasonStatus }) {
  const nextTier = nextTierLabel(season.tier);
  const xpToNext = nextTier
    ? Math.max(0, Math.ceil(((tierLowerBound(nextTier) - season.xp_percent) / 100) * season.xp_target))
    : 0;

  return (
    <section
      className={`ht-tier-card tier-${season.tier.toLowerCase()}`}
      aria-label={`Season tier ${season.tier}`}
    >
      <div className="ht-tier-bg" aria-hidden="true" />

      <div className="ht-tier-head">
        <span className="ht-tier-eyebrow">SEASON · {season.length_days}-DAY ARC</span>
        <span className="ht-tier-meta">
          DAY {season.days_elapsed} / {season.length_days}
          <span className="ht-tier-meta-sep">·</span>
          {season.days_remaining}D LEFT
        </span>
      </div>

      <div className="ht-tier-row">
        <div className="ht-tier-letter-wrap">
          <span className="ht-tier-letter" aria-hidden="true">{season.tier}</span>
          <span className="ht-tier-letter-shadow" aria-hidden="true">{season.tier}</span>
        </div>

        <div className="ht-tier-stats">
          <div className="ht-tier-stat">
            <span className="ht-tier-stat-num">{season.xp_earned.toLocaleString()}</span>
            <span className="ht-tier-stat-label">XP earned</span>
          </div>
          <div className="ht-tier-stat">
            <span className="ht-tier-stat-num">{season.xp_target.toLocaleString()}</span>
            <span className="ht-tier-stat-label">season target</span>
          </div>
          {season.coins > 0 && (
            <div className="ht-tier-stat">
              <span className="ht-tier-stat-num">{season.coins}</span>
              <span className="ht-tier-stat-label">coins</span>
            </div>
          )}
        </div>
      </div>

      <div className="ht-xp-bar" role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(season.xp_percent)}
        aria-label="Season XP progress"
      >
        <div className="ht-xp-bar-track" />
        <div
          className="ht-xp-bar-fill"
          style={{ width: `${Math.min(100, season.xp_percent)}%` }}
        >
          <div className="ht-xp-shimmer" aria-hidden="true" />
        </div>
        {season.xp_percent > 100 && (
          <div
            className="ht-xp-bar-overflow"
            style={{ width: `${Math.min(50, season.xp_percent - 100)}%` }}
            aria-hidden="true"
          />
        )}
      </div>

      <div className="ht-tier-foot">
        <span className="ht-tier-foot-pct">{season.xp_percent.toFixed(1)}%</span>
        {nextTier ? (
          <span className="ht-tier-foot-next">
            <strong>{xpToNext.toLocaleString()} XP</strong> to {nextTier}
          </span>
        ) : (
          <span className="ht-tier-foot-next">Apex reached — keep stacking</span>
        )}
      </div>
    </section>
  );
}

function nextTierLabel(t: Tier): Tier | null {
  const order: Tier[] = ["F", "D", "C", "B", "A", "S", "SSS"];
  const i = order.indexOf(t);
  if (i < 0 || i === order.length - 1) return null;
  return order[i + 1];
}

function tierLowerBound(t: Tier): number {
  switch (t) {
    case "F": return 0;
    case "D": return 50;
    case "C": return 60;
    case "B": return 70;
    case "A": return 80;
    case "S": return 90;
    case "SSS": return 100;
  }
}
