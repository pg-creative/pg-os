import os from "node:os";
import path from "node:path";
import { pgPath } from "./paths";

export type ProjectGlyph =
  "sun" | "star" | "heart" | "sparkles" | "feather" | "music" | "compass";

export type ProjectConfig = {
  id: string;
  name: string;
  path: string;
  sub: string;
  deadline?: string; // ISO date (YYYY-MM-DD) or human; parsed by Date.parse
  glyph?: ProjectGlyph;
};

const HOME = os.homedir();

export const ACTIVE_PROJECTS: ProjectConfig[] = [
  {
    id: "metrasens",
    name: "Metrasens",
    path: pgPath("metrasens"),
    sub: "GTM ENGINEER · W2",
    deadline: "2026-05-31",
    glyph: "compass",
  },
  {
    id: "heros-chronicle",
    name: "Hero's Chronicle",
    path: pgPath("heros-chronicle"),
    sub: "LIFE RPG · 1.0",
    deadline: "2026-10-02",
    glyph: "star",
  },
  {
    id: "pg-creative",
    name: "PG Creative",
    path: pgPath("pg-creative"),
    sub: "PRODUCTS · CONSULTING",
    glyph: "sparkles",
  },
  {
    id: "voyager",
    name: "Voyager",
    path: pgPath("voyager"),
    sub: "GAMING · CONTENT",
    glyph: "music",
  },
  {
    id: "personal-os",
    name: "personal-os",
    path: pgPath("personal-os"),
    sub: "THIS APP",
    glyph: "sun",
  },
  {
    id: "career-ops",
    name: "career-ops",
    path: pgPath("career-ops"),
    sub: "JOB SEARCH CLI",
    glyph: "feather",
  },
  {
    id: "claude-config",
    name: "Claude Config",
    path: path.join(HOME, ".claude"),
    sub: "GLOBAL CLAUDE CONFIG",
    glyph: "sparkles",
  },
];

export function getProject(id: string): ProjectConfig | undefined {
  return ACTIVE_PROJECTS.find((p) => p.id === id);
}

// ── Active Chest ─────────────────────────────────────────────────────────────

export const ACTIVE_CHEST_KEY = "pg-os-active-chest";

export function getActiveChestId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(ACTIVE_CHEST_KEY);
  } catch {
    return null;
  }
}

export function setActiveChestId(id: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (id === null) window.localStorage.removeItem(ACTIVE_CHEST_KEY);
    else window.localStorage.setItem(ACTIVE_CHEST_KEY, id);
  } catch {
    /* no-op */
  }
}

export function getDefaultActiveChestId(): string {
  return ACTIVE_PROJECTS[0]?.id ?? "metrasens";
}
