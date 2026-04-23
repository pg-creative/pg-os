"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type Mode = "laputa-day" | "laputa-twilight" | "laputa-midnight";

export const MODE_LABELS: Record<Mode, string> = {
  "laputa-day": "LAPUTA DAY",
  "laputa-twilight": "LAPUTA TWILIGHT",
  "laputa-midnight": "LAPUTA MIDNIGHT",
};

function modeForHour(h: number): Mode {
  if (h >= 6 && h < 18) return "laputa-day";
  if (h >= 18 && h < 21) return "laputa-twilight";
  return "laputa-midnight";
}

export function greetingForHour(h: number): string {
  if (h >= 5 && h < 12) return "morning,";
  if (h >= 12 && h < 17) return "afternoon,";
  if (h >= 17 && h < 21) return "evening,";
  return "night,";
}

const VALID_MODES: Mode[] = ["laputa-day", "laputa-twilight", "laputa-midnight"];
const KEY_MANUAL = "pg-os-laputa-manual";
const KEY_AUTO = "pg-os-laputa-auto";

type Ctx = {
  mode: Mode;
  autoMode: boolean;
  greeting: string;
  setMode: (m: Mode) => void;
  setAutoMode: (on: boolean) => void;
};

const ModeCtx = createContext<Ctx | null>(null);

export function ModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<Mode>("laputa-day");
  const [autoMode, setAutoModeState] = useState<boolean>(true);
  const [greeting, setGreeting] = useState<string>("afternoon,");

  // Boot from localStorage, then tick once
  useEffect(() => {
    const savedAuto = localStorage.getItem(KEY_AUTO);
    const auto = savedAuto === null ? true : savedAuto === "1";
    setAutoModeState(auto);

    const h = new Date().getHours();
    setGreeting(greetingForHour(h));

    if (auto) {
      setModeState(modeForHour(h));
    } else {
      const manual = localStorage.getItem(KEY_MANUAL) as Mode | null;
      if (manual && VALID_MODES.includes(manual)) setModeState(manual);
    }
  }, []);

  // Re-check every minute so theme + greeting auto-update
  useEffect(() => {
    const tick = () => {
      const h = new Date().getHours();
      setGreeting(greetingForHour(h));
      if (autoMode) setModeState(modeForHour(h));
    };
    const i = setInterval(tick, 60_000);
    return () => clearInterval(i);
  }, [autoMode]);

  // Sync data-variant attribute
  useEffect(() => {
    document.documentElement.setAttribute("data-variant", mode);
  }, [mode]);

  const setMode = (m: Mode) => {
    setModeState(m);
    setAutoModeState(false);
    localStorage.setItem(KEY_MANUAL, m);
    localStorage.setItem(KEY_AUTO, "0");
  };

  const setAutoMode = (on: boolean) => {
    setAutoModeState(on);
    localStorage.setItem(KEY_AUTO, on ? "1" : "0");
    if (on) {
      const h = new Date().getHours();
      setModeState(modeForHour(h));
    }
  };

  return (
    <ModeCtx.Provider value={{ mode, autoMode, greeting, setMode, setAutoMode }}>
      {children}
    </ModeCtx.Provider>
  );
}

export function useMode() {
  const ctx = useContext(ModeCtx);
  if (!ctx) throw new Error("useMode must be used within ModeProvider");
  return ctx;
}
