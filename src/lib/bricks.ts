// Brick-builder game state — one brick per Pomodoro cycle.
// Persists to localStorage. Pure logic; no React imports here.

export type BrickPhase = "idle" | "work" | "break";

export type BrickTier = {
  id: string;
  label: string;
  unlockAt: number;
  color: string;
};

export const TIERS: BrickTier[] = [
  { id: "clay",     label: "Clay",     unlockAt: 0,    color: "#A88B66" },
  { id: "stone",    label: "Stone",    unlockAt: 10,   color: "#7E8896" },
  { id: "marble",   label: "Marble",   unlockAt: 50,   color: "#D9D2C2" },
  { id: "obsidian", label: "Obsidian", unlockAt: 100,  color: "#1F2530" },
  { id: "amber",    label: "Amber",    unlockAt: 250,  color: "#E5B374" },
  { id: "emerald",  label: "Emerald",  unlockAt: 500,  color: "#5C8A55" },
  { id: "kodama",   label: "Kodama",   unlockAt: 1000, color: "#9CB9AB" },
];

export type BrickState = {
  totalBricks: number;
  currentStreak: number;       // consecutive days with ≥1 brick
  longestStreak: number;
  lastBrickDate: string | null; // YYYY-MM-DD
  bricksToday: number;
  todayDate: string;            // YYYY-MM-DD for resetting bricksToday
};

export const INITIAL: BrickState = {
  totalBricks: 0,
  currentStreak: 0,
  longestStreak: 0,
  lastBrickDate: null,
  bricksToday: 0,
  todayDate: new Date().toISOString().slice(0, 10),
};

const KEY = "pg-os-bricks-state-v1";
export const WORK_MIN = 25;
export const BREAK_MIN = 5;

export function loadBricks(): BrickState {
  if (typeof localStorage === "undefined") return INITIAL;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return INITIAL;
    const parsed = JSON.parse(raw) as BrickState;
    // Validate shape — fill missing fields from INITIAL
    return { ...INITIAL, ...parsed, todayDate: new Date().toISOString().slice(0, 10) };
  } catch {
    return INITIAL;
  }
}

export function saveBricks(state: BrickState): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* ignore quota */
  }
}

export function placeBrick(state: BrickState): BrickState {
  const today = new Date().toISOString().slice(0, 10);
  const wasYesterday = state.lastBrickDate
    ? (() => {
        const last = new Date(state.lastBrickDate);
        const diff = (new Date(today).getTime() - last.getTime()) / 86_400_000;
        return diff > 0 && diff <= 1;
      })()
    : false;

  let currentStreak = state.currentStreak;
  if (state.lastBrickDate === today) {
    // Same day, streak unchanged
  } else if (wasYesterday || state.lastBrickDate === null) {
    currentStreak = state.currentStreak + 1;
  } else {
    currentStreak = 1;
  }

  const bricksToday = state.todayDate === today ? state.bricksToday + 1 : 1;

  return {
    totalBricks: state.totalBricks + 1,
    currentStreak,
    longestStreak: Math.max(state.longestStreak, currentStreak),
    lastBrickDate: today,
    bricksToday,
    todayDate: today,
  };
}

export function currentTier(totalBricks: number): BrickTier {
  let active = TIERS[0];
  for (const t of TIERS) {
    if (totalBricks >= t.unlockAt) active = t;
  }
  return active;
}

export function nextTier(totalBricks: number): BrickTier | null {
  for (const t of TIERS) {
    if (totalBricks < t.unlockAt) return t;
  }
  return null;
}

export function unlockedTiers(totalBricks: number): BrickTier[] {
  return TIERS.filter((t) => totalBricks >= t.unlockAt);
}
