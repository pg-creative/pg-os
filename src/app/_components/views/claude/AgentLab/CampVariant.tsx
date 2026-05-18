"use client";

/**
 * V2 — Camp (wayfarer's campfire at golden hour)
 *
 * Outdoor scene. Hooded wayfarers ringed around a warm CSS campfire at golden
 * hour. Characters positioned in a circle, fire warmth radiates outward.
 * Floating embers drift upward slowly. Click any wayfarer → FocusDrawer
 * slides in with recent travels + Jump to Ghostty.
 *
 * Aesthetic bet: outdoor communal warmth beats indoor contemplation.
 * The fire is the party. Every agent is around it.
 */

import { useState } from "react";
import { useAgentStream, type AgentSnapshot } from "./useAgentStream";
import {
  tokens,
  fonts,
  CharacterPortrait,
  ActivityProp,
  PROPS,
  STATUS_LABEL,
  deriveClass,
  useTicker,
  relTime,
  SharedKeyframes,
  getProp,
} from "./primitives";

// 6 camp positions arranged in a loose ring around the fire center.
// Fire center ≈ (50%, 56%). Radii staggered so it reads as a true circle.
const CAMP_POSITIONS = [
  { x: 50, y: 22, label: "by the northern star" }, // top center
  { x: 78, y: 35, label: "the east watch" }, // upper right
  { x: 82, y: 66, label: "beside the provisions" }, // lower right
  { x: 50, y: 82, label: "nearest the flames" }, // bottom center (closest to fire)
  { x: 18, y: 66, label: "the west flank" }, // lower left
  { x: 22, y: 35, label: "the shadow keeper" }, // upper left
];

// Embers — small dots at fixed horizontal positions, animated with delay
const EMBERS = [
  { x: 46, delay: 0 },
  { x: 50, delay: 1.4 },
  { x: 53, delay: 2.8 },
  { x: 48, delay: 4.2 },
  { x: 52, delay: 5.6 },
  { x: 49, delay: 0.7 },
  { x: 51, delay: 3.5 },
];

// ─── Inlined FocusDrawer (self-contained — no import) ────────────────────────

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
          background: "rgba(10, 18, 32, 0.55)",
          zIndex: 60,
          animation: "camp-overlay-fade 200ms ease-out",
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
          boxShadow: "-12px 0 40px rgba(10, 18, 32, 0.30)",
          zIndex: 61,
          padding: "32px 28px",
          overflowY: "auto",
          fontFamily: fonts.body,
          color: tokens.ink,
          animation: "camp-drawer-in 300ms ease-out",
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
              : "resting by the fire"}
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
            recent travels · {agent.toolCallCount} total
          </h3>
          {recent.length === 0 ? (
            <div
              style={{
                color: tokens.dim,
                fontStyle: "italic",
                fontSize: 14,
              }}
            >
              no travels yet — still making camp
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
          arrived {relTime(agent.joinedAt, now)} · last seen{" "}
          {relTime(agent.lastActivityAt, now)}
        </footer>
      </aside>
    </>
  );
}

// ─── Campfire (CSS-art) ───────────────────────────────────────────────────────

function Campfire() {
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        left: "50%",
        top: "56%",
        transform: "translate(-50%, -50%)",
        width: 64,
        height: 64,
        zIndex: 4,
        pointerEvents: "none",
      }}
    >
      {/* Outer glow — largest, slowest flicker */}
      <div
        style={{
          position: "absolute",
          inset: -32,
          borderRadius: "50%",
          background:
            "radial-gradient(ellipse 60% 50% at 50% 60%, rgba(214, 130, 50, 0.35) 0%, transparent 70%)",
          animation: "camp-fire-glow-outer 3.8s ease-in-out infinite",
        }}
      />
      {/* Mid glow */}
      <div
        style={{
          position: "absolute",
          inset: -16,
          borderRadius: "50%",
          background:
            "radial-gradient(ellipse 55% 45% at 50% 58%, rgba(240, 160, 60, 0.50) 0%, transparent 65%)",
          animation: "camp-fire-glow-mid 2.9s ease-in-out infinite",
        }}
      />
      {/* Core flame body */}
      <div
        style={{
          position: "absolute",
          left: "25%",
          bottom: "20%",
          width: "50%",
          height: "60%",
          borderRadius: "50% 50% 30% 30% / 60% 60% 40% 40%",
          background:
            "linear-gradient(180deg, #FFD280 0%, #F4912A 40%, #C85020 100%)",
          animation: "camp-fire-flicker 3.2s ease-in-out infinite",
          transformOrigin: "bottom center",
        }}
      />
      {/* Inner hot core */}
      <div
        style={{
          position: "absolute",
          left: "35%",
          bottom: "22%",
          width: "30%",
          height: "40%",
          borderRadius: "50% 50% 30% 30% / 60% 60% 40% 40%",
          background:
            "linear-gradient(180deg, #FFFCAA 0%, #FFD060 50%, #F08030 100%)",
          animation: "camp-fire-flicker 2.6s ease-in-out infinite reverse",
          transformOrigin: "bottom center",
        }}
      />
      {/* Log base */}
      <div
        style={{
          position: "absolute",
          bottom: "12%",
          left: "10%",
          width: "80%",
          height: "18%",
          borderRadius: 4,
          background:
            "linear-gradient(90deg, #3D2010 0%, #6B3820 50%, #3D2010 100%)",
          boxShadow: "0 2px 4px rgba(0,0,0,0.4)",
        }}
      />
    </div>
  );
}

// ─── Wayfarer station (one character at the camp ring) ────────────────────────

function WayfarerStation({
  agent,
  slot,
  onClick,
}: {
  agent: AgentSnapshot;
  slot: { x: number; y: number; label: string };
  onClick: () => void;
}) {
  // Characters closer to the bottom (nearer fire) glow warmer
  const fireProximity = slot.y > 65 ? 0.9 : slot.y > 45 ? 0.5 : 0.2;
  const warmOverlay = `rgba(220, 140, 50, ${fireProximity * 0.15})`;

  return (
    <button
      onClick={onClick}
      title={slot.label}
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
        zIndex: 5,
        animation:
          agent.status === "idle"
            ? "agent-drift 4s ease-in-out infinite"
            : undefined,
        transition: "transform 200ms ease-out",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translate(-50%, calc(-50% - 4px))";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translate(-50%, -50%)";
      }}
    >
      {/* Warm fire-glow halo around portrait */}
      <div style={{ position: "relative" }}>
        {fireProximity > 0.4 && (
          <div
            style={{
              position: "absolute",
              inset: -8,
              borderRadius: "50%",
              background: `radial-gradient(ellipse at 50% 80%, ${warmOverlay}, transparent 70%)`,
              pointerEvents: "none",
            }}
          />
        )}
        <CharacterPortrait agent={agent} size={80} />
        <div
          style={{
            position: "absolute",
            top: -8,
            right: -8,
          }}
        >
          <ActivityProp agent={agent} size={32} />
        </div>
      </div>

      {/* Project name */}
      <div
        style={{
          fontFamily: fonts.display,
          fontSize: 13,
          color: "#FFF8E7",
          fontWeight: 500,
          letterSpacing: "-0.01em",
          textShadow:
            "0 1px 4px rgba(0,0,0,0.5), 0 0 12px rgba(200,100,30,0.3)",
          textAlign: "center",
          whiteSpace: "nowrap",
        }}
      >
        {agent.projectName}
      </div>

      {/* Active tool label */}
      {agent.currentTool && (
        <div
          style={{
            fontFamily: fonts.mono,
            fontSize: 10,
            color: "rgba(255, 248, 231, 0.82)",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            textShadow: "0 1px 2px rgba(0,0,0,0.4)",
            maxWidth: 140,
            textAlign: "center",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
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

// ─── Root export ──────────────────────────────────────────────────────────────

export function CampVariant() {
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
        // Sky gradient: deep dusky blue top → amber horizon → ember glow bottom
        background: `
          radial-gradient(ellipse 70% 35% at 50% 82%, rgba(200, 90, 20, 0.45) 0%, transparent 70%),
          radial-gradient(ellipse 100% 45% at 50% 65%, rgba(210, 140, 60, 0.22) 0%, transparent 65%),
          linear-gradient(180deg,
            #1A2B4A 0%,
            #1E304E 25%,
            #2E3E58 45%,
            #8C5A28 68%,
            #D6A367 80%,
            #C87828 88%,
            #7A3A10 100%
          )
        `,
        fontFamily: fonts.body,
      }}
    >
      <SharedKeyframes />
      <style>{`
        @keyframes camp-overlay-fade {
          from { opacity: 0; } to { opacity: 1; }
        }
        @keyframes camp-drawer-in {
          from { transform: translateX(100%); } to { transform: translateX(0); }
        }
        @keyframes camp-fire-flicker {
          0%, 100% { transform: scaleX(1) scaleY(1); opacity: 1; }
          33%  { transform: scaleX(0.92) scaleY(1.06); opacity: 0.95; }
          66%  { transform: scaleX(1.05) scaleY(0.96); opacity: 1; }
        }
        @keyframes camp-fire-glow-outer {
          0%, 100% { opacity: 0.7; transform: scale(1); }
          50%  { opacity: 1; transform: scale(1.08); }
        }
        @keyframes camp-fire-glow-mid {
          0%, 100% { opacity: 0.8; transform: scale(1); }
          50%  { opacity: 1; transform: scale(1.05); }
        }
        @keyframes camp-ember-rise {
          0%   { transform: translateY(0) translateX(0) scale(1); opacity: 0.9; }
          60%  { opacity: 0.6; }
          100% { transform: translateY(-80px) translateX(var(--drift, 6px)) scale(0.3); opacity: 0; }
        }
      `}</style>

      {/* Stars — subtle static dots near top */}
      {[12, 22, 35, 45, 58, 68, 78, 88, 6, 94].map((x, i) => (
        <div
          key={i}
          aria-hidden
          style={{
            position: "absolute",
            left: `${x}%`,
            top: `${4 + (i % 5) * 3}%`,
            width: i % 3 === 0 ? 2 : 1,
            height: i % 3 === 0 ? 2 : 1,
            borderRadius: "50%",
            background: "rgba(255,248,231,0.65)",
            animation: `agent-shimmer ${5 + (i % 4)}s ease-in-out infinite`,
            animationDelay: `${i * 0.6}s`,
            pointerEvents: "none",
          }}
        />
      ))}

      {/* Horizon silhouette — distant treeline */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          bottom: "28%",
          left: 0,
          right: 0,
          height: "10%",
          background: `linear-gradient(180deg, transparent 0%, rgba(15, 25, 40, 0.6) 100%)`,
          clipPath:
            "polygon(0% 100%, 0% 60%, 3% 45%, 6% 60%, 9% 30%, 12% 55%, 15% 40%, 18% 60%, 22% 50%, 25% 65%, 30% 48%, 33% 60%, 38% 42%, 42% 58%, 46% 52%, 50% 65%, 54% 50%, 58% 60%, 63% 44%, 67% 62%, 71% 48%, 75% 60%, 79% 42%, 83% 55%, 87% 38%, 90% 55%, 94% 45%, 97% 60%, 100% 50%, 100% 100%)",
          pointerEvents: "none",
          zIndex: 1,
        }}
      />

      {/* Ground — dark earth at base */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: "28%",
          background:
            "linear-gradient(180deg, rgba(30, 18, 8, 0.0) 0%, rgba(20, 12, 5, 0.85) 100%)",
          zIndex: 2,
          pointerEvents: "none",
        }}
      />

      {/* Embers drifting upward */}
      {EMBERS.map((e, i) => (
        <div
          key={i}
          aria-hidden
          style={{
            position: "absolute",
            left: `${e.x}%`,
            top: "56%",
            width: 3,
            height: 3,
            borderRadius: "50%",
            background: "#FFD080",
            boxShadow: "0 0 4px rgba(255, 180, 60, 0.8)",
            animation: `camp-ember-rise ${6 + (i % 3)}s ease-out infinite`,
            animationDelay: `${e.delay}s`,
            // CSS variable for lateral drift per ember
            ["--drift" as string]: `${(i % 2 === 0 ? 1 : -1) * (4 + i * 1.5)}px`,
            zIndex: 6,
            pointerEvents: "none",
          }}
        />
      ))}

      {/* Campfire */}
      <Campfire />

      {/* Ground radial firelight — circle of warmth on the earth */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          left: "50%",
          top: "56%",
          transform: "translate(-50%, -30%)",
          width: "50%",
          height: "30%",
          borderRadius: "50%",
          background:
            "radial-gradient(ellipse 80% 60% at 50% 70%, rgba(210, 120, 30, 0.28) 0%, transparent 75%)",
          zIndex: 3,
          pointerEvents: "none",
          animation: "camp-fire-glow-outer 3.5s ease-in-out infinite",
        }}
      />

      {/* Hero header */}
      <header
        style={{
          padding: "36px 48px 20px",
          maxWidth: 700,
          position: "relative",
          zIndex: 8,
        }}
      >
        <div
          style={{
            fontFamily: fonts.mono,
            fontSize: 11,
            textTransform: "uppercase",
            letterSpacing: "0.18em",
            color: "rgba(255, 232, 180, 0.75)",
            marginBottom: 6,
          }}
        >
          {"// THE CAMP · V2 · "}
          {connected ? "fire burns" : "the wind has changed…"}
        </div>
        <h1
          style={{
            margin: 0,
            fontFamily: fonts.display,
            fontSize: 38,
            fontWeight: 500,
            color: "#FFF8E7",
            letterSpacing: "-0.015em",
            textShadow:
              "0 2px 12px rgba(0,0,0,0.4), 0 0 30px rgba(210,140,50,0.2)",
          }}
        >
          The camp is gathered.
        </h1>
        <p
          style={{
            margin: "8px 0 0",
            fontSize: 15,
            color: "rgba(255, 240, 200, 0.78)",
            maxWidth: 500,
            fontStyle: "italic",
          }}
        >
          Each wayfarer at the fire. Click anyone to hear their story.
        </p>
      </header>

      {/* Scene — wayfarers ringed around fire */}
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "min(640px, 72vh)",
          zIndex: 7,
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
                color: "rgba(255, 240, 200, 0.72)",
                fontStyle: "italic",
              }}
            >
              No one at the fire tonight.
            </div>
            <div
              style={{
                fontFamily: fonts.mono,
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: "0.16em",
                color: "rgba(255, 232, 180, 0.45)",
              }}
            >
              start a claude code session, a wayfarer will arrive
            </div>
          </div>
        ) : (
          agents
            .slice(0, 6)
            .map((agent, i) => (
              <WayfarerStation
                key={agent.id}
                agent={agent}
                slot={CAMP_POSITIONS[i % CAMP_POSITIONS.length]}
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
