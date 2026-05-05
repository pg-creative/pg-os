"use client";

/**
 * DecideDialog — modal for resolving a single queue item.
 *
 * Replaces the old window.alert() handler that was the reason the queue
 * grew to 57 items. Shows full context (title + source + age + note +
 * options) and writes a real decision via DELETE /api/queue?id=…&decision=…
 *
 * Decisions taxonomy (matches queueStore TERMINAL_DECISIONS):
 *   - approved   — yes, do the thing
 *   - deferred   — not now, but keep it on the list (still removed from queue)
 *   - rejected   — no, don't do it
 *   - dismissed  — used by the legacy DISMISS button (close without action)
 *
 * Keyboard: 1–9 pick an option, Enter on focused option, Esc cancel.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type QueueItem = {
  id: string;
  title: string;
  source?: string;
  options?: string[];
  created_at: number;
  updated_at: number;
  note?: string;
};

export type DecideAction = "approved" | "deferred" | "rejected" | "dismissed";

interface DecideDialogProps {
  item: QueueItem;
  onResolved: (id: string, decision: string) => void;
  onClose: () => void;
  /** Optional progress string for triage mode, e.g. "12 / 57" */
  progress?: string;
  /** Optional next/prev navigation for triage mode */
  onNext?: () => void;
  onPrev?: () => void;
}

function daysWaiting(createdAt: number): number {
  return Math.floor((Date.now() - createdAt) / 86_400_000);
}

function ageTier(days: number): { label: string; cls: string } {
  if (days >= 14) return { label: `${days}d · stale`, cls: "decide-age-stale" };
  if (days >= 7)  return { label: `${days}d`,         cls: "decide-age-aged" };
  return { label: `${days}d`, cls: "decide-age-fresh" };
}

export function DecideDialog({
  item,
  onResolved,
  onClose,
  progress,
  onNext,
  onPrev,
}: DecideDialogProps) {
  const [acting, setActing] = useState(false);
  const [freeform, setFreeform] = useState("");
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const submit = useCallback(async (decision: string) => {
    if (acting) return;
    setActing(true);
    setError(null);
    try {
      const res = await fetch(`/api/queue?id=${encodeURIComponent(item.id)}&decision=${encodeURIComponent(decision)}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      onResolved(item.id, decision);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Resolve failed");
      setActing(false);
    }
  }, [acting, item.id, onResolved]);

  // Keyboard handlers — number keys pick options, letters trigger actions.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (acting) return;
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      // Skip/triage navigation
      if ((e.key === "j" || e.key === "ArrowDown") && onNext) {
        e.preventDefault();
        onNext();
        return;
      }
      if ((e.key === "k" || e.key === "ArrowUp") && onPrev) {
        e.preventDefault();
        onPrev();
        return;
      }
      // Number keys → pick option N
      if (item.options && /^[1-9]$/.test(e.key)) {
        const idx = parseInt(e.key, 10) - 1;
        if (idx < item.options.length) {
          e.preventDefault();
          submit(item.options[idx]);
          return;
        }
      }
      // Letter shortcuts (only when not typing in textarea/input)
      const target = e.target as HTMLElement | null;
      if (target?.tagName === "TEXTAREA" || target?.tagName === "INPUT") return;
      if (e.key === "a" || e.key === "A") { e.preventDefault(); submit("approved"); return; }
      if (e.key === "d" || e.key === "D") { e.preventDefault(); submit("deferred"); return; }
      if (e.key === "x" || e.key === "X") { e.preventDefault(); submit("rejected"); return; }
      if (e.key === "s" || e.key === "S") { e.preventDefault(); onClose(); return; }
    };
    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [acting, item.options, submit, onClose, onNext, onPrev]);

  // Focus dialog on mount for screen readers + ESC handling.
  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  const days = daysWaiting(item.created_at);
  const age = ageTier(days);

  // Portal to <body> so the dialog escapes any ancestor with backdrop-filter
  // / transform / filter, which would otherwise become the containing block
  // for our position:fixed backdrop and clip it to the parent card.
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="decide-backdrop"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="decide-title"
    >
      <div ref={dialogRef} className="decide-panel" tabIndex={-1}>
        <header className="decide-head">
          <div className="decide-tags">
            {item.source && <span className="decide-tag">{item.source.toUpperCase()}</span>}
            <span className={`decide-tag ${age.cls}`}>{age.label}</span>
          </div>
          {progress && <span className="decide-progress">{progress}</span>}
          <button type="button" className="decide-close" onClick={onClose} aria-label="Close">✕</button>
        </header>

        <h2 id="decide-title" className="decide-title">{item.title}</h2>

        {item.note && (
          <pre className="decide-note">{item.note}</pre>
        )}

        {item.options && item.options.length > 0 && (
          <div className="decide-options">
            <div className="decide-options-label">PICK ONE</div>
            {item.options.map((opt, i) => (
              <button
                key={i}
                type="button"
                className="decide-option"
                onClick={() => submit(opt)}
                disabled={acting}
              >
                <span className="decide-option-num">{i + 1}</span>
                <span className="decide-option-text">{opt}</span>
              </button>
            ))}
          </div>
        )}

        <div className="decide-actions">
          <button
            type="button"
            className="decide-btn decide-btn-approve"
            onClick={() => submit(freeform.trim() || "approved")}
            disabled={acting}
            title="A — Approve / record custom decision"
          >
            {acting ? "…" : freeform.trim() ? `Decide → ${freeform.trim().slice(0, 30)}` : "Approve"}
            <kbd>A</kbd>
          </button>
          <button
            type="button"
            className="decide-btn decide-btn-defer"
            onClick={() => submit("deferred")}
            disabled={acting}
            title="D — Defer (snooze, remove from active queue)"
          >
            Defer<kbd>D</kbd>
          </button>
          <button
            type="button"
            className="decide-btn decide-btn-reject"
            onClick={() => submit("rejected")}
            disabled={acting}
            title="X — Reject"
          >
            Reject<kbd>X</kbd>
          </button>
          <button
            type="button"
            className="decide-btn decide-btn-skip"
            onClick={onClose}
            disabled={acting}
            title="S or Esc — Skip without acting"
          >
            Skip<kbd>S</kbd>
          </button>
        </div>

        <textarea
          className="decide-freeform"
          placeholder="Custom decision (optional) — pressing Approve will record this text instead of 'approved'."
          value={freeform}
          onChange={(e) => setFreeform(e.target.value)}
          rows={2}
          disabled={acting}
        />

        {error && <div className="decide-error">{error}</div>}

        <footer className="decide-foot">
          <span>Keyboard: 1–{item.options?.length ?? 0} pick · A approve · D defer · X reject · S skip{onNext ? " · J next · K prev" : ""} · Esc close</span>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
