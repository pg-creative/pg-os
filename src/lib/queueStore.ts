import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

const QUEUE_DIR = path.join(os.homedir(), ".pg-os", "queue");

export type QueueItem = {
  id: string;           // filename without .md
  title: string;
  source?: string;      // project id — e.g. "heros-chronicle"
  options?: string[];
  created_at: number;
  updated_at: number;
  note?: string;
};

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

export async function listQueue(): Promise<QueueItem[]> {
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
      });
    } catch { /* skip unreadable */ }
  }
  return items.sort((a, b) => a.created_at - b.created_at);
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
  return safeId;
}

export async function deleteQueueItem(id: string): Promise<boolean> {
  const safe = id.replace(/[^a-zA-Z0-9._-]/g, "-");
  const target = path.join(QUEUE_DIR, `${safe}.md`);
  if (!target.startsWith(QUEUE_DIR)) return false;
  try {
    await fs.unlink(target);
    return true;
  } catch {
    return false;
  }
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
