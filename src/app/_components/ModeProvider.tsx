"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import {
  type BrandMode,
  MODE_CONFIG,
  nextBrandMode,
  prevBrandMode,
} from "../../lib/modes";
import { play } from "../../lib/sound";

export type Mode =
  | "laputa-day"
  | "laputa-twilight"
  | "laputa-midnight"
  | "howls"
  | "totoro"
  | "mononoke";

export const MODE_LABELS: Record<Mode, string> = {
  "laputa-day": "LAPUTA DAY",
  "laputa-twilight": "LAPUTA TWILIGHT",
  "laputa-midnight": "LAPUTA MIDNIGHT",
  howls: "HOWL'S GOLDEN HOUR",
  totoro: "TOTORO DUSK",
  mononoke: "MONONOKE FOREST",
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

const KEY_BRAND = "pg-os-brand-mode";
// Stale keys from the pre-picker era — wiped on boot so auto can't get
// permanently disabled by a leftover value.
const STALE_KEYS = ["pg-os-laputa-manual", "pg-os-laputa-auto"];

const VALID_BRAND_MODES: BrandMode[] = [
  "alchmy",
  "voyager",
  "writer",
  "metrasens",
  "recovery",
];

type Ctx = {
  // Laputa palette state. autoMode is IN-MEMORY ONLY (no localStorage):
  // true = palette tracks time of day, false = ⌘K override locks current pick
  // until the user calls setAutoMode(true) or reloads the page.
  mode: Mode;
  autoMode: boolean;
  greeting: string;
  setMode: (m: Mode) => void;
  setAutoMode: (on: boolean) => void;
  // Brand mode (orthogonal to palette; persisted in localStorage)
  brand: BrandMode | null;
  setBrand: (b: BrandMode | null) => void;
  cycleBrandForward: () => void;
  cycleBrandBack: () => void;
};

const ModeCtx = createContext<Ctx | null>(null);

export function ModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<Mode>("laputa-day");
  const [autoMode, setAutoModeState] = useState<boolean>(true);
  const [greeting, setGreeting] = useState<string>("afternoon,");
  const [brand, setBrandState] = useState<BrandMode | null>(null);

  useEffect(() => {
    STALE_KEYS.forEach((k) => localStorage.removeItem(k));

    const h = new Date().getHours();
    setGreeting(greetingForHour(h));
    setModeState(modeForHour(h));

    const savedBrand = localStorage.getItem(KEY_BRAND) as BrandMode | null;
    if (savedBrand && VALID_BRAND_MODES.includes(savedBrand)) {
      setBrandState(savedBrand);
    }
  }, []);

  // Live tick — palette + greeting follow the clock minute by minute.
  useEffect(() => {
    const tick = () => {
      const h = new Date().getHours();
      setGreeting(greetingForHour(h));
      if (autoMode) setModeState(modeForHour(h));
    };
    const i = setInterval(tick, 60_000);
    return () => clearInterval(i);
  }, [autoMode]);

  useEffect(() => {
    document.documentElement.setAttribute("data-variant", mode);
  }, [mode]);

  useEffect(() => {
    if (brand) {
      document.documentElement.setAttribute("data-brand", brand);
      const cfg = MODE_CONFIG[brand];
      document.documentElement.style.setProperty("--accent-2", cfg.accent);
    } else {
      document.documentElement.removeAttribute("data-brand");
      document.documentElement.style.removeProperty("--accent-2");
    }
  }, [brand]);

  const setMode = (m: Mode) => {
    setModeState(m);
    setAutoModeState(false);
  };

  const setAutoMode = (on: boolean) => {
    setAutoModeState(on);
    if (on) {
      const h = new Date().getHours();
      setModeState(modeForHour(h));
    }
  };

  const setBrand = (b: BrandMode | null) => {
    setBrandState(b);
    if (b) {
      localStorage.setItem(KEY_BRAND, b);
    } else {
      localStorage.removeItem(KEY_BRAND);
    }
  };

  const cycleBrandForward = () => {
    play("brandCycle");
    setBrand(nextBrandMode(brand));
  };

  const cycleBrandBack = () => {
    play("brandCycle");
    setBrand(prevBrandMode(brand));
  };

  return (
    <ModeCtx.Provider
      value={{
        mode,
        autoMode,
        greeting,
        setMode,
        setAutoMode,
        brand,
        setBrand,
        cycleBrandForward,
        cycleBrandBack,
      }}
    >
      {children}
    </ModeCtx.Provider>
  );
}

export function useMode() {
  const ctx = useContext(ModeCtx);
  if (!ctx) throw new Error("useMode must be used within ModeProvider");
  return ctx;
}
