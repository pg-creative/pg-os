"use client";
import { useCallback, useEffect, useState } from "react";

// Curated rotating list of fantasy + video-game lofi YouTube live streams.
// PG can swap with personal picks anytime — these are well-known long-running
// streams as of 2026. ID = YouTube video id.
type Station = { id: string; label: string; vibe: string };

const STATIONS: Station[] = [
  { id: "jfKfPfyJRdk", label: "lofi girl",        vibe: "classic study" },
  { id: "rUxyKA_-grg", label: "synthwave radio",  vibe: "neon city" },
  { id: "5yx6BWlEVcY", label: "chillhop",         vibe: "warm beats" },
  { id: "tNkZsRW7h2c", label: "space ambient",    vibe: "cosmic drift" },
  { id: "DSGyEsJ17cI", label: "fantasy tavern",   vibe: "ttrpg ambience" },
  { id: "AhFL4bJL8XQ", label: "ghibli relaxing",  vibe: "studio ghibli piano" },
];

const KEY = "pg-os-lofi-station-idx";

export function LofiPlayer() {
  const [idx, setIdx] = useState<number>(0);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw !== null) {
        const n = parseInt(raw, 10);
        if (Number.isFinite(n) && n >= 0 && n < STATIONS.length) setIdx(n);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const persist = useCallback((n: number) => {
    try { localStorage.setItem(KEY, String(n)); } catch { /* ignore */ }
  }, []);

  const cycle = useCallback(() => {
    setIdx((prev) => {
      const n = (prev + 1) % STATIONS.length;
      persist(n);
      return n;
    });
  }, [persist]);

  const station = STATIONS[idx];
  const embedUrl = playing
    ? `https://www.youtube.com/embed/${station.id}?autoplay=1&controls=1`
    : null;

  return (
    <div className="bridge-widget bridge-widget-lofi">
      <div className="bridge-widget-label">
        LOFI
        <button
          type="button"
          className="bridge-lofi-cycle"
          onClick={cycle}
          aria-label="Next station"
          title="Next station"
        >
          ↻
        </button>
      </div>
      <div className="bridge-widget-body">
        <div className="bridge-lofi-station">
          <span className="bridge-lofi-name">{station.label}</span>
          <span className="bridge-lofi-vibe">{station.vibe}</span>
        </div>
        {embedUrl ? (
          <div className="bridge-lofi-frame">
            <iframe
              src={embedUrl}
              title={station.label}
              allow="autoplay; encrypted-media"
              loading="lazy"
            />
          </div>
        ) : (
          <button
            type="button"
            className="bridge-lofi-play"
            onClick={() => setPlaying(true)}
          >
            ▶ play
          </button>
        )}
      </div>
    </div>
  );
}
