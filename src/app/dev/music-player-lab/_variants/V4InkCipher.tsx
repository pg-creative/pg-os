"use client";

/**
 * V4 InkCipher — the FALSIFIER. Deliberately points away from the painted
 * direction: pure typography + ink, no gradients, no orbs, no illustrations.
 * Editorial / JRPG-menu restraint. Genre is expressed ONLY through a thin
 * accent rule and text color. Built to feel good while asking "do we even
 * need the imagery?"
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

export default function V4InkCipher({
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
  const label = currentStation ? currentStation.title : "Radio";

  return (
    <div style={{ position: "relative" }}>
      {/* Closed pill: serif-italic name, thin genre left-rule, bare bars */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "5px 11px 5px 9px",
          borderRadius: 4,
          border: "1px solid var(--border-soft)",
          borderLeft: `2px solid ${gt.seed}`,
          background: "transparent",
          color: "var(--fg)",
          cursor: "pointer",
          fontFamily: "var(--serif), serif",
          fontStyle: "italic",
          fontSize: 12,
          transition: "border-color 200ms",
        }}
      >
        <span
          style={{
            maxWidth: 110,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {label}
        </span>
        {playing && (
          <span className="v4-eq" aria-hidden style={{ color: gt.seed }}>
            <span className="v4-eq-bar" />
            <span className="v4-eq-bar" />
            <span className="v4-eq-bar" />
            <span className="v4-eq-bar" />
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
            width: 320,
            background: "var(--panel-solid)",
            border: "1px solid var(--border-soft)",
            borderTop: `1px solid ${gt.seed}`,
            borderRadius: 10,
            boxShadow: "0 16px 48px rgba(0,0,0,0.20)",
            padding: 16,
            zIndex: 1000,
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              marginBottom: 14,
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontFamily: "var(--serif), serif",
                  fontSize: 16,
                  fontWeight: 500,
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
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "var(--muted)",
                  marginTop: 3,
                }}
              >
                {currentStation ? currentStation.subtitle : "Select a station"}
              </div>
            </div>
            <span
              style={{
                fontFamily: "var(--mono), monospace",
                fontSize: 9,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: gt.seed,
                flexShrink: 0,
                marginLeft: 10,
              }}
            >
              {activeGenre}
            </span>
          </div>

          {/* Station list */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            {STATIONS.map((station, i) => {
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
                    alignItems: "baseline",
                    justifyContent: "space-between",
                    gap: 10,
                    padding: "9px 4px 9px 10px",
                    borderTop:
                      i === 0 ? "none" : "1px solid var(--border-soft)",
                    borderLeft: active
                      ? `2px solid ${sg.seed}`
                      : "2px solid transparent",
                    background: "transparent",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "border-color 150ms",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--serif), serif",
                      fontSize: 13,
                      fontWeight: active ? 600 : 400,
                      color: active ? sg.seed : "var(--fg)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {station.title}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--mono), monospace",
                      fontSize: 8,
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                      color: active ? sg.seed : "var(--muted)",
                      flexShrink: 0,
                    }}
                  >
                    {station.genre}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Volume + transport */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginTop: 14,
              paddingTop: 12,
              borderTop: `1px solid ${gt.seed}26`,
            }}
          >
            <button
              type="button"
              onClick={toggle}
              disabled={!currentStation}
              aria-label={isPlaying ? "Pause" : "Play"}
              style={{
                width: 28,
                height: 28,
                borderRadius: 4,
                background: "transparent",
                color: currentStation ? gt.seed : "var(--muted)",
                border: `1px solid ${currentStation ? gt.seed : "var(--border-soft)"}`,
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
      )}

      <style>{`
        .v4-eq { display: inline-flex; align-items: flex-end; gap: 2px; width: 13px; height: 11px; }
        .v4-eq-bar { width: 1.5px; background: currentColor; transform-origin: bottom; animation: v4-eq-bounce 1s ease-in-out infinite; }
        .v4-eq-bar:nth-child(1){ height: 5px; animation-delay: 0s }
        .v4-eq-bar:nth-child(2){ height: 10px; animation-delay: .14s }
        .v4-eq-bar:nth-child(3){ height: 7px; animation-delay: .28s }
        .v4-eq-bar:nth-child(4){ height: 9px; animation-delay: .42s }
        @keyframes v4-eq-bounce { 0%,100% { transform: scaleY(.3) } 50% { transform: scaleY(1) } }
        @media (prefers-reduced-motion: reduce) { .v4-eq-bar { animation: none; transform: scaleY(.7) } }
      `}</style>
    </div>
  );
}
