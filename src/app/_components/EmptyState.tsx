"use client";

import { useCallback, type KeyboardEvent } from "react";

interface EmptyStateCTA {
  label: string;
  onClick: () => void;
  href?: string;
}

interface EmptyStateProps {
  /** The action that fixes the empty state — used as the heading verb. */
  verb: string;
  /**
   * Second-person sentence with exactly one accent word wrapped in <em>…</em>.
   * Example: "Claude hasn't seen <em>enough</em> sessions to model your trust map."
   */
  explanation: string;
  cta?: EmptyStateCTA;
  /** Optional unicode glyph (○ ◐ ● ★, etc.). */
  glyph?: string;
  /** Compact variant for inline / sidebar usage. */
  variant?: "default" | "small";
}

export function EmptyState({ verb, explanation, cta, glyph, variant = "default" }: EmptyStateProps) {
  const onKey = useCallback(
    (e: KeyboardEvent<HTMLButtonElement>) => {
      if (!cta) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        cta.onClick();
      }
    },
    [cta],
  );

  return (
    <div className={`empty-state empty-state-${variant}`} role="status" aria-live="polite">
      {glyph && <span className="empty-state-glyph" aria-hidden>{glyph}</span>}
      <h3 className="empty-state-verb">{verb}</h3>
      <p
        className="empty-state-explanation"
        dangerouslySetInnerHTML={{ __html: explanation }}
      />
      {cta && (
        <button
          type="button"
          className="empty-state-cta"
          onClick={cta.onClick}
          onKeyDown={onKey}
        >
          {cta.label}
        </button>
      )}
    </div>
  );
}
