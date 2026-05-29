"use client";

import type { Station } from "@/lib/musicSources";
import { GenreBadge } from "./SourceBadge";

interface StationCardProps {
  station: Station;
  isActive: boolean;
  onSelect: () => void;
}

/** Palette swatches used when no artworkUrl is provided, keyed by station paletteFit */
const PALETTE_SWATCHES: Record<string, string> = {
  day: "linear-gradient(135deg, #3F6FA8, #D87C52)",
  twilight: "linear-gradient(135deg, #1F3252, #F2B585)",
  midnight: "linear-gradient(135deg, #091433, #5E82E8)",
};

export function StationCard({ station, isActive, onSelect }: StationCardProps) {
  const swatch = PALETTE_SWATCHES[station.paletteFit ?? "day"];
  const artStyle = station.artworkUrl
    ? {
        backgroundImage: `url(${station.artworkUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : { background: swatch };

  return (
    <button
      type="button"
      onClick={onSelect}
      className="station-card spring-hover"
      data-active={isActive ? "true" : undefined}
      aria-pressed={isActive}
      aria-label={`Play ${station.title} — ${station.subtitle}`}
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        gap: 0,
        padding: 0,
        border: isActive
          ? "2px solid var(--accent)"
          : "1px solid var(--border-soft)",
        borderRadius: "12px",
        background: "var(--panel)",
        cursor: "pointer",
        textAlign: "left",
        overflow: "hidden",
        transition: "border-color 200ms ease, box-shadow 200ms ease",
        boxShadow: isActive
          ? "0 0 0 3px color-mix(in srgb, var(--accent) 22%, transparent), 0 6px 24px rgba(60,80,100,0.18)"
          : "0 2px 10px rgba(60,80,100,0.08)",
      }}
    >
      {/* Artwork / swatch area */}
      <div
        style={{
          ...artStyle,
          width: "100%",
          aspectRatio: "16/9",
          position: "relative",
          flexShrink: 0,
        }}
      >
        {/* Active playing indicator */}
        {isActive && (
          <span
            aria-hidden
            style={{
              position: "absolute",
              top: "6px",
              right: "8px",
              fontSize: "16px",
              lineHeight: 1,
              color: "#fff",
              textShadow: "0 1px 6px rgba(0,0,0,0.6)",
              animation: "station-pulse 1.8s ease-in-out infinite",
            }}
          >
            ♪
          </span>
        )}
      </div>

      {/* Info area */}
      <div
        style={{
          padding: "8px 10px 10px",
          display: "flex",
          flexDirection: "column",
          gap: "4px",
          flex: 1,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "4px",
          }}
        >
          <span
            style={{
              fontFamily: "var(--serif), serif",
              fontSize: "13px",
              fontWeight: 600,
              color: "var(--fg)",
              lineHeight: 1.2,
              flex: 1,
            }}
          >
            {station.title}
          </span>
          <GenreBadge genre={station.genre} size="sm" />
        </div>
        <span
          style={{
            fontFamily: "var(--body), sans-serif",
            fontSize: "10px",
            color: "var(--muted)",
            lineHeight: 1.35,
            letterSpacing: "0.01em",
          }}
        >
          {station.subtitle}
        </span>
        {isActive && (
          <span
            style={{
              fontFamily: "var(--mono), monospace",
              fontSize: "9px",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--accent)",
              marginTop: "2px",
            }}
          >
            Now Playing
          </span>
        )}
      </div>
    </button>
  );
}
