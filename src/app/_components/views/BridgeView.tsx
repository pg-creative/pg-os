"use client";
import { CrewRail } from "../bridge/CrewRail";
import { CommsFeed } from "../bridge/CommsFeed";
import { StatusRail } from "../bridge/StatusRail";

/**
 * BridgeView — Cortana-style command center.
 * 3-col layout: Crew (left) | Comms (center) | Status (right).
 */

export function BridgeView() {
  return (
    <div className="bridge">
      <CrewRail />
      <CommsFeed />
      <StatusRail />
    </div>
  );
}
