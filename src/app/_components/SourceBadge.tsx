"use client";

import type { MusicGenre } from "@/lib/musicSources";

interface GenreBadgeProps {
  genre: MusicGenre;
  size?: "sm" | "md";
}

// Genre colors drawn from PG's palette: warm golds for lofi, powder blue for
// chill, jewel tones for game/jazz, deep indigo for ambient/midnight.
const GENRE_CONFIG: Record<
  MusicGenre,
  { color: string; bg: string; border: string }
> = {
  Lofi: {
    color: "#E5C58A",
    bg: "rgba(229,197,138,0.12)",
    border: "rgba(229,197,138,0.38)",
  },
  Chill: {
    color: "#8FB8D8",
    bg: "rgba(143,184,216,0.12)",
    border: "rgba(143,184,216,0.38)",
  },
  Game: {
    color: "#7BB58F",
    bg: "rgba(123,181,143,0.12)",
    border: "rgba(123,181,143,0.38)",
  },
  Jazz: {
    color: "#D98A6A",
    bg: "rgba(217,138,106,0.12)",
    border: "rgba(217,138,106,0.38)",
  },
  Ambient: {
    color: "#8190C0",
    bg: "rgba(129,144,192,0.12)",
    border: "rgba(129,144,192,0.38)",
  },
};

/**
 * GenreBadge — small uppercase chip showing a station's genre.
 * (Replaced the old source-based badge on 2026-05-29 when every station became
 * a direct audio stream, making a "RADIO/YOUTUBE/SPOTIFY" badge meaningless.)
 */
export function GenreBadge({ genre, size = "sm" }: GenreBadgeProps) {
  const cfg = GENRE_CONFIG[genre];
  const fontSize = size === "sm" ? "9px" : "11px";
  const padding = size === "sm" ? "2px 6px" : "3px 8px";

  return (
    <span
      style={{
        display: "inline-block",
        fontFamily: "var(--mono), monospace",
        fontSize,
        fontWeight: 500,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: cfg.color,
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        borderRadius: "4px",
        padding,
        lineHeight: 1.3,
        userSelect: "none",
        whiteSpace: "nowrap",
      }}
    >
      {genre}
    </span>
  );
}
