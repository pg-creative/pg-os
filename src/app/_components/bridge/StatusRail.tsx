"use client";
import { PendingApprovals } from "./widgets/PendingApprovals";
import { RecoveryWidget } from "./widgets/RecoveryWidget";
import { CalendarNextUp } from "./widgets/CalendarNextUp";

export function StatusRail() {
  return (
    <aside className="bridge-status" aria-label="Status widgets">
      <div className="bridge-rail-header">
        <span className="bridge-rail-title">STATUS</span>
        <span className="bridge-rail-meta">live</span>
      </div>
      <PendingApprovals />
      <RecoveryWidget />
      <CalendarNextUp />
    </aside>
  );
}
