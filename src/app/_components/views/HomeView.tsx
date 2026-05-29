"use client";
import { useBridgeMode } from "../BridgeModeProvider";
import { BridgeView } from "./BridgeView";
import TopBarHome from "./home/TopBarHome";

// Foundation = the rich top-bar broadsheet (hero clock + prominent sky + the
// OPERATOR/CALENDAR/PROJECTS/CREW bands). This is the v1 base PG picked; the
// sparse BentoHome was a v0 misread (kept in tree for the good bits to pull in).
// Bridge stays reachable via cmd-/.
export function HomeView() {
  const { mode } = useBridgeMode();
  return mode === "bridge" ? <BridgeView /> : <TopBarHome />;
}
