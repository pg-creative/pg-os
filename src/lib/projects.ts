import os from "node:os";
import path from "node:path";

export type ProjectGlyph = "sun" | "star" | "heart" | "sparkles" | "feather" | "music" | "compass";

export type ProjectConfig = {
  id: string;
  name: string;
  path: string;
  sub: string;
  deadline?: string; // ISO date (YYYY-MM-DD) or human; parsed by Date.parse
  glyph?: ProjectGlyph;
};

const HOME = os.homedir();
const cereb = (rel: string) => path.join(HOME, "CEREBRUM", rel);

export const ACTIVE_PROJECTS: ProjectConfig[] = [
  { id: "metrasens",        name: "Metrasens",        path: cereb("metrasens"),        sub: "GTM ENGINEER · W2",         deadline: "2026-05-31", glyph: "compass" },
  { id: "heros-chronicle",  name: "Hero's Chronicle", path: cereb("heros-chronicle"),  sub: "LIFE RPG · 1.0",            deadline: "2026-10-02", glyph: "star" },
  { id: "pg-creative",      name: "PG Creative",      path: cereb("pg-creative"),      sub: "PRODUCTS · CONSULTING",     glyph: "sparkles" },
  { id: "voyager",          name: "Voyager",          path: cereb("voyager"),          sub: "GAMING · CONTENT",          glyph: "music" },
  { id: "personal-os",      name: "personal-os",      path: cereb("personal-os"),      sub: "THIS APP",                  glyph: "sun" },
  { id: "career-ops",       name: "career-ops",       path: cereb("career-ops"),       sub: "JOB SEARCH CLI",            glyph: "feather" },
  { id: "claude-config",    name: "Claude Config",    path: path.join(HOME, ".claude"), sub: "GLOBAL CLAUDE CONFIG",     glyph: "sparkles" },
];

export function getProject(id: string): ProjectConfig | undefined {
  return ACTIVE_PROJECTS.find((p) => p.id === id);
}
