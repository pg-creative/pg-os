"use client";
import { useBridgeMode } from "../BridgeModeProvider";
import { BridgeView } from "./BridgeView";
import { BentoHome } from "./home/BentoHome";

// Default Home is the Emaki x Laputa bento grid (cohesive with every other tab,
// rendered inside the shared global top bar). Bridge stays reachable via cmd-/.
export function HomeView() {
  const { mode } = useBridgeMode();
  return mode === "bridge" ? <BridgeView /> : <BentoHome />;
}
