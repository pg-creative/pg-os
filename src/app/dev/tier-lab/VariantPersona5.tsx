"use client";
import type { SeasonStatus, Tier } from "@/app/_components/Habits/types";

/**
 * Variant B — Persona 5 (Kinetic / Bold)
 *
 * Aggressive italic sans, slashed clip-path borders, offset tier letter,
 * chunky stair-step XP bar, confetti slash particles on hover.
 */
export function VariantPersona5({ season }: { season: SeasonStatus }) {
  const nextTier = nextTierLabel(season.tier);
  const xpToNext = nextTier
    ? Math.max(0, Math.ceil(((tierLowerBound(nextTier) - season.xp_percent) / 100) * season.xp_target))
    : 0;

  return (
    <section
      className={`v-p5-card v-p5-tier-${season.tier.toLowerCase()}`}
      aria-label={`Season tier ${season.tier}`}
    >
      <div className="v-p5-slash" aria-hidden="true" />
      <div className="v-p5-confetti" aria-hidden="true" />

      <div className="v-p5-head">
        <span className="v-p5-eyebrow">All Out Attack · {season.length_days}d</span>
        <span className="v-p5-meta">
          {season.days_elapsed}/{season.length_days} · {season.days_remaining}d
        </span>
      </div>

      <div className="v-p5-row">
        <div className="v-p5-letter-wrap">
          <span className="v-p5-letter-shadow" aria-hidden="true">
            {season.tier}
          </span>
          <span className="v-p5-letter" aria-hidden="true">
            {season.tier}
          </span>
        </div>

        <div className="v-p5-stats">
          <div>
            <div className="v-p5-stat-num">{season.xp_earned.toLocaleString()}</div>
            <div className="v-p5-stat-label">xp earned</div>
          </div>
          <div>
            <div className="v-p5-stat-num">{season.xp_target.toLocaleString()}</div>
            <div className="v-p5-stat-label">target</div>
          </div>
          {season.coins > 0 && (
            <div>
              <div className="v-p5-stat-num">{season.coins}</div>
              <div className="v-p5-stat-label">coins</div>
            </div>
          )}
        </div>
      </div>

      <div
        className="v-p5-xp"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(season.xp_percent)}
        aria-label="Season XP progress"
      >
        <div
          className="v-p5-xp-fill"
          style={{ width: `${Math.min(100, season.xp_percent)}%` }}
        />
      </div>

      <div className="v-p5-foot">
        <span className="v-p5-foot-pct">{season.xp_percent.toFixed(1)}%</span>
        {nextTier ? (
          <span className="v-p5-foot-next">
            <strong>{xpToNext.toLocaleString()} xp</strong> → {nextTier}
          </span>
        ) : (
          <span className="v-p5-foot-next">max rank</span>
        )}
      </div>
    </section>
  );
}

export function VariantPersona5Ceremony({ tier }: { tier: Tier }) {
  return (
    <div className="v-p5-ceremony">
      <div className="v-p5-ceremony-eyebrow">Rank Up!!</div>
      <div className="v-p5-ceremony-letter">{tier}</div>
      <div className="v-p5-ceremony-foot">All Out Attack</div>
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
