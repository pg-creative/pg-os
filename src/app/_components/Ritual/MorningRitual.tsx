"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  getRitualState,
  getYesterdayEveningPayload,
  recordRitual,
  type MorningPayload,
} from "@/lib/rituals";

interface MorningRitualProps {
  onClose: () => void;
}

interface WhoopData {
  recovery?: number | null;
  loading: boolean;
  error: boolean;
}

export function MorningRitual({ onClose }: MorningRitualProps) {
  // Yesterday's commitment thread
  const yesterday = getYesterdayEveningPayload();
  const commitment = yesterday?.tomorrowsOne?.trim() ?? null;

  const [step, setStep] = useState<"commitment" | "main">(commitment ? "commitment" : "main");

  // Commitment step state
  const [commitmentDone, setCommitmentDone] = useState<boolean | null>(null);

  // Main checkboxes
  const [morningPages, setMorningPages] = useState(false);
  const [stretchSunlight, setStretchSunlight] = useState(false);
  const [whoopCheckin, setWhoopCheckin] = useState(false);

  // Day shape — 3 bullets
  const [dayShape, setDayShape] = useState<[string, string, string]>(["", "", ""]);

  // Whoop live data
  const [whoop, setWhoop] = useState<WhoopData>({ loading: true, error: false });

  // Focus trap
  const sheetRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  // Fetch Whoop recovery score
  useEffect(() => {
    let cancelled = false;
    async function fetchWhoop() {
      try {
        const res = await fetch("/api/vitals/whoop");
        if (cancelled) return;
        if (!res.ok) {
          setWhoop({ loading: false, error: true, recovery: null });
          return;
        }
        const json = await res.json();
        setWhoop({
          loading: false,
          error: false,
          recovery: json?.recovery?.score ?? json?.recovery ?? null,
        });
      } catch {
        if (!cancelled) setWhoop({ loading: false, error: true, recovery: null });
      }
    }
    fetchWhoop();
    return () => { cancelled = true; };
  }, []);

  // Focus management
  useEffect(() => {
    returnFocusRef.current = document.activeElement as HTMLElement;
    const firstFocusable = sheetRef.current?.querySelector<HTMLElement>(
      'button:not([disabled]), input, textarea, [tabindex]:not([tabindex="-1"])'
    );
    firstFocusable?.focus();
    return () => {
      returnFocusRef.current?.focus?.();
    };
  }, []);

  // Focus trap + ESC
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const root = sheetRef.current;
      if (!root) return;
      const focusables = root.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleComplete = useCallback(() => {
    const payload: MorningPayload = {
      morningPages,
      stretchSunlight,
      whoopCheckin,
      dayShape,
      yesterdayOneDone: commitment ? commitmentDone : null,
    };
    recordRitual("morning", payload);
    onClose();
  }, [morningPages, stretchSunlight, whoopCheckin, dayShape, commitment, commitmentDone, onClose]);

  const updateDayShape = (idx: number, val: string) => {
    setDayShape((prev) => {
      const next = [...prev] as [string, string, string];
      next[idx] = val;
      return next;
    });
  };

  const recoveryDisplay = whoop.loading
    ? "loading…"
    : whoop.error
    ? null
    : whoop.recovery != null
    ? `${whoop.recovery}%`
    : null;

  return (
    <div className="rt-backdrop" onClick={onClose} role="dialog" aria-modal aria-label="Morning ritual">
      <div
        className="rt-sheet"
        ref={sheetRef}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="morning-ritual-title"
      >
        <div className="rt-header">
          <span className="rt-eyebrow">MORNING RITUAL</span>
          <button className="rt-close" onClick={onClose} aria-label="Close ritual">✕</button>
        </div>

        {step === "commitment" && commitment && (
          <div className="rt-commitment-step">
            <p className="rt-prompt" id="morning-ritual-title">
              Yesterday you committed to:
            </p>
            <blockquote className="rt-commitment-quote">{commitment}</blockquote>
            <p className="rt-prompt-sub">Did it happen?</p>
            <div className="rt-commitment-btns">
              <button
                className={`rt-commit-btn yes${commitmentDone === true ? " active" : ""}`}
                onClick={() => setCommitmentDone(true)}
                aria-pressed={commitmentDone === true}
              >
                Yes
              </button>
              <button
                className={`rt-commit-btn no${commitmentDone === false ? " active" : ""}`}
                onClick={() => setCommitmentDone(false)}
                aria-pressed={commitmentDone === false}
              >
                Not quite
              </button>
            </div>
            <button
              className="rt-step-next"
              onClick={() => setStep("main")}
            >
              Continue →
            </button>
          </div>
        )}

        {step === "main" && (
          <>
            <h2 className="rt-title" id="morning-ritual-title">
              Begin the day.
            </h2>

            <ul className="rt-checklist" role="list">
              <li className="rt-check-item">
                <button
                  className={`rt-checkbox${morningPages ? " checked" : ""}`}
                  onClick={() => setMorningPages((v) => !v)}
                  aria-label={morningPages ? "Uncheck morning pages" : "Check morning pages"}
                  role="checkbox"
                  aria-checked={morningPages}
                />
                <span className="rt-check-label">Morning pages / writing</span>
              </li>

              <li className="rt-check-item">
                <button
                  className={`rt-checkbox${stretchSunlight ? " checked" : ""}`}
                  onClick={() => setStretchSunlight((v) => !v)}
                  aria-label={stretchSunlight ? "Uncheck stretch + sunlight" : "Check stretch + sunlight"}
                  role="checkbox"
                  aria-checked={stretchSunlight}
                />
                <span className="rt-check-label">Stretch + sunlight</span>
              </li>

              <li className="rt-check-item">
                <button
                  className={`rt-checkbox${whoopCheckin ? " checked" : ""}`}
                  onClick={() => setWhoopCheckin((v) => !v)}
                  aria-label={whoopCheckin ? "Uncheck Whoop check-in" : "Check Whoop check-in"}
                  role="checkbox"
                  aria-checked={whoopCheckin}
                />
                <span className="rt-check-label">
                  Whoop check-in
                  {recoveryDisplay && (
                    <span className="rt-whoop-score">{recoveryDisplay} recovery</span>
                  )}
                </span>
              </li>
            </ul>

            <div className="rt-day-shape">
              <p className="rt-prompt-sub">Today&apos;s shape <span className="rt-optional">(optional)</span></p>
              {([0, 1, 2] as const).map((i) => (
                <input
                  key={i}
                  className="rt-shape-input"
                  type="text"
                  placeholder={`— ${i === 0 ? "most important" : i === 1 ? "second" : "third"}`}
                  value={dayShape[i]}
                  onChange={(e) => updateDayShape(i, e.target.value)}
                  aria-label={`Day shape ${i + 1}`}
                />
              ))}
            </div>

            <button className="rt-cta" onClick={handleComplete}>
              Begin →
            </button>
          </>
        )}
      </div>
    </div>
  );
}
