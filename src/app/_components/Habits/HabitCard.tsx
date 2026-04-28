"use client";
import { useState, useRef, useId } from "react";
import { CardGlyph } from "../CardGlyph";
import { BonusXPBurst, XPBurst } from "./BonusXPBurst";
import type { Habit } from "./types";

export interface HabitCardResult {
  ok: boolean;
  earnedXP: number;
  bonus: boolean;
}

interface Props {
  habit: Habit;
  /** When true, this is shown in the daily anchor row (slightly different chrome). */
  anchor?: boolean;
  /**
   * Submit a completion. Server inserts/updates a habit_completions row.
   * Returns the earned XP so the card can pop a +XP burst.
   */
  onComplete: (habit: Habit, actualValue: number | null) => Promise<HabitCardResult | void>;
}

const burstSeed = { v: 0 };

/**
 * Single habit. Renders the attribute glyph + name + target chip, a primary
 * tap-to-complete button, and (for quantified habits) an inline numeric input.
 * On a successful completion, a +XP burst floats up. Bonus completions get a
 * golden overflow ring.
 */
export function HabitCard({ habit, anchor, onComplete }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [bursts, setBursts] = useState<XPBurst[]>([]);
  const [bonusRing, setBonusRing] = useState(false);
  const [actualVal, setActualVal] = useState<string>(
    habit.actual_value != null ? String(habit.actual_value) : "",
  );
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);

  const isQuantified = !!habit.target_value && habit.target_value > 0;
  const targetLabel = isQuantified
    ? `${habit.target_value}${habit.target_unit ? " " + habit.target_unit : ""}`
    : null;

  const done = habit.completed;
  const overTarget =
    isQuantified &&
    habit.actual_value != null &&
    habit.target_value != null &&
    habit.actual_value > habit.target_value;

  async function handleComplete() {
    if (submitting) return;
    setSubmitting(true);
    let parsed: number | null = null;
    if (isQuantified) {
      const n = parseFloat(actualVal);
      parsed = Number.isFinite(n) ? n : (habit.target_value ?? null);
    }
    try {
      const res = await onComplete(habit, parsed);
      if (res && res.ok) {
        burstSeed.v += 1;
        setBursts((prev) => [...prev, { id: burstSeed.v, xp: res.earnedXP, bonus: res.bonus }]);
        if (res.bonus) {
          setBonusRing(true);
          setTimeout(() => setBonusRing(false), 1800);
        }
      }
    } finally {
      setSubmitting(false);
    }
  }

  const dropBurst = (id: number) =>
    setBursts((prev) => prev.filter((b) => b.id !== id));

  return (
    <div
      className={[
        "ht-card",
        anchor ? "ht-anchor" : "",
        done ? "done" : "",
        overTarget || bonusRing ? "bonus-ring" : "",
      ].filter(Boolean).join(" ")}
    >
      <div className="ht-card-head">
        <span className="ht-card-glyph" aria-hidden="true">
          <CardGlyph name="sparkles" />
        </span>
        <div className="ht-card-title">
          <div className="ht-card-name">{habit.name}</div>
          {targetLabel ? (
            <div className="ht-card-target">{targetLabel}</div>
          ) : (
            <div className="ht-card-target ht-card-target-binary">complete</div>
          )}
        </div>
        <span className="ht-card-xp">+{habit.xp_per_completion}</span>
      </div>

      {isQuantified && (
        <label htmlFor={inputId} className="ht-card-input-row">
          <span className="ht-card-input-label">amount</span>
          <input
            id={inputId}
            ref={inputRef}
            className="ht-card-input"
            type="number"
            inputMode="decimal"
            min={0}
            step={1}
            placeholder={String(habit.target_value)}
            value={actualVal}
            onChange={(e) => setActualVal(e.target.value)}
            disabled={submitting}
          />
          <span className="ht-card-input-unit">{habit.target_unit ?? ""}</span>
        </label>
      )}

      <button
        type="button"
        className={`ht-card-btn${done ? " done" : ""}`}
        onClick={handleComplete}
        disabled={submitting}
        aria-label={done ? `${habit.name} — log another` : `Complete ${habit.name}`}
      >
        {submitting
          ? "…"
          : done
            ? isQuantified ? "Log again" : "Done"
            : isQuantified ? "Log" : "Mark done"}
      </button>

      <span className="ht-card-burst-anchor" aria-hidden="true">
        {bursts.map((b) => (
          <BonusXPBurst key={b.id} burst={b} onDone={dropBurst} />
        ))}
      </span>
    </div>
  );
}
