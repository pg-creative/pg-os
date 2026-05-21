"use client";

/**
 * Emaki phase context — gives every BentoBox the current phase tokens without
 * threading `tk` through every call. TabShell provides it; BentoBox consumes it.
 * This is what keeps every module on every tab visually identical.
 */

import { createContext, useContext, type ReactNode } from "react";
import { PHASES, type Phase, type PhaseTokens } from "../emaki/theme";

export function phaseForMode(mode: string): Phase {
  if (mode === "laputa-day") return "day";
  if (mode === "laputa-twilight" || mode === "totoro") return "twilight";
  return "night"; // laputa-midnight, howls, mononoke
}

interface EmakiCtx {
  phase: Phase;
  tk: PhaseTokens;
}

const Ctx = createContext<EmakiCtx | null>(null);

export function EmakiProvider({
  phase,
  children,
}: {
  phase: Phase;
  children: ReactNode;
}) {
  return (
    <Ctx.Provider value={{ phase, tk: PHASES[phase] }}>{children}</Ctx.Provider>
  );
}

export function useEmaki(): EmakiCtx {
  const ctx = useContext(Ctx);
  // Fallback to night tokens if used outside a TabShell (keeps it crash-proof).
  if (!ctx) return { phase: "night", tk: PHASES.night };
  return ctx;
}
