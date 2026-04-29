"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./avatar.module.css";

interface NamingSheetProps {
  /** Current name — pre-fills the input when re-editing. */
  currentName: string | null;
  onSave: (name: string) => Promise<void>;
  onSkip: () => void;
}

/**
 * Bottom-sheet that asks PG to name their soul-being.
 * Matches the Ghibli aesthetic: serif headline, warm gold CTA, literary tone.
 * Esc / backdrop click = skip (no write). "Skip for now" also skips and sets
 * the localStorage flag so the auto-prompt doesn't fire again this session.
 */
export function NamingSheet({ currentName, onSave, onSkip }: NamingSheetProps) {
  const [draft, setDraft] = useState(currentName ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on mount
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 80);
    return () => clearTimeout(t);
  }, []);

  // Esc → skip
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onSkip();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onSkip]);

  // Trap focus inside the sheet
  useEffect(() => {
    const el = document.getElementById("av-naming-sheet");
    if (!el) return;
    const focusable = Array.from(
      el.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      ),
    );
    function trap(e: KeyboardEvent) {
      if (e.key !== "Tab" || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    el.addEventListener("keydown", trap);
    return () => el.removeEventListener("keydown", trap);
  }, []);

  async function handleSave() {
    const trimmed = draft.trim();
    if (!trimmed) {
      setError("Give it a name — even one syllable.");
      return;
    }
    if (trimmed.length > 32) {
      setError("Too long — 32 characters max.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await onSave(trimmed);
    } finally {
      setSaving(false);
    }
  }

  function handleSkip() {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("pgos-soul-naming-skipped", "1");
      } catch (_) {}
    }
    onSkip();
  }

  return (
    <div
      className={styles.sheetBackdrop}
      role="dialog"
      aria-modal="true"
      aria-label="Name your soul-being"
      onClick={handleSkip}
    >
      <div
        id="av-naming-sheet"
        className={`${styles.sheet} ${styles.avNamingSheet}`}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className={styles.avNamingHeadline}>Name your soul-being</h2>
        <p className={styles.avNamingSubhead}>
          This is the part of you that learns. It listens.{" "}
          <em>Eventually it speaks.</em>
        </p>

        <div className={styles.avNamingInputWrap}>
          <input
            ref={inputRef}
            className={styles.avNamingInput}
            type="text"
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              if (error) setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
            }}
            placeholder="Sora, Howl, Calcifer, Sophie..."
            maxLength={32}
            aria-label="Soul-being name"
            aria-describedby={error ? "av-naming-error" : undefined}
            aria-invalid={!!error}
            disabled={saving}
          />
          {error && (
            <p id="av-naming-error" className={styles.avNamingError} role="alert">
              {error}
            </p>
          )}
        </div>

        <div className={styles.avNamingActions}>
          <button
            type="button"
            className={styles.avNamingSave}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            className={styles.avNamingSkip}
            onClick={handleSkip}
            disabled={saving}
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
}
