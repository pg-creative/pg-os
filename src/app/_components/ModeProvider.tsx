"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { type BrandMode, MODE_CONFIG, nextBrandMode, prevBrandMode } from "../../lib/modes";

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
  "howls": "HOWL'S GOLDEN HOUR",
  "totoro": "TOTORO DUSK",
  "mononoke": "MONONOKE FOREST",
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

const VALID_MODES: Mode[] = [
  "laputa-day", "laputa-twilight", "laputa-midnight",
  "howls", "totoro", "mononoke",
];
const KEY_MANUAL = "pg-os-laputa-manual";
const KEY_AUTO = "pg-os-laputa-auto";
const KEY_BRAND = "pg-os-brand-mode";

// Backward-compat: any prior alt-palette value still resolves cleanly.
const LEGACY_MAP: Record<string, Mode> = {
  // No remaps needed — laputa-* are canonical again. Reserved for future renames.
};
function migrateMode(raw: string | null): Mode | null {
  if (!raw) return null;
  if ((VALID_MODES as string[]).includes(raw)) return raw as Mode;
  if (raw in LEGACY_MAP) return LEGACY_MAP[raw];
  return null;
}

const VALID_BRAND_MODES: BrandMode[] = ["alchmy", "voyager", "writer", "metrasens", "recovery"];

type Ctx = {
  // ── Laputa time-mode (existing API — unchanged) ──────────────────────────────
  mode: Mode;
  autoMode: boolean;
  greeting: string;
  setMode: (m: Mode) => void;
  setAutoMode: (on: boolean) => void;
  // ── Brand mode (new parallel state) ─────────────────────────────────────────
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
      const migrated = migrateMode(localStorage.getItem(KEY_MANUAL));
      if (migrated) {
        setModeState(migrated);
        localStorage.setItem(KEY_MANUAL, migrated);
      }
    }

    // Restore brand mode from localStorage
    const savedBrand = localStorage.getItem(KEY_BRAND) as BrandMode | null;
    if (savedBrand && VALID_BRAND_MODES.includes(savedBrand)) {
      setBrandState(savedBrand);
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

  // Sync data-variant attribute (Laputa palette)
  useEffect(() => {
    document.documentElement.setAttribute("data-variant", mode);
  }, [mode]);

  // Sync data-brand attribute + CSS accent-2 override
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

  const setBrand = (b: BrandMode | null) => {
    setBrandState(b);
    if (b) {
      localStorage.setItem(KEY_BRAND, b);
    } else {
      localStorage.removeItem(KEY_BRAND);
    }
  };

  const cycleBrandForward = () => {
    setBrand(nextBrandMode(brand));
  };

  const cycleBrandBack = () => {
    setBrand(prevBrandMode(brand));
  };

  return (
    <ModeCtx.Provider value={{
      mode, autoMode, greeting, setMode, setAutoMode,
      brand, setBrand, cycleBrandForward, cycleBrandBack,
    }}>
      {children}
    </ModeCtx.Provider>
  );
}

export function useMode() {
  const ctx = useContext(ModeCtx);
  if (!ctx) throw new Error("useMode must be used within ModeProvider");
  return ctx;
}
