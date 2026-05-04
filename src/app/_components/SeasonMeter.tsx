"use client";

/**
 * SeasonMeter — slim persistent strip at the top of HomeView.
 *
 * Layout (left → right):
 *   [tier glyph 32px]  [XP bar with floor tick + animated fill]  [days pill]
 *
 * Data comes from /api/season (mirrors src/lib/habits.ts SeasonStatus).
 * Polls every 30s. Respects prefers-reduced-motion. Click → drilldown modal.
 *
 * a11y: role="meter", aria-valuenow on tier_progress (0–100), aria-label
 * names the current tier.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import SeasonMeterDrilldown from "./SeasonMeterDrilldown";

export type Tier = "F" | "D" | "C" | "B" | "A" | "S" | "SSS";

export type SeasonPayload = {
  connected: boolean;
  length_days: number;
  started_at: string | null;
  days_elapsed: number;
  days_remaining: number;
  xp_earned: number;
  xp_target: number;
  xp_percent: number;
  tier: Tier;
  tier_floor: Tier;
  tier_progress: number;
  coins: number;
};

const TIER_LADDER: Tier[] = ["F", "D", "C", "B", "A", "S", "SSS"];
const TIER_BAND_LOWER: Record<Tier, number> = {
  F: 0,
  D: 50,
  C: 60,
  B: 70,
  A: 80,
  S: 90,
  SSS: 100,
};
const TIER_BAND_UPPER: Record<Tier, number> = {
  F: 50,
  D: 60,
  C: 70,
  B: 80,
  A: 90,
  S: 100,
  SSS: 150,
};

function tierBandClass(tier: Tier): string {
  return `season-meter--tier-${tier.toLowerCase()}`;
}

function tierGlyph(tier: Tier): string {
  return tier;
}

/**
 * Position (0–1) of a tier's lower threshold within the visible 0–100% band.
 * Used to plot the ratchet floor tick mark on the bar.
 */
function tierFloorPosition(floor: Tier): number {
  const lower = TIER_BAND_LOWER[floor];
  return Math.max(0, Math.min(1, lower / 100));
}

const DEFAULT_PAYLOAD: SeasonPayload = {
  connected: false,
  length_days: 66,
  started_at: null,
  days_elapsed: 0,
  days_remaining: 66,
  xp_earned: 0,
  xp_target: 0,
  xp_percent: 0,
  tier: "F",
  tier_floor: "F",
  tier_progress: 0,
  coins: 0,
};

export default function SeasonMeter() {
  const [data, setData] = useState<SeasonPayload>(DEFAULT_PAYLOAD);
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [xpDeltaToday] = useState(0); // future: derive from completions today
  const reducedMotionRef = useRef(false);

  // Detect reduced motion once (and listen for changes).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => {
      reducedMotionRef.current = mq.matches;
    };
    apply();
    mq.addEventListener?.("change", apply);
    return () => mq.removeEventListener?.("change", apply);
  }, []);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/season", { cache: "no-store" });
      if (!res.ok) return;
      const json = (await res.json()) as SeasonPayload;
      setData(json);
    } catch {
      // swallow; keep last known state
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const id = setInterval(fetchStatus, 30_000);
    return () => clearInterval(id);
  }, [fetchStatus]);

  // ESC closes modal even if something inside swallows it.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const tier = data.tier;
  const fillPct = useMemo(() => {
    // Visual fill = position of xp_percent on a 0–100 scale, clamped.
    return Math.max(0, Math.min(100, data.xp_percent));
  }, [data.xp_percent]);

  const floorTickLeft = useMemo(() => tierFloorPosition(data.tier_floor) * 100, [data.tier_floor]);

  const ariaLabel =
    `Tier ${tier} progress · ${Math.round(data.tier_progress)}% to next tier · ` +
    `Day ${data.days_elapsed} of ${data.length_days}`;

  return (
    <>
      <div
        className={`season-meter ${tierBandClass(tier)} ${hovered ? "is-hovered" : ""}`}
        role="meter"
        aria-valuenow={Math.round(data.tier_progress)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={ariaLabel}
        tabIndex={0}
        onClick={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen(true);
          }
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocus={() => setHovered(true)}
        onBlur={() => setHovered(false)}
        data-reduced-motion={reducedMotionRef.current ? "true" : "false"}
      >
        <div className="season-meter__glyph" aria-hidden="true">
          <span className="season-meter__glyph-letter">{tierGlyph(tier)}</span>
        </div>

        <div className="season-meter__bar">
          <div className="season-meter__track">
            <div
              className="season-meter__fill"
              style={{ width: `${fillPct}%` }}
            />
            {/* Tier band markers — slim ticks at D / C / B / A / S / SSS thresholds */}
            {(["D", "C", "B", "A", "S", "SSS"] as Tier[]).map((t) => (
              <span
                key={t}
                className="season-meter__tick"
                style={{ left: `${TIER_BAND_LOWER[t]}%` }}
                aria-hidden="true"
              />
            ))}
            {/* Ratchet floor pinned tick — visually distinct from band markers */}
            <span
              className="season-meter__floor"
              style={{ left: `${floorTickLeft}%` }}
              aria-hidden="true"
              title={`Ratchet floor: ${data.tier_floor}`}
            />
          </div>

          {/* Hover/focus reveal — desktop tooltip */}
          {hovered && (
            <div className="season-meter__reveal" role="tooltip">
              <div className="season-meter__reveal-row">
                <span className="season-meter__reveal-label">Tier</span>
                <span className="season-meter__reveal-value">
                  {tier} <span className="season-meter__reveal-dim">→ {nextTier(tier)}</span>
                </span>
              </div>
              <div className="season-meter__reveal-row">
                <span className="season-meter__reveal-label">XP</span>
                <span className="season-meter__reveal-value">
                  {data.xp_earned.toLocaleString()} / {data.xp_target.toLocaleString()}
                </span>
              </div>
              <div className="season-meter__reveal-row">
                <span className="season-meter__reveal-label">Floor</span>
                <span className="season-meter__reveal-value">{data.tier_floor}</span>
              </div>
              <div className="season-meter__reveal-row">
                <span className="season-meter__reveal-label">Day</span>
                <span className="season-meter__reveal-value">
                  {data.days_elapsed} / {data.length_days}
                </span>
              </div>
              <div className="season-meter__reveal-hint">click for full breakdown</div>
            </div>
          )}
        </div>

        <div className="season-meter__pill" aria-label={`${data.days_remaining} days remaining`}>
          <span className="season-meter__pill-num">{data.days_remaining}</span>
          <span className="season-meter__pill-unit">d left</span>
        </div>
      </div>

      {open && (
        <SeasonMeterDrilldown
          data={data}
          xpDeltaToday={xpDeltaToday}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function nextTier(t: Tier): Tier {
  const i = TIER_LADDER.indexOf(t);
  if (i < 0 || i >= TIER_LADDER.length - 1) return "SSS";
  return TIER_LADDER[i + 1]!;
}
