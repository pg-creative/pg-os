"use client";

import { useEffect, useState } from "react";
import type { SeasonStatus, Tier } from "@/app/_components/Habits/types";
import { VariantOctopath, VariantOctopathCeremony } from "./VariantOctopath";
import { VariantPersona5, VariantPersona5Ceremony } from "./VariantPersona5";
import { VariantGhibli, VariantGhibliCeremony } from "./VariantGhibli";
import "./lab.css";

/**
 * Tier Lab — live design-options page for SeasonTierCard.
 *
 * Three switchable variants of the JRPG rank card, rendered with seeded fake
 * SeasonStatus so PG can compare visual directions on phone. Toggle persists in
 * localStorage. Ceremony button previews the rank-up modal in each variant's
 * style for 3 seconds.
 *
 * Reachable at /dev/tier-lab (must be auth'd if PGOS_SHARED_SECRET is set).
 */

type VariantKey = "octo" | "p5" | "ghibli";
type Psychology = "letter" | "arrow" | "ratchet" | "pace";
const STORAGE_KEY = "pgos_tier_lab_variant";
const PSYCH_KEY = "pgos_tier_lab_psych";
const TIER_LADDER: Tier[] = ["F", "D", "C", "B", "A", "S", "SSS"];

// Pure-letter system seeds at "C, climbing" — the danger zone where loss
// aversion kicks in. We use this scenario across all 4 psychology modes so
// PG can directly compare how each frames the same underlying state.
const SEED: SeasonStatus = {
  length_days: 66,
  started_at: "2026-04-27",
  days_elapsed: 12,
  days_remaining: 54,
  xp_earned: 8200,
  xp_target: 14000,
  xp_percent: 58.5,
  tier: "C",
  tier_progress: 87,
  coins: 0,
};

// Locked tier in ratchet mode = highest tier ever achieved this season.
// In our seed scenario PG once hit B briefly then slipped to C — ratchet
// keeps B as the floor.
const LOCKED_TIER: Tier = "B";

function tierIndex(t: Tier): number {
  return TIER_LADDER.indexOf(t);
}

function tierAtPace(s: SeasonStatus): Tier {
  // Project current XP rate forward to season end → which tier would that hit
  const projected = (s.xp_earned / Math.max(s.days_elapsed, 1)) * s.length_days;
  const projectedPct = (projected / s.xp_target) * 100;
  if (projectedPct >= 100) return "SSS";
  if (projectedPct >= 90) return "S";
  if (projectedPct >= 80) return "A";
  if (projectedPct >= 70) return "B";
  if (projectedPct >= 60) return "C";
  if (projectedPct >= 50) return "D";
  return "F";
}

// Trend arrow: compare current tier_progress (% to next tier) — climbing >50%, declining <30%
function trendArrow(s: SeasonStatus): "up" | "flat" | "down" {
  if (s.tier_progress >= 60) return "up";
  if (s.tier_progress >= 30) return "flat";
  return "down";
}

export default function TierLabPage() {
  const [variant, setVariant] = useState<VariantKey>("ghibli");
  const [psychology, setPsychology] = useState<Psychology>("letter");
  const [ceremonyTier, setCeremonyTier] = useState<Tier | null>(null);

  // Hydrate from localStorage after mount (avoids SSR mismatch)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "octo" || saved === "p5" || saved === "ghibli") {
        setVariant(saved);
      }
      const psych = localStorage.getItem(PSYCH_KEY);
      if (psych === "letter" || psych === "arrow" || psych === "ratchet" || psych === "pace") {
        setPsychology(psych);
      }
    } catch {
      /* ignore quota / privacy mode */
    }
  }, []);

  function pick(v: VariantKey) {
    setVariant(v);
    try {
      localStorage.setItem(STORAGE_KEY, v);
    } catch {
      /* ignore */
    }
  }

  function pickPsych(p: Psychology) {
    setPsychology(p);
    try {
      localStorage.setItem(PSYCH_KEY, p);
    } catch {
      /* ignore */
    }
  }

  // Compute display tier based on psychology mode.
  // - letter: pure tier (C in seed)
  // - arrow: same letter, with trend arrow overlay
  // - ratchet: max(current, locked) — the floor protects from demotion
  // - pace: don't show letter at all; show pace projection instead
  const displayTier: Tier =
    psychology === "ratchet"
      ? (tierIndex(SEED.tier) >= tierIndex(LOCKED_TIER) ? SEED.tier : LOCKED_TIER)
      : SEED.tier;
  const projectedTier = tierAtPace(SEED);
  const arrow = trendArrow(SEED);

  function showCeremony() {
    // Rank-up preview: one tier above the seeded tier, falling back to the same
    const idx = TIER_LADDER.indexOf(SEED.tier);
    const next = idx >= 0 && idx < TIER_LADDER.length - 1 ? TIER_LADDER[idx + 1] : SEED.tier;
    setCeremonyTier(next);
    window.setTimeout(() => setCeremonyTier(null), 3000);
  }

  return (
    <main className="tl-page">
      <h1 className="tl-title">Tier Lab</h1>
      <p className="tl-sub">SeasonTierCard · 3 variants</p>

      <div
        className="tl-toggle-row"
        role="tablist"
        aria-label="Choose tier card variant"
      >
        <button
          type="button"
          role="tab"
          aria-selected={variant === "octo"}
          className={`tl-toggle ${variant === "octo" ? "active" : ""}`}
          onClick={() => pick("octo")}
        >
          A · Octopath
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={variant === "p5"}
          className={`tl-toggle ${variant === "p5" ? "active" : ""}`}
          onClick={() => pick("p5")}
        >
          B · Persona 5
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={variant === "ghibli"}
          className={`tl-toggle ${variant === "ghibli" ? "active" : ""}`}
          onClick={() => pick("ghibli")}
        >
          C · Ghibli
        </button>
      </div>

      <div
        className="tl-psych-row"
        role="tablist"
        aria-label="Choose psychology framing"
      >
        <button type="button" role="tab" aria-selected={psychology === "letter"} className={`tl-psych ${psychology === "letter" ? "active" : ""}`} onClick={() => pickPsych("letter")}>letter only</button>
        <button type="button" role="tab" aria-selected={psychology === "arrow"} className={`tl-psych ${psychology === "arrow" ? "active" : ""}`} onClick={() => pickPsych("arrow")}>+ trend arrow</button>
        <button type="button" role="tab" aria-selected={psychology === "ratchet"} className={`tl-psych ${psychology === "ratchet" ? "active" : ""}`} onClick={() => pickPsych("ratchet")}>ratchet (no demote)</button>
        <button type="button" role="tab" aria-selected={psychology === "pace"} className={`tl-psych ${psychology === "pace" ? "active" : ""}`} onClick={() => pickPsych("pace")}>pace framing</button>
      </div>

      <div className="tl-psych-explainer" role="status" aria-live="polite">
        {psychology === "letter" && <span><strong>letter only.</strong> Pure F→SSS rank. Highest stakes. Can demote. Shame risk on slips — Duolingo research says this loses users.</span>}
        {psychology === "arrow" && <span><strong>letter + trend arrow.</strong> Same letter but ↗↘→ shows direction. Whoop pattern: turns &ldquo;demoted&rdquo; into &ldquo;declining&rdquo; (actionable, not shame).</span>}
        {psychology === "ratchet" && <span><strong>ratchet floor.</strong> Once you hit a tier this season, you can&rsquo;t drop below it. Habitica pattern. Letter is the floor + a small &ldquo;current&rdquo; subtitle.</span>}
        {psychology === "pace" && <span><strong>pace framing.</strong> Hide letter mid-season. Show pace projection: &ldquo;on track for X tier.&rdquo; Letter only revealed at season end. Zero daily anxiety.</span>}
      </div>

      <div className="tl-stage" data-psych={psychology}>
        {variant === "octo" && <VariantOctopath season={{ ...SEED, tier: displayTier }} />}
        {variant === "p5" && <VariantPersona5 season={{ ...SEED, tier: displayTier }} />}
        {variant === "ghibli" && <VariantGhibli season={{ ...SEED, tier: displayTier }} />}

        {psychology === "arrow" && (
          <div className={`tl-arrow-overlay tl-arrow-${arrow}`} aria-label={`Trend ${arrow}`}>
            {arrow === "up" ? "↗" : arrow === "down" ? "↘" : "→"}
          </div>
        )}
        {psychology === "ratchet" && SEED.tier !== LOCKED_TIER && (
          <div className="tl-ratchet-note">
            <span className="tl-ratchet-locked">{LOCKED_TIER} locked</span>
            <span className="tl-ratchet-current">currently pacing {SEED.tier}</span>
          </div>
        )}
        {psychology === "pace" && (
          <div className="tl-pace-overlay">
            <div className="tl-pace-line">Day {SEED.days_elapsed} / {SEED.length_days}</div>
            <div className="tl-pace-projection">on track for <strong>{projectedTier}</strong> tier</div>
            <div className="tl-pace-hint">letter revealed at season end</div>
          </div>
        )}
      </div>

      <div className="tl-ladder" aria-label="Tier ladder preview">
        {TIER_LADDER.map((t) => (
          <TierChip key={t} tier={t} variant={variant} />
        ))}
      </div>

      <button type="button" className="tl-ceremony-btn" onClick={showCeremony}>
        Show ceremony
      </button>

      {ceremonyTier && (
        <div
          className="tl-ceremony-overlay"
          role="dialog"
          aria-label={`Rank up to ${ceremonyTier}`}
          aria-live="polite"
        >
          {variant === "octo" && <VariantOctopathCeremony tier={ceremonyTier} />}
          {variant === "p5" && <VariantPersona5Ceremony tier={ceremonyTier} />}
          {variant === "ghibli" && <VariantGhibliCeremony tier={ceremonyTier} />}
        </div>
      )}
    </main>
  );
}

function TierChip({ tier, variant }: { tier: Tier; variant: VariantKey }) {
  // Each chip uses the variant's own tier-color class so PG sees the full
  // ladder palette at a glance.
  if (variant === "octo") {
    return (
      <span className={`tl-ladder-chip v-octo-tier-${tier.toLowerCase()}`}>
        <span className="v-octo-letter" style={{ position: "static", fontSize: 14 }}>
          {tier}
        </span>
      </span>
    );
  }
  if (variant === "p5") {
    return (
      <span className={`tl-ladder-chip v-p5-tier-${tier.toLowerCase()}`}>
        <span
          className="v-p5-letter"
          style={{ position: "static", fontSize: 16, animation: "none" }}
        >
          {tier}
        </span>
      </span>
    );
  }
  return (
    <span className={`tl-ladder-chip v-ghibli-tier-${tier.toLowerCase()}`}>
      <span
        className="v-ghibli-letter"
        style={{ position: "static", fontSize: 14, animation: "none" }}
      >
        {tier}
      </span>
    </span>
  );
}
