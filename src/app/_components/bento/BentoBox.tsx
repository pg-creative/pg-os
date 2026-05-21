"use client";

/**
 * BentoBox — THE cohesion primitive. One module tile, built on the Emaki
 * WashiPanel, with a consistent header (eyebrow + optional kanji + count) and a
 * span on the 12-col BentoGrid. Every module on every tab is a BentoBox, so
 * fonts, spacing, elevation, and the gilded edge are identical app-wide.
 */

import type { CSSProperties, ReactNode } from "react";
import { WashiPanel } from "../emaki/materials";
import { useEmaki } from "./emakiContext";

export interface BentoBoxProps {
  /** Columns to span on the 12-col grid (default 4). */
  cols?: number;
  /** Rows to span (default 1). */
  rows?: number;
  /** Mono eyebrow label, e.g. "01 // VITALS". */
  eyebrow?: string;
  /** Optional kanji glyph shown faint at the right of the header. */
  kanji?: string;
  /** Optional count/metric shown at the right of the header. */
  count?: ReactNode;
  /** Scroll the body instead of growing the tile. */
  scroll?: boolean;
  onClick?: () => void;
  style?: CSSProperties;
  children: ReactNode;
}

export function BentoBox({
  cols = 4,
  rows = 1,
  eyebrow,
  kanji,
  count,
  scroll,
  onClick,
  style,
  children,
}: BentoBoxProps) {
  const { tk } = useEmaki();

  return (
    <div
      onClick={onClick}
      style={{
        gridColumn: `span ${cols}`,
        gridRow: rows > 1 ? `span ${rows}` : undefined,
        display: "flex",
        cursor: onClick ? "pointer" : undefined,
        minHeight: 96,
      }}
    >
      <WashiPanel
        tk={tk}
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          gap: 10,
          padding: "16px 18px",
          width: "100%",
          overflow: "hidden",
          ...style,
        }}
      >
        {(eyebrow || count != null || kanji) && (
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 8,
              flexShrink: 0,
            }}
          >
            {eyebrow && (
              <span
                style={{
                  fontFamily: "var(--mono), ui-monospace, monospace",
                  fontSize: "var(--text-xs)",
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color: tk.gold,
                  fontWeight: 700,
                }}
              >
                {eyebrow}
              </span>
            )}
            <span style={{ flex: 1 }} />
            {count != null && (
              <span
                style={{
                  fontFamily: "var(--mono), ui-monospace, monospace",
                  fontSize: "var(--text-2xs)",
                  color: tk.textMuted,
                }}
              >
                {count}
              </span>
            )}
            {kanji && (
              <span
                aria-hidden
                style={{
                  fontSize: "var(--text-sm)",
                  color: tk.gold,
                  opacity: 0.5,
                }}
              >
                {kanji}
              </span>
            )}
          </div>
        )}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: scroll ? "auto" : "visible",
            color: tk.textPrimary,
            fontSize: "var(--text-base)",
            fontWeight: 450,
            lineHeight: 1.55,
          }}
        >
          {children}
        </div>
      </WashiPanel>
    </div>
  );
}
