"use client";

/**
 * BentoGrid — the shared 12-column modular grid every tab lays its modules on.
 * Fixed gutters + predictable rhythm = cohesion. Tiles place themselves via the
 * `cols`/`rows` props on BentoBox. Restacks to 6-col on tablet, 1-col on mobile.
 */

import type { CSSProperties, ReactNode } from "react";

export function BentoGrid({
  children,
  style,
  maxWidth = 1320,
}: {
  children: ReactNode;
  style?: CSSProperties;
  maxWidth?: number;
}) {
  return (
    <div
      className="bento-grid"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(12, 1fr)",
        gap: 16,
        width: "100%",
        maxWidth,
        margin: "0 auto",
        ...style,
      }}
    >
      {children}
      {/* Responsive collapse: keep the grid cohesive on smaller viewports.
          Below 680px every tile spans the full row (grid-column 1 / -1) so any
          cols={3,4,6,8,12} prop stacks cleanly — no more "span 4 on a 2-col grid"
          oddness. Phones (<=480) get tighter gap. */}
      <style>{`
        @media (max-width: 1100px) {
          .bento-grid { grid-template-columns: repeat(6, 1fr) !important; }
        }
        @media (max-width: 680px) {
          .bento-grid {
            grid-template-columns: 1fr !important;
            gap: 12px !important;
          }
          .bento-grid > * {
            grid-column: 1 / -1 !important;
          }
        }
        @media (max-width: 480px) {
          .bento-grid { gap: 10px !important; }
        }
      `}</style>
    </div>
  );
}
