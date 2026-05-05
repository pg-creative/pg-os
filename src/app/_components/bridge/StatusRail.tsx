"use client";
import { PendingApprovals } from "./widgets/PendingApprovals";
import { RecoveryWidget } from "./widgets/RecoveryWidget";
import { CalendarNextUp } from "./widgets/CalendarNextUp";
import { BrickBuilder } from "./widgets/BrickBuilder";
import { MementoMori } from "./widgets/MementoMori";
import { LofiPlayer } from "./widgets/LofiPlayer";
import { QuoteRotator } from "./widgets/QuoteRotator";

export function StatusRail() {
  return (
    <aside className="bridge-status" aria-label="Status widgets">
      <div className="bridge-rail-header">
        <span className="bridge-rail-title">STATUS</span>
        <span className="bridge-rail-meta">live</span>
      </div>
      <PendingApprovals />
      <BrickBuilder />
      <RecoveryWidget />
      <CalendarNextUp />
      <LofiPlayer />
      <MementoMori />
      <QuoteRotator />
    </aside>
  );
}
