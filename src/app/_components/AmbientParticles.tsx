"use client";
import { useMemo } from "react";

const N = 32;

export function AmbientParticles() {
  const particles = useMemo(() => {
    return Array.from({ length: N }, (_, i) => {
      const s = (i * 37 + 13) % 100;
      const size = 2 + ((s * 3) % 5);
      const colorIdx = (s % 3) + 1;
      return {
        i,
        left: (s * 7) % 100,
        size,
        dur: 14 + ((s * 11) % 18),
        delay: (s * 0.3) % 22,
        dx: ((s % 7) - 3) * 30,
        opacity: 0.3 + ((s % 5) * 0.12),
        colorIdx,
      };
    });
  }, []);

  return (
    <div className="particles" aria-hidden="true">
      {particles.map((p) => {
        const colorVar = `var(--particle-${p.colorIdx})`;
        return (
          <div
            key={p.i}
            className="p"
            style={{
              left: `${p.left}%`,
              width: `${p.size}px`,
              height: `${p.size}px`,
              background: colorVar,
              ["--dx" as string]: `${p.dx}px`,
              ["--po" as string]: p.opacity.toFixed(2),
              animationDuration: `${p.dur}s`,
              animationDelay: `-${p.delay}s`,
              boxShadow: `0 0 ${p.size * 2}px ${colorVar}`,
            }}
          />
        );
      })}
    </div>
  );
}
