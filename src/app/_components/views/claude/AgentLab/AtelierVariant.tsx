"use client";

/**
 * V1 — Atelier (Howl's library at golden hour)
 *
 * Indoor Ghibli interior. Characters at workstations within a warm painted scene.
 * Activity = prop in hand (book, quill, hammer, hourglass). Status = portrait tint.
 * Click a character → side-drawer slides in with tool history + Jump to Ghostty.
 *
 * Aesthetic locks (from research/agent-office-character-system-2026-05-16):
 *   - Howl's library palette: warm cream walls, golden hour through arched windows,
 *     brass lanterns, deep warm blue ceiling shadows
 *   - Workstations as desk positions arranged in a 2.5D scene
 *   - One bento per page (this whole scene IS the bento)
 *   - Motion: 200ms ease-out only
 */

import { useState } from "react";
import { useAgentStream, type AgentSnapshot } from "./useAgentStream";
import {
  tokens,
  fonts,
  CharacterPortrait,
  ActivityProp,
  STATUS_LABEL,
  PROPS,
  deriveClass,
  useTicker,
  relTime,
  SharedKeyframes,
  getProp,
} from "./primitives";

// 6 workstation slots arranged across the scene (left → center → right, two rows)
const WORKSTATIONS = [
  { x: 14, y: 58, label: "by the west window" }, // far left
  { x: 32, y: 64, label: "the great desk" },
  { x: 50, y: 56, label: "the alcove" }, // center
  { x: 68, y: 64, label: "the brass lamp" },
  { x: 86, y: 58, label: "by the east window" }, // far right
  { x: 41, y: 80, label: "the reading bench" }, // foreground
];

function FocusDrawer({
  agent,
  now,
  onClose,
}: {
  agent: AgentSnapshot;
  now: number;
  onClose: () => void;
}) {
  const cls = deriveClass(agent);
  const recent = agent.toolHistory.slice(-12).reverse();
  const ghosttyUrl = `ghostty://`; // best-effort deep link
  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(26, 21, 16, 0.45)",
          zIndex: 60,
          animation: "atelier-overlay-fade 200ms ease-out",
        }}
      />
      <aside
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: "min(440px, 92vw)",
          background: tokens.bgCream,
          borderLeft: `1px solid ${tokens.rule}`,
          boxShadow: "-12px 0 40px rgba(26, 21, 16, 0.25)",
          zIndex: 61,
          padding: "32px 28px",
          overflowY: "auto",
          fontFamily: fonts.body,
          color: tokens.ink,
          animation: "atelier-drawer-in 300ms ease-out",
        }}
      >
        <header style={{ marginBottom: 24 }}>
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
            {cls} · {STATUS_LABEL[agent.status]}
          </div>
          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
            <CharacterPortrait agent={agent} size={64} />
            <h2
              style={{
                margin: 0,
                fontFamily: fonts.display,
                fontSize: 30,
                fontWeight: 500,
                letterSpacing: "-0.01em",
              }}
            >
              {agent.projectName}
            </h2>
          </div>
          <div
            style={{
              marginTop: 12,
              fontSize: 14,
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
          onClick={() => window.open(ghosttyUrl, "_blank")}
          style={{
            display: "block",
            width: "100%",
            padding: "12px 18px",
            background: tokens.amber,
            color: "#FFF8E7",
            border: "none",
            borderRadius: 4,
            fontFamily: fonts.body,
            fontSize: 14,
            fontWeight: 500,
            cursor: "pointer",
            letterSpacing: "0.02em",
            transition: "transform 200ms ease-out, box-shadow 200ms ease-out",
            marginBottom: 28,
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
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: "0.16em",
              color: tokens.muted,
              margin: "0 0 12px",
              fontWeight: 600,
            }}
          >
            recent labors · {agent.toolCallCount} total
          </h3>
          {recent.length === 0 ? (
            <div
              style={{
                color: tokens.dim,
                fontStyle: "italic",
                fontSize: 14,
              }}
            >
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
                      gap: 10,
                      padding: "8px 0",
                      borderBottom: `1px solid ${tokens.rule}`,
                      fontSize: 13,
                    }}
                  >
                    <span style={{ fontSize: 18, lineHeight: 1 }}>
                      {p.glyph}
                    </span>
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
            marginTop: 32,
            paddingTop: 16,
            borderTop: `1px solid ${tokens.rule}`,
            fontFamily: fonts.mono,
            fontSize: 11,
            color: tokens.dim,
          }}
        >
          joined {relTime(agent.joinedAt, now)} · last labor{" "}
          {relTime(agent.lastActivityAt, now)}
        </footer>
      </aside>
    </>
  );
}

function CharacterStation({
  agent,
  slot,
  onClick,
}: {
  agent: AgentSnapshot;
  slot: { x: number; y: number; label: string };
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        position: "absolute",
        left: `${slot.x}%`,
        top: `${slot.y}%`,
        transform: "translate(-50%, -50%)",
        background: "transparent",
        border: "none",
        cursor: "pointer",
        padding: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
        animation:
          agent.status === "idle"
            ? "agent-drift 4s ease-in-out infinite"
            : undefined,
      }}
    >
      <div style={{ position: "relative" }}>
        <CharacterPortrait agent={agent} size={84} />
        <div
          style={{
            position: "absolute",
            top: -8,
            right: -8,
          }}
        >
          <ActivityProp agent={agent} size={34} />
        </div>
      </div>
      <div
        style={{
          fontFamily: fonts.display,
          fontSize: 14,
          color: "#FFF8E7",
          fontWeight: 500,
          letterSpacing: "-0.01em",
          textShadow: "0 1px 4px rgba(0,0,0,0.4)",
          textAlign: "center",
          whiteSpace: "nowrap",
        }}
      >
        {agent.projectName}
      </div>
      {agent.currentTool && (
        <div
          style={{
            fontFamily: fonts.mono,
            fontSize: 10,
            color: "#FFF8E7",
            opacity: 0.85,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            textShadow: "0 1px 2px rgba(0,0,0,0.4)",
            maxWidth: 160,
            textAlign: "center",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {(getProp(agent)?.label ?? "working") +
            " · " +
            agent.currentTool.toolName}
        </div>
      )}
    </button>
  );
}

export function AtelierVariant() {
  const { agents, connected } = useAgentStream();
  const now = useTicker(1000);
  const [focusId, setFocusId] = useState<number | null>(null);
  const focused = agents.find((a) => a.id === focusId) ?? null;

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        minHeight: "calc(100vh - 50px)",
        overflow: "hidden",
        background: `
          radial-gradient(ellipse 90% 60% at 50% 100%, rgba(214, 163, 103, 0.25), transparent 70%),
          radial-gradient(ellipse 60% 40% at 20% 30%, rgba(232, 180, 168, 0.18), transparent 60%),
          radial-gradient(ellipse 60% 40% at 80% 30%, rgba(232, 180, 168, 0.14), transparent 60%),
          linear-gradient(180deg, ${tokens.bgDeepBlue} 0%, #3D4F66 35%, #6B5640 70%, #8C6F4E 100%)
        `,
        fontFamily: fonts.body,
      }}
    >
      <SharedKeyframes />
      <style>{`
        @keyframes atelier-overlay-fade {
          from { opacity: 0; } to { opacity: 1; }
        }
        @keyframes atelier-drawer-in {
          from { transform: translateX(100%); } to { transform: translateX(0); }
        }
      `}</style>

      {/* Faux arched window beams (golden hour streaks) */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          left: "10%",
          top: 0,
          width: "12%",
          height: "70%",
          background:
            "linear-gradient(180deg, rgba(255, 220, 168, 0.18) 0%, transparent 100%)",
          transform: "skewX(-8deg)",
          pointerEvents: "none",
          animation: "agent-shimmer 6s ease-in-out infinite",
        }}
      />
      <div
        aria-hidden
        style={{
          position: "absolute",
          right: "10%",
          top: 0,
          width: "12%",
          height: "70%",
          background:
            "linear-gradient(180deg, rgba(255, 220, 168, 0.16) 0%, transparent 100%)",
          transform: "skewX(8deg)",
          pointerEvents: "none",
          animation: "agent-shimmer 7s ease-in-out infinite",
        }}
      />

      {/* Faux bookshelves (back wall) */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          left: "35%",
          top: "25%",
          width: "30%",
          height: "20%",
          background: `repeating-linear-gradient(
            90deg,
            rgba(74, 50, 30, 0.7) 0,
            rgba(74, 50, 30, 0.7) 4px,
            rgba(180, 130, 80, 0.5) 4px,
            rgba(180, 130, 80, 0.5) 8px,
            rgba(108, 76, 46, 0.6) 8px,
            rgba(108, 76, 46, 0.6) 14px
          )`,
          borderTop: "2px solid rgba(60, 40, 24, 0.7)",
          borderBottom: "2px solid rgba(60, 40, 24, 0.7)",
          opacity: 0.7,
          pointerEvents: "none",
        }}
      />

      {/* Hero header */}
      <header
        style={{
          padding: "40px 48px 24px",
          maxWidth: 760,
          position: "relative",
          zIndex: 2,
        }}
      >
        <div
          style={{
            fontFamily: fonts.mono,
            fontSize: 11,
            textTransform: "uppercase",
            letterSpacing: "0.18em",
            color: "rgba(255, 248, 231, 0.7)",
            marginBottom: 6,
          }}
        >
          The Atelier · V1 ·{" "}
          {connected ? "lanterns lit" : "the wind has changed…"}
        </div>
        <h1
          style={{
            margin: 0,
            fontFamily: fonts.display,
            fontSize: 38,
            fontWeight: 500,
            color: "#FFF8E7",
            letterSpacing: "-0.015em",
            textShadow: "0 2px 8px rgba(0,0,0,0.3)",
          }}
        >
          The atelier hums.
        </h1>
        <p
          style={{
            margin: "8px 0 0",
            fontSize: 15,
            color: "rgba(255, 248, 231, 0.78)",
            maxWidth: 540,
            fontStyle: "italic",
          }}
        >
          Each agent has a workstation. Click anyone to peer over their
          shoulder.
        </p>
      </header>

      {/* The scene — character stations layered over the painted background */}
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "min(640px, 70vh)",
          marginTop: 24,
        }}
      >
        {agents.length === 0 ? (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
              gap: 12,
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontFamily: fonts.display,
                fontSize: 24,
                color: "rgba(255, 248, 231, 0.7)",
                fontStyle: "italic",
              }}
            >
              The atelier is quiet.
            </div>
            <div
              style={{
                fontFamily: fonts.mono,
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: "0.16em",
                color: "rgba(255, 248, 231, 0.45)",
              }}
            >
              start a claude code session, the master will arrive
            </div>
          </div>
        ) : (
          agents
            .slice(0, 6)
            .map((agent, i) => (
              <CharacterStation
                key={agent.id}
                agent={agent}
                slot={WORKSTATIONS[i % WORKSTATIONS.length]}
                onClick={() => setFocusId(agent.id)}
              />
            ))
        )}
      </div>

      {focused && (
        <FocusDrawer
          agent={focused}
          now={now}
          onClose={() => setFocusId(null)}
        />
      )}
    </div>
  );
}
