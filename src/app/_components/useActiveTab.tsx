"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

export type Tab =
  | "home"
  | "habits"
  | "projects"
  | "flow"
  | "timeline"
  | "claude"
  | "stack"
  | "brain";

export const TABS: { id: Tab; num: string; label: string; glyph: string }[] = [
  { id: "home", num: "00", label: "HOME", glyph: "⌂" },
  { id: "habits", num: "01", label: "HABITS", glyph: "✦" },
  { id: "projects", num: "02", label: "PROJECTS", glyph: "▣" },
  { id: "flow", num: "03", label: "FLOW", glyph: "≋" },
  { id: "timeline", num: "04", label: "TIMELINE", glyph: "◴" },
  { id: "claude", num: "05", label: "CLAUDE", glyph: "◆" },
  { id: "stack", num: "06", label: "STACK", glyph: "⬢" },
  { id: "brain", num: "07", label: "BRAIN", glyph: "◉" },
];

const KEY = "pg-os-active-tab";
const VALID: Tab[] = [
  "home",
  "habits",
  "projects",
  "flow",
  "timeline",
  "claude",
  "stack",
  "brain",
];

type Ctx = { active: Tab; setActive: (t: Tab) => void };
const TabCtx = createContext<Ctx | null>(null);

export function TabProvider({ children }: { children: ReactNode }) {
  const [active, setActiveState] = useState<Tab>("home");

  useEffect(() => {
    // URL `?tab=` wins over localStorage so deep links (briefing email, agent
    // activity links, bookmarks) land on the right tab on first load.
    const readFromUrl = (): Tab | null => {
      const t = new URLSearchParams(window.location.search).get(
        "tab",
      ) as Tab | null;
      return t && VALID.includes(t) ? t : null;
    };
    const fromUrl = readFromUrl();
    if (fromUrl) {
      setActiveState(fromUrl);
      try {
        localStorage.setItem(KEY, fromUrl);
      } catch {
        /* quota / privacy mode */
      }
    } else {
      const saved = localStorage.getItem(KEY) as Tab | null;
      if (saved && VALID.includes(saved)) setActiveState(saved);
    }

    // Browser back/forward: re-sync state from URL. replaceState (used in
    // setActive) doesn't fire popstate, so this only triggers on real navigation.
    const onPop = () => {
      const t = readFromUrl();
      if (t) setActiveState(t);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const setActive = (t: Tab) => {
    // Always commit the state synchronously. View Transitions API was wrapping
    // the state update inside a callback that didn't always commit — clicks
    // looked dead on mobile. The CSS underline transition + Tier 1 polish
    // animations elsewhere already give the cinematic feel without VT.
    setActiveState(t);
    try {
      localStorage.setItem(KEY, t);
    } catch {
      /* quota / privacy mode */
    }
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", t);
      window.history.replaceState(null, "", url);
    } catch {
      /* SSR / no window */
    }
  };

  return (
    <TabCtx.Provider value={{ active, setActive }}>{children}</TabCtx.Provider>
  );
}

export function useActiveTab() {
  const ctx = useContext(TabCtx);
  if (!ctx) throw new Error("useActiveTab must be used within TabProvider");
  return ctx;
}
