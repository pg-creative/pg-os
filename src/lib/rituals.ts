/**
 * rituals.ts — localStorage-backed state for morning + evening ritual flows.
 *
 * TODO (Track A — Supabase migration): replace all localStorage calls with
 * Supabase reads/writes against a `rituals` table with columns:
 *   user_id, date, kind ('morning'|'evening'), completed_at, payload (jsonb)
 * Keep the same public API surface so components don't need changes.
 */

export type RitualKind = "morning" | "evening";

export interface MorningPayload {
  /** Checkbox states for the four morning steps */
  morningPages: boolean;
  stretchSunlight: boolean;
  whoopCheckin: boolean;
  /** The three day-shape bullets (optional) */
  dayShape: [string, string, string];
  /** Whether yesterday's one-thing was accomplished */
  yesterdayOneDone: boolean | null;
}

export interface EveningPayload {
  shipLogged: boolean;
  tomorrowsOne: string;
  /** mood 1–5 */
  mood: number | null;
  reflection: string;
}

export interface RitualRecord<P> {
  completedAt: string | null; // ISO date string YYYY-MM-DD
  lastPayload: P | null;
}

export interface RitualState {
  morning: RitualRecord<MorningPayload>;
  evening: RitualRecord<EveningPayload>;
}

// ── Streak helpers ─────────────────────────────────────────────────────────────

interface StreakData {
  morning: number;
  evening: number;
}

const STREAK_KEY = "pg-os:ritual-streaks";
const MORNING_KEY = "pg-os:ritual-morning";
const EVENING_KEY = "pg-os:ritual-evening";

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function yesterdayISO(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function safeParseJSON<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Read the full ritual state for the current day.
 * Returns null completedAt values when not yet completed today.
 */
export function getRitualState(): RitualState {
  if (typeof window === "undefined") {
    return {
      morning: { completedAt: null, lastPayload: null },
      evening: { completedAt: null, lastPayload: null },
    };
  }

  const today = todayISO();

  const morningRaw = safeParseJSON<{ completedAt: string | null; lastPayload: MorningPayload | null }>(
    localStorage.getItem(MORNING_KEY),
    { completedAt: null, lastPayload: null }
  );
  const eveningRaw = safeParseJSON<{ completedAt: string | null; lastPayload: EveningPayload | null }>(
    localStorage.getItem(EVENING_KEY),
    { completedAt: null, lastPayload: null }
  );

  return {
    morning: {
      completedAt: morningRaw.completedAt === today ? today : null,
      lastPayload: morningRaw.completedAt === today ? morningRaw.lastPayload : null,
    },
    evening: {
      completedAt: eveningRaw.completedAt === today ? today : null,
      lastPayload: eveningRaw.completedAt === today ? eveningRaw.lastPayload : null,
    },
  };
}

/**
 * Get yesterday's evening ritual payload — used to surface tomorrowsOne in morning ritual.
 * Returns null if no evening ritual was completed yesterday.
 */
export function getYesterdayEveningPayload(): EveningPayload | null {
  if (typeof window === "undefined") return null;

  const yesterday = yesterdayISO();
  const raw = safeParseJSON<{ completedAt: string | null; lastPayload: EveningPayload | null }>(
    localStorage.getItem(EVENING_KEY),
    { completedAt: null, lastPayload: null }
  );

  if (raw.completedAt !== yesterday) return null;
  return raw.lastPayload;
}

/**
 * Record a completed ritual. Updates streak counters automatically.
 *
 * TODO (Track A): POST to /api/rituals instead of writing localStorage.
 */
export function recordRitual(kind: RitualKind, payload: MorningPayload | EveningPayload): void {
  if (typeof window === "undefined") return;

  const today = todayISO();
  const yesterday = yesterdayISO();

  // Write the ritual record
  const key = kind === "morning" ? MORNING_KEY : EVENING_KEY;
  localStorage.setItem(key, JSON.stringify({ completedAt: today, lastPayload: payload }));

  // Update streaks
  const streaks = safeParseJSON<{ morning: { count: number; lastDate: string }; evening: { count: number; lastDate: string } }>(
    localStorage.getItem(STREAK_KEY),
    { morning: { count: 0, lastDate: "" }, evening: { count: 0, lastDate: "" } }
  );

  const s = streaks[kind];
  if (s.lastDate === today) {
    // already counted today — no change
  } else if (s.lastDate === yesterday) {
    s.count += 1;
    s.lastDate = today;
  } else {
    // streak broken — reset
    s.count = 1;
    s.lastDate = today;
  }
  streaks[kind] = s;
  localStorage.setItem(STREAK_KEY, JSON.stringify(streaks));
}

/**
 * Get current streak counts for both rituals.
 */
export function getRitualStreaks(): StreakData {
  if (typeof window === "undefined") return { morning: 0, evening: 0 };

  const streaks = safeParseJSON<{ morning: { count: number; lastDate: string }; evening: { count: number; lastDate: string } }>(
    localStorage.getItem(STREAK_KEY),
    { morning: { count: 0, lastDate: "" }, evening: { count: 0, lastDate: "" } }
  );

  return {
    morning: streaks.morning.count,
    evening: streaks.evening.count,
  };
}
