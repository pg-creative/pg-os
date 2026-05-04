"use client";
/**
 * useNowMode — read-only-ish hook for components.
 *
 * Components that want to be the focused card in Now Mode should:
 *   const { isNow } = useNowMode();
 *   <div data-now-active={isNow ? "true" : undefined}>...</div>
 *
 * The full enter/exit/toggle surface is also exposed for components that
 * want to render their own "start focus" affordance (e.g. Flow tab).
 */

import { useNowContext } from "./NowProvider";

export function useNowMode() {
  const { isNow, enteredAt, durationMs, remainingMs, enter, exit, toggle } =
    useNowContext();
  return { isNow, enteredAt, durationMs, remainingMs, enter, exit, toggle };
}
