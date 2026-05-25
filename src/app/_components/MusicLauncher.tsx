"use client";

/**
 * MusicLauncher — topbar nav button + drop-down music menu.
 *
 * Pattern (chosen by PG 2026-05-23): top-right in the .telemetry nav cluster.
 * Click the button to drop a popover beneath it. Click-outside or Escape closes.
 * Active-state shows the currently-playing station name on the button label
 * instead of the default "RADIO".
 *
 * The dropdown is the WHOLE music UI — header + transport + source filter
 * chips + station list + volume slider. No separate sheet, no separate mini-
 * player chrome, no floating cabinet.
 */

import { useEffect, useRef, useState } from "react";
import { usePlayer } from "./PlayerProvider";
import { STATIONS, type MusicSource } from "@/lib/musicSources";
import { SourceBadge } from "./SourceBadge";

const FILTERS: ("all" | MusicSource)[] = ["all", "spotify", "youtube", "radio"];

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
  const [filter, setFilter] = useState<"all" | MusicSource>("all");
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

  const visible =
    filter === "all" ? STATIONS : STATIONS.filter((s) => s.source === filter);

  const buttonLabel = currentStation
    ? currentStation.title.toUpperCase().slice(0, 14)
    : "RADIO";

  const livePlaying = !!(currentStation && isPlaying);

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
      >
        {livePlaying ? (
          // Faux audio visualizer — 3 bars bouncing on staggered timings.
          // (YT/Spotify don't expose their audio streams cross-origin, so this
          // is an "is-playing" vibe signal, not a real-time waveform.)
          <span className="ml-eq" aria-hidden>
            <span className="ml-eq-bar" />
            <span className="ml-eq-bar" />
            <span className="ml-eq-bar" />
          </span>
        ) : (
          <span className="sound-toggle-icon" aria-hidden>
            ♪
          </span>
        )}
        <span className="sound-toggle-label">{buttonLabel}</span>
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Music"
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            width: "340px",
            // Anime-y painted Ghibli background: layered radial gradients for
            // golden-hour glow + a base panel color underneath. The decorative
            // cloud SVG below adds quiet visual weight without competing with
            // the station list for attention.
            background: `
              radial-gradient(ellipse 280px 180px at 88% 8%, rgba(229,197,138,0.28) 0%, transparent 60%),
              radial-gradient(ellipse 260px 220px at 12% 95%, rgba(140,180,210,0.22) 0%, transparent 65%),
              radial-gradient(ellipse 200px 140px at 50% 50%, rgba(196,144,68,0.08) 0%, transparent 70%),
              var(--panel-solid)
            `,
            border: "1px solid var(--border)",
            borderRadius: "14px",
            boxShadow:
              "0 20px 60px rgba(0,0,0,0.22), 0 4px 12px rgba(0,0,0,0.10), 0 0 0 1px rgba(255,255,255,0.16) inset",
            padding: "14px",
            zIndex: 1000,
            overflow: "hidden",
          }}
        >
          {/* Anime-y decorative cloud silhouette — Ghibli-style cumulus at
              very low opacity in the bottom-right. Pure decoration, doesn't
              participate in layout. */}
          <svg
            viewBox="0 0 200 80"
            aria-hidden
            style={{
              position: "absolute",
              right: -20,
              bottom: -10,
              width: 220,
              height: 88,
              opacity: 0.18,
              pointerEvents: "none",
              zIndex: 0,
            }}
          >
            <path
              d="M30,60 Q30,40 50,42 Q55,22 80,28 Q90,12 115,22 Q140,18 145,38 Q170,38 172,55 Q178,62 165,68 L40,68 Q22,66 30,60 Z"
              fill="#E5C58A"
            />
            <path
              d="M85,52 Q85,42 100,44 Q105,32 122,38 Q138,38 138,50 Q150,52 148,58 L90,58 Q80,57 85,52 Z"
              fill="#FFF8E8"
              opacity="0.6"
            />
          </svg>
          {/* Tiny torii silhouette in the top-left, also decorative. */}
          <svg
            viewBox="0 0 40 40"
            aria-hidden
            style={{
              position: "absolute",
              left: 10,
              top: 6,
              width: 22,
              height: 22,
              opacity: 0.14,
              pointerEvents: "none",
              zIndex: 0,
            }}
          >
            <path
              d="M4 10 L36 10 L34 13 L28 13 L28 36 L26 36 L26 13 L14 13 L14 36 L12 36 L12 13 L6 13 Z M4 6 L36 6 L36 9 L4 9 Z M14 17 L26 17 L26 19 L14 19 Z"
              fill="#1F3258"
            />
          </svg>
          {/* Content wrapper — sits above decorations */}
          <div style={{ position: "relative", zIndex: 1 }}>
            {/* Header: title + transport */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                marginBottom: "10px",
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  {currentStation && isPlaying && (
                    <span
                      style={{
                        width: "6px",
                        height: "6px",
                        borderRadius: "50%",
                        background: "var(--accent)",
                        boxShadow: "0 0 8px var(--accent)",
                        flexShrink: 0,
                        animation: "ml-pulse 2s ease-in-out infinite",
                      }}
                      aria-hidden
                    />
                  )}
                  <div
                    style={{
                      fontFamily: "var(--serif), serif",
                      fontSize: "14px",
                      fontWeight: 600,
                      color: "var(--fg)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {currentStation ? currentStation.title : "PG Radio"}
                  </div>
                </div>
                <div
                  style={{
                    fontFamily: "var(--mono), monospace",
                    fontSize: "9px",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: "var(--muted)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    marginTop: "2px",
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
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  background: currentStation
                    ? "var(--fg)"
                    : "var(--border-soft)",
                  color: "var(--bg-0)",
                  border: "none",
                  cursor: currentStation ? "pointer" : "default",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "10px",
                  fontFamily: "inherit",
                  flexShrink: 0,
                }}
                aria-label={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? "❚❚" : "▶"}
              </button>
            </div>

            {/* Source filter chips */}
            <div
              style={{
                display: "flex",
                gap: "4px",
                marginBottom: "10px",
              }}
            >
              {FILTERS.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  style={{
                    flex: 1,
                    padding: "6px 8px",
                    borderRadius: "8px",
                    border: "1px solid",
                    borderColor:
                      filter === f ? "var(--accent)" : "var(--border-soft)",
                    background:
                      filter === f
                        ? "color-mix(in srgb, var(--accent) 12%, transparent)"
                        : "transparent",
                    color: filter === f ? "var(--fg)" : "var(--muted)",
                    fontFamily: "var(--mono), monospace",
                    fontSize: "9px",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    cursor: "pointer",
                    transition: "all 150ms",
                  }}
                  aria-pressed={filter === f}
                >
                  {f}
                </button>
              ))}
            </div>

            {/* Vertical station list (scrollable) */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "4px",
                maxHeight: "320px",
                overflowY: "auto",
              }}
            >
              {visible.map((station) => {
                const active = currentStation?.id === station.id;
                return (
                  <button
                    key={station.id}
                    type="button"
                    onClick={() => selectStation(station.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "8px 10px",
                      borderRadius: "8px",
                      border: "1px solid",
                      borderColor: active
                        ? "var(--accent)"
                        : "var(--border-soft)",
                      background: active
                        ? "color-mix(in srgb, var(--accent) 10%, transparent)"
                        : "transparent",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "all 150ms",
                    }}
                    aria-label={`Play ${station.title}`}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        <span
                          style={{
                            fontFamily: "var(--serif), serif",
                            fontSize: "12px",
                            fontWeight: 600,
                            color: "var(--fg)",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {station.title}
                        </span>
                        {active && (
                          <span
                            style={{
                              fontSize: "10px",
                              color: "var(--accent)",
                            }}
                            aria-hidden
                          >
                            ♪
                          </span>
                        )}
                      </div>
                      <div
                        style={{
                          fontFamily: "var(--mono), monospace",
                          fontSize: "9px",
                          color: "var(--muted)",
                          letterSpacing: "0.06em",
                          marginTop: "2px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {station.subtitle}
                      </div>
                    </div>
                    <SourceBadge source={station.source} size="sm" />
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
                style={{
                  flex: 1,
                  accentColor: "var(--accent)",
                  cursor: "pointer",
                }}
                aria-label="Volume"
              />
            </div>
          </div>
          {/* Visualizer + pulse animations. Defined here so the keyframes
              ship with the component and don't need a globals.css touch. */}
          <style>{`
            @keyframes ml-pulse {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.4; }
            }
            .ml-eq {
              display: inline-flex;
              align-items: flex-end;
              justify-content: center;
              gap: 2px;
              width: 12px;
              height: 14px;
              vertical-align: middle;
            }
            .ml-eq-bar {
              width: 2px;
              background: currentColor;
              border-radius: 1px;
              transform-origin: bottom center;
              animation: ml-eq-bounce 0.9s ease-in-out infinite;
            }
            .ml-eq-bar:nth-child(1) { height: 8px;  animation-delay: 0s; }
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
