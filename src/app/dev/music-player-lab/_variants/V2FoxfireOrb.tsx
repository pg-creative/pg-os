"use client";

/**
 * V2 FoxfireOrb — bold motion. A drifting genre-colored orb field sits behind
 * the dropdown content (kodama-foxfire recipe lifted inline from emaki
 * materials, recolored per genre). The closed pill becomes a glowing "ember"
 * with two micro-orbs drifting inside it. Same list layout as V1.
 */

import { useState } from "react";
import { usePlayer } from "@/app/_components/PlayerProvider";
import { STATIONS, type MusicGenre } from "@/lib/musicSources";
import { GENRE_THEMES } from "@/lib/genreTheme";

interface VariantProps {
  forceOpen?: boolean;
  previewGenre?: MusicGenre;
  previewPlaying?: boolean;
}

// Seeded orb scatter for the dropdown background (smaller than full-bleed).
const ORBS = [
  { top: "14%", left: "18%", size: 7, dur: 7.2, delay: 0 },
  { top: "30%", left: "78%", size: 5, dur: 9.1, delay: 1.3 },
  { top: "52%", left: "40%", size: 8, dur: 6.4, delay: 2.6 },
  { top: "68%", left: "86%", size: 5, dur: 8.3, delay: 0.9 },
  { top: "78%", left: "24%", size: 6, dur: 10.2, delay: 3.2 },
  { top: "22%", left: "55%", size: 4, dur: 8.8, delay: 4.1 },
  { top: "44%", left: "9%", size: 6, dur: 6.9, delay: 2.1 },
];

export default function V2FoxfireOrb({
  forceOpen,
  previewGenre,
  previewPlaying,
}: VariantProps) {
  const {
    currentStation,
    isPlaying,
    volume,
    selectStation,
    toggle,
    setVolume,
  } = usePlayer();
  const [open, setOpen] = useState(false);
  const isOpen = forceOpen || open;

  const activeGenre: MusicGenre =
    previewGenre ?? currentStation?.genre ?? "Lofi";
  const gt = GENRE_THEMES[activeGenre];
  const playing = previewPlaying ?? (isPlaying && !!currentStation);
  const label = currentStation
    ? currentStation.title.toUpperCase().slice(0, 14)
    : "RADIO";

  return (
    <div style={{ position: "relative" }}>
      {/* Closed "ember" pill */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          position: "relative",
          display: "inline-flex",
          alignItems: "center",
          gap: 7,
          padding: "5px 11px",
          borderRadius: 8,
          border: `1px solid ${playing ? gt.seed : "var(--border-soft)"}`,
          background: playing ? gt.seed + "1a" : "transparent",
          color: "var(--fg)",
          cursor: "pointer",
          fontFamily: "var(--mono), monospace",
          fontSize: 11,
          letterSpacing: "0.08em",
          overflow: "hidden",
          boxShadow: playing
            ? `0 0 0 1px ${gt.seed}66, 0 0 14px ${gt.glow}`
            : "none",
          transition: "all 200ms",
        }}
      >
        {/* micro drifting orbs inside the pill */}
        {playing && (
          <>
            <span
              aria-hidden
              className="v2-orb"
              style={{
                left: 8,
                top: 6,
                width: 5,
                height: 5,
                background: `radial-gradient(circle at 35% 35%, ${gt.orbColor}, transparent 70%)`,
                boxShadow: `0 0 6px ${gt.orbGlow}`,
                ["--d" as string]: "5.5s",
                ["--dl" as string]: "0s",
              }}
            />
            <span
              aria-hidden
              className="v2-orb"
              style={{
                right: 10,
                bottom: 5,
                width: 4,
                height: 4,
                background: `radial-gradient(circle at 35% 35%, ${gt.orbColor}, transparent 70%)`,
                boxShadow: `0 0 6px ${gt.orbGlow}`,
                ["--d" as string]: "7s",
                ["--dl" as string]: "1.2s",
              }}
            />
          </>
        )}
        <span
          aria-hidden
          style={{ color: gt.seed, fontSize: 13, position: "relative" }}
        >
          {playing ? "◉" : "♪"}
        </span>
        <span style={{ position: "relative" }}>{label}</span>
      </button>

      {isOpen && (
        <div
          role="menu"
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            width: 340,
            background: "var(--panel-solid)",
            border: `1px solid ${gt.seed}55`,
            borderRadius: 14,
            boxShadow: `0 20px 60px rgba(0,0,0,0.28), 0 0 18px ${gt.glow} inset`,
            zIndex: 1000,
            overflow: "hidden",
          }}
        >
          {/* Orb field layer */}
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 0,
              overflow: "hidden",
              pointerEvents: "none",
            }}
          >
            {ORBS.map((o, i) => (
              <span
                key={i}
                className="v2-orb"
                style={{
                  top: o.top,
                  left: o.left,
                  width: o.size,
                  height: o.size,
                  background: `radial-gradient(circle at 35% 35%, ${gt.orbColor}, transparent 70%)`,
                  boxShadow: `0 0 ${o.size * 2}px ${gt.orbGlow}`,
                  ["--d" as string]: `${o.dur}s`,
                  ["--dl" as string]: `${o.delay}s`,
                }}
              />
            ))}
            {/* genre tint top + legibility scrim bottom */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: `linear-gradient(180deg, ${gt.topTint} 0%, transparent 34%, var(--panel-solid) 88%)`,
              }}
            />
          </div>

          {/* Content */}
          <div style={{ position: "relative", zIndex: 1, padding: 14 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 12,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: "var(--serif), serif",
                    fontSize: 14,
                    fontWeight: 600,
                    color: "var(--fg)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {currentStation ? currentStation.title : "PG Radio"}
                </div>
                <div
                  style={{
                    fontFamily: "var(--mono), monospace",
                    fontSize: 9,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: "var(--muted)",
                    marginTop: 2,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {currentStation
                    ? currentStation.subtitle
                    : "Select a station"}
                </div>
              </div>
              <button
                type="button"
                onClick={toggle}
                disabled={!currentStation}
                aria-label={isPlaying ? "Pause" : "Play"}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: "50%",
                  background: currentStation ? gt.seed : "var(--border-soft)",
                  color: "#160f08",
                  border: "none",
                  cursor: currentStation ? "pointer" : "default",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 11,
                  flexShrink: 0,
                  boxShadow: currentStation ? `0 0 12px ${gt.glow}` : "none",
                }}
              >
                {isPlaying ? "❚❚" : "▶"}
              </button>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 4,
                maxHeight: 300,
                overflowY: "auto",
              }}
            >
              {STATIONS.map((station) => {
                const active = currentStation?.id === station.id;
                const sg = GENRE_THEMES[station.genre];
                return (
                  <button
                    key={station.id}
                    type="button"
                    onClick={() => selectStation(station.id)}
                    aria-label={`Play ${station.title}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "8px 10px",
                      borderRadius: 8,
                      border: `1px solid ${active ? sg.seed : "rgba(255,255,255,0.10)"}`,
                      background: active
                        ? sg.seed + "22"
                        : "rgba(255,255,255,0.03)",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "all 150ms",
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontFamily: "var(--serif), serif",
                          fontSize: 12,
                          fontWeight: 600,
                          color: "var(--fg)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {station.title}
                      </div>
                      <div
                        style={{
                          fontFamily: "var(--mono), monospace",
                          fontSize: 9,
                          color: "var(--muted)",
                          marginTop: 2,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {station.subtitle}
                      </div>
                    </div>
                    <span
                      style={{
                        fontFamily: "var(--mono), monospace",
                        fontSize: 9,
                        fontWeight: 500,
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                        color: sg.seed,
                        background: sg.seed + "22",
                        border: `1px solid ${sg.seed}66`,
                        borderRadius: 4,
                        padding: "2px 6px",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {station.genre}
                    </span>
                  </button>
                );
              })}
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginTop: 12,
                paddingTop: 10,
                borderTop: `1px solid ${gt.seed}33`,
              }}
            >
              <span
                style={{
                  fontFamily: "var(--mono), monospace",
                  fontSize: 9,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "var(--muted)",
                }}
              >
                Vol
              </span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                aria-label="Volume"
                style={{ flex: 1, accentColor: gt.seed, cursor: "pointer" }}
              />
            </div>
          </div>
        </div>
      )}

      <style>{`
        .v2-orb { position: absolute; border-radius: 50%; pointer-events: none;
          animation: v2-drift var(--d, 8s) ease-in-out infinite var(--dl, 0s); }
        @keyframes v2-drift {
          0% { transform: translate(0,0) scale(1); opacity: .5 }
          25% { transform: translate(5px,-8px) scale(1.12); opacity: .9 }
          50% { transform: translate(-4px,-13px) scale(.96); opacity: .65 }
          75% { transform: translate(7px,-5px) scale(1.06); opacity: .8 }
          100% { transform: translate(0,0) scale(1); opacity: .5 }
        }
        @media (prefers-reduced-motion: reduce) { .v2-orb { animation: none } }
      `}</style>
    </div>
  );
}
