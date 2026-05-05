"use client";
import { CrewRail } from "../bridge/CrewRail";
import { CommsFeed } from "../bridge/CommsFeed";

/**
 * BridgeView — Cortana-style command center.
 * 3-col layout: Crew (left) | Comms (center) | Status (right).
 */

export function BridgeView() {
  return (
    <div className="bridge">
      <CrewRail />

      <CommsFeed />

      <aside className="bridge-status" aria-label="Status widgets">
        <div className="bridge-rail-header">
          <span className="bridge-rail-title">STATUS</span>
          <span className="bridge-rail-meta">live</span>
        </div>
        <div className="bridge-widget bridge-widget-stub">
          <div className="bridge-widget-label">PENDING</div>
          <div className="bridge-widget-body">— wiring soon —</div>
        </div>
        <div className="bridge-widget bridge-widget-stub">
          <div className="bridge-widget-label">RECOVERY</div>
          <div className="bridge-widget-body">— wiring soon —</div>
        </div>
        <div className="bridge-widget bridge-widget-stub">
          <div className="bridge-widget-label">CALENDAR</div>
          <div className="bridge-widget-body">— wiring soon —</div>
        </div>
        <div className="bridge-widget bridge-widget-stub">
          <div className="bridge-widget-label">FOCUS</div>
          <div className="bridge-widget-body">— pomodoro coming —</div>
        </div>
        <div className="bridge-widget bridge-widget-stub">
          <div className="bridge-widget-label">MEMENTO</div>
          <div className="bridge-widget-body">— weeks remaining —</div>
        </div>
      </aside>
    </div>
  );
}
