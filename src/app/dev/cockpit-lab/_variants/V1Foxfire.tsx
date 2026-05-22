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

// Stable pseudo-random seeded by string (no re-mount thrash)
function seededRand(seed: string, index: number): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  h = (h * 1664525 + index * 1013904223) >>> 0;
  return (h >>> 0) / 0xffffffff;
}

type FlamePos = { top: string; left: string; scale: number; delay: number };

function flamePositions(cards: Card[]): FlamePos[] {
  return cards.map((c, i) => {
    const r1 = seededRand(c.sessionId, 1);
    const r2 = seededRand(c.sessionId, 2);
    const r3 = seededRand(c.sessionId, 3);
    const r4 = seededRand(c.sessionId, 4);
    // Avoid the center zone (30-70% x, 35-65% y) where Kitsu sits
    // by scattering into quadrant-biased positions
    const quadrant = i % 4;
    let top: number;
    let left: number;
    switch (quadrant) {
      case 0:
        top = 8 + r1 * 30;
        left = 5 + r2 * 38;
        break; // top-left
      case 1:
        top = 8 + r1 * 30;
        left = 57 + r2 * 38;
        break; // top-right
      case 2:
        top = 62 + r1 * 28;
        left = 5 + r2 * 38;
        break; // bottom-left
      default:
        top = 62 + r1 * 28;
        left = 57 + r2 * 38;
        break; // bottom-right
    }
    const scale = c.running ? 1.0 + r3 * 0.5 : 0.45 + r3 * 0.3;
    return {
      top: `${top}%`,
      left: `${left}%`,
      scale,
      delay: r4 * 2.5,
    };
  });
}

function FlameIcon({
  color,
  glow,
  size,
}: {
  color: string;
  glow: string;
  size: number;
}) {
  return (
    <svg
      width={size}
      height={size * 1.4}
      viewBox="0 0 24 34"
      fill="none"
      style={{ display: "block" }}
      aria-hidden
    >
      <defs>
        <radialGradient id="fg1" cx="50%" cy="85%" r="60%">
          <stop offset="0%" stopColor={color} stopOpacity="1" />
          <stop offset="100%" stopColor={glow} stopOpacity="0.2" />
        </radialGradient>
      </defs>
      <path
        d="M12 2 C8 10 2 14 4 22 C5 27 8 31 12 32 C16 31 19 27 20 22 C22 14 16 10 12 2Z"
        fill="url(#fg1)"
        opacity="0.92"
      />
      <path
        d="M12 10 C10 16 7 19 8 23 C9 26 10 28 12 29 C14 28 15 26 16 23 C17 19 14 16 12 10Z"
        fill={color}
        opacity="0.7"
      />
      <ellipse cx="12" cy="28" rx="4" ry="2" fill={glow} opacity="0.4" />
    </svg>
  );
}

const TOOLS_KANJI: Record<string, string> = {
  Edit: "編",
  Bash: "殻",
  Read: "読",
  Write: "書",
  Glob: "索",
  Grep: "探",
};

export default function V1Foxfire({ phase }: { phase: Phase }) {
  useEmakiVars(phase);
  const tk = PHASES[phase];
  const { cards, daemon, controllableCount, runningCount } = useCockpitData();
  const display = cards.length ? cards : demoCards();

  const [selected, setSelected] = useState<Card | null>(null);
  const positions = flamePositions(display);

  const foxfireColor = tk.foxfire;
  const foxfireGlow = tk.foxfireGlow;
  const emberColor = tk.accentDim;

  return (
    <div
      style={{
        position: "relative",
        minHeight: "100vh",
        width: "100%",
        overflow: "hidden",
        fontFamily: "'Georgia', 'Times New Roman', serif",
        color: tk.textPrimary,
      }}
    >
      <style>{EMAKI_CSS}</style>
      <style>{`
        @keyframes foxPulse {
          0%, 100% { opacity: 0.92; transform: scale(1) translateY(0); }
          50%       { opacity: 1;    transform: scale(1.06) translateY(-3px); }
        }
        @keyframes emberFlicker {
          0%, 100% { opacity: 0.45; transform: scale(1) translateY(0); }
          33%       { opacity: 0.65; transform: scale(1.05) translateY(-2px); }
          66%       { opacity: 0.38; transform: scale(0.95) translateY(1px); }
        }
        @keyframes foxIdle {
          0%, 100% { transform: translateY(0) rotate(-1deg); }
          50%       { transform: translateY(-6px) rotate(1deg); }
        }
        @keyframes glowPulse {
          0%, 100% { box-shadow: 0 0 18px 6px rgba(240,192,96,0.35); }
          50%       { box-shadow: 0 0 32px 12px rgba(240,192,96,0.6); }
        }
        @keyframes constellationFade {
          0%, 100% { opacity: 0.7; }
          50%       { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          * { animation-duration: 0.01ms !important; }
        }
      `}</style>

      {/* Background layers (fixed, behind everything) */}
      <PaintedBackdrop phase={phase} />
      <FoxfireLayer phase={phase} />

      {/* Constellation readout — top-left */}
      <div
        style={{
          position: "fixed",
          top: 18,
          left: 20,
          zIndex: 10,
          animation: "constellationFade 4s ease-in-out infinite",
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            fontSize: 10,
            letterSpacing: "0.18em",
            color: tk.eyebrowText,
            textTransform: "uppercase",
            marginBottom: 4,
          }}
        >
          {tk.eyebrowLabel}
        </div>
        <div style={{ display: "flex", gap: 16, alignItems: "baseline" }}>
          <span
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: foxfireColor,
              textShadow: `0 0 12px ${foxfireGlow}`,
            }}
          >
            {runningCount}
          </span>
          <span style={{ fontSize: 11, color: tk.textSub }}>running</span>
          <span style={{ fontSize: 16, color: tk.textMuted, marginLeft: 4 }}>
            {display.length - runningCount}
          </span>
          <span style={{ fontSize: 11, color: tk.textMuted }}>idle</span>
          {controllableCount > 0 && (
            <>
              <span
                style={{
                  fontSize: 14,
                  color: tk.gold,
                  marginLeft: 8,
                  textShadow: `0 0 8px ${tk.gold}`,
                }}
              >
                {controllableCount}
              </span>
              <span style={{ fontSize: 11, color: tk.textSub }}>wired</span>
            </>
          )}
        </div>
        <div style={{ fontSize: 11, color: tk.textMuted, marginTop: 3 }}>
          {daemon?.running ? `daemon :${daemon.port}` : "daemon offline"}
        </div>
      </div>

      {/* Kanji + title — top-right */}
      <div
        style={{
          position: "fixed",
          top: 18,
          right: 20,
          zIndex: 10,
          textAlign: "right",
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            fontSize: 26,
            color: tk.gold,
            textShadow: `0 0 16px ${tk.goldBright}`,
            letterSpacing: "0.1em",
          }}
        >
          {tk.kanji}
        </div>
        <div
          style={{
            fontSize: 11,
            color: tk.textSub,
            letterSpacing: "0.12em",
            marginTop: 2,
          }}
        >
          {tk.subtitle}
        </div>
      </div>

      {/* Flame field — scattered session flames */}
      {display.map((card, i) => {
        const pos = positions[i];
        const isRunning = card.running;
        const isSelected = selected?.sessionId === card.sessionId;
        const flameSize = isRunning
          ? Math.round(28 + pos.scale * 16)
          : Math.round(14 + pos.scale * 10);
        return (
          <button
            key={card.sessionId}
            aria-label={`${card.projectLabel} session`}
            onClick={() => setSelected(isSelected ? null : card)}
            style={{
              position: "fixed",
              top: pos.top,
              left: pos.left,
              zIndex: 4,
              background: "none",
              border: "none",
              padding: 0,
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
              animation: isRunning
                ? `foxPulse ${2.8 + pos.delay * 0.4}s ease-in-out infinite`
                : `emberFlicker ${4.2 + pos.delay * 0.6}s ease-in-out infinite`,
              animationDelay: `${pos.delay}s`,
              filter: isSelected
                ? `drop-shadow(0 0 14px ${foxfireColor})`
                : isRunning
                  ? `drop-shadow(0 0 8px ${foxfireGlow})`
                  : "none",
              outline: "none",
            }}
          >
            <FlameIcon
              color={isRunning ? foxfireColor : emberColor}
              glow={isRunning ? foxfireGlow : tk.accentDim}
              size={flameSize}
            />
            <span
              style={{
                fontSize: 9,
                color: isRunning ? tk.textPrimary : tk.textMuted,
                letterSpacing: "0.06em",
                maxWidth: 72,
                textAlign: "center",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                textShadow: isRunning ? `0 0 8px ${foxfireGlow}` : "none",
              }}
            >
              {card.projectLabel}
            </span>
          </button>
        );
      })}

      {/* Kitsu fox — center stage */}
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 5,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 6,
          animation: "foxIdle 5s ease-in-out infinite",
          pointerEvents: "none",
        }}
      >
        {/* Halo ring behind fox */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 180,
            height: 180,
            borderRadius: "50%",
            background: `radial-gradient(ellipse at center, ${foxfireGlow}22 0%, transparent 70%)`,
            animation: "glowPulse 3s ease-in-out infinite",
          }}
        />
        <img
          src="/agent-office/pixel/marvis-kitsune.png"
          alt="Kitsu"
          width={140}
          height={140}
          style={{
            width: 140,
            height: 140,
            objectFit: "contain",
            filter: `drop-shadow(0 0 18px ${foxfireGlow}) drop-shadow(0 4px 8px rgba(0,0,0,0.6))`,
            imageRendering: "pixelated",
          }}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
        <span
          style={{
            fontSize: 11,
            color: foxfireColor,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            textShadow: `0 0 12px ${foxfireGlow}`,
          }}
        >
          Kitsu
        </span>
      </div>

      {/* Session detail panel — slides in from bottom when a flame is clicked */}
      {selected && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 20,
            width: "min(520px, calc(100vw - 48px))",
          }}
        >
          <WashiPanel tk={tk} style={{ padding: "20px 24px" }}>
            {/* Header row */}
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 12,
                marginBottom: 12,
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span
                    style={{
                      display: "inline-block",
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: selected.running ? foxfireColor : emberColor,
                      boxShadow: selected.running
                        ? `0 0 6px ${foxfireGlow}`
                        : "none",
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      fontSize: 16,
                      fontWeight: 700,
                      color: tk.textPrimary,
                      letterSpacing: "0.04em",
                    }}
                  >
                    {selected.projectLabel}
                  </span>
                  {selected.branch && (
                    <span
                      style={{
                        fontSize: 11,
                        color: tk.textMuted,
                        fontFamily: "monospace",
                      }}
                    >
                      {selected.branch}
                    </span>
                  )}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: tk.textSub,
                    marginTop: 4,
                    letterSpacing: "0.06em",
                  }}
                >
                  {selected.modelName ?? "unknown model"}
                  {selected.fastMode && " · fast"}
                  {selected.thinking && " · thinking"}
                </div>
              </div>
              <button
                onClick={() => setSelected(null)}
                aria-label="Close"
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: tk.textMuted,
                  fontSize: 18,
                  lineHeight: 1,
                  padding: "0 2px",
                  flexShrink: 0,
                }}
              >
                x
              </button>
            </div>

            <KintsugiSeam gold={tk.gold} goldBright={tk.goldBright} />

            {/* Stats grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "10px 16px",
                marginTop: 12,
              }}
            >
              {/* Context */}
              <div>
                <div
                  style={{
                    fontSize: 9,
                    color: tk.eyebrowText,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    marginBottom: 3,
                  }}
                >
                  Context
                </div>
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color:
                      selected.contextUsedPct > 80 ? tk.accent : tk.textPrimary,
                  }}
                >
                  {selected.contextUsedPct}%
                </div>
                <div
                  style={{
                    height: 3,
                    marginTop: 4,
                    borderRadius: 2,
                    background: tk.divider,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${selected.contextUsedPct}%`,
                      background:
                        selected.contextUsedPct > 80 ? tk.accent : foxfireColor,
                      borderRadius: 2,
                      transition: "width 0.4s ease",
                    }}
                  />
                </div>
              </div>

              {/* Cost */}
              <div>
                <div
                  style={{
                    fontSize: 9,
                    color: tk.eyebrowText,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    marginBottom: 3,
                  }}
                >
                  Cost
                </div>
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: tk.textPrimary,
                  }}
                >
                  ${selected.costUsd.toFixed(2)}
                </div>
              </div>

              {/* 5hr rate */}
              {selected.fiveHour && (
                <div>
                  <div
                    style={{
                      fontSize: 9,
                      color: tk.eyebrowText,
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                      marginBottom: 3,
                    }}
                  >
                    5hr rate
                  </div>
                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 700,
                      color: tk.textPrimary,
                    }}
                  >
                    {selected.fiveHour.usedPercentage}%
                  </div>
                </div>
              )}

              {/* Lines changed */}
              {(selected.linesAdded != null ||
                selected.linesRemoved != null) && (
                <div>
                  <div
                    style={{
                      fontSize: 9,
                      color: tk.eyebrowText,
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                      marginBottom: 3,
                    }}
                  >
                    Lines
                  </div>
                  <div style={{ fontSize: 13, color: tk.textPrimary }}>
                    <span style={{ color: "#6bc87a" }}>
                      +{selected.linesAdded ?? 0}
                    </span>{" "}
                    <span style={{ color: "#d07070" }}>
                      -{selected.linesRemoved ?? 0}
                    </span>
                  </div>
                </div>
              )}

              {/* Current tool */}
              {selected.currentTool && (
                <div>
                  <div
                    style={{
                      fontSize: 9,
                      color: tk.eyebrowText,
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                      marginBottom: 3,
                    }}
                  >
                    Tool
                  </div>
                  <div
                    style={{
                      fontSize: 14,
                      color: foxfireColor,
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                    }}
                  >
                    {TOOLS_KANJI[selected.currentTool] && (
                      <span style={{ fontSize: 16, opacity: 0.7 }}>
                        {TOOLS_KANJI[selected.currentTool]}
                      </span>
                    )}
                    {selected.currentTool}
                  </div>
                </div>
              )}

              {/* 7-day rate */}
              {selected.sevenDay && (
                <div>
                  <div
                    style={{
                      fontSize: 9,
                      color: tk.eyebrowText,
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                      marginBottom: 3,
                    }}
                  >
                    7d rate
                  </div>
                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 700,
                      color: tk.textPrimary,
                    }}
                  >
                    {selected.sevenDay.usedPercentage}%
                  </div>
                </div>
              )}
            </div>

            {/* Last message */}
            {selected.lastUserMsg && (
              <div
                style={{
                  marginTop: 12,
                  paddingTop: 10,
                  borderTop: `1px solid ${tk.divider}`,
                  fontSize: 11,
                  color: tk.textSub,
                  fontStyle: "italic",
                  lineHeight: 1.5,
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                "{selected.lastUserMsg}"
              </div>
            )}

            {/* Controllable badge */}
            {selected.controllable && (
              <div
                style={{
                  marginTop: 10,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 10,
                  color: tk.ctaText,
                  background: tk.ctaBg,
                  border: `1px solid ${tk.ctaBorder}`,
                  borderRadius: 4,
                  padding: "3px 8px",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                }}
              >
                <span
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: "50%",
                    background: foxfireColor,
                    display: "inline-block",
                    boxShadow: `0 0 5px ${foxfireGlow}`,
                  }}
                />
                Wired to Kitsu
              </div>
            )}
          </WashiPanel>
        </div>
      )}
    </div>
  );
}
