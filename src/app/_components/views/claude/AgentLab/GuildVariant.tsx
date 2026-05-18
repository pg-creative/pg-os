"use client";

/**
 * V3 — Guild Hall (JRPG party tableau / adventurer's guild board)
 *
 * Information-dense character cards arranged like a D&D party sheet.
 * Each agent = one guild card with portrait, class, stats, stamina bar.
 * Warm parchment-cream, brass-corner accents, worn-vellum feel.
 * Click card → side-drawer with full tool history.
 *
 * Aesthetic locks (research/agent-office-character-system-2026-05-16.md):
 *   - JRPG party tableau, auto-class from deriveClass()
 *   - Parchment cream bg, brass accents, worn-vellum cards
 *   - CSS grid responsive: 1-col mobile / 2-col tablet / 3-col desktop
 *   - Motion: 200ms ease-out only, stamina bar 300ms fill, NO infinite loops
 */

import { useState } from "react";
import { useAgentStream, type AgentSnapshot } from "./useAgentStream";
import {
  tokens,
  fonts,
  CharacterPortrait,
  ActivityProp,
  PROPS,
  STATUS_TINT,
  STATUS_LABEL,
  deriveClass,
  useTicker,
  relTime,
  SharedKeyframes,
  getProp,
} from "./primitives";

// ─── FocusDrawer (inlined — not imported) ────────────────────────────────────

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
  const recent = agent.toolHistory.slice(-14).reverse();
  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(26, 21, 16, 0.42)",
          zIndex: 60,
          animation: "guild-fade-in 200ms ease-out",
        }}
      />
      <aside
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: "min(460px, 92vw)",
          background: tokens.bgCream,
          borderLeft: `1px solid ${tokens.rule}`,
          boxShadow: "-16px 0 48px rgba(26, 21, 16, 0.22)",
          zIndex: 61,
          padding: "32px 28px",
          overflowY: "auto",
          fontFamily: fonts.body,
          color: tokens.ink,
          animation: "guild-drawer-in 250ms ease-out",
        }}
      >
        {/* Drawer header */}
        <header style={{ marginBottom: 24 }}>
          <div
            style={{
              fontFamily: fonts.mono,
              fontSize: 10,
              textTransform: "uppercase",
              letterSpacing: "0.18em",
              color: tokens.muted,
              marginBottom: 8,
            }}
          >
            {cls} · quest log
          </div>
          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
            <CharacterPortrait agent={agent} size={64} />
            <div>
              <h2
                style={{
                  margin: 0,
                  fontFamily: fonts.display,
                  fontSize: 28,
                  fontWeight: 500,
                  letterSpacing: "-0.01em",
                  lineHeight: 1.1,
                }}
              >
                {agent.projectName}
              </h2>
              <div
                style={{
                  marginTop: 4,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <span
                  style={{
                    display: "inline-block",
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: STATUS_TINT[agent.status],
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontFamily: fonts.mono,
                    fontSize: 11,
                    color: STATUS_TINT[agent.status],
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                  }}
                >
                  {STATUS_LABEL[agent.status]}
                </span>
              </div>
            </div>
          </div>
          {agent.currentTool && (
            <div
              style={{
                marginTop: 12,
                fontSize: 13,
                color: tokens.muted,
                fontStyle: "italic",
                lineHeight: 1.5,
              }}
            >
              {agent.currentTool.toolStatus}
            </div>
          )}
        </header>

        {/* Ghostty button */}
        <button
          onClick={() => window.open("ghostty://", "_blank")}
          style={{
            display: "block",
            width: "100%",
            padding: "11px 18px",
            background: tokens.amber,
            color: "#FFF8E7",
            border: "none",
            borderRadius: 4,
            fontFamily: fonts.body,
            fontSize: 13,
            fontWeight: 500,
            cursor: "pointer",
            letterSpacing: "0.03em",
            transition: "transform 200ms ease-out, box-shadow 200ms ease-out",
            marginBottom: 28,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-1px)";
            e.currentTarget.style.boxShadow =
              "0 4px 14px rgba(214, 163, 103, 0.4)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          open in ghostty →
        </button>

        {/* Tool history */}
        <section>
          <h3
            style={{
              fontFamily: fonts.mono,
              fontSize: 10,
              textTransform: "uppercase",
              letterSpacing: "0.18em",
              color: tokens.muted,
              margin: "0 0 14px",
              fontWeight: 600,
            }}
          >
            quest log · {agent.toolCallCount} entries
          </h3>
          {recent.length === 0 ? (
            <div
              style={{
                color: tokens.dim,
                fontStyle: "italic",
                fontSize: 13,
              }}
            >
              no quests logged yet
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
                    <span
                      style={{ fontSize: 17, lineHeight: 1.2, flexShrink: 0 }}
                    >
                      {p.glyph}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          color: t.doneAt ? tokens.muted : tokens.ink,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
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
            paddingTop: 14,
            borderTop: `1px solid ${tokens.rule}`,
            fontFamily: fonts.mono,
            fontSize: 10,
            color: tokens.dim,
          }}
        >
          joined {relTime(agent.joinedAt, now)} · last act{" "}
          {relTime(agent.lastActivityAt, now)}
        </footer>
      </aside>
    </>
  );
}

// ─── Stamina bar ─────────────────────────────────────────────────────────────

function StaminaBar({ count }: { count: number }) {
  const level = Math.floor(count / 100);
  const progress = (count % 100) / 100; // 0–1 within current level
  const pct = Math.round(progress * 100);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div
        style={{
          flex: 1,
          height: 6,
          borderRadius: 3,
          background: "rgba(214, 163, 103, 0.18)",
          overflow: "hidden",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            width: `${pct}%`,
            background: `linear-gradient(90deg, rgba(214, 163, 103, 0.55) 0%, ${tokens.amber} 100%)`,
            borderRadius: 3,
            transition: "width 300ms ease-out",
          }}
        />
      </div>
      {level > 0 && (
        <span
          style={{
            fontFamily: fonts.mono,
            fontSize: 9,
            color: tokens.amber,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          Lv {level + 1}
        </span>
      )}
    </div>
  );
}

// ─── Brass corner accents ─────────────────────────────────────────────────────

const BRASS = "rgba(180, 140, 80, 0.55)";

function BrassCorners() {
  const size = 10;
  const positions: React.CSSProperties[] = [
    {
      top: 4,
      left: 4,
      borderTop: `2px solid ${BRASS}`,
      borderLeft: `2px solid ${BRASS}`,
    },
    {
      top: 4,
      right: 4,
      borderTop: `2px solid ${BRASS}`,
      borderRight: `2px solid ${BRASS}`,
    },
    {
      bottom: 4,
      left: 4,
      borderBottom: `2px solid ${BRASS}`,
      borderLeft: `2px solid ${BRASS}`,
    },
    {
      bottom: 4,
      right: 4,
      borderBottom: `2px solid ${BRASS}`,
      borderRight: `2px solid ${BRASS}`,
    },
  ];
  return (
    <>
      {positions.map((pos, i) => (
        <div
          key={i}
          aria-hidden
          style={{
            position: "absolute",
            width: size,
            height: size,
            pointerEvents: "none",
            ...pos,
          }}
        />
      ))}
    </>
  );
}

// ─── Guild card ───────────────────────────────────────────────────────────────

function GuildCard({
  agent,
  now,
  onClick,
}: {
  agent: AgentSnapshot;
  now: number;
  onClick: () => void;
}) {
  const cls = deriveClass(agent);
  const prop = getProp(agent);
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        background: tokens.bgCream,
        border: `1px solid ${tokens.rule}`,
        borderRadius: 8,
        padding: "20px 18px 14px",
        cursor: "pointer",
        textAlign: "left",
        fontFamily: fonts.body,
        color: tokens.ink,
        boxShadow: hovered
          ? `0 6px 24px rgba(214, 163, 103, 0.28), 0 2px 8px rgba(26, 21, 16, 0.08)`
          : "0 1px 4px rgba(26, 21, 16, 0.07)",
        transform: hovered ? "translateY(-2px)" : "translateY(0)",
        transition: "transform 200ms ease-out, box-shadow 200ms ease-out",
        /* Aged parchment: subtle warm noise */
        backgroundImage:
          "repeating-radial-gradient(circle at 50% 50%, rgba(214, 163, 103, 0.03) 0, rgba(214, 163, 103, 0.03) 1px, transparent 1px, transparent 4px)",
      }}
    >
      <BrassCorners />

      {/* Portrait area */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 8,
          marginBottom: 16,
          position: "relative",
        }}
      >
        {/* Activity prop badge — top-right float */}
        {prop && (
          <div
            style={{
              position: "absolute",
              top: 0,
              right: 0,
            }}
          >
            <ActivityProp agent={agent} size={40} />
          </div>
        )}

        <CharacterPortrait agent={agent} size={120} />

        <div
          style={{
            fontFamily: fonts.mono,
            fontSize: 10,
            textTransform: "uppercase",
            letterSpacing: "0.2em",
            color: tokens.muted,
          }}
        >
          {cls}
        </div>
      </div>

      {/* Stats block */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "auto 1fr",
          gap: "5px 10px",
          alignItems: "baseline",
          flex: 1,
        }}
      >
        {/* PROJECT */}
        <span
          style={{
            fontFamily: fonts.mono,
            fontSize: 9,
            textTransform: "uppercase",
            letterSpacing: "0.14em",
            color: tokens.dim,
          }}
        >
          PROJECT
        </span>
        <span
          style={{
            fontFamily: fonts.display,
            fontSize: 17,
            fontWeight: 500,
            letterSpacing: "-0.01em",
            color: tokens.ink,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {agent.projectName}
        </span>

        {/* CLASS */}
        <span
          style={{
            fontFamily: fonts.mono,
            fontSize: 9,
            textTransform: "uppercase",
            letterSpacing: "0.14em",
            color: tokens.dim,
          }}
        >
          CLASS
        </span>
        <span
          style={{
            fontFamily: fonts.mono,
            fontSize: 10,
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            color: tokens.muted,
          }}
        >
          {cls}
        </span>

        {/* STATUS */}
        <span
          style={{
            fontFamily: fonts.mono,
            fontSize: 9,
            textTransform: "uppercase",
            letterSpacing: "0.14em",
            color: tokens.dim,
          }}
        >
          STATUS
        </span>
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
          }}
        >
          <span
            style={{
              display: "inline-block",
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: STATUS_TINT[agent.status],
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontFamily: fonts.mono,
              fontSize: 10,
              color: STATUS_TINT[agent.status],
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            {agent.status}
          </span>
        </span>

        {/* TOOLS */}
        <span
          style={{
            fontFamily: fonts.mono,
            fontSize: 9,
            textTransform: "uppercase",
            letterSpacing: "0.14em",
            color: tokens.dim,
          }}
        >
          TOOLS
        </span>
        <span
          style={{
            fontFamily: fonts.mono,
            fontSize: 22,
            fontWeight: 700,
            color: tokens.amber,
            letterSpacing: "-0.03em",
            lineHeight: 1,
          }}
        >
          {agent.toolCallCount}
        </span>

        {/* CURRENT */}
        <span
          style={{
            fontFamily: fonts.mono,
            fontSize: 9,
            textTransform: "uppercase",
            letterSpacing: "0.14em",
            color: tokens.dim,
            paddingTop: 2,
          }}
        >
          CURRENT
        </span>
        <span
          style={{
            fontSize: 11,
            color: tokens.muted,
            fontStyle: "italic",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {agent.currentTool?.toolStatus ?? "—"}
        </span>

        {/* TIME */}
        <span
          style={{
            fontFamily: fonts.mono,
            fontSize: 9,
            textTransform: "uppercase",
            letterSpacing: "0.14em",
            color: tokens.dim,
          }}
        >
          TIME
        </span>
        <span
          style={{
            fontFamily: fonts.mono,
            fontSize: 10,
            color: tokens.muted,
          }}
        >
          {relTime(agent.joinedAt, now)}
        </span>
      </div>

      {/* Stamina bar */}
      <div style={{ marginTop: 14 }}>
        <div
          style={{
            fontFamily: fonts.mono,
            fontSize: 9,
            textTransform: "uppercase",
            letterSpacing: "0.14em",
            color: tokens.dim,
            marginBottom: 5,
          }}
        >
          STAMINA
        </div>
        <StaminaBar count={agent.toolCallCount} />
      </div>
    </button>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function GuildVariant() {
  const { agents, connected } = useAgentStream();
  const now = useTicker(1000);
  const [focusId, setFocusId] = useState<number | null>(null);
  const focused = agents.find((a) => a.id === focusId) ?? null;

  return (
    <div
      style={{
        minHeight: "calc(100vh - 50px)",
        background: tokens.bgCream,
        fontFamily: fonts.body,
        color: tokens.ink,
      }}
    >
      <SharedKeyframes />
      <style>{`
        @keyframes guild-fade-in {
          from { opacity: 0; } to { opacity: 1; }
        }
        @keyframes guild-drawer-in {
          from { transform: translateX(100%); } to { transform: translateX(0); }
        }
      `}</style>

      {/* Header */}
      <header
        style={{
          padding: "36px 36px 20px",
          borderBottom: `1px solid ${tokens.rule}`,
          maxWidth: 1100,
          margin: "0 auto",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            fontFamily: fonts.mono,
            fontSize: 10,
            textTransform: "uppercase",
            letterSpacing: "0.2em",
            color: tokens.muted,
            marginBottom: 6,
          }}
        >
          // THE GUILD HALL · V3 ·{" "}
          {connected ? "the board is posted" : "the wind has changed…"}
        </div>
        <h1
          style={{
            margin: 0,
            fontFamily: fonts.display,
            fontSize: 36,
            fontWeight: 500,
            letterSpacing: "-0.015em",
            color: tokens.ink,
            lineHeight: 1.1,
          }}
        >
          Today's roster.
        </h1>
        <p
          style={{
            margin: "8px 0 0",
            fontSize: 14,
            color: tokens.muted,
            fontStyle: "italic",
          }}
        >
          Six adventurers, six classes. Click one to read the quest log.
        </p>
      </header>

      {/* Grid / empty */}
      <main
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "28px 36px 48px",
          boxSizing: "border-box",
        }}
      >
        {agents.length === 0 ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              minHeight: 320,
              gap: 10,
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontFamily: fonts.display,
                fontSize: 22,
                color: tokens.muted,
                fontStyle: "italic",
              }}
            >
              The guild hall is empty.
            </div>
            <div
              style={{
                fontFamily: fonts.mono,
                fontSize: 10,
                textTransform: "uppercase",
                letterSpacing: "0.18em",
                color: tokens.dim,
              }}
            >
              the board awaits its first adventurer.
            </div>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fill, minmax(min(100%, 280px), 1fr))",
              gap: 20,
            }}
          >
            {agents.slice(0, 6).map((agent) => (
              <GuildCard
                key={agent.id}
                agent={agent}
                now={now}
                onClick={() => setFocusId(agent.id)}
              />
            ))}
          </div>
        )}
      </main>

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
