"use client";
import { useState } from "react";
import type { Phase, PhaseTokens } from "../../../_components/emaki/theme";
import { PHASES } from "../../../_components/emaki/theme";
import {
  useEmakiVars,
  EMAKI_CSS,
  PaintedBackdrop,
  FoxfireLayer,
  WashiPanel,
  KintsugiSeam,
} from "../../../_components/emaki/materials";
import {
  useCockpitData,
  demoCards,
  type Card,
} from "../_shared/useCockpitData";

// Shrine vermilion (torii gate red)
const TORII_RED = "#C8434F";
const TORII_GOLD = "#D4963A";

// ----- sub-components -----

function ToriiGate({ color, gold }: { color: string; gold: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 0,
        margin: "6px auto",
        width: 90,
      }}
    >
      {/* top lintel (curved cap) */}
      <div
        style={{
          width: 90,
          height: 8,
          background: color,
          borderRadius: "50% 50% 0 0 / 60% 60% 0 0",
          boxShadow: `0 -2px 6px ${color}88`,
        }}
      />
      {/* lower lintel */}
      <div
        style={{
          width: 78,
          height: 5,
          background: color,
          marginTop: 3,
          boxShadow: `0 0 4px ${color}66`,
        }}
      />
      {/* posts */}
      <div style={{ display: "flex", gap: 44, marginTop: 2 }}>
        <div
          style={{
            width: 6,
            height: 30,
            background: `linear-gradient(to bottom, ${color}, ${gold})`,
            borderRadius: 2,
          }}
        />
        <div
          style={{
            width: 6,
            height: 30,
            background: `linear-gradient(to bottom, ${color}, ${gold})`,
            borderRadius: 2,
          }}
        />
      </div>
    </div>
  );
}

function ContextBar({
  pct,
  running,
  gold,
}: {
  pct: number;
  running: boolean;
  gold: string;
}) {
  const fill = running ? TORII_RED : gold;
  return (
    <div
      style={{
        width: "100%",
        height: 4,
        borderRadius: 2,
        background: "rgba(0,0,0,0.25)",
        overflow: "hidden",
        marginTop: 6,
      }}
    >
      <div
        style={{
          width: `${Math.min(pct, 100)}%`,
          height: "100%",
          background: pct > 80 ? TORII_RED : fill,
          transition: "width 0.6s ease",
          borderRadius: 2,
        }}
      />
    </div>
  );
}

function LanternPlaque({
  card,
  tk,
  side,
}: {
  card: Card;
  tk: PhaseTokens;
  side: "left" | "right" | "center";
}) {
  const isRunning = card.running;

  const offsetX = side === "left" ? "-22px" : side === "right" ? "22px" : "0px";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        transform: `translateX(${offsetX})`,
        transition: "transform 0.3s ease",
        position: "relative",
        width: 240,
      }}
    >
      {/* hanging rope */}
      <div
        style={{
          width: 1,
          height: 18,
          background: `linear-gradient(to bottom, ${tk.gold}88, ${tk.gold}44)`,
        }}
      />

      {/* lantern glow for running */}
      {isRunning && (
        <div
          style={{
            position: "absolute",
            top: 18,
            left: "50%",
            transform: "translateX(-50%)",
            width: 220,
            height: 90,
            background: `radial-gradient(ellipse at center, ${tk.foxfireGlow} 0%, transparent 70%)`,
            pointerEvents: "none",
            zIndex: 0,
          }}
        />
      )}

      {/* ema / plaque panel */}
      <WashiPanel
        tk={tk}
        style={{
          width: 220,
          padding: "10px 14px",
          position: "relative",
          zIndex: 1,
          border: isRunning
            ? `1px solid ${TORII_RED}88`
            : `1px solid ${tk.panelBorder}`,
          boxShadow: isRunning
            ? `0 0 14px ${tk.foxfireGlow}, inset 0 0 6px ${TORII_RED}22`
            : `0 2px 8px rgba(0,0,0,0.3)`,
        }}
      >
        {/* running badge */}
        {isRunning && (
          <div
            style={{
              position: "absolute",
              top: -8,
              right: 10,
              background: TORII_RED,
              color: "#fff",
              fontSize: 8,
              fontFamily: "'Press Start 2P', monospace",
              padding: "2px 5px",
              borderRadius: 2,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
            }}
          >
            LIVE
          </div>
        )}

        {/* project + branch */}
        <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: isRunning ? tk.foxfire : tk.textPrimary,
              letterSpacing: "0.04em",
              fontFamily: "serif",
            }}
          >
            {card.projectLabel}
          </span>
          {card.branch && (
            <span
              style={{
                fontSize: 9,
                color: tk.textMuted,
                fontFamily: "monospace",
              }}
            >
              {card.branch}
            </span>
          )}
        </div>

        {/* model + cost row */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: 4,
          }}
        >
          <span
            style={{ fontSize: 9, color: tk.textSub, fontFamily: "monospace" }}
          >
            {card.modelName ?? "claude"}
          </span>
          <span
            style={{
              fontSize: 10,
              color: TORII_GOLD,
              fontFamily: "monospace",
              fontWeight: 600,
            }}
          >
            ${card.costUsd.toFixed(2)}
          </span>
        </div>

        {/* context bar */}
        <ContextBar
          pct={card.contextUsedPct}
          running={isRunning}
          gold={tk.gold}
        />
        <div
          style={{
            fontSize: 8,
            color: tk.textMuted,
            textAlign: "right",
            marginTop: 2,
            fontFamily: "monospace",
          }}
        >
          ctx {card.contextUsedPct}%
        </div>

        {/* current tool */}
        {card.currentTool && (
          <div
            style={{
              marginTop: 5,
              fontSize: 9,
              color: isRunning ? tk.foxfire : tk.textSub,
              fontFamily: "monospace",
              background: "rgba(0,0,0,0.2)",
              padding: "2px 6px",
              borderRadius: 3,
              display: "inline-block",
            }}
          >
            {isRunning ? ">" : " "} {card.currentTool}
          </div>
        )}

        {/* last msg snippet */}
        {card.lastUserMsg && (
          <div
            style={{
              marginTop: 5,
              fontSize: 9,
              color: tk.textMuted,
              fontStyle: "italic",
              lineHeight: 1.4,
              overflow: "hidden",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
            }}
          >
            {card.lastUserMsg}
          </div>
        )}

        {/* controllable tag */}
        {card.controllable && (
          <div
            style={{
              marginTop: 6,
              display: "inline-block",
              fontSize: 8,
              color: TORII_RED,
              border: `1px solid ${TORII_RED}66`,
              padding: "1px 5px",
              borderRadius: 2,
              letterSpacing: "0.06em",
              fontFamily: "monospace",
            }}
          >
            CONTROLLABLE
          </div>
        )}
      </WashiPanel>
    </div>
  );
}

// ----- main component -----

export default function V4Shrine({ phase }: { phase: Phase }) {
  useEmakiVars(phase);
  const tk = PHASES[phase];
  const { cards, daemon, controllableCount, runningCount } = useCockpitData();
  const display = cards.length ? cards : demoCards();

  const totalCost = display.reduce((s, c) => s + c.costUsd, 0);

  return (
    <div
      style={{
        minHeight: "100vh",
        position: "relative",
        overflowX: "hidden",
        fontFamily: "serif",
      }}
    >
      <style>{EMAKI_CSS}</style>
      <PaintedBackdrop phase={phase} />
      <FoxfireLayer phase={phase} />

      {/* shrine path column */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          paddingBottom: 60,
        }}
      >
        {/* altar header */}
        <div style={{ width: "100%", maxWidth: 480, padding: "32px 24px 0" }}>
          <WashiPanel
            tk={tk}
            style={{
              padding: "18px 24px",
              textAlign: "center",
              border: `1px solid ${TORII_GOLD}66`,
              boxShadow: `0 4px 20px rgba(0,0,0,0.4), inset 0 0 12px ${TORII_GOLD}11`,
            }}
          >
            {/* shrine label */}
            <div
              style={{
                fontSize: 9,
                letterSpacing: "0.25em",
                color: tk.textMuted,
                textTransform: "uppercase",
                fontFamily: "monospace",
                marginBottom: 10,
              }}
            >
              {tk.eyebrowLabel}
            </div>

            {/* fox guardian */}
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                marginBottom: 10,
              }}
            >
              <div
                style={{
                  position: "relative",
                  display: "inline-block",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    inset: -12,
                    borderRadius: "50%",
                    background: `radial-gradient(circle, ${tk.foxfireGlow} 0%, transparent 70%)`,
                    animation: "foxPulse 3s ease-in-out infinite",
                  }}
                />
                <img
                  src="/agent-office/pixel/marvis-kitsune.png"
                  alt="Kitsu"
                  style={{
                    width: 130,
                    height: 130,
                    objectFit: "contain",
                    imageRendering: "pixelated",
                    position: "relative",
                    zIndex: 1,
                    filter: `drop-shadow(0 0 8px ${tk.foxfire}88)`,
                  }}
                />
              </div>
            </div>

            {/* title */}
            <div
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: tk.textPrimary,
                letterSpacing: "0.06em",
                fontFamily: "serif",
                lineHeight: 1.2,
              }}
            >
              KITSU
            </div>
            <div
              style={{
                fontSize: 11,
                color: TORII_GOLD,
                letterSpacing: "0.15em",
                marginTop: 2,
                fontFamily: "monospace",
              }}
            >
              稲荷の守護神
            </div>

            {/* fleet stats */}
            <KintsugiSeam gold={tk.gold} goldBright={tk.goldBright} />
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: 28,
                marginTop: 12,
              }}
            >
              <div style={{ textAlign: "center" }}>
                <div
                  style={{
                    fontSize: 20,
                    fontWeight: 700,
                    color: runningCount > 0 ? tk.foxfire : tk.textSub,
                    fontFamily: "monospace",
                  }}
                >
                  {runningCount}
                </div>
                <div
                  style={{
                    fontSize: 9,
                    color: tk.textMuted,
                    letterSpacing: "0.1em",
                  }}
                >
                  RUNNING
                </div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div
                  style={{
                    fontSize: 20,
                    fontWeight: 700,
                    color: controllableCount > 0 ? TORII_RED : tk.textSub,
                    fontFamily: "monospace",
                  }}
                >
                  {controllableCount}
                </div>
                <div
                  style={{
                    fontSize: 9,
                    color: tk.textMuted,
                    letterSpacing: "0.1em",
                  }}
                >
                  WIRED
                </div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div
                  style={{
                    fontSize: 20,
                    fontWeight: 700,
                    color: TORII_GOLD,
                    fontFamily: "monospace",
                  }}
                >
                  ${totalCost.toFixed(2)}
                </div>
                <div
                  style={{
                    fontSize: 9,
                    color: tk.textMuted,
                    letterSpacing: "0.1em",
                  }}
                >
                  TOTAL
                </div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div
                  style={{
                    fontSize: 20,
                    fontWeight: 700,
                    color: daemon?.running ? tk.foxfire : tk.textMuted,
                    fontFamily: "monospace",
                  }}
                >
                  {daemon?.running ? "ON" : "OFF"}
                </div>
                <div
                  style={{
                    fontSize: 9,
                    color: tk.textMuted,
                    letterSpacing: "0.1em",
                  }}
                >
                  DAEMON
                </div>
              </div>
            </div>
          </WashiPanel>
        </div>

        {/* shrine path with plaques */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            width: "100%",
            maxWidth: 480,
            paddingTop: 8,
          }}
        >
          {display.map((card, i) => {
            const isFirst = i === 0;
            const side = i === 0 ? "center" : i % 2 === 1 ? "left" : "right";
            return (
              <div
                key={card.sessionId}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  width: "100%",
                }}
              >
                {/* torii gate between groups (after every 2, starting before 1st) */}
                {(isFirst || i % 2 === 0) && (
                  <ToriiGate color={TORII_RED} gold={TORII_GOLD} />
                )}

                <LanternPlaque card={card} tk={tk} side={side} />

                {/* path thread between plaques */}
                {i < display.length - 1 && (
                  <div
                    style={{
                      width: 1,
                      height: 12,
                      background: `linear-gradient(to bottom, ${TORII_GOLD}44, transparent)`,
                    }}
                  />
                )}
              </div>
            );
          })}

          {/* terminal torii at path end */}
          <ToriiGate color={TORII_RED} gold={TORII_GOLD} />

          {/* path end glow */}
          <div
            style={{
              marginTop: 8,
              fontSize: 14,
              color: tk.textMuted,
              letterSpacing: "0.2em",
              fontFamily: "monospace",
              opacity: 0.6,
            }}
          >
            ⛩
          </div>
        </div>
      </div>

      {/* keyframe for fox pulse */}
      <style>{`
        @keyframes foxPulse {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.08); }
        }
      `}</style>
    </div>
  );
}
