"use client";
import type { SeasonStatus, Tier } from "@/app/_components/Habits/types";

/**
 * Variant A — Octopath Traveler (Reverent / Bookish)
 *
 * Heavy display serif, parchment-toned panel, illuminated-manuscript flourishes.
 * Tier letter feels stamped rather than animated. The lack of motion IS the gravitas.
 */
export function VariantOctopath({ season }: { season: SeasonStatus }) {
  const nextTier = nextTierLabel(season.tier);
  const xpToNext = nextTier
    ? Math.max(0, Math.ceil(((tierLowerBound(nextTier) - season.xp_percent) / 100) * season.xp_target))
    : 0;

  return (
    <section
      className={`v-octo-card v-octo-tier-${season.tier.toLowerCase()}`}
      aria-label={`Season tier ${season.tier}`}
    >
      <Filigree className="tl" />
      <Filigree className="tr" />
      <Filigree className="bl" />
      <Filigree className="br" />

      <div className="v-octo-head">
        <span className="v-octo-eyebrow">Chapter · {season.length_days}-day arc</span>
        <span className="v-octo-meta">
          Day {season.days_elapsed} / {season.length_days}
        </span>
      </div>

      <div className="v-octo-row">
        <div className="v-octo-letter-wrap">
          <span className="v-octo-letter-stamp" aria-hidden="true" />
          <span className="v-octo-letter" aria-hidden="true">
            {season.tier}
          </span>
        </div>

        <div className="v-octo-stats">
          <div className="v-octo-stat">
            <span className="v-octo-stat-num">{season.xp_earned.toLocaleString()}</span>
            <span className="v-octo-stat-label">xp earned</span>
          </div>
          <div className="v-octo-stat">
            <span className="v-octo-stat-num">{season.xp_target.toLocaleString()}</span>
            <span className="v-octo-stat-label">arc target</span>
          </div>
          <div className="v-octo-stat">
            <span className="v-octo-stat-num">{season.days_remaining}</span>
            <span className="v-octo-stat-label">days remain</span>
          </div>
          {season.coins > 0 && (
            <div className="v-octo-stat">
              <span className="v-octo-stat-num">{season.coins}</span>
              <span className="v-octo-stat-label">coin</span>
            </div>
          )}
        </div>
      </div>

      <div
        className="v-octo-xp"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(season.xp_percent)}
        aria-label="Season XP progress"
      >
        <div
          className="v-octo-xp-fill"
          style={{ width: `${Math.min(100, season.xp_percent)}%` }}
        />
      </div>

      <div className="v-octo-foot">
        <span className="v-octo-foot-pct">{season.xp_percent.toFixed(1)}%</span>
        {nextTier ? (
          <span className="v-octo-foot-next">
            <strong>{xpToNext.toLocaleString()} xp</strong> to {nextTier}
          </span>
        ) : (
          <span className="v-octo-foot-next">apex reached</span>
        )}
      </div>
    </section>
  );
}

export function VariantOctopathCeremony({ tier }: { tier: Tier }) {
  return (
    <div className="v-octo-ceremony">
      <div className="v-octo-ceremony-eyebrow">Rank achieved</div>
      <div className="v-octo-ceremony-letter">{tier}</div>
      <div className="v-octo-ceremony-foot">— a new chapter begins —</div>
    </div>
  );
}

function Filigree({ className }: { className: string }) {
  return (
    <svg
      className={`v-octo-corner ${className}`}
      viewBox="0 0 42 42"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      aria-hidden="true"
    >
      <path d="M2 2 L18 2 M2 2 L2 18" strokeLinecap="round" />
      <path
        d="M2 8 Q 6 8 8 12 Q 10 16 14 16 M8 2 Q 8 6 12 8 Q 16 10 16 14"
        strokeLinecap="round"
        opacity="0.7"
      />
      <circle cx="6" cy="6" r="1" fill="currentColor" stroke="none" />
    </svg>
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
