"use client";
// Track C: Brand Mode Picker
// Top-bar pill. Click = cycle forward. ⌘⇧M = forward, ⌘⇧⌥M = back. ESC = clear.

import { useEffect, useCallback } from "react";
import { useMode } from "./ModeProvider";
import { MODE_CONFIG } from "../../lib/modes";

export function BrandModePicker() {
  const { brand, cycleBrandForward, cycleBrandBack, setBrand } = useMode();

  const cfg = brand ? MODE_CONFIG[brand] : null;

  // Keyboard: ⌘⇧M = forward, ⌘⇧⌥M = back
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "M" && e.metaKey && e.shiftKey && e.altKey) {
        e.preventDefault();
        cycleBrandBack();
        return;
      }
      if (e.key === "M" && e.metaKey && e.shiftKey) {
        e.preventDefault();
        cycleBrandForward();
        return;
      }
    },
    [cycleBrandForward, cycleBrandBack]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // ESC when pill is focused clears the mode
  const handlePillKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setBrand(null);
      }
    },
    [setBrand]
  );

  return (
    <button
      className={`cm-brand-picker${brand ? " cm-active" : ""}`}
      onClick={cycleBrandForward}
      onKeyDown={handlePillKeyDown}
      aria-label={
        brand
          ? `Brand mode: ${cfg!.label} — click to cycle, ESC to clear`
          : "No brand mode — click to activate"
      }
      title="⌘⇧M to cycle · ESC to clear"
      style={brand ? { "--cm-pill-accent": cfg!.accent } as React.CSSProperties : undefined}
    >
      <span className="cm-glyph" aria-hidden>
        {cfg ? cfg.glyph : "○"}
      </span>
      <span className="cm-label">
        {cfg ? cfg.label.toUpperCase() : "ALL"}
      </span>
    </button>
  );
}
