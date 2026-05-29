"use client";

/**
 * PlayerProvider — singleton audio engine for PG OS music player.
 *
 * Mounts:
 *  - A hidden <div id="pgos-yt-player"> for the YouTube IFrame Player singleton
 *  - A single <audio> element for SomaFM / radio streams
 *  - Loads the YouTube IFrame API via next/script (lazyOnload)
 *
 * The YT.Player instance is held in module scope (outside React) to survive
 * React 19 StrictMode double-mount without re-creating the player.
 *
 * Exposes usePlayer() hook for MiniPlayer / PlayerSheet / MusicLauncher.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import Script from "next/script";
import { useMusicStore } from "@/lib/musicStore";
import { getStation, type Station } from "@/lib/musicSources";

// ─── Minimal YouTube IFrame API types ────────────────────────────────────────
// We declare only what PlayerProvider needs — avoids @types/youtube dependency.

interface YTPlayerOptions {
  videoId?: string;
  playerVars?: Record<string, string | number>;
  events?: {
    onReady?: () => void;
    onError?: (e: { data: number }) => void;
  };
}

interface YTPlayerInstance {
  loadVideoById(videoId: string): void;
  playVideo(): void;
  pauseVideo(): void;
  setVolume(vol: number): void; // 0–100
  destroy(): void;
}

interface YTNamespace {
  Player: new (elementId: string, options: YTPlayerOptions) => YTPlayerInstance;
}

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

// ─── Module-scope singletons (survive StrictMode double-mount) ───────────────
let ytPlayer: YTPlayerInstance | null = null;
let ytApiReady = false;
let ytPendingVideoId: string | null = null;

// ─── Safe call helpers ───────────────────────────────────────────────────────
// `new YT.Player()` returns an object IMMEDIATELY, but its methods are only
// bound after the IFrame API finishes booting (onReady fires). Optional
// chaining `ytPlayer?.setVolume(...)` only guards null, not "method not yet
// defined." These helpers add the real guard.

function ytSetVolume(v: number) {
  if (ytPlayer && typeof ytPlayer.setVolume === "function") {
    try {
      ytPlayer.setVolume(v);
    } catch {
      /* noop */
    }
  }
}
function ytLoadVideo(id: string) {
  if (ytPlayer && typeof ytPlayer.loadVideoById === "function") {
    try {
      ytPlayer.loadVideoById(id);
    } catch {
      /* noop */
    }
  } else {
    ytPendingVideoId = id;
  }
}
function ytPlay() {
  if (ytPlayer && typeof ytPlayer.playVideo === "function") {
    try {
      ytPlayer.playVideo();
    } catch {
      /* noop */
    }
  }
}
function ytPause() {
  if (ytPlayer && typeof ytPlayer.pauseVideo === "function") {
    try {
      ytPlayer.pauseVideo();
    } catch {
      /* noop */
    }
  }
}

// ─── Context ─────────────────────────────────────────────────────────────────

interface PlayerContextValue {
  currentStation: Station | null;
  isPlaying: boolean;
  volume: number;
  effectiveVolume: number;
  selectStation: (id: string | null) => void;
  toggle: () => void;
  setVolume: (v: number) => void;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

// ─── Provider ────────────────────────────────────────────────────────────────

export function PlayerProvider({ children }: { children: ReactNode }) {
  const radioRef = useRef<HTMLAudioElement | null>(null);
  // Wrapper React owns; YT API mutates an INNER div inside it without React
  // knowing. Prevents React from trying to reconcile/removeChild on the
  // iframe that YT.Player injects in place of our placeholder div.
  const ytWrapperRef = useRef<HTMLDivElement | null>(null);

  // Imperatively create the inner mount div on first mount only.
  // Subsequent re-renders leave it alone — React doesn't track it.
  useEffect(() => {
    const wrapper = ytWrapperRef.current;
    if (!wrapper) return;
    if (wrapper.querySelector("#pgos-yt-player")) return;
    const inner = document.createElement("div");
    inner.id = "pgos-yt-player";
    wrapper.appendChild(inner);
  }, []);

  const {
    currentStationId,
    isPlaying,
    volume,
    duckLevel,
    selectStation,
    setPlaying,
    setVolume,
  } = useMusicStore();

  const effectiveVolume = volume * duckLevel;

  const currentStation = currentStationId
    ? (getStation(currentStationId) ?? null)
    : null;

  // ── YouTube helpers ────────────────────────────────────────────────────────

  function initYTPlayer(videoId: string) {
    if (!ytApiReady || !window.YT?.Player) {
      ytPendingVideoId = videoId;
      return;
    }
    if (ytPlayer) {
      ytLoadVideo(videoId);
      ytSetVolume(effectiveVolume * 100);
      return;
    }
    // Confirm the inner mount div exists before handing it to YT.Player —
    // protects against init before the wrapper useEffect has run.
    if (!document.getElementById("pgos-yt-player")) {
      ytPendingVideoId = videoId;
      return;
    }
    try {
      ytPlayer = new window.YT.Player("pgos-yt-player", {
        videoId,
        playerVars: {
          autoplay: 1,
          controls: 0,
          disablekb: 1,
          fs: 0,
          iv_load_policy: 3,
          modestbranding: 1,
          rel: 0,
        },
        events: {
          onReady: () => {
            // setVolume IS bound by the time onReady fires; safe path.
            ytSetVolume(effectiveVolume * 100);
          },
          onError: (e) => {
            console.warn("[PlayerProvider] YouTube player error code:", e.data);
          },
        },
      });
    } catch (err) {
      console.warn("[PlayerProvider] Failed to create YT.Player:", err);
    }
  }

  // Register the global callback so the IFrame API can fire it.
  // We set this once; any re-render that fires before the script loads
  // will overwrite with the same function, which is safe.
  if (typeof window !== "undefined") {
    window.onYouTubeIframeAPIReady = () => {
      ytApiReady = true;
      if (ytPendingVideoId) {
        const vid = ytPendingVideoId;
        ytPendingVideoId = null;
        initYTPlayer(vid);
      }
    };
  }

  // ── React to station change ────────────────────────────────────────────────

  useEffect(() => {
    if (!currentStation) {
      // Clear everything
      ytPause();
      if (radioRef.current) {
        radioRef.current.pause();
        radioRef.current.src = "";
        setMediaSessionInactive();
      }
      return;
    }

    if (currentStation.source === "youtube") {
      // Pause radio if it was playing
      if (radioRef.current) {
        radioRef.current.pause();
        radioRef.current.src = "";
        setMediaSessionInactive();
      }
      initYTPlayer(currentStation.sourceId);
    } else if (currentStation.source === "radio") {
      // Pause YouTube
      ytPause();
      if (radioRef.current) {
        radioRef.current.src = currentStation.sourceId;
        radioRef.current.volume = effectiveVolume;
        radioRef.current.play().catch((err) => {
          console.warn("[PlayerProvider] Radio play() rejected:", err);
        });
        setRadioMediaSession(currentStation);
      }
    } else if (currentStation.source === "spotify") {
      // Pause local players
      ytPause();
      if (radioRef.current) {
        radioRef.current.pause();
        radioRef.current.src = "";
        setMediaSessionInactive();
      }
      // Trigger Spotify remote-control
      const body = currentStation.sourceId.startsWith("spotify:playlist:")
        ? { action: "play", context_uri: currentStation.sourceId }
        : { action: "play" };
      fetch("/api/spotify/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).catch((err) => {
        console.warn("[PlayerProvider] Spotify command failed:", err);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStationId]);

  // ── React to effectiveVolume change ───────────────────────────────────────

  useEffect(() => {
    if (!currentStation) return;
    if (currentStation.source === "youtube") {
      ytSetVolume(effectiveVolume * 100);
    } else if (currentStation.source === "radio" && radioRef.current) {
      radioRef.current.volume = effectiveVolume;
    }
    // Spotify has its own volume; we don't control it here
  }, [effectiveVolume, currentStation]);

  // ── React to isPlaying flips ───────────────────────────────────────────────

  useEffect(() => {
    if (!currentStation) return;

    if (currentStation.source === "youtube") {
      if (isPlaying) ytPlay();
      else ytPause();
    } else if (currentStation.source === "radio" && radioRef.current) {
      if (isPlaying) {
        radioRef.current.play().catch((err) => {
          console.warn("[PlayerProvider] Radio resume rejected:", err);
        });
      } else {
        radioRef.current.pause();
      }
    } else if (currentStation.source === "spotify") {
      fetch("/api/spotify/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: isPlaying ? "play" : "pause" }),
      }).catch((err) => {
        console.warn("[PlayerProvider] Spotify pause/resume failed:", err);
      });
    }
  }, [isPlaying, currentStation]);

  // ── Exposed toggle ─────────────────────────────────────────────────────────

  const toggle = useCallback(() => {
    setPlaying(!isPlaying);
  }, [isPlaying, setPlaying]);

  // ── Media Session helpers (radio only) ─────────────────────────────────────

  function setRadioMediaSession(station: Station) {
    if (!("mediaSession" in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: station.title,
      artist: station.subtitle,
      album: "PG OS Radio",
    });
    navigator.mediaSession.setActionHandler("play", () => setPlaying(true));
    navigator.mediaSession.setActionHandler("pause", () => setPlaying(false));
  }

  function setMediaSessionInactive() {
    if (!("mediaSession" in navigator)) return;
    navigator.mediaSession.metadata = null;
    try {
      navigator.mediaSession.setActionHandler("play", null);
      navigator.mediaSession.setActionHandler("pause", null);
    } catch {
      // Some browsers throw if handler wasn't set
    }
  }

  // ── Context value ──────────────────────────────────────────────────────────

  const contextValue: PlayerContextValue = {
    currentStation,
    isPlaying,
    volume,
    effectiveVolume,
    selectStation,
    toggle,
    setVolume,
  };

  return (
    <PlayerContext.Provider value={contextValue}>
      {/* YouTube IFrame API — loaded lazily, fires onYouTubeIframeAPIReady when ready */}
      <Script
        src="https://www.youtube.com/iframe_api"
        strategy="lazyOnload"
        onError={() => {
          console.warn(
            "[PlayerProvider] YouTube IFrame API script failed to load",
          );
        }}
      />

      {/* Hidden YouTube player WRAPPER. React owns this div only. The actual
          #pgos-yt-player mount div is created imperatively inside (see the
          useEffect above) so the YT API's iframe-swap doesn't make React's
          reconciliation throw NotFoundError. */}
      <div
        ref={ytWrapperRef}
        aria-hidden="true"
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          overflow: "hidden",
          opacity: 0,
          pointerEvents: "none",
        }}
      />

      {/* Radio <audio> element — single instance for all radio streams */}
      <audio
        ref={radioRef}
        preload="none"
        aria-hidden="true"
        onError={(e) => {
          console.warn("[PlayerProvider] Radio audio error:", e);
        }}
        style={{ display: "none" }}
      />

      {children}
    </PlayerContext.Provider>
  );
}

// ─── Consumer hook ────────────────────────────────────────────────────────────

export function usePlayer(): PlayerContextValue {
  const ctx = useContext(PlayerContext);
  if (!ctx) {
    // Safe fallback for SSR / components rendered outside the provider
    return {
      currentStation: null,
      isPlaying: false,
      volume: 0.7,
      effectiveVolume: 0.7,
      selectStation: () => {},
      toggle: () => {},
      setVolume: () => {},
    };
  }
  return ctx;
}
