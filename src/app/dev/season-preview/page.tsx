"use client";

import { useState } from "react";
import { SeasonTierCard } from "@/app/_components/Habits/SeasonTierCard";
import { RankUpModal } from "@/app/_components/Habits/RankUpModal";
import type { SeasonStatus, Tier } from "@/app/_components/Habits/types";

/**
 * /dev/season-preview — production SeasonTierCard with seeded data.
 *
 * Lets PG see the lifted Ghibli aesthetic + ratchet display before the
 * HC service role key is pasted (without which the live Habits view shows
 * the "HC NOT CONNECTED" empty state).
 *
 * Tier slider lets you scrub the live tier from F→SSS to feel the colors
 * + aurora at SSS. Floor toggle simulates the ratchet behavior — when
 * floor > current, the "currently pacing X" subtitle appears.
 */

const TIER_LADDER: Tier[] = ["F", "D", "C", "B", "A", "S", "SSS"];

const BASE_SEED: Omit<SeasonStatus, "tier" | "tier_floor" | "xp_percent"> = {
  length_days: 66,
  started_at: "2026-04-27",
  days_elapsed: 12,
  days_remaining: 54,
  xp_earned: 8200,
  xp_target: 14000,
  tier_progress: 87,
  coins: 42,
};

function tierToPercent(t: Tier): number {
  switch (t) {
    case "F": return 30;
    case "D": return 55;
    case "C": return 65;
    case "B": return 75;
    case "A": return 85;
    case "S": return 95;
    case "SSS": return 108;
  }
}

export default function SeasonPreviewPage() {
  const [tier, setTier] = useState<Tier>("C");
  const [floor, setFloor] = useState<Tier>("B");
  const [showCeremony, setShowCeremony] = useState<{ from: Tier; to: Tier } | null>(null);

  const xpPercent = tierToPercent(tier);
  const season: SeasonStatus = {
    ...BASE_SEED,
    tier,
    tier_floor: floor,
    xp_percent: xpPercent,
    xp_earned: Math.round(BASE_SEED.xp_target * (xpPercent / 100)),
  };

  return (
    <main
      style={{
        minHeight: "100dvh",
        padding: "24px 16px 96px",
        display: "flex",
        flexDirection: "column",
        gap: 20,
        color: "var(--fg)",
        background: "var(--bg)",
      }}
    >
      <header style={{ textAlign: "center" }}>
        <h1 style={{ fontFamily: "var(--serif), serif", fontSize: 22, margin: 0 }}>
          Season Preview
        </h1>
        <p style={{ fontFamily: "var(--mono), monospace", fontSize: 10.5, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--muted)", marginTop: 6 }}>
          Production SeasonTierCard · Ghibli + Ratchet
        </p>
      </header>

      <SeasonTierCard season={season} />

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <div style={{ fontFamily: "var(--mono), monospace", fontSize: 10.5, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 8 }}>
            Live tier (current pace)
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {TIER_LADDER.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTier(t)}
                style={{
                  flex: "1 1 40px",
                  minHeight: 44,
                  padding: "10px 8px",
                  borderRadius: 10,
                  border: `1px solid ${tier === t ? "var(--accent-2)" : "var(--border-soft)"}`,
                  background: tier === t ? "rgba(232,178,107,0.18)" : "rgba(255,255,255,0.03)",
                  color: tier === t ? "var(--ht-gold-warm)" : "var(--fg-dim)",
                  fontFamily: "var(--serif), serif",
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div style={{ fontFamily: "var(--mono), monospace", fontSize: 10.5, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 8 }}>
            Locked floor (ratchet)
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {TIER_LADDER.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setFloor(t)}
                style={{
                  flex: "1 1 40px",
                  minHeight: 44,
                  padding: "10px 8px",
                  borderRadius: 10,
                  border: `1px solid ${floor === t ? "var(--accent-2)" : "var(--border-soft)"}`,
                  background: floor === t ? "rgba(232,178,107,0.18)" : "rgba(255,255,255,0.03)",
                  color: floor === t ? "var(--ht-gold-warm)" : "var(--fg-dim)",
                  fontFamily: "var(--serif), serif",
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {t}
              </button>
            ))}
          </div>
          <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 8, fontStyle: "italic" }}>
            When floor &gt; live tier, &ldquo;currently pacing X&rdquo; subtitle appears.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            const idx = TIER_LADDER.indexOf(tier);
            const next = idx >= 0 && idx < TIER_LADDER.length - 1 ? TIER_LADDER[idx + 1] : tier;
            setShowCeremony({ from: tier, to: next });
          }}
          style={{
            marginTop: 8,
            minHeight: 48,
            padding: "12px 20px",
            borderRadius: 12,
            border: "1px solid var(--accent-2)",
            background: "rgba(232,178,107,0.08)",
            color: "var(--ht-gold-warm)",
            fontFamily: "var(--mono), monospace",
            fontSize: 12,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            cursor: "pointer",
          }}
        >
          Show rank-up ceremony
        </button>
      </div>

      {showCeremony && (
        <RankUpModal
          from={showCeremony.from}
          to={showCeremony.to}
          onDone={() => setShowCeremony(null)}
        />
      )}
    </main>
  );
}
