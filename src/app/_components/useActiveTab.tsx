"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type Tab = "home" | "habits" | "projects" | "flow";

export const TABS: { id: Tab; num: string; label: string }[] = [
  { id: "home",     num: "00", label: "HOME" },
  { id: "habits",   num: "01", label: "HABITS" },
  { id: "projects", num: "02", label: "PROJECTS" },
  { id: "flow",     num: "03", label: "FLOW" },
];

const KEY = "pg-os-active-tab";
const VALID: Tab[] = ["home", "habits", "projects", "flow"];

type Ctx = { active: Tab; setActive: (t: Tab) => void };
const TabCtx = createContext<Ctx | null>(null);

export function TabProvider({ children }: { children: ReactNode }) {
  const [active, setActiveState] = useState<Tab>("home");

  useEffect(() => {
    const saved = localStorage.getItem(KEY) as Tab | null;
    if (saved && VALID.includes(saved)) setActiveState(saved);
  }, []);

  const setActive = (t: Tab) => {
    const apply = () => {
      setActiveState(t);
      try { localStorage.setItem(KEY, t); } catch { /* quota */ }
    };
    // Tier 1: View Transitions API for cinematic tab swap (native, no deps)
    const doc = typeof document !== "undefined"
      ? (document as Document & { startViewTransition?: (cb: () => void) => void })
      : null;
    if (doc?.startViewTransition) {
      doc.startViewTransition(() => apply());
    } else {
      apply();
    }
  };

  return <TabCtx.Provider value={{ active, setActive }}>{children}</TabCtx.Provider>;
}

export function useActiveTab() {
  const ctx = useContext(TabCtx);
  if (!ctx) throw new Error("useActiveTab must be used within TabProvider");
  return ctx;
}
