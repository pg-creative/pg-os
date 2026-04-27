import os from "node:os";
import path from "node:path";
import fs from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { db, isDbConfigured, T } from "./db";

// ── Types ────────────────────────────────────────────────────
export type Ship = {
  id: number;
  text: string;
  context: string | null;
  created_at: number; // ms-since-epoch (legacy SQLite shape, preserved across both backends)
  source?: string;
};

// ── Local sqlite fallback (for offline / pre-cloud setup) ────
const DB_DIR = path.join(os.homedir(), ".pg-os");
const DB_PATH = path.join(DB_DIR, "ships.db");

let _sqlite: DatabaseSync | null = null;

function sqlite(): DatabaseSync {
  if (_sqlite) return _sqlite;
  fs.mkdirSync(DB_DIR, { recursive: true, mode: 0o700 });
  _sqlite = new DatabaseSync(DB_PATH);
  _sqlite.exec(`
    CREATE TABLE IF NOT EXISTS ships (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      text TEXT NOT NULL,
      context TEXT,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_ships_created_at ON ships(created_at DESC);
  `);
  return _sqlite;
}

function startOfLocalDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

// ── Public API (async — both backends) ───────────────────────
//
// Supabase is the source of truth when configured. Sqlite is the fallback for
// dev environments that haven't set PGOS_SUPABASE_URL yet. There's a one-time
// migration script (scripts/migrate-ships-sqlite-to-supabase.mjs) to move existing
// rows once you're ready to flip.

export async function addShip(text: string, context?: string | null, source = "dashboard"): Promise<Ship> {
  if (isDbConfigured()) {
    const now = Date.now();
    const { data, error } = await db()
      .from(T.ships)
      .insert({ text, context: context ?? null, source, created_at: new Date(now).toISOString() })
      .select("id, text, context, created_at, source")
      .single();
    if (error) throw new Error(`addShip failed: ${error.message}`);
    return rowToShip(data);
  }

  // Local fallback
  const now = Date.now();
  const stmt = sqlite().prepare(`INSERT INTO ships (text, context, created_at) VALUES (?, ?, ?)`);
  const result = stmt.run(text, context ?? null, now);
  return { id: Number(result.lastInsertRowid), text, context: context ?? null, created_at: now, source };
}

export async function listShips(limit = 50): Promise<Ship[]> {
  if (isDbConfigured()) {
    const { data, error } = await db()
      .from(T.ships)
      .select("id, text, context, created_at, source")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw new Error(`listShips failed: ${error.message}`);
    return (data ?? []).map(rowToShip);
  }
  const rows = sqlite()
    .prepare(`SELECT id, text, context, created_at FROM ships ORDER BY created_at DESC LIMIT ?`)
    .all(limit) as unknown as Ship[];
  return rows;
}

export async function currentStreak(): Promise<number> {
  const rows = await fetchRecentTimestamps(500);
  if (rows.length === 0) return 0;
  const dayBuckets = new Set(rows.map((ts) => startOfLocalDay(ts)));
  const today = startOfLocalDay(Date.now());
  const yesterday = today - 86_400_000;
  if (!dayBuckets.has(today) && !dayBuckets.has(yesterday)) return 0;
  let cursor = dayBuckets.has(today) ? today : yesterday;
  let streak = 0;
  while (dayBuckets.has(cursor)) {
    streak++;
    cursor -= 86_400_000;
  }
  return streak;
}

export async function shipsPerDayLast30(): Promise<{ day: string; count: number }[]> {
  const since = Date.now() - 30 * 86_400_000;
  const rows = await fetchTimestampsSince(since);
  const map = new Map<number, number>();
  for (const ts of rows) {
    const d = startOfLocalDay(ts);
    map.set(d, (map.get(d) ?? 0) + 1);
  }
  const out: { day: string; count: number }[] = [];
  const today = startOfLocalDay(Date.now());
  for (let i = 29; i >= 0; i--) {
    const d = today - i * 86_400_000;
    out.push({ day: new Date(d).toISOString().slice(0, 10), count: map.get(d) ?? 0 });
  }
  return out;
}

export async function velocityPerWeek(): Promise<number> {
  const last30 = await shipsPerDayLast30();
  const total = last30.reduce((a, b) => a + b.count, 0);
  return +(total / (30 / 7)).toFixed(1);
}

export async function shipsInLastDays(days: number): Promise<Ship[]> {
  const since = Date.now() - days * 86_400_000;
  if (isDbConfigured()) {
    const { data, error } = await db()
      .from(T.ships)
      .select("id, text, context, created_at, source")
      .gte("created_at", new Date(since).toISOString())
      .order("created_at", { ascending: false });
    if (error) throw new Error(`shipsInLastDays failed: ${error.message}`);
    return (data ?? []).map(rowToShip);
  }
  const rows = sqlite()
    .prepare(`SELECT id, text, context, created_at FROM ships WHERE created_at >= ? ORDER BY created_at DESC`)
    .all(since) as unknown as Ship[];
  return rows;
}

export async function shippedToday(): Promise<boolean> {
  const today = startOfLocalDay(Date.now());
  const tomorrow = today + 86_400_000;
  if (isDbConfigured()) {
    const { count, error } = await db()
      .from(T.ships)
      .select("id", { count: "exact", head: true })
      .gte("created_at", new Date(today).toISOString())
      .lt("created_at", new Date(tomorrow).toISOString());
    if (error) throw new Error(`shippedToday failed: ${error.message}`);
    return (count ?? 0) > 0;
  }
  const row = sqlite()
    .prepare(`SELECT 1 as n FROM ships WHERE created_at >= ? AND created_at < ? LIMIT 1`)
    .get(today, tomorrow);
  return !!row;
}

// ── Internals ────────────────────────────────────────────────

type ShipRow = {
  id: number;
  text: string;
  context: string | null;
  created_at: string | number;
  source?: string | null;
};

function rowToShip(r: ShipRow): Ship {
  // Supabase returns ISO strings; sqlite returns ms numbers. Normalize to ms.
  const ts = typeof r.created_at === "string" ? new Date(r.created_at).getTime() : r.created_at;
  return {
    id: r.id,
    text: r.text,
    context: r.context ?? null,
    created_at: ts,
    source: r.source ?? undefined,
  };
}

async function fetchRecentTimestamps(limit: number): Promise<number[]> {
  if (isDbConfigured()) {
    const { data, error } = await db()
      .from(T.ships)
      .select("created_at")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw new Error(`fetchRecentTimestamps failed: ${error.message}`);
    return (data ?? []).map((r) => new Date(r.created_at).getTime());
  }
  const rows = sqlite()
    .prepare(`SELECT created_at FROM ships ORDER BY created_at DESC LIMIT ?`)
    .all(limit) as unknown as { created_at: number }[];
  return rows.map((r) => r.created_at);
}

async function fetchTimestampsSince(sinceMs: number): Promise<number[]> {
  if (isDbConfigured()) {
    const { data, error } = await db()
      .from(T.ships)
      .select("created_at")
      .gte("created_at", new Date(sinceMs).toISOString());
    if (error) throw new Error(`fetchTimestampsSince failed: ${error.message}`);
    return (data ?? []).map((r) => new Date(r.created_at).getTime());
  }
  const rows = sqlite()
    .prepare(`SELECT created_at FROM ships WHERE created_at >= ?`)
    .all(sinceMs) as unknown as { created_at: number }[];
  return rows.map((r) => r.created_at);
}
