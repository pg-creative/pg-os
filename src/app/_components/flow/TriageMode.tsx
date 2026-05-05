"use client";

/**
 * TriageMode — full-screen walk-through of the approval queue.
 *
 * Loads /api/queue and presents items one at a time via DecideDialog.
 * Resolving an item auto-advances. Skip leaves it for later. Counter
 * tracks "N of M" and the final state shows a summary.
 */

import { useCallback, useEffect, useState } from "react";
import { DecideDialog, QueueItem } from "./DecideDialog";

interface TriageModeProps {
  initialItems: QueueItem[];
  onClose: () => void;
  /** Called whenever an item is resolved so parent FlowView can refresh. */
  onResolved?: (id: string, decision: string) => void;
}

export function TriageMode({ initialItems, onClose, onResolved }: TriageModeProps) {
  const [items, setItems] = useState<QueueItem[]>(initialItems);
  const [cursor, setCursor] = useState(0);
  const [resolved, setResolved] = useState(0);
  const [skipped, setSkipped] = useState(0);

  // Keep cursor in bounds when items list shrinks.
  useEffect(() => {
    if (cursor >= items.length && items.length > 0) {
      setCursor(items.length - 1);
    }
  }, [cursor, items.length]);

  const handleResolved = useCallback((id: string, decision: string) => {
    onResolved?.(id, decision);
    setItems((prev) => prev.filter((i) => i.id !== id));
    setResolved((n) => n + 1);
    // Cursor stays the same — next item shifts into the same slot.
  }, [onResolved]);

  const handleNext = useCallback(() => {
    setCursor((c) => Math.min(c + 1, items.length - 1));
    setSkipped((n) => n + 1);
  }, [items.length]);

  const handlePrev = useCallback(() => {
    setCursor((c) => Math.max(c - 1, 0));
    if (skipped > 0) setSkipped((n) => n - 1);
  }, [skipped]);

  if (items.length === 0) {
    return (
      <div className="decide-backdrop">
        <div className="decide-panel decide-panel-summary" tabIndex={-1}>
          <h2 className="decide-title">Queue clear.</h2>
          <p className="decide-summary-line">
            Resolved <strong>{resolved}</strong> · skipped <strong>{skipped}</strong>.
          </p>
          <div className="decide-actions">
            <button
              type="button"
              className="decide-btn decide-btn-approve"
              onClick={onClose}
            >
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  const current = items[cursor];
  if (!current) {
    // Defensive — fall back to summary state
    return (
      <div className="decide-backdrop">
        <div className="decide-panel decide-panel-summary" tabIndex={-1}>
          <h2 className="decide-title">No more items.</h2>
          <button
            type="button"
            className="decide-btn decide-btn-approve"
            onClick={onClose}
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <DecideDialog
      key={current.id}
      item={current}
      progress={`${cursor + 1} / ${items.length} · resolved ${resolved}`}
      onResolved={handleResolved}
      onNext={cursor < items.length - 1 ? handleNext : undefined}
      onPrev={cursor > 0 ? handlePrev : undefined}
      onClose={onClose}
    />
  );
}
