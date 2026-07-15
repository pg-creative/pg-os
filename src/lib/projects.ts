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
    id: "pg-creative",
    name: "PG Creative",
    path: pgPath("pg-creative"),
    sub: "PRODUCTS · CONSULTING",
    glyph: "sparkles",
  },
  {
    id: "alchmy",
    name: "Alchmy",
    path: pgPath("alchmy"),
    sub: "THE AI ALCHEMIST",
    glyph: "star",
  },
  {
    id: "voyager",
    name: "Voyager",
    path: pgPath("voyager"),
    sub: "GAMING · CONTENT",
    glyph: "music",
  },
  {
    id: "game-coach",
    name: "Game Coach",
    path: pgPath("game-coach"),
    sub: "COACHING ENGINE",
    glyph: "compass",
  },
  {
    id: "personal-os",
    name: "personal-os",
    path: pgPath("personal-os"),
    sub: "THIS APP",
    glyph: "sun",
  },
  {
    id: "meta-claude",
    name: "Meta-Claude",
    path: pgPath("meta-claude"),
    sub: "CONFIG WORKSPACE",
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
  return ACTIVE_PROJECTS[0]?.id ?? "pg-creative";
}
