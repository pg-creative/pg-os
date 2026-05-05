"use client";

/**
 * BridgeView — Cortana-style command center.
 * 3-col layout: Crew (left) | Comms (center) | Status (right).
 * Stage 1 ships the skeleton with placeholder content; later stages
 * wire real data into each rail.
 */

export function BridgeView() {
  return (
    <div className="bridge">
      <aside className="bridge-crew" aria-label="Agent crew">
        <div className="bridge-rail-header">
          <span className="bridge-rail-title">CREW</span>
          <span className="bridge-rail-meta">— booting</span>
        </div>
        <ul className="bridge-crew-list">
          {[
            "session-review",
            "morning-briefing",
            "weekly-meta-audit",
            "memory-hygiene",
            "description-optimizer",
          ].map((name) => (
            <li key={name} className="bridge-crew-row bridge-crew-placeholder">
              <span className="bridge-crew-dot" />
              <span className="bridge-crew-name">{name}</span>
              <span className="bridge-crew-status">—</span>
            </li>
          ))}
        </ul>
      </aside>

      <section className="bridge-comms" aria-label="Comms feed">
        <div className="bridge-rail-header">
          <span className="bridge-rail-title">COMMS</span>
          <span className="bridge-rail-meta">unified feed</span>
        </div>
        <div className="bridge-comms-feed bridge-comms-empty">
          <p className="bridge-empty-heading">Comms link standing by.</p>
          <p className="bridge-empty-hint">
            Agent updates, approvals, and your chat with the co-pilot will
            appear here. Press ⌘J to open the side-panel chat in the meantime.
          </p>
        </div>
        <div className="bridge-comms-input">
          <div className="bridge-comms-input-stub">
            Input wires up in Stage&nbsp;3 — for now use ⌘J for chat.
          </div>
        </div>
      </section>

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
