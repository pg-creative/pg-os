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
};

// ── Filesystem helpers (filesystem stays source of truth for Claude Code's rule)

async function ensureDir() {
  await fs.mkdir(QUEUE_DIR, { recursive: true, mode: 0o700 });
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

async function listFsQueue(): Promise<QueueItem[]> {
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
      items.push({
        id: file.replace(/\.md$/, ""),
        title: (meta.title as string) ?? file.replace(/\.md$/, ""),
        source: meta.source as string | undefined,
        options: Array.isArray(meta.options) ? (meta.options as string[]) : undefined,
        created_at: meta.created_at ? Number(meta.created_at) : stat.birthtimeMs,
        updated_at: stat.mtimeMs,
        note: body.trim() || undefined,
        resolved_at: null,
      });
    } catch { /* skip unreadable */ }
  }
  return items;
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
