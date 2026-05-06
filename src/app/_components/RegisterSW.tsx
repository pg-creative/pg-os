"use client";

import { useEffect } from "react";

export function RegisterSW() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    const register = async () => {
      try {
        const existing = await navigator.serviceWorker.getRegistration("/sw.js");
        if (!existing) {
          await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        }
      } catch {
        // SW registration is best-effort. Push opt-in flow handles the
        // diagnostic surface; here we only need the worker live so iOS
        // recognizes the app as a PWA candidate.
      }
    };

    register();
  }, []);

  return null;
}
