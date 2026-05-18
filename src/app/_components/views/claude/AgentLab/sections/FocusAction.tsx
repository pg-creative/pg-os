"use client";

/**
 * Focus action section primitive — 4 variants for what happens when PG
 * clicks a character.
 *
 * V1 drawer         Right-slide drawer (default — Persona 5 entrance)
 * V2 modal          Full-page cinematic focus
 * V3 flyout         Anchored contextual flyout (VS Code peek)
 * V4 inline-expand  FALSIFIER — character expands in place
 *
 * All variants render the same content: project name, recent tool history,
 * "open in ghostty" button. Different surface treatment.
 */

import type { AgentSnapshot, FocusVariant } from "./types";
import {
  tokens,
  fonts,
  PROPS,
  deriveClass,
  relTime,
  useTicker,
} from "../primitives";

export interface FocusActionProps {
  agent: AgentSnapshot | null;
  variant: FocusVariant;
  onClose: () => void;
}

export function FocusAction({ agent, variant, onClose }: FocusActionProps) {
  if (!agent) return null;
  switch (variant) {
    case "drawer":
      return <Drawer agent={agent} onClose={onClose} />;
    case "modal":
      return <Modal agent={agent} onClose={onClose} />;
    case "flyout":
      return <Flyout agent={agent} onClose={onClose} />;
    case "inline-expand":
      return <InlineExpand agent={agent} onClose={onClose} />;
  }
}

// Shared content — every variant displays the same data, different surface
function FocusContent({ agent }: { agent: AgentSnapshot }) {
  const cls = deriveClass(agent);
  const now = useTicker(1000);
  const recent = agent.toolHistory.slice(-12).reverse();
  return (
    <>
      <header style={{ marginBottom: 20 }}>
        <div
          style={{
            fontFamily: fonts.mono,
            fontSize: 11,
            textTransform: "uppercase",
            letterSpacing: "0.16em",
            color: tokens.muted,
            marginBottom: 6,
          }}
        >
          the {cls}
        </div>
        <h2
          style={{
            margin: 0,
            fontFamily: fonts.display,
            fontSize: 28,
            fontWeight: 500,
            letterSpacing: "-0.01em",
            color: tokens.ink,
          }}
        >
          {agent.projectName}
        </h2>
        <div
          style={{
            marginTop: 8,
            fontSize: 13,
            color: tokens.muted,
            fontStyle: "italic",
          }}
        >
          {agent.currentTool
            ? agent.currentTool.toolStatus
            : "resting between tasks"}
        </div>
      </header>

      <button
        onClick={() => window.open("ghostty://", "_blank")}
        style={{
          display: "block",
          width: "100%",
          padding: "11px 16px",
          background: tokens.amber,
          color: "#FFF8E7",
          border: "none",
          borderRadius: 4,
          fontFamily: fonts.body,
          fontSize: 13,
          fontWeight: 500,
          cursor: "pointer",
          marginBottom: 22,
          transition: "transform 200ms ease-out, box-shadow 200ms ease-out",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateY(-1px)";
          e.currentTarget.style.boxShadow =
            "0 4px 12px rgba(214, 163, 103, 0.35)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "none";
        }}
      >
        open in ghostty →
      </button>

      <section>
        <h3
          style={{
            fontFamily: fonts.mono,
            fontSize: 10,
            textTransform: "uppercase",
            letterSpacing: "0.16em",
            color: tokens.muted,
            margin: "0 0 10px",
            fontWeight: 600,
          }}
        >
          recent labors · {agent.toolCallCount} total
        </h3>
        {recent.length === 0 ? (
          <div style={{ color: tokens.dim, fontStyle: "italic", fontSize: 13 }}>
            no labors yet
          </div>
        ) : (
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {recent.map((t) => {
              const p = PROPS[t.category] ?? PROPS.other;
              return (
                <li
                  key={t.toolId}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 9,
                    padding: "7px 0",
                    borderBottom: `1px solid ${tokens.rule}`,
                    fontSize: 12,
                  }}
                >
                  <span style={{ fontSize: 15, lineHeight: 1 }}>{p.glyph}</span>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{ color: t.doneAt ? tokens.muted : tokens.ink }}
                    >
                      {t.toolStatus}
                    </div>
                    <div
                      style={{
                        fontFamily: fonts.mono,
                        fontSize: 10,
                        color: tokens.dim,
                        marginTop: 2,
                      }}
                    >
                      {relTime(t.startedAt, now)}
                      {t.doneAt
                        ? ` · ${Math.round((t.doneAt - t.startedAt) / 100) / 10}s`
                        : " · ongoing"}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <footer
        style={{
          marginTop: 24,
          paddingTop: 14,
          borderTop: `1px solid ${tokens.rule}`,
          fontFamily: fonts.mono,
          fontSize: 10,
          color: tokens.dim,
        }}
      >
        joined {relTime(agent.joinedAt, now)} · last labor{" "}
        {relTime(agent.lastActivityAt, now)}
      </footer>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// V1 — Right-slide drawer (default)

function Drawer({
  agent,
  onClose,
}: {
  agent: AgentSnapshot;
  onClose: () => void;
}) {
  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(26, 21, 16, 0.45)",
          zIndex: 60,
          animation: "focus-fade 200ms ease-out",
        }}
      />
      <aside
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: "min(420px, 92vw)",
          background: tokens.bgCream,
          borderLeft: `1px solid ${tokens.rule}`,
          boxShadow: "-12px 0 40px rgba(26, 21, 16, 0.25)",
          zIndex: 61,
          padding: "28px 26px",
          overflowY: "auto",
          fontFamily: fonts.body,
          animation: "focus-drawer-in 300ms ease-out",
        }}
      >
        <FocusContent agent={agent} />
      </aside>
      <FocusKeyframes />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// V2 — Full-page cinematic modal

function Modal({
  agent,
  onClose,
}: {
  agent: AgentSnapshot;
  onClose: () => void;
}) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(26, 21, 16, 0.78)",
        zIndex: 60,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        animation: "focus-fade 200ms ease-out",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(520px, 92vw)",
          maxHeight: "90vh",
          overflowY: "auto",
          background: tokens.bgCream,
          padding: "36px 36px",
          border: `1px solid ${tokens.amber}`,
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
          fontFamily: fonts.body,
          animation: "focus-modal-in 300ms ease-out",
        }}
      >
        <FocusContent agent={agent} />
      </div>
      <FocusKeyframes />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// V3 — Anchored contextual flyout (VS Code peek)

function Flyout({
  agent,
  onClose,
}: {
  agent: AgentSnapshot;
  onClose: () => void;
}) {
  return (
    <div
      style={{
        position: "fixed",
        right: 24,
        bottom: 24,
        width: "min(360px, 90vw)",
        maxHeight: "70vh",
        overflowY: "auto",
        background: tokens.bgCream,
        padding: "22px 22px",
        border: `1px solid ${tokens.rule}`,
        borderRadius: 6,
        boxShadow: "0 12px 40px rgba(26, 21, 16, 0.35)",
        zIndex: 60,
        fontFamily: fonts.body,
        animation: "focus-flyout-in 200ms ease-out",
      }}
    >
      <button
        onClick={onClose}
        aria-label="close"
        style={{
          position: "absolute",
          top: 8,
          right: 8,
          width: 22,
          height: 22,
          borderRadius: "50%",
          border: "none",
          background: tokens.rule,
          color: tokens.ink,
          cursor: "pointer",
          fontSize: 14,
          lineHeight: 1,
        }}
      >
        ×
      </button>
      <FocusContent agent={agent} />
      <FocusKeyframes />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// V4 — Inline expand (FALSIFIER)
// No overlay. The card expands in place to reveal content. Tests whether
// preserving spatial context (the agent stays where it is) beats overlay
// surfaces. Built as a bottom-anchored expanding panel below the scene.

function InlineExpand({
  agent,
  onClose,
}: {
  agent: AgentSnapshot;
  onClose: () => void;
}) {
  return (
    <div
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        background: tokens.bgCream,
        borderTop: `2px solid ${tokens.amber}`,
        padding: "22px 28px 26px",
        maxHeight: "55vh",
        overflowY: "auto",
        boxShadow: "0 -8px 32px rgba(26, 21, 16, 0.35)",
        zIndex: 60,
        fontFamily: fonts.body,
        animation: "focus-inline-in 240ms ease-out",
      }}
    >
      <div style={{ maxWidth: 640, margin: "0 auto", position: "relative" }}>
        <button
          onClick={onClose}
          aria-label="close"
          style={{
            position: "absolute",
            top: -6,
            right: -6,
            width: 24,
            height: 24,
            borderRadius: "50%",
            border: "none",
            background: tokens.rule,
            color: tokens.ink,
            cursor: "pointer",
            fontSize: 14,
            lineHeight: 1,
          }}
        >
          ×
        </button>
        <FocusContent agent={agent} />
      </div>
      <FocusKeyframes />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function FocusKeyframes() {
  return (
    <style>{`
      @keyframes focus-fade { from { opacity: 0; } to { opacity: 1; } }
      @keyframes focus-drawer-in { from { transform: translateX(100%); } to { transform: translateX(0); } }
      @keyframes focus-modal-in {
        from { transform: scale(0.96); opacity: 0; }
        to { transform: scale(1); opacity: 1; }
      }
      @keyframes focus-flyout-in {
        from { transform: translateY(8px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
      @keyframes focus-inline-in {
        from { transform: translateY(100%); }
        to { transform: translateY(0); }
      }
    `}</style>
  );
}
