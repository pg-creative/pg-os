/**
 * Reconcile janitor — moves queue files older than 30 days into an archive
 * subfolder so the live queue stays focused on current decisions.
 *
 * Uses mtime as the resolution proxy (queueStore doesn't write resolved_at
 * into the frontmatter — resolution lives in Supabase). Files written by the
 * cross-tab cron itself are also subject to archiving once they age out.
 *
 * Returns a summary action even though it doesn't write a new queue file —
 * the engine special-cases this rule's id and skips the queue-write step.
 */
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import type { Rule, RuleAction } from "../ruleEngine";

const QUEUE_DIR = path.join(os.homedir(), ".pg-os", "queue");
const ARCHIVE_DIR = path.join(QUEUE_DIR, "archive");
const STALE_MS = 30 * 86_400_000;

export const reconcileJanitor: Rule = {
  id: "reconcile-janitor",
  name: "Queue reconcile janitor",
  schedule: "daily",
  evaluate: async (): Promise<RuleAction | null> => {
    let entries: string[];
    try {
      entries = await fs.readdir(QUEUE_DIR);
    } catch {
      return null; // queue dir doesn't exist yet — nothing to do
    }
    const cutoff = Date.now() - STALE_MS;
    const moved: string[] = [];
    for (const name of entries) {
      if (!name.endsWith(".md")) continue;
      const src = path.join(QUEUE_DIR, name);
      try {
        const stat = await fs.stat(src);
        if (!stat.isFile()) continue;
        if (stat.mtimeMs >= cutoff) continue;
        // Make sure archive dir exists, lazily
        await fs.mkdir(ARCHIVE_DIR, { recursive: true, mode: 0o700 });
        const dest = path.join(ARCHIVE_DIR, name);
        // If a previous archive collision exists, prefix with mtime stamp
        let finalDest = dest;
        try {
          await fs.stat(dest);
          const stamp = new Date(stat.mtimeMs).toISOString().slice(0, 10);
          finalDest = path.join(ARCHIVE_DIR, `${stamp}-${name}`);
        } catch {
          /* no collision */
        }
        await fs.rename(src, finalDest);
        moved.push(name);
      } catch {
        /* skip unreadable file, keep going */
      }
    }
    if (moved.length === 0) return null;
    return {
      kind: "queue_item",
      title: `Archived ${moved.length} stale queue item${moved.length === 1 ? "" : "s"}`,
      source: "cross-tab",
      note: `Moved to ~/.pg-os/queue/archive/:\n${moved.map((m) => `• ${m}`).join("\n")}`,
    };
  },
};
