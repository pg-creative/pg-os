"use client";

import { useState } from "react";
import type { Phase } from "../../../_components/emaki/theme";
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

/* ── geometry helpers ── */

/** Place up to 9 satellites around a circle. Returns {x, y} in px relative to
 *  the center, offset outward by `radius`. Top is 0 deg, clockwise. */
function orbitalPos(
  index: number,
  total: number,
  radius: number,
): { x: number; y: number; angleDeg: number } {
  const angleDeg = (index / total) * 360 - 90; // start at top
  const rad = (angleDeg * Math.PI) / 180;
  return { x: Math.cos(rad) * radius, y: Math.sin(rad) * radius, angleDeg };
}

/* ── sub-components ── */

interface TailProps {
  x: number;
  y: number;
  running: boolean;
  gold: string;
  goldBright: string;
  foxfire: string;
  index: number;
}

/** SVG curved tail from center (0,0) to the satellite position */
function KitsuTail({
  x,
  y,
  running,
  gold,
  goldBright,
  foxfire,
  index,
}: TailProps) {
  // Bezier: control point slightly off-axis for a natural tail curve
  const cpX = x * 0.45 + y * 0.18;
  const cpY = y * 0.45 - x * 0.18;
  const strokeColor = running ? foxfire : gold;
  const opacity = running ? 1 : 0.35;
  const strokeWidth = running ? 2.5 : 1.5;

  return (
    <svg
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        overflow: "visible",
        pointerEvents: "none",
        zIndex: 3,
      }}
    >
      <defs>
        <filter
          id={`tail-glow-${index}`}
          x="-50%"
          y="-50%"
          width="200%"
          height="200%"
        >
          <feGaussianBlur stdDeviation={running ? "3" : "1"} result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <linearGradient
          id={`tail-grad-${index}`}
          x1="0%"
          y1="0%"
          x2="100%"
          y2="0%"
          gradientUnits="userSpaceOnUse"
        >
          <stop
            offset="0%"
            stopColor={goldBright}
            stopOpacity={running ? 0.9 : 0.2}
          />
          <stop
            offset="100%"
            stopColor={strokeColor}
            stopOpacity={running ? 0.6 : 0.15}
          />
        </linearGradient>
      </defs>
      <path
        d={`M 0 0 Q ${cpX} ${cpY} ${x} ${y}`}
        fill="none"
        stroke={`url(#tail-grad-${index})`}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        opacity={opacity}
        filter={running ? `url(#tail-glow-${index})` : undefined}
        style={{
          transition: "all 0.6s ease",
        }}
      />
      {/* Terminal node at satellite end */}
      <circle
        cx={x}
        cy={y}
        r={running ? 4 : 2.5}
        fill={running ? foxfire : gold}
        opacity={running ? 0.9 : 0.3}
        filter={running ? `url(#tail-glow-${index})` : undefined}
      />
    </svg>
  );
}

interface SatelliteProps {
  card: Card;
  x: number;
  y: number;
  tk: (typeof PHASES)[Phase];
  selected: boolean;
  onSelect: () => void;
}

function SessionSatellite({
  card,
  x,
  y,
  tk,
  selected,
  onSelect,
}: SatelliteProps) {
  const isRunning = card.running;
  const borderColor = selected
    ? tk.goldBright
    : isRunning
      ? tk.foxfire
      : tk.panelBorder;

  return (
    // Wrap in div so onClick works (WashiPanel has no onClick prop)
    <div
      style={{
        position: "absolute",
        left: x - 86,
        top: y - 52,
        width: 172,
        cursor: "pointer",
        zIndex: 10,
        transform: selected ? "scale(1.04)" : "scale(1)",
        transition: "transform 0.2s ease",
      }}
      onClick={onSelect}
    >
      <WashiPanel
        tk={tk}
        style={{
          width: "100%",
          minHeight: 104,
          border: `1.5px solid ${borderColor}`,
          boxShadow: isRunning
            ? `0 0 14px 2px ${tk.foxfireGlow}40, 0 2px 8px rgba(0,0,0,0.35)`
            : `0 2px 8px rgba(0,0,0,0.25)`,
          transition: "box-shadow 0.4s ease, border-color 0.4s ease",
          padding: "8px 10px",
        }}
      >
        {/* Header row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            marginBottom: 4,
          }}
        >
          {/* Status dot */}
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: isRunning ? tk.foxfire : tk.textMuted,
              boxShadow: isRunning ? `0 0 6px ${tk.foxfireGlow}` : "none",
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: tk.textPrimary,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              maxWidth: 120,
            }}
          >
            {card.projectLabel}
          </span>
          {card.controllable && (
            <span
              style={{
                fontSize: 8,
                color: tk.gold,
                background: `${tk.gold}22`,
                border: `1px solid ${tk.gold}55`,
                borderRadius: 3,
                padding: "0 3px",
                flexShrink: 0,
              }}
            >
              CTL
            </span>
          )}
        </div>

        {/* Context bar */}
        <div style={{ marginBottom: 4 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 9,
              color: tk.textMuted,
              marginBottom: 2,
            }}
          >
            <span>ctx</span>
            <span>{card.contextUsedPct}%</span>
          </div>
          <div
            style={{
              height: 3,
              background: `${tk.divider}`,
              borderRadius: 2,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${card.contextUsedPct}%`,
                background:
                  card.contextUsedPct > 80
                    ? `linear-gradient(90deg, ${tk.accent}, #e04040)`
                    : `linear-gradient(90deg, ${tk.gold}, ${tk.goldBright})`,
                borderRadius: 2,
                transition: "width 0.5s ease",
              }}
            />
          </div>
        </div>

        {/* Tool / msg row */}
        <div
          style={{
            fontSize: 9,
            color: isRunning ? tk.foxfire : tk.textMuted,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {card.currentTool
            ? `[ ${card.currentTool} ]`
            : card.lastUserMsg
              ? card.lastUserMsg.slice(0, 28) + "…"
              : card.branch
                ? `${card.branch}`
                : "idle"}
        </div>

        {/* Cost */}
        <div
          style={{
            position: "absolute",
            bottom: 6,
            right: 8,
            fontSize: 9,
            color: tk.textMuted,
          }}
        >
          ${card.costUsd.toFixed(2)}
        </div>
      </WashiPanel>
    </div>
  );
}

/* ── main component ── */

export default function V2NineTails({ phase }: { phase: Phase }) {
  useEmakiVars(phase);
  const tk = PHASES[phase];

  const { cards, daemon, controllableCount, runningCount } = useCockpitData();
  const display = (cards.length ? cards : demoCards()).slice(0, 9);

  const [selectedId, setSelectedId] = useState<string | null>(null);

  // The radial orbit lives inside a 560x560 square centered in the viewport.
  // Each satellite is placed at radius=220 from center.
  const ORBIT_RADIUS = 220;
  const CENTER = 280; // half of 560

  return (
    <div
      style={{
        position: "relative",
        minHeight: "100vh",
        width: "100%",
        overflow: "hidden",
        background: tk.bg,
      }}
    >
      <style>{EMAKI_CSS}</style>
      <PaintedBackdrop phase={phase} />
      <FoxfireLayer phase={phase} />

      {/* ── Command core: centered orbital stage ── */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 560,
          height: 560,
          zIndex: 2,
        }}
      >
        {/* SVG tails layer — absolute, fills the 560x560, origin at center */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            transformOrigin: "center",
          }}
        >
          {display.map((card, i) => {
            const { x, y } = orbitalPos(i, display.length, ORBIT_RADIUS);
            return (
              <div
                key={card.sessionId}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  transform: `translate(${CENTER}px, ${CENTER}px)`,
                  pointerEvents: "none",
                }}
              >
                <KitsuTail
                  x={x}
                  y={y}
                  running={card.running}
                  gold={tk.gold}
                  goldBright={tk.goldBright}
                  foxfire={tk.foxfire}
                  index={i}
                />
              </div>
            );
          })}
        </div>

        {/* Satellite panels */}
        {display.map((card, i) => {
          const { x, y } = orbitalPos(i, display.length, ORBIT_RADIUS);
          return (
            <SessionSatellite
              key={card.sessionId}
              card={card}
              x={CENTER + x}
              y={CENTER + y}
              tk={tk}
              selected={selectedId === card.sessionId}
              onSelect={() =>
                setSelectedId(
                  selectedId === card.sessionId ? null : card.sessionId,
                )
              }
            />
          );
        })}

        {/* ── Center core ── */}
        <WashiPanel
          tk={tk}
          style={{
            position: "absolute",
            left: CENTER - 90,
            top: CENTER - 90,
            width: 180,
            height: 180,
            borderRadius: "50%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            border: `2px solid ${tk.goldBright}`,
            boxShadow: `0 0 32px 8px ${tk.foxfireGlow}50, 0 0 8px 2px ${tk.gold}40, inset 0 0 24px ${tk.foxfireGlow}20`,
            zIndex: 12,
            gap: 0,
            padding: 0,
          }}
        >
          {/* Kitsune avatar */}
          <img
            src="/agent-office/pixel/marvis-kitsune.png"
            alt="Kitsu"
            style={{
              width: 72,
              height: 72,
              objectFit: "contain",
              filter: `drop-shadow(0 0 10px ${tk.foxfire}) drop-shadow(0 0 4px ${tk.goldBright})`,
              marginBottom: 4,
            }}
          />

          {/* Fleet summary */}
          <div
            style={{
              fontSize: 10,
              color: tk.textPrimary,
              textAlign: "center",
              lineHeight: 1.5,
            }}
          >
            <div>
              <span style={{ color: tk.foxfire, fontWeight: 700 }}>
                {runningCount}
              </span>
              <span style={{ color: tk.textMuted }}> running</span>
            </div>
            <div>
              <span style={{ color: tk.gold, fontWeight: 700 }}>
                {controllableCount}
              </span>
              <span style={{ color: tk.textMuted }}> ctrl</span>
            </div>
          </div>

          {/* Daemon pip */}
          <div
            style={{
              position: "absolute",
              bottom: 14,
              left: "50%",
              transform: "translateX(-50%)",
              display: "flex",
              alignItems: "center",
              gap: 3,
              fontSize: 8,
              color: daemon?.running ? tk.foxfire : tk.textMuted,
            }}
          >
            <span
              style={{
                width: 5,
                height: 5,
                borderRadius: "50%",
                background: daemon?.running ? tk.foxfire : tk.textMuted,
                boxShadow: daemon?.running
                  ? `0 0 5px ${tk.foxfireGlow}`
                  : "none",
              }}
            />
            {daemon?.running ? "daemon" : "offline"}
          </div>
        </WashiPanel>

        {/* Outer orbital ring (decorative) */}
        <div
          style={{
            position: "absolute",
            left: CENTER - ORBIT_RADIUS - 4,
            top: CENTER - ORBIT_RADIUS - 4,
            width: (ORBIT_RADIUS + 4) * 2,
            height: (ORBIT_RADIUS + 4) * 2,
            borderRadius: "50%",
            border: `1px solid ${tk.gold}25`,
            pointerEvents: "none",
            zIndex: 2,
          }}
        />
        {/* Inner ring */}
        <div
          style={{
            position: "absolute",
            left: CENTER - 110,
            top: CENTER - 110,
            width: 220,
            height: 220,
            borderRadius: "50%",
            border: `1px solid ${tk.goldBright}18`,
            pointerEvents: "none",
            zIndex: 2,
          }}
        />
      </div>

      {/* ── Top bar: kanji + fleet title ── */}
      <div
        style={{
          position: "absolute",
          top: 20,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 20,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 2,
        }}
      >
        <span
          style={{
            fontSize: 22,
            color: tk.gold,
            fontWeight: 300,
            letterSpacing: "0.2em",
            textShadow: `0 0 12px ${tk.foxfireGlow}`,
          }}
        >
          {tk.kanji}
        </span>
        <span
          style={{ fontSize: 11, color: tk.textMuted, letterSpacing: "0.12em" }}
        >
          {tk.eyebrowLabel}
        </span>
      </div>

      {/* ── Bottom: kintsugi seam + total cost ── */}
      <div
        style={{
          position: "absolute",
          bottom: 18,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 20,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 6,
          width: 320,
        }}
      >
        <KintsugiSeam gold={tk.gold} goldBright={tk.goldBright} />
        <span style={{ fontSize: 10, color: tk.textMuted }}>
          fleet total{" "}
          <span style={{ color: tk.gold, fontWeight: 700 }}>
            ${display.reduce((s, c) => s + c.costUsd, 0).toFixed(2)}
          </span>
          {"  "}
          <span style={{ color: tk.textMuted }}>
            {display.length} session{display.length !== 1 ? "s" : ""}
          </span>
        </span>
      </div>
    </div>
  );
}
