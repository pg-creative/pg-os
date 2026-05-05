"use client";
import { useBridgeMode } from "../BridgeModeProvider";
import { BridgeView } from "./BridgeView";
import { PersonalView } from "./PersonalView";

export function HomeView() {
  const { mode } = useBridgeMode();
  return mode === "bridge" ? <BridgeView /> : <PersonalView />;
}
