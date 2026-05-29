"use client";

/**
 * TabShell — the frame every tab renders inside, so all tabs share one identity.
 * Provides: the live phase (from ModeProvider), the Emaki CSS vars, a consistent
 * page header (serif title + one mono eyebrow line), and the 12-col BentoGrid the
 * tab fills with BentoBoxes. The painted sky comes from the global EmakiBackdrop.
 */

import type { ReactNode } from "react";
import { useMode } from "../ModeProvider";
import { useEmakiVars } from "../emaki/materials";
import { PHASES } from "../emaki/theme";
import { EmakiProvider, phaseForMode } from "./emakiContext";
import { BentoGrid } from "./BentoGrid";

export function TabShell({
  title,
  eyebrow,
  actions,
  children,
  maxWidth = 1320,
}: {
  title: string;
  eyebrow?: string;
  /** Optional right-aligned header actions (buttons, filters). */
  actions?: ReactNode;
  children: ReactNode;
  maxWidth?: number;
}) {
  const { mode } = useMode();
  const phase = phaseForMode(mode);
  const tk = PHASES[phase];
  useEmakiVars(phase);

  return (
    <EmakiProvider phase={phase}>
      {/* Mobile safety: keep tile internals from pushing the page wider than the
          viewport, but DO NOT use overflow-x: hidden here (the root html/body now
          uses overflow-x: clip globally; adding hidden on this descendant would
          re-create an unintended scroll container and could re-introduce the
          scroll-trap bug). max-width on children is the safe containment. */}
      <style>{`
        @media (max-width: 767px) {
          .tab-shell-root > * { max-width: 100%; }
        }
      `}</style>
      <div
        className="tab-shell-root"
        style={{ padding: "8px 0 64px", position: "relative", zIndex: 2 }}
      >
        <div
          style={{
            maxWidth,
            margin: "0 auto",
            display: "flex",
            alignItems: "flex-end",
            gap: 16,
            flexWrap: "wrap",
            marginBottom: 18,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            {eyebrow && (
              <div
                style={{
                  fontFamily: "var(--mono), ui-monospace, monospace",
                  fontSize: "var(--text-2xs)",
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color: tk.eyebrowText,
                  marginBottom: 4,
                }}
              >
                {eyebrow}
              </div>
            )}
            <h1
              style={{
                margin: 0,
                fontFamily: "var(--serif), Georgia, serif",
                fontSize: "var(--text-2xl)",
                fontWeight: 500,
                color: tk.textPrimary,
                letterSpacing: "-0.01em",
                textShadow: phase === "day" ? "none" : tk.heroHalo,
              }}
            >
              {title}
            </h1>
          </div>
          {actions && (
            <div
              style={{
                display: "flex",
                gap: 8,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              {actions}
            </div>
          )}
        </div>
        <BentoGrid maxWidth={maxWidth}>{children}</BentoGrid>
      </div>
    </EmakiProvider>
  );
}
