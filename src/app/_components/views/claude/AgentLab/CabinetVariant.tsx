"use client";

/**
 * V4 — Cabinet (Disco Elysium Thought Cabinet, NO environment)
 *
 * The falsifier bet: the WORLD is not required. Characters + activity + data
 * are sufficient. Each agent rendered as a painted bookplate-card — tall
 * portrait orientation, old-paper border, display-serif name in big type,
 * a paragraph of flavor text generated from real tool counts (Disco Elysium
 * voice), small-caps mono stats at the bottom.
 *
 * Tests: was the appeal of "worlds" actually about WORLDS, or about characters?
 * If this variant wins, the answer is characters. The world is optional scenery.
 *
 * Motion: 200ms ease-out on hover/select only. Static portraits — calm is the point.
 */

import { useState } from "react";
import { useAgentStream, type AgentSnapshot } from "./useAgentStream";
import {
  tokens,
  fonts,
  CharacterPortrait,
  PROPS,
  STATUS_LABEL,
  deriveClass,
  useTicker,
  relTime,
  SharedKeyframes,
  getProp,
} from "./primitives";

// ─── Flavor text engine ──────────────────────────────────────────────────────

function flavorText(agent: AgentSnapshot): string {
  const calls = agent.toolCallCount;
  const reads = agent.toolHistory.filter((t) => t.category === "read").length;
  const writes = agent.toolHistory.filter((t) => t.category === "write").length;
  const searches = agent.toolHistory.filter(
    (t) => t.category === "search",
  ).length;

  if (calls === 0) {
    return "A new arrival. They have not yet begun their labors.";
  }
  if (calls <= 10) {
    return `Newly settled. Their first few movements are recorded here — ${calls} ${calls === 1 ? "gesture" : "gestures"} noted in the ledger.`;
  }
  if (calls <= 50) {
    const parts: string[] = [];
    if (reads > 0)
      parts.push(`${reads} ${reads === 1 ? "tome" : "tomes"} read`);
    if (writes > 0)
      parts.push(`${writes} ${writes === 1 ? "page" : "pages"} filled`);
    if (searches > 0) parts.push(`${searches} horizons searched`);
    const detail = parts.length > 0 ? ` ${parts.join(", ")}.` : ".";
    return `An adventurer of some experience.${detail} What they've found, they have not yet spoken of.`;
  }
  // 51+
  const parts: string[] = [];
  if (reads > 0) parts.push(`${reads} tomes`);
  if (writes > 0) parts.push(`${writes} pages`);
  if (searches > 0) parts.push(`${searches} expeditions`);
  const tally = parts.length > 0 ? ` — ${parts.join(", ")}` : "";
  return `A figure of consequence. They have done much, and the cabinet is full of their work${tally}. The weight of it shows.`;
}

// ─── Focus drawer (self-contained — not imported from Atelier) ────────────────

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
  const ghosttyUrl = `ghostty://`;

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(42, 36, 28, 0.38)",
          zIndex: 60,
          animation: "cabinet-overlay-in 200ms ease-out",
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
          boxShadow: "-12px 0 40px rgba(42, 36, 28, 0.18)",
          zIndex: 61,
          padding: "32px 28px",
          overflowY: "auto",
          fontFamily: fonts.body,
          color: tokens.ink,
          animation: "cabinet-drawer-in 200ms ease-out",
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
              marginBottom: 8,
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
                fontSize: 28,
                fontWeight: 500,
                letterSpacing: "-0.01em",
                color: tokens.ink,
              }}
            >
              {agent.projectName}
            </h2>
          </div>
          <p
            style={{
              margin: "14px 0 0",
              fontSize: 13,
              fontStyle: "italic",
              color: tokens.muted,
              lineHeight: 1.65,
            }}
          >
            {flavorText(agent)}
          </p>
        </header>

        <button
          onClick={() => window.open(ghosttyUrl, "_blank")}
          style={{
            display: "block",
            width: "100%",
            padding: "11px 18px",
            background: tokens.amber,
            color: "#FFF8E7",
            border: "none",
            borderRadius: 3,
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
              "0 4px 12px rgba(214,163,103,0.35)";
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
              no labors yet recorded
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
                        style={{
                          color: t.doneAt ? tokens.muted : tokens.ink,
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

// ─── Single cabinet card ──────────────────────────────────────────────────────

function CabinetCard({
  agent,
  now,
  onClick,
}: {
  agent: AgentSnapshot;
  now: number;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const cls = deriveClass(agent);
  const prop = getProp(agent);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: "100%",
        maxWidth: 280,
        background: tokens.bgCream,
        border: `1.5px solid ${tokens.rule}`,
        borderRadius: 4,
        padding: "28px 24px 20px",
        cursor: "pointer",
        textAlign: "left",
        transition: "transform 200ms ease-out, box-shadow 200ms ease-out",
        transform: hovered ? "translateY(-2px)" : "translateY(0)",
        boxShadow: hovered
          ? `0 8px 28px rgba(42, 36, 28, 0.14), 0 2px 8px rgba(42, 36, 28, 0.08)`
          : `0 1px 4px rgba(42, 36, 28, 0.06)`,
      }}
    >
      {/* Portrait block — bookplate frame feel */}
      <div
        style={{
          width: "100%",
          background: `rgba(42, 36, 28, 0.04)`,
          borderRadius: 3,
          border: `1px solid ${tokens.rule}`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px 16px 20px",
          marginBottom: 20,
          boxShadow: "inset 0 2px 8px rgba(42, 36, 28, 0.06)",
          position: "relative",
        }}
      >
        {/* Bookplate corner marks — four corners */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: 6,
            left: 6,
            width: 10,
            height: 10,
            borderTop: `1.5px solid ${tokens.dim}`,
            borderLeft: `1.5px solid ${tokens.dim}`,
          }}
        />
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: 6,
            right: 6,
            width: 10,
            height: 10,
            borderTop: `1.5px solid ${tokens.dim}`,
            borderRight: `1.5px solid ${tokens.dim}`,
          }}
        />
        <div
          aria-hidden
          style={{
            position: "absolute",
            bottom: 6,
            left: 6,
            width: 10,
            height: 10,
            borderBottom: `1.5px solid ${tokens.dim}`,
            borderLeft: `1.5px solid ${tokens.dim}`,
          }}
        />
        <div
          aria-hidden
          style={{
            position: "absolute",
            bottom: 6,
            right: 6,
            width: 10,
            height: 10,
            borderBottom: `1.5px solid ${tokens.dim}`,
            borderRight: `1.5px solid ${tokens.dim}`,
          }}
        />

        <CharacterPortrait agent={agent} size={140} />

        {/* Active prop — sits below portrait inside frame */}
        {prop ? (
          <div
            style={{
              marginTop: 14,
              fontFamily: fonts.mono,
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: "0.13em",
              color: tokens.muted,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span style={{ fontSize: 15 }}>{prop.glyph}</span>
            {prop.label}
          </div>
        ) : (
          <div
            style={{
              marginTop: 14,
              fontFamily: fonts.mono,
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: "0.13em",
              color: tokens.dim,
            }}
          >
            {STATUS_LABEL[agent.status]}
          </div>
        )}
      </div>

      {/* Name — big display serif */}
      <div
        style={{
          fontFamily: fonts.display,
          fontSize: 24,
          fontWeight: 500,
          letterSpacing: "0.01em",
          color: tokens.ink,
          marginBottom: 4,
          textAlign: "center",
          lineHeight: 1.2,
        }}
      >
        {agent.projectName}
      </div>

      {/* Class — small caps mono */}
      <div
        style={{
          fontFamily: fonts.mono,
          fontSize: 10,
          textTransform: "uppercase",
          letterSpacing: "0.2em",
          color: tokens.muted,
          marginBottom: 14,
        }}
      >
        {cls}
      </div>

      {/* Flavor text — the soul of the variant */}
      <p
        style={{
          margin: 0,
          fontSize: 13,
          fontStyle: "italic",
          color: tokens.muted,
          lineHeight: 1.65,
          textAlign: "center",
        }}
      >
        {flavorText(agent)}
      </p>

      {/* Bottom stat row */}
      <div
        style={{
          marginTop: 18,
          paddingTop: 14,
          borderTop: `1px solid ${tokens.rule}`,
          width: "100%",
          display: "flex",
          justifyContent: "center",
          gap: 20,
          fontFamily: fonts.mono,
          fontSize: 10,
          textTransform: "uppercase",
          letterSpacing: "0.14em",
          color: tokens.dim,
        }}
      >
        <span>{agent.toolCallCount} calls</span>
        <span>{cls}</span>
        <span>{relTime(agent.joinedAt, now)}</span>
      </div>
    </button>
  );
}

// ─── Main variant ─────────────────────────────────────────────────────────────

export function CabinetVariant() {
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
        background: `
          radial-gradient(ellipse 60% 40% at 0% 0%, rgba(168, 159, 142, 0.08), transparent 60%),
          radial-gradient(ellipse 60% 40% at 100% 100%, rgba(168, 159, 142, 0.07), transparent 60%),
          ${tokens.bgCream}
        `,
        fontFamily: fonts.body,
        color: tokens.ink,
      }}
    >
      <SharedKeyframes />
      <style>{`
        @keyframes cabinet-overlay-in {
          from { opacity: 0; } to { opacity: 1; }
        }
        @keyframes cabinet-drawer-in {
          from { transform: translateX(100%); } to { transform: translateX(0); }
        }
      `}</style>

      {/* Header */}
      <header
        style={{
          padding: "40px 48px 32px",
          maxWidth: 860,
          margin: "0 auto",
        }}
      >
        <div
          style={{
            fontFamily: fonts.mono,
            fontSize: 11,
            textTransform: "uppercase",
            letterSpacing: "0.18em",
            color: tokens.muted,
            marginBottom: 8,
          }}
        >
          // THE CABINET · V4 ·{" "}
          {connected ? "cards arranged" : "the wind has changed…"}
        </div>
        <h1
          style={{
            margin: 0,
            fontFamily: fonts.display,
            fontSize: 36,
            fontWeight: 500,
            letterSpacing: "-0.015em",
            color: tokens.ink,
          }}
        >
          The agents, considered.
        </h1>
        <p
          style={{
            margin: "8px 0 0",
            fontSize: 15,
            fontStyle: "italic",
            color: tokens.muted,
          }}
        >
          No room, no fire. Just the characters and what they&rsquo;re doing.
        </p>
      </header>

      {/* Card grid */}
      <main
        style={{
          maxWidth: 960,
          margin: "0 auto",
          padding: "0 48px 64px",
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
              gap: 12,
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontFamily: fonts.display,
                fontSize: 22,
                fontStyle: "italic",
                color: tokens.muted,
              }}
            >
              The cabinet is empty.
            </div>
            <div
              style={{
                fontFamily: fonts.mono,
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: "0.16em",
                color: tokens.dim,
              }}
            >
              no agent specimens to display.
            </div>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
              gap: 32,
              justifyItems: "center",
            }}
          >
            {agents.map((agent) => (
              <CabinetCard
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
