/**
 * Zustand store for PG OS music player.
 *
 * Persisted keys: volume, lastPlayedIds
 * In-memory only: currentStationId, isPlaying, duckLevel
 * (avoids surprise autoplay on page reload)
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

const DEDUP_CAP = 6;

interface MusicState {
  // Playback state (in-memory, not persisted)
  currentStationId: string | null;
  isPlaying: boolean;
  duckLevel: number; // 1 = normal, 0.25 = ducked by voice capture

  // Persisted preferences
  volume: number; // 0..1, default 0.7
  lastPlayedIds: string[]; // most-recent first, capped at DEDUP_CAP

  // Actions
  selectStation: (id: string | null) => void;
  setPlaying: (playing: boolean) => void;
  setVolume: (v: number) => void;
  setDuck: (level: number) => void;
}

// Separate the persisted slice so we can use the `partialize` option
type PersistedSlice = Pick<MusicState, "volume" | "lastPlayedIds">;

export const useMusicStore = create<MusicState>()(
  persist(
    (set) => ({
      // In-memory defaults
      currentStationId: null,
      isPlaying: false,
      duckLevel: 1,

      // Persisted defaults
      volume: 0.7,
      lastPlayedIds: [],

      selectStation: (id) =>
        set((state) => {
          if (id === null) {
            return { currentStationId: null, isPlaying: false };
          }
          // Deduplicate and prepend; cap at DEDUP_CAP
          const filtered = state.lastPlayedIds.filter((x) => x !== id);
          const lastPlayedIds = [id, ...filtered].slice(0, DEDUP_CAP);
          return {
            currentStationId: id,
            isPlaying: true,
            lastPlayedIds,
          };
        }),

      setPlaying: (playing) => set({ isPlaying: playing }),

      setVolume: (v) => set({ volume: Math.min(1, Math.max(0, v)) }),

      setDuck: (level) => set({ duckLevel: level }),
    }),
    {
      name: "pg-os-music-store",
      storage: createJSONStorage(() => {
        // Guard for SSR — return a no-op storage when window isn't available
        if (typeof window === "undefined") {
          return {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {},
          };
        }
        return window.localStorage;
      }),
      // Only persist preferences — not transient playback state
      partialize: (state): PersistedSlice => ({
        volume: state.volume,
        lastPlayedIds: state.lastPlayedIds,
      }),
    },
  ),
);
