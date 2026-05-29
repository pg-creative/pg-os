"use client";

/**
 * V1 SceneWash — light touch. Keeps the current dropdown structure (header +
 * station list + volume) but the whole panel gets a per-genre gradient wash,
 * the decorative cloud takes the genre color, the seam above volume is tinted,
 * and the closed pill gets a 5-bar genre-colored waveform + glow.
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

export default function V1SceneWash({
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
      {/* Closed pill */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 7,
          padding: "5px 11px",
          borderRadius: 8,
          border: `1px solid ${playing ? gt.seed + "88" : "var(--border-soft)"}`,
          background: playing ? gt.seed + "18" : "transparent",
          color: "var(--fg)",
          cursor: "pointer",
          fontFamily: "var(--mono), monospace",
          fontSize: 11,
          letterSpacing: "0.08em",
          boxShadow: playing ? `0 0 10px ${gt.glow}` : "none",
          transition: "all 200ms",
        }}
      >
        {playing ? (
          <span className="v1-eq" aria-hidden style={{ color: gt.seed }}>
            <span className="v1-eq-bar" />
            <span className="v1-eq-bar" />
            <span className="v1-eq-bar" />
            <span className="v1-eq-bar" />
            <span className="v1-eq-bar" />
          </span>
        ) : (
          <span aria-hidden style={{ color: gt.seed, fontSize: 13 }}>
            ♪
          </span>
        )}
        <span>{label}</span>
      </button>

      {isOpen && (
        <div
          role="menu"
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            width: 340,
            background: `${gt.sceneBg}, var(--panel-solid)`,
            border: `1px solid ${gt.seed}44`,
            borderRadius: 14,
            boxShadow: `0 20px 60px rgba(0,0,0,0.22), 0 0 0 1px ${gt.seed}22 inset`,
            padding: 14,
            zIndex: 1000,
            overflow: "hidden",
          }}
        >
          {/* Genre-colored decorative cloud */}
          <svg
            viewBox="0 0 200 80"
            aria-hidden
            style={{
              position: "absolute",
              right: -20,
              bottom: -10,
              width: 220,
              height: 88,
              opacity: 0.2,
              pointerEvents: "none",
            }}
          >
            <path
              d="M30,60 Q30,40 50,42 Q55,22 80,28 Q90,12 115,22 Q140,18 145,38 Q170,38 172,55 Q178,62 165,68 L40,68 Q22,66 30,60 Z"
              fill={gt.seed}
            />
          </svg>

          <div style={{ position: "relative", zIndex: 1 }}>
            {/* Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 12,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {playing && (
                    <span
                      aria-hidden
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: gt.seed,
                        boxShadow: `0 0 8px ${gt.seed}`,
                        flexShrink: 0,
                        animation: "v1-pulse 2s ease-in-out infinite",
                      }}
                    />
                  )}
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
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: currentStation ? gt.seed : "var(--border-soft)",
                  color: "#1a120a",
                  border: "none",
                  cursor: currentStation ? "pointer" : "default",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 10,
                  flexShrink: 0,
                }}
              >
                {isPlaying ? "❚❚" : "▶"}
              </button>
            </div>

            {/* Station list */}
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
                      border: "1px solid",
                      borderColor: active ? sg.seed : "var(--border-soft)",
                      borderLeft: active
                        ? `3px solid ${sg.seed}`
                        : "1px solid var(--border-soft)",
                      background: active ? sg.seed + "16" : "transparent",
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
                        background: sg.seed + "1f",
                        border: `1px solid ${sg.seed}55`,
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

            {/* Kintsugi seam (genre gold) */}
            <div
              style={{
                height: 1,
                position: "relative",
                margin: "12px 0 10px",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: `linear-gradient(90deg, transparent 0%, ${gt.gold}55 15%, ${gt.seed}cc 40%, ${gt.gold} 50%, ${gt.seed}cc 60%, ${gt.gold}55 85%, transparent 100%)`,
                  clipPath:
                    "polygon(0% 50%, 6% 15%, 13% 72%, 21% 28%, 29% 65%, 37% 8%, 45% 78%, 53% 22%, 61% 62%, 69% 32%, 77% 58%, 85% 12%, 93% 68%, 100% 50%)",
                }}
              />
            </div>

            {/* Volume */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
        @keyframes v1-pulse { 0%,100% { opacity: 1 } 50% { opacity: 0.4 } }
        .v1-eq { display: inline-flex; align-items: flex-end; gap: 2px; width: 16px; height: 14px; }
        .v1-eq-bar { width: 2px; background: currentColor; border-radius: 1px; transform-origin: bottom; animation: v1-eq-bounce 0.9s ease-in-out infinite; }
        .v1-eq-bar:nth-child(1){ height: 6px; animation-delay: 0s }
        .v1-eq-bar:nth-child(2){ height: 12px; animation-delay: .12s }
        .v1-eq-bar:nth-child(3){ height: 8px; animation-delay: .24s }
        .v1-eq-bar:nth-child(4){ height: 13px; animation-delay: .36s }
        .v1-eq-bar:nth-child(5){ height: 7px; animation-delay: .48s }
        @keyframes v1-eq-bounce { 0%,100% { transform: scaleY(0.35) } 50% { transform: scaleY(1) } }
        @media (prefers-reduced-motion: reduce) {
          .v1-eq-bar { animation: none; transform: scaleY(0.7) }
        }
      `}</style>
    </div>
  );
}
