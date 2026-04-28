"use client";
import type { SeasonStatus, Tier } from "@/app/_components/Habits/types";

/**
 * Variant C — Studio Ghibli Hybrid (Refined Current)
 *
 * Stays grounded in Laputa palette. Cormorant for the letter, finer particle
 * work, more contained card. SSS shifts to aurora-borealis (greens/violets)
 * instead of full rainbow.
 */
export function VariantGhibli({ season }: { season: SeasonStatus }) {
  const nextTier = nextTierLabel(season.tier);
  const xpToNext = nextTier
    ? Math.max(0, Math.ceil(((tierLowerBound(nextTier) - season.xp_percent) / 100) * season.xp_target))
    : 0;

  return (
    <section
      className={`v-ghibli-card v-ghibli-tier-${season.tier.toLowerCase()}`}
      aria-label={`Season tier ${season.tier}`}
    >
      <div className="v-ghibli-bg" aria-hidden="true" />
      <div className="v-ghibli-sparkles" aria-hidden="true">
        <span className="v-ghibli-sparkle" />
        <span className="v-ghibli-sparkle" />
        <span className="v-ghibli-sparkle" />
        <span className="v-ghibli-sparkle" />
      </div>

      <div className="v-ghibli-head">
        <span className="v-ghibli-eyebrow">Season · {season.length_days}-day arc</span>
        <span className="v-ghibli-meta">
          Day {season.days_elapsed} / {season.length_days}
          <span className="v-ghibli-meta-sep">·</span>
          {season.days_remaining}d left
        </span>
      </div>

      <div className="v-ghibli-row">
        <div className="v-ghibli-letter-wrap">
          <span className="v-ghibli-letter" aria-hidden="true">
            {season.tier}
          </span>
          <span className="v-ghibli-letter-shadow" aria-hidden="true">
            {season.tier}
          </span>
        </div>

        <div className="v-ghibli-stats">
          <div>
            <div className="v-ghibli-stat-num">{season.xp_earned.toLocaleString()}</div>
            <div className="v-ghibli-stat-label">xp earned</div>
          </div>
          <div>
            <div className="v-ghibli-stat-num">{season.xp_target.toLocaleString()}</div>
            <div className="v-ghibli-stat-label">season target</div>
          </div>
          {season.coins > 0 && (
            <div>
              <div className="v-ghibli-stat-num">{season.coins}</div>
              <div className="v-ghibli-stat-label">coins</div>
            </div>
          )}
        </div>
      </div>

      <div
        className="v-ghibli-xp"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(season.xp_percent)}
        aria-label="Season XP progress"
      >
        <div
          className="v-ghibli-xp-fill"
          style={{ width: `${Math.min(100, season.xp_percent)}%` }}
        >
          <div className="v-ghibli-xp-shimmer" aria-hidden="true" />
        </div>
      </div>

      <div className="v-ghibli-foot">
        <span className="v-ghibli-foot-pct">{season.xp_percent.toFixed(1)}%</span>
        {nextTier ? (
          <span className="v-ghibli-foot-next">
            <strong>{xpToNext.toLocaleString()} xp</strong> to {nextTier}
          </span>
        ) : (
          <span className="v-ghibli-foot-next">apex reached — keep stacking</span>
        )}
      </div>
    </section>
  );
}

export function VariantGhibliCeremony({ tier }: { tier: Tier }) {
  return (
    <div className="v-ghibli-ceremony">
      <div className="v-ghibli-ceremony-eyebrow">Rank achieved</div>
      <div className="v-ghibli-ceremony-letter">{tier}</div>
      <div className="v-ghibli-ceremony-foot">a new chapter begins</div>
    </div>
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
    case "F":
      return 0;
    case "D":
      return 50;
    case "C":
      return 60;
    case "B":
      return 70;
    case "A":
      return 80;
    case "S":
      return 90;
    case "SSS":
      return 100;
  }
}
