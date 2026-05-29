"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  play as playChime,
  playThrottled as playChimeThrottled,
  unlockAudio,
  setEnabled as setSoundEnabled,
  type ChimeName,
} from "../../lib/sound";

const STORAGE_KEY = "pg-os-sound-enabled";

interface SoundContextValue {
  enabled: boolean;
  toggle: () => void;
  setEnabled: (next: boolean) => void;
  play: (name: ChimeName) => void;
  playThrottled: (name: ChimeName, cooldownMs: number) => void;
}

const SoundContext = createContext<SoundContextValue | null>(null);

function readStored(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function SoundProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabledState] = useState(false);

  // Hydrate from localStorage on mount (don't read during SSR to avoid hydration mismatch)
  useEffect(() => {
    setEnabledState(readStored());
  }, []);

  // Sync enabled state into the module-level gate so raw play() imports
  // (e.g. ModeProvider) also respect the SoundToggle preference.
  useEffect(() => {
    setSoundEnabled(enabled);
  }, [enabled]);

  const setEnabled = useCallback((next: boolean) => {
    setEnabledState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    } catch {
      /* ignore quota / private mode */
    }
    if (next) {
      // Resume the AudioContext on the gesture that turned sound on, so
      // Safari/Chrome autoplay policies don't suspend the first chime.
      void unlockAudio();
    }
  }, []);

  const toggle = useCallback(() => setEnabled(!enabled), [enabled, setEnabled]);

  const play = useCallback(
    (name: ChimeName) => {
      if (!enabled) return;
      playChime(name);
    },
    [enabled],
  );

  const playThrottled = useCallback(
    (name: ChimeName, cooldownMs: number) => {
      if (!enabled) return;
      playChimeThrottled(name, cooldownMs);
    },
    [enabled],
  );

  return (
    <SoundContext.Provider
      value={{ enabled, toggle, setEnabled, play, playThrottled }}
    >
      {children}
    </SoundContext.Provider>
  );
}

export function useSound(): SoundContextValue {
  const ctx = useContext(SoundContext);
  if (!ctx) {
    // Safe fallback — lets components call useSound() without crashing if
    // the provider hasn't mounted yet (e.g. during SSR or storybook).
    return {
      enabled: false,
      toggle: () => {},
      setEnabled: () => {},
      play: () => {},
      playThrottled: () => {},
    };
  }
  return ctx;
}

export function SoundToggle() {
  const { enabled, toggle, play } = useSound();
  const onClick = () => {
    const next = !enabled;
    toggle();
    // Demo chime when turning ON, so PG hears the volume he just enabled.
    if (next) {
      // play() guard re-checks enabled, which is stale here — call playChime directly
      // via a microtask so the state update flushes first.
      queueMicrotask(() => play("capture"));
    }
  };
  return (
    <button
      type="button"
      className={`sound-toggle${enabled ? " on" : ""}`}
      onClick={onClick}
      aria-pressed={enabled}
      aria-label={
        enabled ? "Sound on — click to mute" : "Sound off — click to enable"
      }
      title={enabled ? "Sound on" : "Sound off"}
    >
      <span className="sound-toggle-icon" aria-hidden>
        {enabled ? "♪" : "♪̸"}
      </span>
      <span className="sound-toggle-label">{enabled ? "ON" : "OFF"}</span>
    </button>
  );
}
