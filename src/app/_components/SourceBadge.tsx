"use client";

import type { MusicSource } from "@/lib/musicSources";

interface SourceBadgeProps {
  source: MusicSource;
  size?: "sm" | "md";
}

const SOURCE_CONFIG: Record<
  MusicSource,
  { label: string; color: string; bg: string; border: string }
> = {
  spotify: {
    label: "SPOTIFY",
    color: "#1DB954",
    bg: "rgba(29,185,84,0.10)",
    border: "rgba(29,185,84,0.35)",
  },
  youtube: {
    label: "YOUTUBE",
    color: "#FF4444",
    bg: "rgba(255,68,68,0.10)",
    border: "rgba(255,68,68,0.35)",
  },
  radio: {
    label: "RADIO",
    color: "#F2B585",
    bg: "rgba(242,181,133,0.12)",
    border: "rgba(242,181,133,0.38)",
  },
};

export function SourceBadge({ source, size = "sm" }: SourceBadgeProps) {
  const cfg = SOURCE_CONFIG[source];
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
      {cfg.label}
    </span>
  );
}
