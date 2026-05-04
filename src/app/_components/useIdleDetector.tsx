"use client";
/**
 * useIdleDetector — global idle detector for T-08 Ambient Idle.
 *
 * Watches pointermove / pointerdown / keydown / scroll / touchstart / wheel /
 * visibilitychange and the active-tab change event. Emits `idle = true` after
 * `timeoutMs` of zero activity. Any event flips back to `idle = false` and
 * restarts the countdown.
 *
 * Listeners are registered on the window in capture+passive mode so they fire
 * regardless of stopPropagation in the tree, and they don't block scroll/touch
 * performance.
 */

import { useEffect, useRef, useState } from "react";

const ACTIVITY_EVENTS = [
  "pointermove",
  "pointerdown",
  "keydown",
  "scroll",
  "touchstart",
  "wheel",
  "mousemove", // safety net for older browsers
] as const;

type Options = {
  timeoutMs?: number;
  /** When false, disables the detector entirely (always returns idle=false). */
  enabled?: boolean;
};

export function useIdleDetector({
  timeoutMs = 90_000,
  enabled = true,
}: Options = {}) {
  const [idle, setIdle] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleRef = useRef(false);

  useEffect(() => {
    if (!enabled) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      idleRef.current = false;
      setIdle(false);
      return;
    }

    const goIdle = () => {
      if (idleRef.current) return;
      idleRef.current = true;
      setIdle(true);
    };

    const wake = () => {
      if (idleRef.current) {
        idleRef.current = false;
        setIdle(false);
      }
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(goIdle, timeoutMs);
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") wake();
    };

    // Tab swaps inside the app dispatch a synthetic event so we treat them
    // as activity even though they don't necessarily fire pointer/keys.
    const onTabChange = () => wake();

    for (const evt of ACTIVITY_EVENTS) {
      window.addEventListener(evt, wake, { passive: true, capture: true });
    }
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pgos:tab-change", onTabChange);

    // Start the first countdown immediately.
    wake();
    // But don't strip the "wake" status — wake() already set idle=false.

    return () => {
      for (const evt of ACTIVITY_EVENTS) {
        window.removeEventListener(evt, wake, { capture: true });
      }
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pgos:tab-change", onTabChange);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [timeoutMs, enabled]);

  return idle;
}
