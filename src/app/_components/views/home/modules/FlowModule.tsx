"use client";

/**
 * FlowModule — ship streak + open queue count glance.
 * Fetches /api/ships and /api/queue in parallel.
 * Tapping opens the Flow tab.
 */

import { useState, useEffect } from "react";
import { BentoBox } from "../../../bento/BentoBox";
import { useActiveTab } from "../../../useActiveTab";

interface ShipsResp {
  streak?: number;
  shippedToday?: boolean;
  velocity?: number;
}

interface QueueResp {
  items?: unknown[];
}

export function FlowModule({ cols = 4 }: { cols?: number }) {
  const { setActive } = useActiveTab();
  const [loading, setLoading] = useState(true);
  const [streak, setStreak] = useState(0);
  const [shippedToday, setShippedToday] = useState(false);
  const [queueCount, setQueueCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch("/api/ships").then((r) => r.json()),
      fetch("/api/queue").then((r) => r.json()),
    ])
      .then(([ships, queue]: [ShipsResp, QueueResp]) => {
        if (cancelled) return;
        setStreak(ships.streak ?? 0);
        setShippedToday(ships.shippedToday ?? false);
        setQueueCount((queue.items ?? []).length);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <BentoBox
      cols={cols}
      eyebrow="Flow"
      kanji="流"
      count={!loading && queueCount > 0 ? `${queueCount} queued` : undefined}
      onClick={() => setActive("flow")}
    >
      {loading ? (
        <span style={{ opacity: 0.45, fontSize: 13 }}>Loading...</span>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 6,
            }}
          >
            <span
              style={{
                fontSize: 28,
                fontWeight: 800,
                fontFamily: "'DM Sans', monospace",
                fontVariantNumeric: "tabular-nums",
                lineHeight: 1,
                color: shippedToday ? "#34D399" : undefined,
              }}
            >
              {streak}
            </span>
            <span style={{ fontSize: 12, opacity: 0.6, fontWeight: 600 }}>
              day streak
            </span>
          </div>
          <div style={{ fontSize: 12, opacity: 0.55, letterSpacing: "0.04em" }}>
            {shippedToday ? "Shipped today" : "Nothing shipped yet today"}
            {queueCount > 0 && ` · ${queueCount} pending`}
          </div>
        </div>
      )}
    </BentoBox>
  );
}
