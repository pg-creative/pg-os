"use client";
/**
 * NowProvider — T-09 Now Mode (⌘.)
 *
 * Press ⌘. anywhere in the app to enter "Now Mode" — a focus state that
 * dims the UI to a single active card, pauses ambient SSE motion, and starts
 * a 25-min timer. Press ⌘. again or wait for the timer to exit.
 *
 * Active card detection
 * ---------------------
 * The "active card" is whichever element on the page has
 * `data-now-active="true"`. Components opt in by adding the attribute
 * conditionally — typically based on `useNowMode().isNow`. For this initial
 * ship no specific card opts in; later commits will hook individual views
 * (Flow timer, current ship, ritual gate).
 *
 * State surface
 * -------------
 * - `data-now="true"` is set on `<body>` while active. CSS in globals.css
 *   uses this to dim everything except `[data-now-active="true"]`.
 * - localStorage `pg-os-now-block` = `{ enteredAt, durationMs }` — survives
 *   refresh and supports cross-tab sync via the `storage` event.
 * - SSE channels are paused on enter (close all open EventSources) and
 *   resumed on exit (reopen) via `realtimeBrowser.pause()` / `resume()`.
 * - Optional cookie sync: POSTs to `/api/now/state` so other devices /
 *   tabs without storage events still see the state on load.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { pause as pauseRealtime, resume as resumeRealtime } from "@/lib/realtimeBrowser";

const STORAGE_KEY = "pg-os-now-block";
const DEFAULT_DURATION_MS = 25 * 60 * 1000; // 25 minutes
const TICK_MS = 1000;

export type NowBlock = {
  enteredAt: string; // ISO
  durationMs: number;
};

type Ctx = {
  isNow: boolean;
  enteredAt: string | null;
  durationMs: number;
  remainingMs: number;
  enter: (durationMs?: number) => void;
  exit: () => void;
  toggle: () => void;
};

const NowCtx = createContext<Ctx | null>(null);

function readBlock(): NowBlock | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as NowBlock;
    if (!parsed?.enteredAt || typeof parsed.durationMs !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeBlock(block: NowBlock | null) {
  if (typeof window === "undefined") return;
  try {
    if (block) localStorage.setItem(STORAGE_KEY, JSON.stringify(block));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* quota / privacy mode */
  }
}

function syncCookie(block: NowBlock | null) {
  // Best-effort cross-tab/device sync. Don't await — UI shouldn't block on this.
  try {
    void fetch("/api/now/state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(block ?? { clear: true }),
      keepalive: true,
    });
  } catch {
    /* offline / not supported */
  }
}

export function NowProvider({ children }: { children: ReactNode }) {
  const [block, setBlock] = useState<NowBlock | null>(null);
  const [now, setNow] = useState<number>(() => Date.now());
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastIsNowRef = useRef<boolean>(false);

  // Hydrate from localStorage on mount + listen for cross-tab updates.
  useEffect(() => {
    const initial = readBlock();
    if (initial) {
      const elapsed = Date.now() - new Date(initial.enteredAt).getTime();
      if (elapsed >= initial.durationMs) {
        // Stale block — auto-clear
        writeBlock(null);
        setBlock(null);
      } else {
        setBlock(initial);
      }
    }

    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return;
      if (!e.newValue) {
        setBlock(null);
        return;
      }
      try {
        const parsed = JSON.parse(e.newValue) as NowBlock;
        setBlock(parsed);
      } catch {
        /* ignore malformed */
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Compute derived state
  const enteredAt = block?.enteredAt ?? null;
  const durationMs = block?.durationMs ?? DEFAULT_DURATION_MS;
  const remainingMs = block
    ? Math.max(0, new Date(block.enteredAt).getTime() + block.durationMs - now)
    : 0;
  const isNow = !!block && remainingMs > 0;

  // Tick while active so the timer display updates and we can auto-exit.
  useEffect(() => {
    if (!block) {
      if (tickRef.current) {
        clearInterval(tickRef.current);
        tickRef.current = null;
      }
      return;
    }
    setNow(Date.now());
    tickRef.current = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => {
      if (tickRef.current) {
        clearInterval(tickRef.current);
        tickRef.current = null;
      }
    };
  }, [block]);

  // Auto-exit at timer end
  useEffect(() => {
    if (block && remainingMs <= 0) {
      writeBlock(null);
      setBlock(null);
      syncCookie(null);
    }
  }, [block, remainingMs]);

  // Reflect state to <body data-now> + pause/resume SSE on edge transitions.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const wasNow = lastIsNowRef.current;
    if (isNow && !wasNow) {
      document.body.setAttribute("data-now", "true");
      try {
        pauseRealtime();
      } catch {
        /* no-op */
      }
    } else if (!isNow && wasNow) {
      document.body.removeAttribute("data-now");
      try {
        resumeRealtime();
      } catch {
        /* no-op */
      }
    }
    lastIsNowRef.current = isNow;
  }, [isNow]);

  const enter = useCallback((duration?: number) => {
    const next: NowBlock = {
      enteredAt: new Date().toISOString(),
      durationMs: duration ?? DEFAULT_DURATION_MS,
    };
    writeBlock(next);
    setBlock(next);
    syncCookie(next);
  }, []);

  const exit = useCallback(() => {
    writeBlock(null);
    setBlock(null);
    syncCookie(null);
  }, []);

  const toggle = useCallback(() => {
    if (isNow) exit();
    else enter();
  }, [isNow, enter, exit]);

  // Global hotkey: ⌘. (Cmd or Ctrl + period)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === ".") {
        // Don't interfere with input editing if user has focused a field —
        // but ⌘. is rarely a native binding; safe to claim globally.
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [toggle]);

  return (
    <NowCtx.Provider
      value={{ isNow, enteredAt, durationMs, remainingMs, enter, exit, toggle }}
    >
      {children}
      {isNow && <NowOverlay remainingMs={remainingMs} />}
    </NowCtx.Provider>
  );
}

export function useNowContext() {
  const ctx = useContext(NowCtx);
  if (!ctx) throw new Error("useNowContext must be used within NowProvider");
  return ctx;
}

/**
 * NowOverlay — minimal chrome shown while Now Mode is active.
 * - "now" italic serif label (top-left)
 * - countdown timer digits (top-right, monospace)
 * The dim + ring effect lives in CSS, driven by [data-now] on <body>.
 */
function NowOverlay({ remainingMs }: { remainingMs: number }) {
  const totalSec = Math.max(0, Math.ceil(remainingMs / 1000));
  const mm = String(Math.floor(totalSec / 60)).padStart(2, "0");
  const ss = String(totalSec % 60).padStart(2, "0");
  return (
    <>
      <div className="now-label" aria-hidden>
        now
      </div>
      <div className="now-timer" role="timer" aria-live="off">
        {mm}:{ss}
      </div>
    </>
  );
}
