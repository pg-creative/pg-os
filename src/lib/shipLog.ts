import os from "node:os";
import path from "node:path";
import fs from "node:fs";
import { DatabaseSync } from "node:sqlite";

const DB_DIR = path.join(os.homedir(), ".pg-os");
const DB_PATH = path.join(DB_DIR, "ships.db");

let _db: DatabaseSync | null = null;

function db(): DatabaseSync {
  if (_db) return _db;
  fs.mkdirSync(DB_DIR, { recursive: true, mode: 0o700 });
  _db = new DatabaseSync(DB_PATH);
  _db.exec(`
    CREATE TABLE IF NOT EXISTS ships (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      text TEXT NOT NULL,
      context TEXT,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_ships_created_at ON ships(created_at DESC);
  `);
  return _db;
}

export type Ship = {
  id: number;
  text: string;
  context: string | null;
  created_at: number;
};

function startOfLocalDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function addShip(text: string, context?: string | null): Ship {
  const now = Date.now();
  const stmt = db().prepare(`INSERT INTO ships (text, context, created_at) VALUES (?, ?, ?)`);
  const result = stmt.run(text, context ?? null, now);
  return { id: Number(result.lastInsertRowid), text, context: context ?? null, created_at: now };
}

export function listShips(limit = 50): Ship[] {
  const stmt = db().prepare(`SELECT id, text, context, created_at FROM ships ORDER BY created_at DESC LIMIT ?`);
  return stmt.all(limit) as unknown as Ship[];
}

export function currentStreak(): number {
  const rows = db().prepare(`SELECT created_at FROM ships ORDER BY created_at DESC LIMIT 500`).all() as unknown as { created_at: number }[];
  if (rows.length === 0) return 0;
  const dayBuckets = new Set(rows.map((r) => startOfLocalDay(r.created_at)));
  const today = startOfLocalDay(Date.now());
  const yesterday = today - 86_400_000;
  // Streak intact if shipped today OR shipped yesterday (grace for today not done yet).
  if (!dayBuckets.has(today) && !dayBuckets.has(yesterday)) return 0;
  let cursor = dayBuckets.has(today) ? today : yesterday;
  let streak = 0;
  while (dayBuckets.has(cursor)) {
    streak++;
    cursor -= 86_400_000;
  }
  return streak;
}

export function shipsPerDayLast30(): { day: string; count: number }[] {
  const since = Date.now() - 30 * 86_400_000;
  const rows = db().prepare(`SELECT created_at FROM ships WHERE created_at >= ?`).all(since) as unknown as { created_at: number }[];
  const map = new Map<number, number>();
  for (const r of rows) {
    const d = startOfLocalDay(r.created_at);
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

export function velocityPerWeek(): number {
  const last30 = shipsPerDayLast30();
  const total = last30.reduce((a, b) => a + b.count, 0);
  return +(total / (30 / 7)).toFixed(1);
}

export function shipsInLastDays(days: number): Ship[] {
  const since = Date.now() - days * 86_400_000;
  const rows = db().prepare(`SELECT id, text, context, created_at FROM ships WHERE created_at >= ? ORDER BY created_at DESC`).all(since) as unknown as Ship[];
  return rows;
}

export function shippedToday(): boolean {
  const today = startOfLocalDay(Date.now());
  const tomorrow = today + 86_400_000;
  const row = db().prepare(`SELECT 1 as n FROM ships WHERE created_at >= ? AND created_at < ? LIMIT 1`).get(today, tomorrow);
  return !!row;
}
