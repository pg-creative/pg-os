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
const STORAGE_KEY = "pgos_tier_lab_variant";
const TIER_LADDER: Tier[] = ["F", "D", "C", "B", "A", "S", "SSS"];

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

export default function TierLabPage() {
  const [variant, setVariant] = useState<VariantKey>("ghibli");
  const [ceremonyTier, setCeremonyTier] = useState<Tier | null>(null);

  // Hydrate from localStorage after mount (avoids SSR mismatch)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "octo" || saved === "p5" || saved === "ghibli") {
        setVariant(saved);
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

      <div className="tl-stage">
        {variant === "octo" && <VariantOctopath season={SEED} />}
        {variant === "p5" && <VariantPersona5 season={SEED} />}
        {variant === "ghibli" && <VariantGhibli season={SEED} />}
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
