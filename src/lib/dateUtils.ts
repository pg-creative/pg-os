/**
 * dateUtils.ts — Shared date helpers. Native Date only, no external deps.
 *
 * isoWeekStart mirrors the same Monday-anchored logic in habits.ts but
 * lives here so calendarService / dayOverview can import it without pulling
 * in the entire habits module.
 */

/** Mon-anchored ISO week start for a YYYY-MM-DD string (local time). */
export function isoWeekStart(d: string): string {
  const [y, m, day] = d.split("-").map(Number);
  const dt = new Date(y, (m ?? 1) - 1, day ?? 1);
  // Mon=1..Sun=7; subtract (dow-1) days to land on Monday
  const dow = dt.getDay() === 0 ? 7 : dt.getDay();
  dt.setDate(dt.getDate() - (dow - 1));
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

/** Returns a new Date with time set to 00:00:00.000 (local). */
export function startOfDayLocal(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Returns a new Date with time set to 23:59:59.999 (local). */
export function endOfDayLocal(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

/**
 * Returns the {from, to} Date range for a given view anchored to a date.
 *
 * "day"  → midnight-to-midnight on anchor's date
 * "week" → midnight on anchor → 23:59:59.999 six days later (matches existing
 *           events route behavior: "today through 6 days out", not Mon-Sun)
 */
export function rangeForView(
  view: "day" | "week",
  anchor: Date,
): { from: Date; to: Date } {
  const from = startOfDayLocal(anchor);
  const to =
    view === "week"
      ? endOfDayLocal(new Date(from.getTime() + 6 * 86_400_000))
      : endOfDayLocal(anchor);
  return { from, to };
}
