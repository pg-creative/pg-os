"use client";

/**
 * PartyMode — the "initialize party mode" easter egg. Confetti + strobing
 * light overlay + autoplaying disco ("Ain't No Stoppin' Us Now"). Triggered
 * by the voice/text command via useMarvis. Pure delight, zero purpose. 🎉
 */

import { useEffect, useRef } from "react";

export function PartyMode({
  active,
  onClose,
}: {
  active: boolean;
  onClose: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!active) return;
    const c = canvasRef.current;
    if (!c) return;
    const x = c.getContext("2d");
    if (!x) return;
    c.width = window.innerWidth;
    c.height = window.innerHeight;
    const colors = [
      "#D6A367",
      "#E8B4A8",
      "#7C9A6E",
      "#5B7BA1",
      "#B8536F",
      "#FDEFD2",
    ];
    const bits = Array.from({ length: 220 }, () => ({
      x: Math.random() * c.width,
      y: Math.random() * -c.height,
      r: 4 + Math.random() * 7,
      vy: 2 + Math.random() * 4,
      vx: -2 + Math.random() * 4,
      col: colors[Math.floor(Math.random() * colors.length)],
      rot: Math.random() * 6,
      vr: -0.2 + Math.random() * 0.4,
    }));
    let raf = 0;
    const draw = () => {
      x.clearRect(0, 0, c.width, c.height);
      for (const b of bits) {
        b.y += b.vy;
        b.x += b.vx;
        b.rot += b.vr;
        if (b.y > c.height + 10) {
          b.y = -10;
          b.x = Math.random() * c.width;
        }
        x.save();
        x.translate(b.x, b.y);
        x.rotate(b.rot);
        x.fillStyle = b.col;
        x.fillRect(-b.r / 2, -b.r / 2, b.r, b.r * 1.6);
        x.restore();
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    const onResize = () => {
      c.width = window.innerWidth;
      c.height = window.innerHeight;
    };
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, [active]);

  if (!active) return null;
  const q = encodeURIComponent("Ain't No Stoppin Us Now McFadden Whitehead");

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        pointerEvents: "none",
      }}
    >
      <style>{`
        @keyframes partyhue { 0%{filter:hue-rotate(0deg)} 100%{filter:hue-rotate(360deg)} }
        @keyframes partypulse { from{opacity:.35} to{opacity:.85} }
        .party-strobe {
          position:absolute; inset:0; mix-blend-mode:screen;
          background:
            radial-gradient(circle at 18% 28%, rgba(214,163,103,.55), transparent 42%),
            radial-gradient(circle at 82% 62%, rgba(184,83,111,.55), transparent 42%),
            radial-gradient(circle at 50% 85%, rgba(91,123,161,.55), transparent 42%),
            radial-gradient(circle at 65% 18%, rgba(124,154,110,.5), transparent 40%);
          animation: partyhue 3s linear infinite, partypulse .5s ease-in-out infinite alternate;
        }
      `}</style>
      <div className="party-strobe" />
      <canvas ref={canvasRef} style={{ position: "absolute", inset: 0 }} />
      <div
        style={{
          position: "absolute",
          top: 26,
          left: 0,
          right: 0,
          textAlign: "center",
          fontFamily: '"Iowan Old Style",Palatino,Georgia,serif',
          fontSize: 52,
          fontWeight: 600,
          color: "#FDEFD2",
          textShadow: "0 2px 24px rgba(214,163,103,.9)",
          letterSpacing: ".02em",
        }}
      >
        ✨ PARTY MODE ✨
      </div>
      {/* autoplaying disco (top search result, no hardcoded video id) */}
      <iframe
        title="party music"
        width="340"
        height="191"
        src={`https://www.youtube.com/embed?listType=search&list=${q}&autoplay=1`}
        allow="autoplay; encrypted-media"
        style={{
          position: "absolute",
          right: 22,
          top: 22,
          border: "3px solid #D6A367",
          borderRadius: 12,
          pointerEvents: "auto",
          boxShadow: "0 0 40px rgba(214,163,103,.6)",
        }}
      />
      <button
        onClick={onClose}
        style={{
          position: "absolute",
          bottom: 32,
          left: "50%",
          transform: "translateX(-50%)",
          pointerEvents: "auto",
          background: "#13110D",
          border: "1px solid #D6A367",
          color: "#D6A367",
          borderRadius: 8,
          padding: "10px 22px",
          cursor: "pointer",
          fontFamily: "ui-monospace,monospace",
          fontSize: 12,
          letterSpacing: ".08em",
          textTransform: "uppercase",
        }}
      >
        end party
      </button>
    </div>
  );
}
