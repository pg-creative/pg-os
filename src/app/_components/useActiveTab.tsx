"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type Tab = "home" | "habits" | "projects" | "flow" | "claude";

export const TABS: { id: Tab; num: string; label: string }[] = [
  { id: "home",     num: "00", label: "HOME" },
  { id: "habits",   num: "01", label: "HABITS" },
  { id: "projects", num: "02", label: "PROJECTS" },
  { id: "flow",     num: "03", label: "FLOW" },
  { id: "claude",   num: "04", label: "CLAUDE" },
];

const KEY = "pg-os-active-tab";
const VALID: Tab[] = ["home", "habits", "projects", "flow", "claude"];

type Ctx = { active: Tab; setActive: (t: Tab) => void };
const TabCtx = createContext<Ctx | null>(null);

export function TabProvider({ children }: { children: ReactNode }) {
  const [active, setActiveState] = useState<Tab>("home");

  useEffect(() => {
    const saved = localStorage.getItem(KEY) as Tab | null;
    if (saved && VALID.includes(saved)) setActiveState(saved);
  }, []);

  const setActive = (t: Tab) => {
    // Always commit the state synchronously. View Transitions API was wrapping
    // the state update inside a callback that didn't always commit — clicks
    // looked dead on mobile. The CSS underline transition + Tier 1 polish
    // animations elsewhere already give the cinematic feel without VT.
    setActiveState(t);
    try { localStorage.setItem(KEY, t); } catch { /* quota / privacy mode */ }
  };

  return <TabCtx.Provider value={{ active, setActive }}>{children}</TabCtx.Provider>;
}

export function useActiveTab() {
  const ctx = useContext(TabCtx);
  if (!ctx) throw new Error("useActiveTab must be used within TabProvider");
  return ctx;
}
