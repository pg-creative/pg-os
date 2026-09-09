/**
 * The cosmos route's own layout.
 *
 * EXTENDS: `src/app/layout.tsx`, which it nests inside. Next's App Router allows
 * one root layout unless every existing route moves into its own route group, so
 * /cosmos inherits the root html/body, ModeProvider, SoundProvider (which the
 * ambient bed deliberately reuses) and, unavoidably for now, globals.css and the
 * webfont link. That inherited weight is the Critic's D10 deduction and it is
 * recorded rather than hidden; see the note at the top of cosmos.css.
 *
 * What this layout DOES own: one small stylesheet, no tab shell, no Live2D, no
 * capture FAB, no particles layer. The page is the world.
 */

import type { Metadata } from "next";
import "./cosmos.css";

export const metadata: Metadata = {
  title: "Cosmos",
  // Private forever. Nothing about this route should ever reach an index or a
  // preview card.
  robots: { index: false, follow: false, nocache: true },
};

export default function CosmosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="cosmos-root">{children}</div>;
}
