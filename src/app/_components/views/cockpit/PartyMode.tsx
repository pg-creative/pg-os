"use client";

/**
 * PartyMode — "initialize party mode" 🎉. Heavy confetti + strobing lights +
 * the disco track in a deliberately cheesy old-2009-YouTube player frame.
 */

import { useEffect, useRef } from "react";

const VIDEO_ID = "i2FW1WJc0lg"; // McFadden & Whitehead — Ain't No Stoppin' Us Now (Official Audio)

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
      "#FFD23F",
      "#06D6A0",
    ];
    const bits = Array.from({ length: 480 }, () => ({
      x: Math.random() * c.width,
      y: Math.random() * -c.height,
      r: 5 + Math.random() * 10,
      vy: 2.5 + Math.random() * 5,
      vx: -3 + Math.random() * 6,
      col: colors[Math.floor(Math.random() * colors.length)],
      rot: Math.random() * 6,
      vr: -0.3 + Math.random() * 0.6,
    }));
    let raf = 0;
    const draw = () => {
      x.clearRect(0, 0, c.width, c.height);
      for (const b of bits) {
        b.y += b.vy;
        b.x += b.vx;
        b.rot += b.vr;
        if (b.y > c.height + 12) {
          b.y = -12;
          b.x = Math.random() * c.width;
        }
        x.save();
        x.translate(b.x, b.y);
        x.rotate(b.rot);
        x.fillStyle = b.col;
        x.fillRect(-b.r / 2, -b.r / 2, b.r, b.r * 1.5);
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
        @keyframes partypulse { from{opacity:.3} to{opacity:.9} }
        .party-strobe {
          position:absolute; inset:0; mix-blend-mode:screen;
          background:
            radial-gradient(circle at 15% 25%, rgba(214,163,103,.6), transparent 40%),
            radial-gradient(circle at 85% 60%, rgba(184,83,111,.6), transparent 40%),
            radial-gradient(circle at 50% 88%, rgba(91,123,161,.6), transparent 40%),
            radial-gradient(circle at 70% 15%, rgba(124,154,110,.55), transparent 38%),
            radial-gradient(circle at 30% 70%, rgba(255,210,63,.5), transparent 38%);
          animation: partyhue 3s linear infinite, partypulse .45s ease-in-out infinite alternate;
        }
        .yt-logo { font-family: Arial, sans-serif; font-weight:bold; font-size:22px; }
        .yt-logo b { background:#cc181e; color:#fff; padding:1px 6px; border-radius:5px; }
      `}</style>
      <div className="party-strobe" />
      <canvas ref={canvasRef} style={{ position: "absolute", inset: 0 }} />

      <div
        style={{
          position: "absolute",
          top: 18,
          left: 0,
          right: 0,
          textAlign: "center",
          fontFamily: '"Iowan Old Style",Palatino,Georgia,serif',
          fontSize: 56,
          fontWeight: 600,
          color: "#FDEFD2",
          textShadow: "0 2px 26px rgba(214,163,103,.95)",
        }}
      >
        ✨ PARTY MODE ✨
      </div>

      {/* cheesy old-2009-YouTube player */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%,-50%)",
          width: 600,
          background: "#f9f9f9",
          border: "1px solid #ccc",
          borderRadius: 4,
          boxShadow: "0 20px 60px rgba(0,0,0,.6)",
          pointerEvents: "auto",
          fontFamily: "Arial, Helvetica, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "8px 12px",
            borderBottom: "1px solid #e3e3e3",
            background: "#fff",
          }}
        >
          <span className="yt-logo">
            You<b>Tube</b>
          </span>
          <div
            style={{
              flex: 1,
              border: "1px solid #ccc",
              borderRadius: 2,
              padding: "3px 6px",
              color: "#999",
              fontSize: 12,
              background: "#fff",
            }}
          >
            aint no stoppin us now
          </div>
          <span style={{ fontSize: 11, color: "#2793e6" }}>Sign In</span>
        </div>
        <div
          style={{
            background: "#000",
            aspectRatio: "16/9",
            position: "relative",
          }}
        >
          <iframe
            title="party"
            src={`https://www.youtube.com/embed/${VIDEO_ID}?autoplay=1&rel=0`}
            allow="autoplay; encrypted-media"
            allowFullScreen
            style={{
              width: "100%",
              height: "100%",
              border: 0,
              display: "block",
            }}
          />
        </div>
        <div style={{ padding: "8px 12px", color: "#333" }}>
          <div style={{ fontSize: 15, fontWeight: "bold", color: "#1a1a1a" }}>
            Ain&apos;t No Stoppin&apos; Us Now (1979) [HQ] 🕺
          </div>
          <div style={{ fontSize: 11, color: "#666", margin: "3px 0 8px" }}>
            👁 2,153,089 views · ★★★★★ · Uploaded May 20, 2009 by{" "}
            <span style={{ color: "#2793e6" }}>MarvisDiscoVEVO</span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              fontSize: 12,
              color: "#555",
              borderTop: "1px solid #eee",
              paddingTop: 8,
            }}
          >
            <span>👍 12,043</span>
            <span>👎 87</span>
            <span>💬 Comments (411)</span>
            <span>⤴ Share</span>
            <span
              style={{
                marginLeft: "auto",
                background: "#cc181e",
                color: "#fff",
                padding: "4px 10px",
                borderRadius: 2,
                fontWeight: "bold",
              }}
            >
              Subscribe
            </span>
          </div>
          <div style={{ fontSize: 10.5, color: "#999", marginTop: 6 }}>
            video not playing?{" "}
            <a
              href={`https://www.youtube.com/watch?v=${VIDEO_ID}`}
              target="_blank"
              rel="noreferrer"
              style={{ color: "#2793e6" }}
            >
              ▶ watch on YouTube
            </a>
          </div>
        </div>
      </div>

      <button
        onClick={onClose}
        style={{
          position: "absolute",
          bottom: 30,
          left: "50%",
          transform: "translateX(-50%)",
          pointerEvents: "auto",
          background: "#13110D",
          border: "1px solid #D6A367",
          color: "#D6A367",
          borderRadius: 8,
          padding: "10px 24px",
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
