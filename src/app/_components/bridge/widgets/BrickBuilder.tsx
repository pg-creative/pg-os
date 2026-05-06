"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  BrickPhase,
  BrickState,
  WORK_MIN,
  BREAK_MIN,
  loadBricks,
  saveBricks,
  placeBrick,
  currentTier,
  nextTier,
  TIERS,
} from "@/lib/bricks";

const TICK_MS = 1000;

function fmt(ms: number): string {
  if (ms < 0) ms = 0;
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60).toString().padStart(2, "0");
  const s = (total % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export function BrickBuilder() {
  const [state, setState] = useState<BrickState>(loadBricks);
  const [phase, setPhase] = useState<BrickPhase>("idle");
  const [phaseEndAt, setPhaseEndAt] = useState<number | null>(null);
  const [now, setNow] = useState<number>(() => Date.now());
  const [justPlaced, setJustPlaced] = useState(false);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Live tick while a phase is active
  useEffect(() => {
    if (phase === "idle") {
      if (tickRef.current) {
        clearInterval(tickRef.current);
        tickRef.current = null;
      }
      return;
    }
    tickRef.current = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => {
      if (tickRef.current) {
        clearInterval(tickRef.current);
        tickRef.current = null;
      }
    };
  }, [phase]);

  // Phase transition when timer hits zero
  useEffect(() => {
    if (phase === "idle" || phaseEndAt === null) return;
    if (now < phaseEndAt) return;

    if (phase === "work") {
      const next = placeBrick(state);
      setState(next);
      saveBricks(next);
      setJustPlaced(true);
      try {
        document.body.setAttribute("data-brick-celebrating", "true");
        setTimeout(() => document.body.removeAttribute("data-brick-celebrating"), 1200);
      } catch { /* SSR — ignore */ }
      setTimeout(() => setJustPlaced(false), 1500);
      setPhase("break");
      setPhaseEndAt(Date.now() + BREAK_MIN * 60_000);
    } else if (phase === "break") {
      setPhase("idle");
      setPhaseEndAt(null);
    }
  }, [now, phase, phaseEndAt, state]);

  const startWork = useCallback(() => {
    setPhase("work");
    setPhaseEndAt(Date.now() + WORK_MIN * 60_000);
    setNow(Date.now());
  }, []);

  const cancel = useCallback(() => {
    setPhase("idle");
    setPhaseEndAt(null);
  }, []);

  const remaining = phaseEndAt !== null ? phaseEndAt - now : 0;
  const tier = currentTier(state.totalBricks);
  const nxt = nextTier(state.totalBricks);
  const toNext = nxt ? nxt.unlockAt - state.totalBricks : 0;

  // Phase label for the arcade header
  const phaseLabel =
    phase === "work" ? "WORK" : phase === "break" ? "REST" : "READY";
  const timerText = phase === "idle" ? "25:00" : fmt(remaining);

  return (
    <div className="bridge-widget bridge-widget-bricks bb-arcade">
      <div className="bb-arcade-frame">
        {/* NES sky stars */}
        <span className="bb-arcade-star" style={{ left: "14%", top: "12%" }} />
        <span className="bb-arcade-star" style={{ left: "62%", top: "8%" }} />
        <span className="bb-arcade-star" style={{ left: "82%", top: "18%" }} />
        <span className="bb-arcade-star" style={{ left: "38%", top: "22%" }} />

        {/* Header — 1UP / phase / hi-score */}
        <div className="bb-arcade-header">
          <span className="bb-arcade-1up">1UP</span>
          <span className={`bb-arcade-phase bb-arcade-phase-${phase}`}>
            {phaseLabel}
          </span>
          <span className="bb-arcade-hi">HI {state.longestStreak}</span>
        </div>

        {/* Big chunky timer */}
        <div className={`bb-arcade-timer bb-arcade-timer-${phase}`}>
          {timerText}
        </div>

        {/* Construction site — girder + Mario + brick wall */}
        <div className="bb-arcade-stage">
          <div className="bb-arcade-girder" />
          <div
            className={`bb-arcade-mario ${phase === "work" ? "bb-arcade-mario-walking" : ""}`}
          >
            <Mario />
          </div>
          <div className="bb-arcade-wall" aria-label={`${state.totalBricks} bricks placed`}>
            <BrickWall total={state.totalBricks} justPlaced={justPlaced} />
          </div>
        </div>

        {/* Footer — stats row in pixel mono */}
        <div className="bb-arcade-footer">
          <span>BRICKS:{state.totalBricks}</span>
          <span style={{ color: tier.color }}>{tier.label.toUpperCase()}</span>
          <span>♥{state.currentStreak}</span>
        </div>

        {/* Scanlines overlay */}
        <div className="bb-arcade-scanlines" aria-hidden />
      </div>

      {/* Action button + next-tier hint live OUTSIDE the arcade frame so the
          NES screen is "the game" and the surround is "the cabinet controls". */}
      <div className="bb-arcade-controls">
        {phase === "idle" ? (
          <button type="button" className="bb-arcade-btn bb-arcade-btn-go" onClick={startWork}>
            ▶ INSERT&nbsp;COIN
          </button>
        ) : (
          <button type="button" className="bb-arcade-btn bb-arcade-btn-stop" onClick={cancel}>
            ■ CANCEL
          </button>
        )}
        {nxt && (
          <span className="bb-arcade-next" title={`Unlocks ${nxt.label} at ${nxt.unlockAt}`}>
            {toNext} → {nxt.label}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Brick wall renderer ─────────────────────────────────────────────────
// Up to MAX_VISIBLE recent bricks, colored by the tier active when each was
// placed. Approximation: contiguous tiers — works for display purposes.

const MAX_VISIBLE = 28; // smaller wall to fit beside Mario in the arcade frame

function BrickWall({ total, justPlaced }: { total: number; justPlaced: boolean }) {
  const visible = Math.min(total, MAX_VISIBLE);
  if (visible === 0) {
    return <div className="bb-arcade-wall-empty">FIRST BRICK</div>;
  }
  const bricks: string[] = [];
  for (let i = total - visible; i < total; i++) {
    let activeColor = TIERS[0].color;
    for (const t of TIERS) if (i >= t.unlockAt) activeColor = t.color;
    bricks.push(activeColor);
  }
  return (
    <div className="bb-arcade-wall-grid">
      {bricks.map((color, i) => (
        <span
          key={`${total}-${i}`}
          className={`bb-arcade-brick${justPlaced && i === bricks.length - 1 ? " bb-arcade-brick-fresh" : ""}`}
          style={{ background: color }}
        />
      ))}
    </div>
  );
}

// ── Mario sprite ─────────────────────────────────────────────────────────
// 14×16 px body grid + a hammer that pivots from the shoulder. Inline SVG so
// no asset pipeline; CSS keyframes drive the walk + hammer swing.

function Mario() {
  const px = 3;
  const COLORS: Record<string, string | undefined> = {
    ".": undefined,
    R: "#d23232",
    B: "#3050d0",
    F: "#fcb888",
    K: "#000000",
    Y: "#fcd400",
    H: "#9b9b9b",
    S: "#a05a2c",
  };
  const body = [
    "....KKKKKK....",
    "...KRRRRRRK...",
    "...RRRRRRRR...",
    "..KFFKFFFK....",
    "..KFKFFKFK....",
    "..KFFFFFFFK...",
    "..KKFFFFFKK...",
    "....KKKKK.....",
    "..KKBBYBBKK...",
    ".KRRRBYBRRRK..",
    ".KRRRBBBRRRK..",
    ".KRRRRRRRRKK..",
    ".KKBBBKBBBK...",
    "..KKBBKBBK....",
    "...KKK.KKK....",
    "...KKK.KKK....",
  ];
  const cells: React.ReactNode[] = [];
  body.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      const c = COLORS[ch];
      if (!c) return;
      cells.push(<rect key={`${x}-${y}`} x={x * px} y={y * px} width={px} height={px} fill={c} />);
    }),
  );
  return (
    <svg
      width={14 * px}
      height={16 * px + 16}
      viewBox={`0 0 ${14 * px} ${16 * px + 16}`}
      style={{ overflow: "visible" }}
    >
      <g className="bb-arcade-hammer">
        <rect x={2 * px} y={1 * px} width={px} height={8 * px} fill={COLORS.S} stroke="#000" strokeWidth="0.5" />
        <rect x={0} y={0} width={5 * px} height={3 * px} fill={COLORS.H} stroke="#000" strokeWidth="0.5" />
      </g>
      {cells}
    </svg>
  );
}
