"use client";

/**
 * HabitsModule — today's habit completion glance.
 * Fetches /api/habits to get today's completed/total + streak.
 * Tapping opens the Habits tab.
 */

import { useState, useEffect } from "react";
import { BentoBox } from "../../../bento/BentoBox";
import { useActiveTab } from "../../../useActiveTab";

interface DaySnapshot {
  completedToday?: number;
  totalToday?: number;
}

interface SeasonStatus {
  currentStreak?: number;
}

interface HabitsResp {
  connected?: boolean;
  snapshot?: DaySnapshot;
  season?: SeasonStatus;
  error?: string;
}

export function HabitsModule({ cols = 4 }: { cols?: number }) {
  const { setActive } = useActiveTab();
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [completed, setCompleted] = useState(0);
  const [total, setTotal] = useState(0);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/habits")
      .then((r) => r.json())
      .then((d: HabitsResp) => {
        if (cancelled) return;
        setConnected(!!d.connected);
        setCompleted(d.snapshot?.completedToday ?? 0);
        setTotal(d.snapshot?.totalToday ?? 0);
        setStreak(d.season?.currentStreak ?? 0);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const allDone = connected && !loading && total > 0 && completed >= total;

  return (
    <BentoBox
      cols={cols}
      eyebrow="Habits"
      kanji="習"
      count={
        !loading && connected && total > 0 ? `${completed}/${total}` : undefined
      }
      onClick={() => setActive("habits")}
    >
      {loading ? (
        <span style={{ opacity: 0.45, fontSize: 13 }}>Loading...</span>
      ) : !connected ? (
        <span style={{ opacity: 0.5, fontSize: 13 }}>
          Connect Supabase to track habits
        </span>
      ) : total === 0 ? (
        <span style={{ opacity: 0.5, fontSize: 13 }}>No habits for today</span>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {/* Progress bar */}
          <div
            style={{
              height: 5,
              borderRadius: 3,
              background: "rgba(255,255,255,0.08)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                borderRadius: 3,
                width: `${pct}%`,
                background: allDone
                  ? "#34D399"
                  : "var(--emaki-foxfire, #E8A038)",
                transition: "width 0.4s ease",
              }}
            />
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              gap: 8,
            }}
          >
            <div style={{ fontSize: 13, opacity: 0.7 }}>
              {allDone ? "All done today" : `${total - completed} remaining`}
            </div>
            {streak > 0 && (
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  opacity: 0.6,
                  letterSpacing: "0.06em",
                }}
              >
                {streak}d streak
              </div>
            )}
          </div>
        </div>
      )}
    </BentoBox>
  );
}
