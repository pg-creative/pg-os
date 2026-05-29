"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

export type HomeMode = "bridge" | "personal";

const KEY = "pg-os-home-mode";

type Ctx = {
  mode: HomeMode;
  setMode: (m: HomeMode) => void;
  toggle: () => void;
};

const BridgeModeCtx = createContext<Ctx | null>(null);

// Wrap a state mutation in document.startViewTransition when available.
// The browser captures a snapshot of the old DOM, runs the mutation, captures
// the new DOM, then crossfades between them. Persona 5 wipes are layered via
// CSS pseudos ::view-transition-old(root) / ::view-transition-new(root) in
// globals.css under the BRIDGE MODE block.
function withViewTransition(mutate: () => void) {
  type DocWithVT = Document & {
    startViewTransition?: (cb: () => void) => unknown;
  };
  const doc = document as DocWithVT;
  if (typeof doc.startViewTransition === "function") {
    doc.startViewTransition(mutate);
  } else {
    mutate();
  }
}

export function BridgeModeProvider({ children }: { children: ReactNode }) {
  // Default Home is the locked Emaki x Laputa top-bar broadsheet ("personal").
  // Bridge stays reachable via the cmd-/ toggle and persists in localStorage.
  const [mode, setModeState] = useState<HomeMode>("personal");

  useEffect(() => {
    const saved = localStorage.getItem(KEY);
    if (saved === "bridge" || saved === "personal") setModeState(saved);
  }, []);

  const setMode = useCallback((m: HomeMode) => {
    withViewTransition(() => {
      setModeState(m);
      try {
        localStorage.setItem(KEY, m);
      } catch {
        /* ignore */
      }
    });
  }, []);

  const toggle = useCallback(() => {
    withViewTransition(() => {
      setModeState((prev) => {
        const next: HomeMode = prev === "bridge" ? "personal" : "bridge";
        try {
          localStorage.setItem(KEY, next);
        } catch {
          /* ignore */
        }
        return next;
      });
    });
  }, []);

  // ⌘/ global hotkey
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        e.key === "/" &&
        (e.metaKey || e.ctrlKey) &&
        !e.shiftKey &&
        !e.altKey
      ) {
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
  if (!ctx)
    throw new Error("useBridgeMode must be used within BridgeModeProvider");
  return ctx;
}

export function HomeModeBadge() {
  const { mode } = useBridgeMode();
  return <>{mode === "bridge" ? "BRIDGE" : "PERSONAL"}</>;
}
