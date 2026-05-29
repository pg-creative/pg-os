"use client";

/**
 * V3 ScenePanel — full reimagine. The dropdown opens with a 100px illustrated
 * "scene header": a per-genre gradient sky, the station title in serif, and a
 * monoline genre glyph (leaf / wave / sword / star / void-circle). The station
 * list sits below a kintsugi seam. The closed pill leads with the genre glyph.
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

// Monoline genre glyphs (stroke-based, no emoji).
function GenreGlyph({
  genre,
  color,
  size = 14,
}: {
  genre: MusicGenre;
  color: string;
  size?: number;
}) {
  const p = { stroke: color, strokeWidth: 1.6, fill: "none" as const };
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden>
      {genre === "Lofi" && (
        <path
          {...p}
          d="M8 2 C5 5 5 9 8 14 C11 9 11 5 8 2 Z M8 2 L8 14"
          strokeLinejoin="round"
        />
      )}
      {genre === "Chill" && (
        <path
          {...p}
          d="M1 6 Q4 3 7 6 T13 6 M1 10 Q4 7 7 10 T13 10"
          strokeLinecap="round"
        />
      )}
      {genre === "Game" && (
        <path
          {...p}
          d="M3 13 L11 5 M9 3 L13 7 L11 5 M3 13 L5 13 L3 11 Z"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      )}
      {genre === "Jazz" && (
        <path
          {...p}
          d="M8 1.5 L9.6 6 L14 6 L10.4 8.8 L11.8 13 L8 10.3 L4.2 13 L5.6 8.8 L2 6 L6.4 6 Z"
          strokeLinejoin="round"
        />
      )}
      {genre === "Ambient" && (
        <circle {...p} cx="8" cy="8" r="5.5" strokeDasharray="2 2.4" />
      )}
    </svg>
  );
}

export default function V3ScenePanel({
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
    ? currentStation.title.toUpperCase().slice(0, 12)
    : "RADIO";

  return (
    <div style={{ position: "relative" }}>
      {/* Closed pill: glyph + name + bars */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 7,
          padding: "5px 11px",
          borderRadius: 8,
          border: `1px solid ${playing ? gt.seed + "99" : "var(--border-soft)"}`,
          background: playing ? gt.seed + "16" : "transparent",
          color: "var(--fg)",
          cursor: "pointer",
          fontFamily: "var(--mono), monospace",
          fontSize: 11,
          letterSpacing: "0.08em",
          boxShadow: playing ? `0 0 10px ${gt.glow}` : "none",
          transition: "all 200ms",
        }}
      >
        <span
          aria-hidden
          style={{
            display: "inline-flex",
            animation: playing ? "v3-pulse 2.4s ease-in-out infinite" : "none",
          }}
        >
          <GenreGlyph genre={activeGenre} color={gt.seed} />
        </span>
        <span>{label}</span>
        {playing && (
          <span className="v3-eq" aria-hidden style={{ color: gt.seed }}>
            <span className="v3-eq-bar" />
            <span className="v3-eq-bar" />
            <span className="v3-eq-bar" />
          </span>
        )}
      </button>

      {isOpen && (
        <div
          role="menu"
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            width: 360,
            background: "var(--panel-solid)",
            border: `1px solid ${gt.seed}44`,
            borderRadius: 14,
            boxShadow: "0 20px 60px rgba(0,0,0,0.26)",
            zIndex: 1000,
            overflow: "hidden",
          }}
        >
          {/* Scene header */}
          <div
            style={{
              position: "relative",
              height: 100,
              padding: "16px 18px",
              background: `${gt.sceneBg}, var(--panel-solid)`,
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-end",
              overflow: "hidden",
            }}
          >
            <span
              aria-hidden
              style={{
                position: "absolute",
                top: 10,
                right: 12,
                opacity: 0.16,
              }}
            >
              <GenreGlyph genre={activeGenre} color={gt.seed} size={48} />
            </span>
            <div
              style={{
                fontFamily: "var(--mono), monospace",
                fontSize: 9,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: gt.seed,
                marginBottom: 4,
              }}
            >
              {playing ? "Now Playing" : "PG Radio"} · {activeGenre}
            </div>
            <div
              style={{
                fontFamily: "var(--serif), serif",
                fontSize: 19,
                fontWeight: 600,
                color: "var(--fg)",
                lineHeight: 1.1,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {currentStation ? currentStation.title : "Select a station"}
            </div>
            <div
              style={{
                fontFamily: "var(--mono), monospace",
                fontSize: 10,
                color: "var(--muted)",
                marginTop: 2,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {currentStation ? currentStation.subtitle : "Pick a vibe below"}
            </div>
          </div>

          {/* Seam */}
          <div style={{ height: 1, position: "relative" }}>
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: `linear-gradient(90deg, transparent, ${gt.gold}aa 30%, ${gt.seed} 50%, ${gt.gold}aa 70%, transparent)`,
                clipPath:
                  "polygon(0% 50%, 8% 20%, 16% 70%, 26% 30%, 36% 64%, 46% 12%, 56% 74%, 66% 26%, 76% 60%, 86% 22%, 94% 66%, 100% 50%)",
              }}
            />
          </div>

          <div style={{ padding: 12 }}>
            {/* Transport */}
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                marginBottom: 8,
              }}
            >
              <button
                type="button"
                onClick={toggle}
                disabled={!currentStation}
                aria-label={isPlaying ? "Pause" : "Play"}
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: "50%",
                  background: currentStation ? gt.seed : "var(--border-soft)",
                  color: "#160f08",
                  border: "none",
                  cursor: currentStation ? "pointer" : "default",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 10,
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
                maxHeight: 260,
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
                      border: `1px solid ${active ? sg.seed : "var(--border-soft)"}`,
                      background: active ? sg.seed + "16" : "transparent",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "all 150ms",
                    }}
                  >
                    <GenreGlyph genre={station.genre} color={sg.seed} />
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
                  </button>
                );
              })}
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginTop: 10,
                paddingTop: 10,
                borderTop: "1px solid var(--border-soft)",
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
        @keyframes v3-pulse { 0%,100% { opacity: 1 } 50% { opacity: .45 } }
        .v3-eq { display: inline-flex; align-items: flex-end; gap: 2px; width: 10px; height: 12px; }
        .v3-eq-bar { width: 2px; background: currentColor; border-radius: 1px; transform-origin: bottom; animation: v3-eq-bounce 0.9s ease-in-out infinite; }
        .v3-eq-bar:nth-child(1){ height: 7px; animation-delay: 0s }
        .v3-eq-bar:nth-child(2){ height: 11px; animation-delay: .15s }
        .v3-eq-bar:nth-child(3){ height: 6px; animation-delay: .30s }
        @keyframes v3-eq-bounce { 0%,100% { transform: scaleY(.35) } 50% { transform: scaleY(1) } }
        @media (prefers-reduced-motion: reduce) { .v3-eq-bar, [class^="v3-"] { animation: none !important } }
      `}</style>
    </div>
  );
}
