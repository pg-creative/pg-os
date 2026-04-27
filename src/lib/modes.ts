// ── Brand Mode definitions ─────────────────────────────────────────────────────
// Track C: Brand Mode Pivot
// Parallel to the Laputa time-mode — does not replace it.

export type BrandMode = "alchmy" | "voyager" | "writer" | "metrasens" | "recovery";

export type CaptureDefault =
  | "ship"
  | "queue"
  | "essay"
  | "linkedin"
  | "yuriko"
  | "hc-journal";

export interface ModeConfig {
  /** Short identifier */
  mode: BrandMode;
  /** Display label */
  label: string;
  /** Visual glyph shown in the pill */
  glyph: string;
  /** CSS hex used to override --accent-2 while mode is active */
  accent: string;
  /** Project IDs from ACTIVE_PROJECTS that this mode surfaces */
  projectIds: string[];
  /** Default destination for CaptureSheet */
  captureDefault: CaptureDefault;
  /** Habit tags to surface in HabitsView (empty = all) */
  habitTags: string[];
  /** Optional calendar keyword filter (for future use) */
  calendarFilter?: string;
}

export const MODE_CONFIG: Record<BrandMode, ModeConfig> = {
  alchmy: {
    mode: "alchmy",
    label: "Alchmy",
    glyph: "✦",
    accent: "#C8923B",
    projectIds: ["pg-creative", "alchmy"],
    captureDefault: "linkedin",
    habitTags: ["content", "ai"],
    calendarFilter: "alchmy",
  },
  voyager: {
    mode: "voyager",
    label: "Voyager",
    glyph: "◈",
    accent: "#5A87B8",
    projectIds: ["voyager", "heros-chronicle"],
    captureDefault: "essay",
    habitTags: ["gaming", "creative"],
    calendarFilter: "voyager",
  },
  writer: {
    mode: "writer",
    label: "Writer",
    glyph: "❦",
    accent: "#D17A4A",
    projectIds: ["writer", "voyager"],
    captureDefault: "essay",
    habitTags: ["writing"],
    calendarFilter: "writing",
  },
  metrasens: {
    mode: "metrasens",
    label: "Metrasens",
    glyph: "◆",
    accent: "#5E9A6B",
    projectIds: ["metrasens"],
    captureDefault: "ship",
    habitTags: ["work"],
    calendarFilter: "metrasens",
  },
  recovery: {
    mode: "recovery",
    label: "Recovery",
    glyph: "❀",
    accent: "#8C7AB4",
    projectIds: [],
    captureDefault: "hc-journal",
    habitTags: ["health", "sleep", "recovery"],
    calendarFilter: undefined,
  },
};

/** Ordered cycle for the picker (null = no mode) */
export const BRAND_MODE_ORDER: Array<BrandMode | null> = [
  null,
  "alchmy",
  "voyager",
  "writer",
  "metrasens",
  "recovery",
];

/**
 * Given the current mode, returns the next in the cycle (forward).
 */
export function nextBrandMode(current: BrandMode | null): BrandMode | null {
  const idx = BRAND_MODE_ORDER.indexOf(current);
  return BRAND_MODE_ORDER[(idx + 1) % BRAND_MODE_ORDER.length] ?? null;
}

/**
 * Given the current mode, returns the previous in the cycle (backward).
 */
export function prevBrandMode(current: BrandMode | null): BrandMode | null {
  const idx = BRAND_MODE_ORDER.indexOf(current);
  const prev = (idx - 1 + BRAND_MODE_ORDER.length) % BRAND_MODE_ORDER.length;
  return BRAND_MODE_ORDER[prev] ?? null;
}

/**
 * Filter an array of items by mode's projectIds.
 * @param items  Array of objects
 * @param mode   Active brand mode (null = no filter)
 * @param key    Property on each item that holds the project id string
 */
export function applyModeFilter<T>(
  items: T[],
  mode: BrandMode | null,
  key: keyof T
): T[] {
  if (!mode) return items;
  const cfg = MODE_CONFIG[mode];
  if (cfg.projectIds.length === 0) return items; // recovery: show all items
  return items.filter((item) => {
    const val = item[key];
    return typeof val === "string" && cfg.projectIds.includes(val);
  });
}

/**
 * Filter habits by mode's habitTags.
 * @param habits  Array of habit objects
 * @param mode    Active brand mode (null = no filter)
 * @param tagsKey Property on each habit that holds an array of tag strings
 */
export function applyHabitTagFilter<T>(
  habits: T[],
  mode: BrandMode | null,
  tagsKey: keyof T
): T[] {
  if (!mode) return habits;
  const cfg = MODE_CONFIG[mode];
  if (cfg.habitTags.length === 0) return habits;
  return habits.filter((h) => {
    const tags = h[tagsKey];
    if (!Array.isArray(tags)) return true; // no tags field — show it
    return (tags as string[]).some((t) => cfg.habitTags.includes(t));
  });
}
