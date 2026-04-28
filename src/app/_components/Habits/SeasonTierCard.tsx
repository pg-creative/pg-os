"use client";
import type { SeasonStatus, Tier } from "./types";

const TIER_LADDER: Tier[] = ["F", "D", "C", "B", "A", "S", "SSS"];
function tierIndex(t: Tier): number {
  return TIER_LADDER.indexOf(t);
}

/**
 * Hero card: season-level tier + XP progress, Ghibli aesthetic, ratchet display.
 *
 * Ratchet: the displayed letter is `tier_floor` (the highest tier ever
 * reached this season). If the live tier slips below the floor, a small
 * "currently pacing X" subtitle surfaces below the card. Once you climb
 * to a tier this season, you don't lose it — Habitica pattern, prevents
 * loss-aversion churn after a bad week.
 *
 * SSS unlocks an aurora-borealis (greens/violets/golds) gradient + extra
 * particle wash as the easter-egg secret-tier state.
 */
export function SeasonTierCard({ season }: { season: SeasonStatus }) {
  const displayTier = tierIndex(season.tier_floor) > tierIndex(season.tier)
    ? season.tier_floor
    : season.tier;
  const isPacingBelow = displayTier !== season.tier;

  const nextTier = nextTierLabel(displayTier);
  const xpToNext = nextTier
    ? Math.max(0, Math.ceil(((tierLowerBound(nextTier) - season.xp_percent) / 100) * season.xp_target))
    : 0;

  return (
    <>
      <section
        className={`ht-tier-card tier-${displayTier.toLowerCase()}`}
        aria-label={`Season tier ${displayTier}`}
      >
        <div className="ht-tier-bg" aria-hidden="true" />
        <div className="ht-tier-sparkles" aria-hidden="true">
          <span className="ht-tier-sparkle" />
          <span className="ht-tier-sparkle" />
          <span className="ht-tier-sparkle" />
          <span className="ht-tier-sparkle" />
        </div>

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
            <span className="ht-tier-letter" aria-hidden="true">{displayTier}</span>
            <span className="ht-tier-letter-shadow" aria-hidden="true">{displayTier}</span>
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

      {isPacingBelow && (
        <div className="ht-tier-ratchet" role="status" aria-live="polite">
          <span className="ht-tier-ratchet-locked">{displayTier} locked</span>
          <span className="ht-tier-ratchet-current">currently pacing {season.tier}</span>
        </div>
      )}
    </>
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
