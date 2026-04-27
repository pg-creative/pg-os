"use client";
import { useState, useEffect } from "react";
import { getRitualState, getRitualStreaks } from "@/lib/rituals";
import { MorningRitual } from "./MorningRitual";
import { EveningRitual } from "./EveningRitual";

type RitualKind = "morning" | "evening";
type OpenModal = RitualKind | null;

/** Returns true if current local hour is within the ritual's availability window */
function isInWindow(kind: RitualKind): boolean {
  const h = new Date().getHours();
  if (kind === "morning") return h >= 5 && h < 12;   // 5am – noon
  return h >= 18 || h < 3;                             // 6pm – 3am
}

function streakGlyph(n: number): string {
  if (n === 0) return "○";
  if (n < 3) return "◐";
  if (n < 7) return "●";
  return "★";
}

export function RitualGate() {
  const [doneToday, setDoneToday] = useState<{ morning: boolean; evening: boolean }>({
    morning: false,
    evening: false,
  });
  const [streaks, setStreaks] = useState<{ morning: number; evening: number }>({
    morning: 0,
    evening: 0,
  });
  const [openModal, setOpenModal] = useState<OpenModal>(null);
  // Hydration guard
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const state = getRitualState();
    const s = getRitualStreaks();
    setDoneToday({
      morning: !!state.morning.completedAt,
      evening: !!state.evening.completedAt,
    });
    setStreaks(s);
  }, []);

  // Re-read state when a modal closes (after completion)
  const handleClose = (kind: RitualKind) => {
    setOpenModal(null);
    const state = getRitualState();
    const s = getRitualStreaks();
    setDoneToday({
      morning: !!state.morning.completedAt,
      evening: !!state.evening.completedAt,
    });
    setStreaks(s);
  };

  // Don't render on server — localStorage is client-only
  if (!mounted) return null;

  const rituals: { kind: RitualKind; label: string; timeWindow: string }[] = [
    { kind: "morning", label: "Morning ritual", timeWindow: "5am – noon" },
    { kind: "evening", label: "Evening ritual", timeWindow: "6pm – 3am" },
  ];

  return (
    <>
      <div className="rt-gate" role="region" aria-label="Ritual anchors">
        <div className="rt-gate-label">ANCHORS</div>
        <div className="rt-gate-pills">
          {rituals.map(({ kind, label, timeWindow }) => {
            const done = doneToday[kind];
            const inWindow = isInWindow(kind);
            const nudge = !done && inWindow;
            const streak = streaks[kind];

            return (
              <button
                key={kind}
                className={[
                  "rt-pill",
                  done ? "done" : "",
                  !inWindow ? "dim" : "",
                  nudge ? "nudge" : "",
                ].filter(Boolean).join(" ")}
                onClick={() => setOpenModal(kind)}
                aria-label={`${label}${done ? " — completed today" : ""}`}
              >
                <span className="rt-pill-label">
                  {done ? "✓ " : ""}
                  {label}
                </span>
                <span className="rt-pill-meta" aria-hidden="true">
                  {done ? "done" : inWindow ? "available" : timeWindow}
                </span>
                {streak > 0 && (
                  <span className="rt-pill-streak" title={`${streak}-day streak`} aria-label={`${streak}-day streak`}>
                    {streakGlyph(streak)} {streak}
                  </span>
                )}
                {nudge && (
                  <span className="rt-pill-dot" aria-hidden="true" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {openModal === "morning" && (
        <MorningRitual onClose={() => handleClose("morning")} />
      )}
      {openModal === "evening" && (
        <EveningRitual onClose={() => handleClose("evening")} />
      )}
    </>
  );
}
