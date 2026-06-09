"use client";

/**
 * NowPlayingModule — Spotify now-playing glance (no tap target).
 * Fetches /api/spotify/now-playing.
 */

import { useState, useEffect } from "react";
import { BentoBox } from "../../../bento/BentoBox";
import { useEmaki } from "../../../bento/emakiContext";

interface NowPlayingResp {
  authed: boolean;
  playing?: boolean;
  track?: {
    id: string;
    name: string;
    artists: string;
    album: string;
    albumArt: string | null;
    progressMs: number;
    durationMs: number;
    externalUrl: string;
  };
}

export function NowPlayingModule({ cols = 6 }: { cols?: number }) {
  const { tk } = useEmaki();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<NowPlayingResp | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/spotify/now-playing")
      .then((r) => r.json())
      .then((d: NowPlayingResp) => {
        if (cancelled) return;
        setData(d);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const playing = data?.playing && data?.track;

  return (
    <BentoBox cols={cols} eyebrow="Now Playing" kanji="楽">
      {loading ? (
        <span style={{ opacity: 0.45, fontSize: 13 }}>Loading...</span>
      ) : !data?.authed ? (
        <span style={{ opacity: 0.5, fontSize: 13 }}>Connect Spotify</span>
      ) : !playing ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            opacity: 0.5,
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 8,
              background: `linear-gradient(135deg, ${tk.accent}30, ${tk.foxfire}20)`,
              border: `1.5px solid ${tk.panelBorder}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20,
              flexShrink: 0,
            }}
          >
            ♪
          </div>
          <span style={{ fontSize: 13 }}>Nothing playing</span>
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {data.track!.albumArt ? (
            <img
              src={data.track!.albumArt}
              alt="Album art"
              style={{
                width: 44,
                height: 44,
                borderRadius: 8,
                objectFit: "cover",
                border: `1.5px solid ${tk.panelBorder}`,
                flexShrink: 0,
              }}
            />
          ) : (
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 8,
                background: `linear-gradient(135deg, ${tk.accent}30, ${tk.foxfire}20)`,
                border: `1.5px solid ${tk.panelBorder}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 20,
                flexShrink: 0,
              }}
            >
              ♪
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 15,
                fontWeight: 600,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {data.track!.name}
            </div>
            <div style={{ fontSize: 12, opacity: 0.6, marginTop: 2 }}>
              {data.track!.artists}
            </div>
          </div>
          {/* EQ bars — animate only when actually playing */}
          <div
            aria-label="Now playing"
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: 3,
              height: 16,
              flexShrink: 0,
            }}
          >
            {[0.6, 1, 0.75, 0.9, 0.5].map((h, i) => (
              <div
                key={i}
                style={{
                  width: 3,
                  height: 16 * h,
                  borderRadius: 1.5,
                  background: `linear-gradient(180deg, ${tk.foxfireGlow}, ${tk.accent})`,
                  animation: `np-pulse ${0.6 + i * 0.12}s ease-in-out infinite alternate`,
                }}
              />
            ))}
          </div>
          <style>{`
            @keyframes np-pulse { from { transform: scaleY(0.3); } to { transform: scaleY(1); } }
            @media (prefers-reduced-motion: reduce) { [aria-label="Now playing"] > div { animation: none !important; } }
          `}</style>
        </div>
      )}
    </BentoBox>
  );
}
