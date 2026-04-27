"use client";
import { useState } from "react";

// AUTO / MANUAL pill that flips a trust category's auto_execute flag.
// Designed to drop next to each row in the existing trust card. Self-contained
// so ClaudeView / ClaudeTrust can `import { TrustToggle } from "@/app/_components/Claude/TrustToggle"`
// without any other rewiring.

export type TrustToggleProps = {
  category: string;
  autoExecute: boolean;
  approvals: number;
  threshold: number;
  /** Called after the server confirms the new state. */
  onToggle?: (next: boolean) => void;
};

export function TrustToggle({
  category,
  autoExecute,
  approvals,
  threshold,
  onToggle,
}: TrustToggleProps) {
  const [optimistic, setOptimistic] = useState<boolean>(autoExecute);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ready = !optimistic && approvals >= threshold;

  async function flip() {
    if (busy) return;
    const next = !optimistic;
    setBusy(true);
    setError(null);
    setOptimistic(next);
    try {
      const res = await fetch("/api/claude/trust/toggle", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ category, auto_execute: next }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Toggle failed (${res.status})`);
      }
      onToggle?.(next);
    } catch (e) {
      // Roll back optimistic state on failure.
      setOptimistic(!next);
      setError(e instanceof Error ? e.message : "Toggle failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="cl-trust-toggle-wrap">
      <button
        type="button"
        className={`cl-trust-toggle${optimistic ? " on" : " off"}${busy ? " busy" : ""}`}
        onClick={flip}
        disabled={busy}
        aria-pressed={optimistic}
        aria-label={`${optimistic ? "Disable" : "Enable"} autonomy for ${category}`}
        title={
          optimistic
            ? "Auto-executing approved proposals every 30 min"
            : "Manual mode — PG approves each proposal"
        }
      >
        {optimistic ? "AUTO" : "MANUAL"}
      </button>
      {ready && (
        <span className="cl-trust-ready" title="approvals at threshold — ready for autonomy">
          ready
        </span>
      )}
      {error && <span className="cl-trust-toggle-err">{error}</span>}
    </span>
  );
}
