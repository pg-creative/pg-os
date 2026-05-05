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

  return (
    <div className="bridge-widget bridge-widget-bricks">
      <div className="bridge-widget-label">
        BRICK BY BRICK
        <span className="bridge-widget-tag">{state.totalBricks} placed</span>
      </div>
      <div className="bridge-widget-body">
        {phase !== "idle" && (
          <div className={`bb-timer bb-timer-${phase}`}>
            <span className="bb-timer-num">{fmt(remaining)}</span>
            <span className="bb-timer-phase">{phase.toUpperCase()}</span>
          </div>
        )}

        <div className="bb-wall" aria-label={`${state.totalBricks} bricks placed`}>
          <BrickWall total={state.totalBricks} justPlaced={justPlaced} />
        </div>

        <div className="bb-stats">
          <span className="bb-stat">
            <span className="bb-stat-num">{state.bricksToday}</span>
            <span className="bb-stat-label">today</span>
          </span>
          <span className="bb-stat">
            <span className="bb-stat-num">{state.currentStreak}</span>
            <span className="bb-stat-label">streak</span>
          </span>
          <span className="bb-stat">
            <span className="bb-stat-num bb-tier-swatch" style={{ background: tier.color }} aria-hidden />
            <span className="bb-stat-label">{tier.label}</span>
          </span>
        </div>

        {nxt && (
          <div className="bb-next" title={`Unlocks ${nxt.label} bricks at ${nxt.unlockAt} placed`}>
            {toNext} → {nxt.label}
          </div>
        )}

        <div className="bb-actions">
          {phase === "idle" ? (
            <button type="button" className="bridge-btn bridge-btn-approve" onClick={startWork}>
              ▶ Start cycle
            </button>
          ) : (
            <button type="button" className="bridge-btn" onClick={cancel}>
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Wall renderer ────────────────────────────────────────────────────────────
// Show up to MAX_VISIBLE recent bricks, colored by the tier in effect when
// each was placed. Approximation: assume contiguous tiers — works for stat
// display purposes since we don't persist per-brick history.

const MAX_VISIBLE = 60;

function BrickWall({ total, justPlaced }: { total: number; justPlaced: boolean }) {
  const visible = Math.min(total, MAX_VISIBLE);
  if (visible === 0) {
    return <div className="bb-wall-empty">first brick awaits</div>;
  }
  const bricks: string[] = [];
  // Walk forward from total - visible to total - 1, each gets the tier active
  // at that count.
  for (let i = total - visible; i < total; i++) {
    let activeColor = TIERS[0].color;
    for (const t of TIERS) if (i >= t.unlockAt) activeColor = t.color;
    bricks.push(activeColor);
  }
  return (
    <div className="bb-wall-grid">
      {bricks.map((color, i) => (
        <span
          key={`${total}-${i}`}
          className={`bb-brick${justPlaced && i === bricks.length - 1 ? " bb-brick-fresh" : ""}`}
          style={{ background: color }}
        />
      ))}
    </div>
  );
}
