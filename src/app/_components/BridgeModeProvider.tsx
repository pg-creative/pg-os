"use client";
import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";

export type HomeMode = "bridge" | "personal";

const KEY = "pg-os-home-mode";

type Ctx = {
  mode: HomeMode;
  setMode: (m: HomeMode) => void;
  toggle: () => void;
};

const BridgeModeCtx = createContext<Ctx | null>(null);

export function BridgeModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<HomeMode>("bridge");

  useEffect(() => {
    const saved = localStorage.getItem(KEY);
    if (saved === "bridge" || saved === "personal") setModeState(saved);
  }, []);

  const setMode = useCallback((m: HomeMode) => {
    setModeState(m);
    localStorage.setItem(KEY, m);
  }, []);

  const toggle = useCallback(() => {
    setModeState((prev) => {
      const next: HomeMode = prev === "bridge" ? "personal" : "bridge";
      localStorage.setItem(KEY, next);
      return next;
    });
  }, []);

  // ⌘/ global hotkey
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "/" && (e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [toggle]);

  return (
    <BridgeModeCtx.Provider value={{ mode, setMode, toggle }}>
      {children}
    </BridgeModeCtx.Provider>
  );
}

export function useBridgeMode() {
  const ctx = useContext(BridgeModeCtx);
  if (!ctx) throw new Error("useBridgeMode must be used within BridgeModeProvider");
  return ctx;
}

export function HomeModeBadge() {
  const { mode } = useBridgeMode();
  return <>{mode === "bridge" ? "BRIDGE" : "PERSONAL"}</>;
}
