"use client";
import { HabitCard, HabitCardResult } from "./HabitCard";
import type { Habit } from "./types";

/**
 * Weekly habits — render with a small dot row showing weekly progress
 * (one dot per weekly_target slot, filled = completed in this ISO week).
 */
export function WeeklyGrid({
  habits,
  onComplete,
}: {
  habits: Habit[];
  onComplete: (habit: Habit, actualValue: number | null) => Promise<HabitCardResult | void>;
}) {
  if (habits.length === 0) return null;
  return (
    <section className="ht-weekly" aria-label="Weekly habits">
      <div className="ht-section-head">
        <span className="ht-section-label">THIS WEEK</span>
        <span className="ht-section-meta">{habits.length} habits</span>
      </div>
      <div className="ht-weekly-grid">
        {habits.map((h) => (
          <div key={h.id} className="ht-weekly-cell">
            <HabitCard habit={h} onComplete={onComplete} />
            <WeeklyDots
              target={h.weekly_target ?? 1}
              done={h.weekly_completions ?? 0}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

function WeeklyDots({ target, done }: { target: number; done: number }) {
  const slots = Array.from({ length: target }, (_, i) => i < done);
  return (
    <div className="ht-weekly-dots" aria-label={`${done} of ${target} this week`}>
      {slots.map((filled, i) => (
        <span key={i} className={`ht-weekly-dot${filled ? " filled" : ""}`} aria-hidden="true" />
      ))}
      <span className="ht-weekly-dots-text">
        {done}/{target}
      </span>
    </div>
  );
}
