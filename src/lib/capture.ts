import fs from "node:fs/promises";
import path from "node:path";
import { pgPath } from "./paths";
import { addShip } from "./shipLog";
import { addQueueItem } from "./queueStore";
import { upsertJournal } from "./habits";
import { connected as hcConnected } from "./hcSupabase";
import { createTask } from "./tasks";

export type CaptureDestination =
  | "ship"
  | "queue"
  | "essay"
  | "linkedin"
  | "yuriko"
  | "hc-journal"
  | "todo";

const DEST_DIRS: Record<"essay" | "linkedin" | "yuriko", string> = {
  essay: pgPath("pg-creative", "essays", "drafts"),
  linkedin: pgPath("pg-creative", "linkedin-queue"),
  yuriko: pgPath("yuriko", "notebook"),
};

function slugify(s: string): string {
  const base = s.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60) || "capture";
  return `${new Date().toISOString().slice(0, 10)}-${base}`;
}

async function writeMarkdown(dir: string, title: string, text: string): Promise<string> {
  await fs.mkdir(dir, { recursive: true, mode: 0o755 });
  const slug = slugify(title);
  const file = path.join(dir, `${slug}.md`);
  const frontmatter = [
    "---",
    `title: "${title.replace(/"/g, '\\"')}"`,
    `created_at: ${Date.now()}`,
    `captured_via: pg-os`,
    "---",
  ].join("\n");
  await fs.writeFile(file, `${frontmatter}\n\n${text}\n`, { mode: 0o600 });
  return file;
}

export type RouteResult =
  | { ok: true; destination: CaptureDestination; detail: string }
  | { ok: false; destination: CaptureDestination; error: string };

export async function routeCapture(
  destination: CaptureDestination,
  text: string,
  meta?: { title?: string; source?: string; energyLevel?: number | null },
): Promise<RouteResult> {
  try {
    if (destination === "ship") {
      const ship = await addShip(text.trim(), meta?.source ?? null);
      return { ok: true, destination, detail: `ship #${ship.id}` };
    }
    if (destination === "queue") {
      const title = meta?.title ?? text.split("\n")[0].slice(0, 80);
      const id = await addQueueItem({ title, source: meta?.source, note: text });
      return { ok: true, destination, detail: `queue/${id}` };
    }
    if (destination === "essay" || destination === "linkedin" || destination === "yuriko") {
      const title = meta?.title ?? text.split("\n")[0].slice(0, 80);
      const file = await writeMarkdown(DEST_DIRS[destination], title, text);
      return { ok: true, destination, detail: file };
    }
    if (destination === "todo") {
      const title = text.split("\n")[0].slice(0, 200);
      const task = await createTask({
        title,
        project_id: meta?.source ?? null,
        source: "capture-fab",
      });
      return { ok: true, destination, detail: `task/${task.id}` };
    }
    if (destination === "hc-journal") {
      if (!hcConnected()) {
        return { ok: false, destination, error: "HC not connected — add HC_SUPABASE_SERVICE_ROLE_KEY to .env.local" };
      }
      const today = new Date();
      const d = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
      await upsertJournal(d, text, typeof meta?.energyLevel === "number" ? meta.energyLevel : null);
      return { ok: true, destination, detail: `journal/${d}` };
    }
    return { ok: false, destination, error: "unknown_destination" };
  } catch (err) {
    return {
      ok: false,
      destination,
      error: err instanceof Error ? err.message : "unknown",
    };
  }
}
