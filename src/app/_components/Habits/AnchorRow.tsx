"use client";
import { HabitCard, HabitCardResult } from "./HabitCard";
import type { Habit } from "./types";

/**
 * Daily anchors row. The 4 daily-frequency habits (no weekly_target) get
 * a glowing border treatment to signal "non-negotiable, every day".
 */
export function AnchorRow({
  habits,
  onComplete,
}: {
  habits: Habit[];
  onComplete: (habit: Habit, actualValue: number | null) => Promise<HabitCardResult | void>;
}) {
  if (habits.length === 0) return null;
  return (
    <section className="ht-anchor-row" aria-label="Daily anchors">
      <div className="ht-section-head">
        <span className="ht-section-label">DAILY · ANCHORS</span>
        <span className="ht-section-meta">{habits.length} non-negotiable</span>
      </div>
      <div className="ht-anchor-grid">
        {habits.map((h) => (
          <HabitCard key={h.id} habit={h} anchor onComplete={onComplete} />
        ))}
      </div>
    </section>
  );
}
