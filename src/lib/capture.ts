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
  | "evening-pages"
  | "todo";

const DEST_DIRS: Record<"essay" | "linkedin" | "yuriko" | "evening-pages", string> = {
  essay: pgPath("pg-creative", "essays", "drafts"),
  linkedin: pgPath("pg-creative", "linkedin-queue"),
  yuriko: pgPath("yuriko", "notebook"),
  // The evening pages the cosmos reads. `sources.yml` points at this exact
  // folder, so a page captured here is in the vault's field of view the moment
  // it lands; nothing is copied and nothing moves (plan 7g-1: "nothing moves").
  "evening-pages": pgPath("knowledge", "journal", "pages"),
};

function slugify(s: string): string {
  const base = s.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60) || "capture";
  return `${new Date().toISOString().slice(0, 10)}-${base}`;
}

/**
 * Writes one markdown file with frontmatter.
 *
 * Round two adds two options, both for the evening pages (plan 7i, D12):
 *   `name`   an exact filename, because a journal page is `YYYY-MM-DD.md` and
 *            not a slug; the cosmos and the witness both find it by its date
 *   `extra`  extra frontmatter lines
 *   `append` when the file already exists, append a dated section instead of
 *            overwriting. A day's page is written to more than once, and losing
 *            the morning's entry to the evening's would be a wipe.
 */
async function writeMarkdown(
  dir: string,
  title: string,
  text: string,
  opts: { name?: string; extra?: string[]; append?: boolean } = {},
): Promise<string> {
  await fs.mkdir(dir, { recursive: true, mode: 0o755 });
  const file = path.join(dir, opts.name ?? `${slugify(title)}.md`);

  if (opts.append) {
    const existing = await fs.readFile(file, "utf8").catch(() => null);
    if (existing !== null) {
      const stamp = new Date().toTimeString().slice(0, 5);
      const section = `\n\n## ${stamp}\n\n${text}\n`;
      await fs.appendFile(file, section);
      return file;
    }
  }

  const frontmatter = [
    "---",
    `title: "${title.replace(/"/g, '\\"')}"`,
    ...(opts.extra ?? []),
    `created_at: ${Date.now()}`,
    `captured_via: pg-os`,
    "---",
  ].join("\n");
  await fs.writeFile(file, `${frontmatter}\n\n${text}\n`, { mode: 0o600 });
  return file;
}

/** Local date, not UTC: an evening page written at 11pm belongs to that evening. */
function localDate(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
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
    /**
     * The evening pages. ONE act, ONE home (plan 7h, D12): the page lands in
     * `knowledge/journal/pages/YYYY-MM-DD.md`, which `sources.yml` already points
     * the cosmos at, AND the same text goes to Hero's Chronicle through the
     * `upsertJournal` that already exists, when HC is configured.
     *
     * `plate: null` is deliberate and is not a missing field: it is the marker
     * the witness looks for. "No page without a plate" is a rule about the vault;
     * an evening page arrives unplated and the witness plates it that night.
     *
     * HC being down never costs PG the page. The file is written first and the
     * journal write is best-effort, reported in the detail line.
     */
    if (destination === "evening-pages") {
      const day = localDate();
      const file = await writeMarkdown(DEST_DIRS["evening-pages"], day, text, {
        name: `${day}.md`,
        append: true,
        extra: [
          `date: ${day}`,
          "type: page",
          "world: quiet-practice",
          "private: true",
          "plate: null",
        ],
      });
      let journal = "hc not connected";
      if (hcConnected()) {
        try {
          await upsertJournal(
            day,
            text,
            typeof meta?.energyLevel === "number" ? meta.energyLevel : null,
          );
          journal = `journal/${day}`;
        } catch (err) {
          journal = `hc write failed: ${err instanceof Error ? err.message : "unknown"}`;
        }
      }
      return { ok: true, destination, detail: `${file} (${journal})` };
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
