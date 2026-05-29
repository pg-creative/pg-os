"use client";

/**
 * CockpitOrb — canvas presence skin. Faceless luminous orb (research #1).
 * Reacts to Marvis state (idle/listening/thinking/speaking) AND live fleet
 * activity (0..1) — busier fleet = denser particles + stronger glow. This is
 * the "aligns with my Claude Code setup" hook: the orb breathes with the work.
 */

import { useEffect, useRef } from "react";

export function CockpitOrb({
  state,
  activity = 0,
  size = 120,
}: {
  state: string;
  activity?: number;
  size?: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef(state);
  const actRef = useRef(activity);
  stateRef.current = state;
  actRef.current = activity;

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const x = c.getContext("2d");
    if (!x) return;
    const W = c.width;
    const H = c.height;
    const cx = W / 2;
    const cy = H / 2;
    const base = W * 0.22;
    let raf = 0;
    let t = 0;
    const parts = Array.from({ length: 22 }, () => ({
      a: Math.random() * 6.28,
      r: base * (1.05 + Math.random() * 0.6),
      sp: 0.002 + Math.random() * 0.004,
    }));

    const frame = () => {
      t += 1;
      const s = stateRef.current;
      const act = actRef.current;
      x.clearRect(0, 0, W, H);
      const speaking = s === "speaking";
      const listening = s === "listening";
      const thinking = s === "thinking";
      const amp = speaking ? Math.sin(t * 0.5) * 0.5 + 0.5 : 0;
      const r =
        base +
        (listening ? Math.sin(t * 0.08) * base * 0.08 : Math.sin(t * 0.03) * base * 0.05) +
        amp * base * 0.18 +
        act * base * 0.12;
      const col = thinking ? "91,123,161" : listening ? "124,154,110" : "214,163,103";

      // aura
      const g = x.createRadialGradient(cx, cy, r * 0.4, cx, cy, r * 2.4);
      g.addColorStop(0, `rgba(${col},${0.45 + act * 0.2})`);
      g.addColorStop(1, `rgba(${col},0)`);
      x.fillStyle = g;
      x.beginPath();
      x.arc(cx, cy, r * 2.4, 0, 6.29);
      x.fill();

      // core
      const cg = x.createRadialGradient(cx - r * 0.3, cy - r * 0.3, 2, cx, cy, r);
      cg.addColorStop(0, "#FDEFD2");
      cg.addColorStop(0.5, thinking ? "#7FA0C8" : "#E8B86A");
      cg.addColorStop(1, thinking ? "#3a4f6b" : "#8a5a2a");
      x.fillStyle = cg;
      x.beginPath();
      x.arc(cx, cy, r, 0, 6.29);
      x.fill();

      // particles (density tracks fleet activity)
      const shown = Math.max(6, Math.round(parts.length * (0.4 + act * 0.6)));
      for (let i = 0; i < shown; i++) {
        const p = parts[i];
        p.a += p.sp * (1 + amp * 3 + act);
        const px = cx + Math.cos(p.a) * (p.r + amp * base * 0.15);
        const py = cy + Math.sin(p.a) * (p.r + amp * base * 0.15);
        x.fillStyle = `rgba(255,225,170,${listening || speaking ? 0.85 : 0.4 + act * 0.3})`;
        x.beginPath();
        x.arc(px, py, 1.6, 0, 6.29);
        x.fill();
      }
      raf = requestAnimationFrame(frame);
    };
    frame();
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <canvas
      ref={ref}
      width={size * 2}
      height={size * 2}
      style={{ width: size, height: size }}
    />
  );
}
