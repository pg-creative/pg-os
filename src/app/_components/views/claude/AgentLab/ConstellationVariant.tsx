"use client";

/**
 * V3 — Constellation (the falsifier)
 * Pure spatial beauty over operational scannability.
 * Night sky / star map. Each agent = a glowing orb on a 2D plane.
 * The only operational info is behind hover — by design.
 *
 * Bet: if PG picks this over V1/V2, the brief was wrong —
 * he values beauty over function for this surface. Valuable signal.
 * But it's built to win on its own terms. No strawmen.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { useAgentStream, type AgentSnapshot } from "./useAgentStream";

// ─── Constants ───────────────────────────────────────────────────────────────

const STAR_MIN = 12;
const STAR_MAX = 24;
const PULSE_DURATION = 300; // ms
const BREATHE_PERIOD = 3800; // ms — slow halo breathing
const LINE_OPACITY = 0.18;

// Colors per status
const STAR_COLOR: Record<AgentSnapshot["status"], string> = {
  active: "#D6A367", // warm gold — working
  permission: "#7C3AED", // royal purple — waiting for permission
  waiting: "#C4B5E8", // pale lavender — waiting
  idle: "#8A8099", // muted grey-purple — idle
};

const GLOW_COLOR: Record<AgentSnapshot["status"], string> = {
  active: "rgba(214, 163, 103, 0.35)",
  permission: "rgba(124, 58, 237, 0.4)",
  waiting: "rgba(196, 181, 232, 0.28)",
  idle: "rgba(138, 128, 153, 0.2)",
};

// ─── Layout ──────────────────────────────────────────────────────────────────

interface StarPosition {
  id: number;
  x: number; // 0..1 (fraction of canvas)
  y: number; // 0..1
}

/**
 * Distribute agents in a loose circular constellation.
 * Radius varies by toolCallCount (more active = pushed slightly outward).
 * Angle is deterministic by index so the layout is stable.
 */
function computePositions(agents: AgentSnapshot[]): StarPosition[] {
  const n = agents.length;
  if (n === 0) return [];

  const cx = 0.5;
  const cy = 0.5;
  const BASE_R = 0.28;
  const JITTER = 0.08;

  return agents.map((agent, i) => {
    const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
    // More active agents drift slightly further out
    const activityFactor = Math.min(agent.toolCallCount / 40, 1);
    const r = BASE_R + JITTER * activityFactor;
    // Small positional nudge by id to break perfect symmetry
    const nudge = ((agent.id * 17) % 7) * 0.006;
    return {
      id: agent.id,
      x: cx + Math.cos(angle) * (r + nudge),
      y: cy + Math.sin(angle) * (r + nudge * 0.7),
    };
  });
}

/**
 * Nearest-neighbour spanning lines — connect each star to its 2 nearest peers.
 * Returns pairs of [indexA, indexB].
 */
function computeLines(positions: StarPosition[]): [number, number][] {
  const n = positions.length;
  if (n < 2) return [];

  const pairs = new Set<string>();
  const lines: [number, number][] = [];

  for (let i = 0; i < n; i++) {
    const distances = positions
      .map((p, j) => ({
        j,
        d: Math.hypot(positions[i].x - p.x, positions[i].y - p.y),
      }))
      .filter((e) => e.j !== i)
      .sort((a, b) => a.d - b.d);

    // Connect to nearest 2 neighbours
    for (let k = 0; k < Math.min(2, distances.length); k++) {
      const a = Math.min(i, distances[k].j);
      const b = Math.max(i, distances[k].j);
      const key = `${a}-${b}`;
      if (!pairs.has(key)) {
        pairs.add(key);
        lines.push([a, b]);
      }
    }
  }

  return lines;
}

// ─── Individual star ─────────────────────────────────────────────────────────

interface StarProps {
  agent: AgentSnapshot;
  x: number; // px in the canvas
  y: number; // px
  isPulsing: boolean;
  isHovered: boolean;
  onHoverEnter: () => void;
  onHoverLeave: () => void;
  breathePhase: number; // 0..1 oscillation for halo breathing
}

function Star({
  agent,
  x,
  y,
  isPulsing,
  isHovered,
  onHoverEnter,
  onHoverLeave,
  breathePhase,
}: StarProps) {
  const maxCalls = 60; // clamp
  const ratio = Math.min(agent.toolCallCount / maxCalls, 1);
  const diameter = STAR_MIN + (STAR_MAX - STAR_MIN) * ratio;
  const r = diameter / 2;

  const color = STAR_COLOR[agent.status];
  const glowColor = GLOW_COLOR[agent.status];

  // Breathe: halo radius oscillates gently
  const haloBase = 40;
  const haloMax = 80;
  const haloR = haloBase + (haloMax - haloBase) * breathePhase;
  const haloOpacity = 0.55 + 0.35 * breathePhase;

  // Pulse: radial scale + opacity wave
  const pulseScale = isPulsing ? 1.65 : 1;
  const pulseOpacity = isPulsing ? 0.6 : 1;

  return (
    <g
      transform={`translate(${x}, ${y})`}
      style={{ cursor: "pointer" }}
      onMouseEnter={onHoverEnter}
      onMouseLeave={onHoverLeave}
    >
      {/* Halo (breathing) */}
      <circle
        r={haloR}
        fill="none"
        stroke={glowColor}
        strokeWidth={haloR * 0.55}
        opacity={haloOpacity * 0.55}
        style={{ filter: "blur(1px)", transition: "r 200ms ease-out" }}
      />

      {/* Inner soft glow */}
      <circle
        r={r * 2.8}
        fill={glowColor}
        opacity={0.4}
        style={{ filter: "blur(0.5px)" }}
      />

      {/* Core orb */}
      <circle
        r={r}
        fill={color}
        style={{
          filter: `drop-shadow(0 0 ${r * 1.4}px ${color})`,
          transform: `scale(${pulseScale})`,
          opacity: pulseOpacity,
          transition: isPulsing
            ? `transform ${PULSE_DURATION}ms cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity ${PULSE_DURATION}ms ease-out`
            : "transform 400ms ease-out, opacity 400ms ease-out",
        }}
      />

      {/* Centre pinpoint — brighter */}
      <circle r={r * 0.35} fill="rgba(255,255,255,0.85)" />

      {/* Hover label */}
      {isHovered && (
        <g transform={`translate(${r + 10}, ${-r})`}>
          <rect
            x={0}
            y={-13}
            width={Math.max(agent.projectName.length * 7.2, 100)}
            height={agent.currentTool ? 38 : 22}
            rx={4}
            fill="rgba(15, 14, 19, 0.88)"
            stroke="rgba(214, 163, 103, 0.35)"
            strokeWidth={0.8}
          />
          <text
            x={8}
            y={2}
            fill="#D6A367"
            fontFamily="ui-monospace, 'SF Mono', Menlo, monospace"
            fontSize={10}
            letterSpacing="0.06em"
          >
            {agent.projectName}
          </text>
          {agent.currentTool && (
            <text
              x={8}
              y={18}
              fill="#8A8099"
              fontFamily="ui-monospace, 'SF Mono', Menlo, monospace"
              fontSize={9}
              letterSpacing="0.04em"
            >
              {agent.currentTool.toolStatus.slice(0, 36)}
              {agent.currentTool.toolStatus.length > 36 ? "…" : ""}
            </text>
          )}
        </g>
      )}
    </g>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ConstellationVariant() {
  const { agents, connected } = useAgentStream();

  // Ticker for animations (16fps is plenty for breathing)
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 60);
    return () => clearInterval(t);
  }, []);

  // Canvas dimensions (SVG fills its container)
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 800, h: 600 });
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver((entries) => {
      const e = entries[0];
      if (e) setDims({ w: e.contentRect.width, h: e.contentRect.height });
    });
    obs.observe(el);
    // Initial
    setDims({ w: el.offsetWidth, h: el.offsetHeight });
    return () => obs.disconnect();
  }, []);

  // Positions (recomputed on agents change)
  const positions = computePositions(agents);
  const lines = computeLines(positions);

  // Convert fractional positions → pixel positions
  const px = (pos: StarPosition) => ({
    x: pos.x * dims.w,
    y: pos.y * dims.h,
  });

  // Hover state
  const [hoveredId, setHoveredId] = useState<number | null>(null);

  // Pulse tracking — map of agentId → pulse start time
  const pulseRef = useRef<Map<number, number>>(new Map());
  const [pulseVersion, setPulseVersion] = useState(0); // force re-render

  // Detect tool fires (toolCallCount increments)
  const prevCountsRef = useRef<Map<number, number>>(new Map());
  useEffect(() => {
    const prev = prevCountsRef.current;
    let changed = false;
    for (const agent of agents) {
      const prevCount = prev.get(agent.id) ?? agent.toolCallCount;
      if (agent.toolCallCount > prevCount) {
        pulseRef.current.set(agent.id, Date.now());
        changed = true;
      }
      prev.set(agent.id, agent.toolCallCount);
    }
    if (changed) setPulseVersion((v) => v + 1);
  }, [agents]);

  // Breathing oscillator (0..1, sinusoidal, ~3.8s period)
  const breathePhase =
    (Math.sin((tick * 60 * 2 * Math.PI) / BREATHE_PERIOD) + 1) / 2;

  // Is agent currently pulsing?
  const isPulsing = useCallback(
    (id: number): boolean => {
      const start = pulseRef.current.get(id);
      if (!start) return false;
      return Date.now() - start < PULSE_DURATION * 2;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pulseVersion, tick],
  );

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        minHeight: "100vh",
        background:
          "radial-gradient(ellipse 70% 70% at 50% 50%, #0F0E13 0%, #13111A 55%, #1A1822 100%)",
        overflow: "hidden",
        fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
      }}
    >
      <style>{`
        @keyframes constellation-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .constellation-line {
          animation: constellation-fade-in 600ms ease-out both;
        }
        .constellation-star {
          animation: constellation-fade-in 400ms ease-out both;
        }
      `}</style>

      {/* Header — minimal, upper-left only */}
      <header
        style={{
          position: "absolute",
          top: 20,
          left: 24,
          zIndex: 10,
          fontSize: 10,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: "rgba(214, 163, 103, 0.55)",
          userSelect: "none",
          lineHeight: 1.4,
        }}
      >
        CONSTELLATION · V3 · {connected ? "live" : "reconnecting…"}
      </header>

      {/* Subtle star field background (static decorative dots) */}
      <BackgroundStarField seed={42} count={180} />

      {/* Canvas — full container */}
      <div ref={containerRef} style={{ position: "absolute", inset: 0 }}>
        {agents.length === 0 ? (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "rgba(138, 128, 153, 0.55)",
              fontStyle: "italic",
              fontSize: 15,
              fontFamily: "'Iowan Old Style', Palatino, Georgia, serif",
              letterSpacing: "0.04em",
              userSelect: "none",
            }}
          >
            the sky is empty
          </div>
        ) : (
          <svg width={dims.w} height={dims.h} style={{ display: "block" }}>
            {/* Connecting lines */}
            {lines.map(([ai, bi]) => {
              const a = positions[ai];
              const b = positions[bi];
              if (!a || !b) return null;
              const pa = px(a);
              const pb = px(b);
              return (
                <line
                  key={`${a.id}-${b.id}`}
                  className="constellation-line"
                  x1={pa.x}
                  y1={pa.y}
                  x2={pb.x}
                  y2={pb.y}
                  stroke="rgba(214, 163, 103, 0.18)"
                  strokeWidth={0.8}
                  style={{
                    transition:
                      "opacity 600ms ease-out, x1 500ms ease-out, y1 500ms ease-out, x2 500ms ease-out, y2 500ms ease-out",
                  }}
                />
              );
            })}

            {/* Stars */}
            {agents.map((agent, i) => {
              const pos = positions[i];
              if (!pos) return null;
              const { x, y } = px(pos);
              return (
                <g key={agent.id} className="constellation-star">
                  <Star
                    agent={agent}
                    x={x}
                    y={y}
                    isPulsing={isPulsing(agent.id)}
                    isHovered={hoveredId === agent.id}
                    onHoverEnter={() => setHoveredId(agent.id)}
                    onHoverLeave={() => setHoveredId(null)}
                    breathePhase={breathePhase}
                  />
                </g>
              );
            })}
          </svg>
        )}
      </div>

      {/* Legend — bottom-right, minimal */}
      <footer
        style={{
          position: "absolute",
          bottom: 20,
          right: 24,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: 6,
          zIndex: 10,
        }}
      >
        {(["active", "permission", "waiting", "idle"] as const).map((s) => (
          <div
            key={s}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              fontSize: 9,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "rgba(138, 128, 153, 0.6)",
              userSelect: "none",
            }}
          >
            <span style={{ fontSize: 8, letterSpacing: "0.08em" }}>{s}</span>
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: STAR_COLOR[s],
                boxShadow: `0 0 6px ${STAR_COLOR[s]}`,
                flexShrink: 0,
              }}
            />
          </div>
        ))}
      </footer>
    </div>
  );
}

// ─── Background star field (decorative, purely visual) ────────────────────────

function BackgroundStarField({ seed, count }: { seed: number; count: number }) {
  // Deterministic pseudo-random from seed
  const stars = Array.from({ length: count }, (_, i) => {
    const h = Math.sin(seed + i * 2.3999) * 43758.5453;
    const x = (h - Math.floor(h)) * 100;
    const h2 = Math.sin(seed + i * 1.7121) * 43758.5453;
    const y = (h2 - Math.floor(h2)) * 100;
    const h3 = Math.sin(seed + i * 3.1415) * 43758.5453;
    const size = 0.8 + (h3 - Math.floor(h3)) * 1.2;
    const h4 = Math.sin(seed + i * 0.9273) * 43758.5453;
    const opacity = 0.08 + (h4 - Math.floor(h4)) * 0.25;
    return { x, y, size, opacity };
  });

  return (
    <svg
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
      }}
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid slice"
    >
      {stars.map((s, i) => (
        <circle
          key={i}
          cx={s.x}
          cy={s.y}
          r={s.size * 0.18}
          fill="white"
          opacity={s.opacity}
        />
      ))}
    </svg>
  );
}
