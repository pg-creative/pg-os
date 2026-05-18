"use client";
import { createContext, useContext, useEffect, ReactNode } from "react";
import type { BrainTheme } from "./ThemeAssets";

const Ctx = createContext<BrainTheme | null>(null);

export function ThemeProvider({
  theme,
  children,
}: {
  theme: BrainTheme;
  children: ReactNode;
}) {
  // Inject Google Fonts CSS once per theme (idempotent)
  useEffect(() => {
    const links: HTMLLinkElement[] = [];
    for (const url of theme.fonts.cssImports) {
      if (document.querySelector(`link[href="${url}"]`)) continue;
      const l = document.createElement("link");
      l.rel = "stylesheet";
      l.href = url;
      document.head.appendChild(l);
      links.push(l);
    }
    return () => {
      // Keep fonts cached even after unmount (cross-variant reuse)
    };
  }, [theme.id, theme.fonts.cssImports]);

  // Set CSS custom properties so children styled with var(--bl-ink) etc. respond
  useEffect(() => {
    const r = document.documentElement;
    const p = theme.palette;
    r.style.setProperty("--bl-bg", p.bg);
    r.style.setProperty("--bl-surface", p.surface);
    r.style.setProperty("--bl-surface-alt", p.surfaceAlt);
    r.style.setProperty("--bl-ink", p.ink);
    r.style.setProperty("--bl-ink-muted", p.inkMuted);
    r.style.setProperty("--bl-accent", p.accent);
    r.style.setProperty("--bl-accent-2", p.accent2);
    r.style.setProperty("--bl-line", p.line);
    r.style.setProperty("--bl-tier-high", p.tierHigh);
    r.style.setProperty("--bl-tier-mid", p.tierMid);
    r.style.setProperty("--bl-tier-low", p.tierLow);
    r.style.setProperty("--bl-tier-kill", p.tierKill);
    r.style.setProperty("--bl-font-display", theme.fonts.display);
    r.style.setProperty("--bl-font-body", theme.fonts.body);
    r.style.setProperty("--bl-font-mono", theme.fonts.mono);
    r.style.setProperty(
      "--bl-font-small-caps",
      theme.fonts.smallCaps ?? theme.fonts.display,
    );
    r.style.setProperty("--bl-transition", `${theme.motion.transitionMs}ms`);
    r.style.setProperty("--bl-hover-lift", theme.motion.hoverLift);
  }, [theme]);

  return <Ctx.Provider value={theme}>{children}</Ctx.Provider>;
}

export function useTheme(): BrainTheme {
  const t = useContext(Ctx);
  if (!t) throw new Error("useTheme outside ThemeProvider");
  return t;
}
