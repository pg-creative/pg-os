"use client";

/**
 * SeasonMeterDrilldown — modal showing all 7 tiers vertically with thresholds,
 * the current position highlighted, today's XP delta, season-day counter.
 *
 * Opened from SeasonMeter on click / Enter / Space, or directly on mobile tap.
 * Closes on ESC, backdrop click, or the explicit close button.
 *
 * a11y: role="dialog" aria-modal="true", focus trap on the close button,
 * restores focus to the trigger on close.
 */
import { useEffect, useRef } from "react";
import type { SeasonPayload, Tier } from "./SeasonMeter";

const TIER_BANDS: Array<{ tier: Tier; lower: number; upper: number; label: string }> = [
  { tier: "SSS", lower: 100, upper: 150, label: "Mythic — beyond the season target" },
  { tier: "S", lower: 90, upper: 100, label: "Brilliant" },
  { tier: "A", lower: 80, upper: 90, label: "Gold" },
  { tier: "B", lower: 70, upper: 80, label: "Amber" },
  { tier: "C", lower: 60, upper: 70, label: "Cream" },
  { tier: "D", lower: 50, upper: 60, label: "Neutral" },
  { tier: "F", lower: 0, upper: 50, label: "Foundation" },
];

type Props = {
  data: SeasonPayload;
  xpDeltaToday: number;
  onClose: () => void;
};

export default function SeasonMeterDrilldown({ data, xpDeltaToday, onClose }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const prevFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (typeof document === "undefined") return;
    prevFocus.current = (document.activeElement as HTMLElement | null) ?? null;
    closeRef.current?.focus();
    return () => {
      prevFocus.current?.focus?.();
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "Tab") {
        // Single-element focus trap on the close button.
        e.preventDefault();
        closeRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="season-drilldown__backdrop"
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={dialogRef}
        className="season-drilldown"
        role="dialog"
        aria-modal="true"
        aria-labelledby="season-drilldown-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="season-drilldown__head">
          <div>
            <h2 id="season-drilldown-title" className="season-drilldown__title">
              Season <em>map</em>
            </h2>
            <div className="season-drilldown__sub">
              Day {data.days_elapsed} of {data.length_days} · {data.days_remaining} remaining
            </div>
          </div>
          <button
            ref={closeRef}
            type="button"
            className="season-drilldown__close"
            onClick={onClose}
            aria-label="Close season map"
          >
            ✕
          </button>
        </div>

        <div className="season-drilldown__stats">
          <div className="season-drilldown__stat">
            <div className="season-drilldown__stat-label">Tier</div>
            <div className="season-drilldown__stat-value">{data.tier}</div>
          </div>
          <div className="season-drilldown__stat">
            <div className="season-drilldown__stat-label">Floor</div>
            <div className="season-drilldown__stat-value">{data.tier_floor}</div>
          </div>
          <div className="season-drilldown__stat">
            <div className="season-drilldown__stat-label">XP</div>
            <div className="season-drilldown__stat-value">
              {data.xp_earned.toLocaleString()}
              <span className="season-drilldown__stat-dim">
                {" "}/ {data.xp_target.toLocaleString()}
              </span>
            </div>
          </div>
          <div className="season-drilldown__stat">
            <div className="season-drilldown__stat-label">Today</div>
            <div className="season-drilldown__stat-value">
              {xpDeltaToday > 0 ? `+${xpDeltaToday}` : xpDeltaToday}
            </div>
          </div>
        </div>

        <ul className="season-drilldown__ladder" aria-label="Tier ladder">
          {TIER_BANDS.map(({ tier, lower, upper, label }) => {
            const isCurrent = data.tier === tier;
            const isFloor = data.tier_floor === tier;
            const isReached = bandReached(data.xp_percent, lower);
            return (
              <li
                key={tier}
                className={[
                  "season-drilldown__rung",
                  `season-drilldown__rung--${tier.toLowerCase()}`,
                  isCurrent ? "is-current" : "",
                  isReached ? "is-reached" : "",
                  isFloor ? "is-floor" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                aria-current={isCurrent ? "true" : undefined}
              >
                <span className="season-drilldown__rung-glyph">{tier}</span>
                <span className="season-drilldown__rung-meta">
                  <span className="season-drilldown__rung-range">
                    {lower}%{tier === "SSS" ? "+" : `–${upper}%`}
                  </span>
                  <span className="season-drilldown__rung-label">{label}</span>
                </span>
                <span className="season-drilldown__rung-tag">
                  {isCurrent && <em>here</em>}
                  {!isCurrent && isFloor && <span>floor</span>}
                </span>
              </li>
            );
          })}
        </ul>

        <div className="season-drilldown__foot">
          {data.connected ? (
            <span>
              {Math.round(data.xp_percent)}% of target · {Math.round(data.tier_progress)}% across the {data.tier} band
            </span>
          ) : (
            <span>Hero&rsquo;s Chronicle not connected — meter is showing an empty season.</span>
          )}
        </div>
      </div>
    </div>
  );
}

function bandReached(xpPercent: number, lower: number): boolean {
  return xpPercent >= lower;
}
