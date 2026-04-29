"use client";
import { useEffect, useState } from "react";

/**
 * Returns true when the OS is running on a remote host (Vercel, tunnel) rather
 * than the local laptop dev server. Used to gate laptop-only actions like
 * "Run Now" agent triggers and "Open Claude Code" terminal launches —
 * those rely on local subprocess spawning which serverless can't do.
 *
 * Returns null during SSR / initial hydration so callers can render a
 * neutral placeholder instead of flickering between modes.
 */
export function useIsCloud(): boolean | null {
  const [isCloud, setIsCloud] = useState<boolean | null>(null);
  useEffect(() => {
    const host = window.location.hostname;
    const local = host === "127.0.0.1" || host === "localhost" || host === "0.0.0.0";
    setIsCloud(!local);
  }, []);
  return isCloud;
}
