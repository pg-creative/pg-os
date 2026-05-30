"use client";

/**
 * MusicLauncher — topbar nav button + drop-down music menu.
 *
 * Pattern (chosen by PG 2026-05-23): top-right in the .telemetry nav cluster.
 * Click the button to drop a popover beneath it. Click-outside or Escape closes.
 *
 * Design: "ScenePanel" (PG pick 2026-05-29, from /dev/music-player-lab). The
 * dropdown opens with a per-genre illustrated scene header (gradient sky +
 * station title in serif + a monoline genre glyph), a kintsugi seam, then the
 * station list (each row led by its genre glyph) and a volume slider. Theming
 * is genre-keyed via src/lib/genreTheme.ts. Closed pill leads with the active
 * genre glyph + a genre-colored glow + waveform when playing.
 */

import { useEffect, useRef, useState } from "react";
import { usePlayer } from "./PlayerProvider";
import { STATIONS, type MusicGenre } from "@/lib/musicSources";
import { GENRE_THEMES } from "@/lib/genreTheme";

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

export function MusicLauncher() {
  const {
    currentStation,
    isPlaying,
    volume,
    selectStation,
    toggle,
    setVolume,
  } = usePlayer();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Close on click-outside + Escape
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const activeGenre: MusicGenre = currentStation?.genre ?? "Lofi";
  const gt = GENRE_THEMES[activeGenre];
  const livePlaying = !!(currentStation && isPlaying);
  const buttonLabel = currentStation
    ? currentStation.title.toUpperCase().slice(0, 12)
    : "RADIO";

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <button
        type="button"
        className={`sound-toggle music-launcher${livePlaying ? " on" : ""}`}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={open ? "Close music menu" : "Open music menu"}
        title={
          currentStation ? `Playing: ${currentStation.title}` : "Open music"
        }
        style={livePlaying ? { boxShadow: `0 0 10px ${gt.glow}` } : undefined}
      >
        <span
          aria-hidden
          style={{
            display: "inline-flex",
            animation: livePlaying
              ? "ml-pulse 2.4s ease-in-out infinite"
              : "none",
          }}
        >
          <GenreGlyph genre={activeGenre} color={gt.seed} />
        </span>
        <span className="sound-toggle-label">{buttonLabel}</span>
        {livePlaying && (
          <span className="ml-eq" aria-hidden style={{ color: gt.seed }}>
            <span className="ml-eq-bar" />
            <span className="ml-eq-bar" />
            <span className="ml-eq-bar" />
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Music"
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            width: "360px",
            background: "var(--panel-solid)",
            border: `1px solid ${gt.seed}44`,
            borderRadius: "14px",
            boxShadow: "0 20px 60px rgba(0,0,0,0.26)",
            zIndex: 1000,
            overflow: "hidden",
          }}
        >
          {/* Scene header — per-genre painted mood */}
          <div
            style={{
              position: "relative",
              height: "100px",
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
                fontSize: "9px",
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: gt.seed,
                marginBottom: "4px",
              }}
            >
              {livePlaying ? "Now Playing" : "PG Radio"} · {activeGenre}
            </div>
            <div
              style={{
                fontFamily: "var(--serif), serif",
                fontSize: "19px",
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
                fontSize: "10px",
                color: "var(--muted)",
                marginTop: "2px",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {currentStation ? currentStation.subtitle : "Pick a vibe below"}
            </div>
          </div>

          {/* Kintsugi seam (genre gold) */}
          <div style={{ height: "1px", position: "relative" }}>
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

          <div style={{ padding: "12px" }}>
            {/* Transport */}
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                marginBottom: "8px",
              }}
            >
              <button
                type="button"
                onClick={toggle}
                disabled={!currentStation}
                aria-label={isPlaying ? "Pause" : "Play"}
                style={{
                  width: "30px",
                  height: "30px",
                  borderRadius: "50%",
                  background: currentStation ? gt.seed : "var(--border-soft)",
                  color: "#160f08",
                  border: "none",
                  cursor: currentStation ? "pointer" : "default",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "10px",
                  fontFamily: "inherit",
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
                gap: "4px",
                maxHeight: "260px",
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
                      gap: "10px",
                      padding: "8px 10px",
                      borderRadius: "8px",
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
                          fontSize: "12px",
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
                          fontSize: "9px",
                          color: "var(--muted)",
                          marginTop: "2px",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {station.subtitle}
                      </div>
                    </div>
                    {active && (
                      <span
                        aria-hidden
                        style={{ fontSize: "10px", color: sg.seed }}
                      >
                        ♪
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Volume */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginTop: "10px",
                paddingTop: "10px",
                borderTop: "1px solid var(--border-soft)",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--mono), monospace",
                  fontSize: "9px",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "var(--muted)",
                  flexShrink: 0,
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
                style={{ flex: 1, accentColor: gt.seed, cursor: "pointer" }}
                aria-label="Volume"
              />
            </div>
          </div>

          {/* Keyframes ship with the component (no globals.css touch). */}
          <style>{`
            @keyframes ml-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.45; } }
            .ml-eq {
              display: inline-flex; align-items: flex-end; justify-content: center;
              gap: 2px; width: 11px; height: 13px; vertical-align: middle;
            }
            .ml-eq-bar {
              width: 2px; background: currentColor; border-radius: 1px;
              transform-origin: bottom center;
              animation: ml-eq-bounce 0.9s ease-in-out infinite;
            }
            .ml-eq-bar:nth-child(1) { height: 7px;  animation-delay: 0s; }
            .ml-eq-bar:nth-child(2) { height: 12px; animation-delay: 0.15s; }
            .ml-eq-bar:nth-child(3) { height: 6px;  animation-delay: 0.30s; }
            @keyframes ml-eq-bounce {
              0%, 100% { transform: scaleY(0.35); }
              50%      { transform: scaleY(1);    }
            }
            @media (prefers-reduced-motion: reduce) {
              .ml-eq-bar { animation: none; transform: scaleY(0.7); }
            }
          `}</style>
        </div>
      )}
    </div>
  );
}
