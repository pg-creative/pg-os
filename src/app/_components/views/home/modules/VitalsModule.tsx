"use client";

/**
 * VitalsModule — Whoop recovery + sleep glance (no tap target).
 * Fetches /api/vitals/whoop.
 */

import { useState, useEffect } from "react";
import { BentoBox } from "../../../bento/BentoBox";

interface WhoopResp {
  authed: boolean;
  recovery?: number | null;
  hrv?: number | null;
  restingHr?: number | null;
  sleepHours?: number | null;
}

function recoveryColor(r: number): string {
  if (r >= 67) return "#34D399"; // green
  if (r >= 34) return "#FBBF24"; // yellow
  return "#F87171"; // red
}

export function VitalsModule({ cols = 6 }: { cols?: number }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<WhoopResp | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/vitals/whoop")
      .then((r) => r.json())
      .then((d: WhoopResp) => {
        if (cancelled) return;
        setData(d);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const fmt = (n: number | null | undefined, dp = 0) =>
    n == null ? "—" : n.toFixed(dp);

  const stats = data?.authed
    ? [
        {
          val: fmt(data.recovery),
          unit: "%",
          lbl: "Recovery",
          color:
            data.recovery != null ? recoveryColor(data.recovery) : undefined,
        },
        { val: fmt(data.sleepHours, 1), unit: "h", lbl: "Sleep" },
        { val: fmt(data.hrv), unit: "ms", lbl: "HRV" },
        { val: fmt(data.restingHr), unit: "bpm", lbl: "Rest HR" },
      ]
    : null;

  return (
    <BentoBox cols={cols} eyebrow="Vitals" kanji="生">
      {loading ? (
        <span style={{ opacity: 0.45, fontSize: 13 }}>Loading...</span>
      ) : !data?.authed ? (
        <span style={{ opacity: 0.5, fontSize: 13 }}>
          Connect Whoop to see vitals
        </span>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 8,
          }}
        >
          {stats!.map((s) => (
            <div
              key={s.lbl}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 3,
              }}
            >
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 800,
                  fontFamily: "'DM Sans', monospace",
                  fontVariantNumeric: "tabular-nums",
                  lineHeight: 1,
                  color: s.color,
                }}
              >
                {s.val}
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 500,
                    marginLeft: 1,
                    opacity: 0.6,
                  }}
                >
                  {s.unit}
                </span>
              </div>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  opacity: 0.5,
                  fontFamily: "'Noto Serif JP', serif",
                }}
              >
                {s.lbl}
              </div>
            </div>
          ))}
        </div>
      )}
    </BentoBox>
  );
}
