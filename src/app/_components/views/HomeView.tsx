"use client";
import { useBridgeMode } from "../BridgeModeProvider";
import { BridgeView } from "./BridgeView";
import TopBarHome from "./home/TopBarHome";

// Default Home is the locked Emaki x Laputa top-bar broadsheet. The older
// Bridge command center stays reachable behind the existing mode toggle (cmd-/).
export function HomeView() {
  const { mode } = useBridgeMode();
  return mode === "bridge" ? <BridgeView /> : <TopBarHome />;
}
