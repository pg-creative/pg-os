import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { db, isDbConfigured, T } from "./db";

const QUEUE_DIR = path.join(os.homedir(), ".pg-os", "queue");

export type QueueItem = {
  id: string;
  title: string;
  source?: string;
  options?: string[];
  created_at: number;
  updated_at: number;
  note?: string;
  resolved_at?: number | null;
  decision?: string | null;
  decided_at?: string | null;
  decided_via?: string | null;
};

// Decisions that mean the item is fully resolved and should disappear from active lists.
// "details_requested" is intentionally NOT here — that's an info-only action that keeps
// the item visible until PG actually approves or defers.
const TERMINAL_DECISIONS = new Set(["approved", "deferred", "dismissed", "rejected"]);

// ── Filesystem helpers (filesystem stays source of truth for Claude Code's rule)

async function ensureDir() {
  // Tolerant of read-only filesystems (e.g. Vercel serverless). The reads in
  // listFsQueue already use .catch(() => []) so a missing dir falls through
  // to an empty list — only writes need the dir to exist.
  try {
    await fs.mkdir(QUEUE_DIR, { recursive: true, mode: 0o700 });
  } catch {
    /* read-only fs or permission denied — non-fatal for reads */
  }
}

function parseFrontmatter(raw: string): { meta: Record<string, string | string[]>; body: string } {
  if (!raw.startsWith("---\n")) return { meta: {}, body: raw };
  const end = raw.indexOf("\n---\n", 4);
  if (end === -1) return { meta: {}, body: raw };
  const head = raw.slice(4, end);
  const body = raw.slice(end + 5);
  const meta: Record<string, string | string[]> = {};
  for (const line of head.split("\n")) {
    const m = line.match(/^([a-zA-Z_]+):\s*(.*)$/);
    if (!m) continue;
    const key = m[1];
    const val = m[2].trim();
    if (val.startsWith("[") && val.endsWith("]")) {
      meta[key] = val
        .slice(1, -1)
        .split(",")
        .map((s) => s.trim().replace(/^"|"$/g, ""))
        .filter(Boolean);
    } else {
      meta[key] = val.replace(/^"|"$/g, "");
    }
  }
  return { meta, body };
}

async function listFsQueue(opts: { includeResolved?: boolean } = {}): Promise<QueueItem[]> {
  await ensureDir();
  const files = await fs.readdir(QUEUE_DIR).catch(() => []);
  const mdFiles = files.filter((f) => f.endsWith(".md"));
  const items: QueueItem[] = [];
  for (const file of mdFiles) {
    const full = path.join(QUEUE_DIR, file);
    try {
      const raw = await fs.readFile(full, "utf8");
      const stat = await fs.stat(full);
      const { meta, body } = parseFrontmatter(raw);
      const decision = (meta.decision as string | undefined) ?? null;
      // Skip items whose decision means they're done — Telegram-side approve/defer writes
      // these to frontmatter, and we want the FS list to honor that the same way Supabase
      // honors `resolved_at IS NULL`. Activity stream passes includeResolved:true.
      if (!opts.includeResolved && decision && TERMINAL_DECISIONS.has(decision)) continue;
      items.push({
        id: file.replace(/\.md$/, ""),
        title: (meta.title as string) ?? file.replace(/\.md$/, ""),
        source: meta.source as string | undefined,
        options: Array.isArray(meta.options) ? (meta.options as string[]) : undefined,
        created_at: meta.created_at ? Number(meta.created_at) : stat.birthtimeMs,
        updated_at: stat.mtimeMs,
        note: body.trim() || undefined,
        resolved_at: null,
        decision,
        decided_at: (meta.decided_at as string | undefined) ?? null,
        decided_via: (meta.decided_via as string | undefined) ?? null,
      });
    } catch { /* skip unreadable */ }
  }
  return items;
}

export async function listAllQueueItems(): Promise<QueueItem[]> {
  // Used by the activity stream — includes items the user already resolved so
  // history is visible. Filesystem is source of truth, supabase fills in any
  // gaps (e.g. items resolved on a different machine).
  const fsItems = await listFsQueue({ includeResolved: true });
  if (!isDbConfigured()) return fsItems.sort((a, b) => a.created_at - b.created_at);
  const sb = await listSupabaseAll();
  const byId = new Map<string, QueueItem>();
  for (const i of sb) byId.set(i.id, i);
  for (const i of fsItems) byId.set(i.id, i);
  return Array.from(byId.values()).sort((a, b) => a.created_at - b.created_at);
}

async function listSupabaseAll(): Promise<QueueItem[]> {
  if (!isDbConfigured()) return [];
  try {
    const { data, error } = await db()
      .from(T.queue_items)
      .select("id, title, source, options, note, created_at, updated_at, resolved_at, decision");
    if (error) throw error;
    return (data ?? []).map((r) => ({
      id: r.id,
      title: r.title,
      source: r.source ?? undefined,
      options: Array.isArray(r.options) ? r.options : undefined,
      note: r.note ?? undefined,
      created_at: new Date(r.created_at).getTime(),
      updated_at: new Date(r.updated_at).getTime(),
      resolved_at: r.resolved_at ? new Date(r.resolved_at).getTime() : null,
      decision: r.decision ?? null,
    }));
  } catch (e) {
    console.error("queueStore listSupabaseAll failed:", e);
    return [];
  }
}

// ── Supabase mirror (writes called as fire-and-forget; reads merged into list)

async function mirrorUpsert(item: QueueItem): Promise<void> {
  if (!isDbConfigured()) return;
  try {
    await db()
      .from(T.queue_items)
      .upsert({
        id: item.id,
        title: item.title,
        source: item.source ?? null,
        options: item.options ?? null,
        note: item.note ?? null,
        created_at: new Date(item.created_at).toISOString(),
        updated_at: new Date(item.updated_at).toISOString(),
      }, { onConflict: "id" });
  } catch (e) {
    console.error("queueStore mirrorUpsert failed:", e);
  }
}

async function mirrorResolve(id: string, decision: string): Promise<void> {
  if (!isDbConfigured()) return;
  try {
    await db()
      .from(T.queue_items)
      .update({ resolved_at: new Date().toISOString(), decision })
      .eq("id", id);
  } catch (e) {
    console.error("queueStore mirrorResolve failed:", e);
  }
}

async function listSupabaseUnresolved(): Promise<QueueItem[]> {
  if (!isDbConfigured()) return [];
  try {
    const { data, error } = await db()
      .from(T.queue_items)
      .select("id, title, source, options, note, created_at, updated_at, resolved_at, decision")
      .is("resolved_at", null);
    if (error) throw error;
    return (data ?? []).map((r) => ({
      id: r.id,
      title: r.title,
      source: r.source ?? undefined,
      options: Array.isArray(r.options) ? r.options : undefined,
      note: r.note ?? undefined,
      created_at: new Date(r.created_at).getTime(),
      updated_at: new Date(r.updated_at).getTime(),
      resolved_at: r.resolved_at ? new Date(r.resolved_at).getTime() : null,
      decision: r.decision ?? null,
    }));
  } catch (e) {
    console.error("queueStore listSupabaseUnresolved failed:", e);
    return [];
  }
}

// ── Public API ──

export async function listQueue(): Promise<QueueItem[]> {
  const [fsItems, sbItems] = await Promise.all([listFsQueue(), listSupabaseUnresolved()]);
  // Merge by id; filesystem wins on conflict (it's source of truth on this machine)
  const byId = new Map<string, QueueItem>();
  for (const i of sbItems) byId.set(i.id, i);
  for (const i of fsItems) byId.set(i.id, i);
  return Array.from(byId.values()).sort((a, b) => a.created_at - b.created_at);
}

export async function addQueueItem(item: {
  id?: string;
  title: string;
  source?: string;
  options?: string[];
  note?: string;
}): Promise<string> {
  await ensureDir();
  const safeId = (item.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`)
    .replace(/[^a-zA-Z0-9._-]/g, "-");
  const now = Date.now();
  const frontmatterLines = [
    "---",
    `title: "${item.title.replace(/"/g, '\\"')}"`,
    item.source ? `source: ${item.source}` : null,
    item.options ? `options: [${item.options.map((o) => `"${o.replace(/"/g, '\\"')}"`).join(", ")}]` : null,
    `created_at: ${now}`,
    "---",
  ].filter(Boolean);
  const body = item.note ?? "";
  await fs.writeFile(
    path.join(QUEUE_DIR, `${safeId}.md`),
    `${frontmatterLines.join("\n")}\n\n${body}\n`,
    { mode: 0o600 },
  );
  // Mirror to Supabase (fire-and-forget — failures only logged)
  await mirrorUpsert({
    id: safeId,
    title: item.title,
    source: item.source,
    options: item.options,
    note: item.note,
    created_at: now,
    updated_at: now,
  });
  return safeId;
}

export async function deleteQueueItem(id: string, decision = "dismissed"): Promise<boolean> {
  const safe = id.replace(/[^a-zA-Z0-9._-]/g, "-");
  const target = path.join(QUEUE_DIR, `${safe}.md`);
  if (!target.startsWith(QUEUE_DIR)) return false;
  let removed = false;
  try {
    await fs.unlink(target);
    removed = true;
  } catch {
    // file may not exist (e.g., resolution from phone of an item written only to Supabase)
  }
  await mirrorResolve(safe, decision);
  return removed || isDbConfigured();
}

export async function countBySource(): Promise<Record<string, number>> {
  const items = await listQueue();
  const out: Record<string, number> = {};
  for (const i of items) {
    if (!i.source) continue;
    out[i.source] = (out[i.source] ?? 0) + 1;
  }
  return out;
}

export function daysWaiting(item: QueueItem): number {
  return Math.floor((Date.now() - item.created_at) / 86_400_000);
}
