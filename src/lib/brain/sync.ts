// Bidirectional sync between local brain/wiki/*.md and Notion Brain Inbox
// Source of truth: local markdown. Notion is a mirror.
//
// Two flows:
//   1. local mutation → write Notion (called from API on PG UI action)
//   2. Notion change (rare — PG edits Status manually) → update local md
//
// Conflict resolution: Status is most-recent-write-wins; all other fields are local-canonical.

import path from "node:path";
import {
  findEntryBySlug,
  getBrainRoot,
  updateEntryFrontmatter,
} from "./parser";
import { listInboxRows, updateRow, notionConfigured } from "./notion-client";
import type { BrainEntry, EntryStatus, Route } from "./types";

export interface SyncMutation {
  slug: string;
  patch: {
    status?: EntryStatus;
    route?: Route;
    notes?: string;
  };
  notionPageId?: string; // if known, skip lookup
}

/**
 * Local-to-Notion: PG took an action in the Brain tab.
 * Update the local frontmatter first (canonical), then mirror to Notion.
 */
export async function applyLocalMutation(m: SyncMutation): Promise<{
  ok: boolean;
  local: boolean;
  notion: boolean;
  message?: string;
}> {
  const entry = findEntryBySlug(m.slug);
  if (!entry)
    return {
      ok: false,
      local: false,
      notion: false,
      message: "entry not found",
    };

  // Update local md
  const localOk = updateEntryFrontmatter(entry.path, {
    status: m.patch.status,
    route: m.patch.route,
  });

  // Mirror to Notion if we have a page ID or can find one by URL
  let notionOk = false;
  if (notionConfigured()) {
    const pageId =
      m.notionPageId ??
      (await findNotionPageBySourceUrl(entry.frontmatter.source_url));
    if (pageId) {
      notionOk = await updateRow(pageId, {
        status: m.patch.status === "active" ? "routed" : m.patch.status,
        route: m.patch.route,
        processed: new Date().toISOString().slice(0, 10),
      });
    }
  }

  return { ok: localOk, local: localOk, notion: notionOk };
}

/**
 * Notion-to-local: poll for rows whose lastEditedTime is newer than
 * our last poll. Detect Status drift and update local frontmatter.
 *
 * Lightweight implementation: caller passes the timestamp of the last poll;
 * we return rows newer than that.
 */
export async function pollNotionForChanges(since?: string): Promise<{
  changed: number;
  errors: number;
  latest: string;
}> {
  if (!notionConfigured())
    return { changed: 0, errors: 0, latest: new Date().toISOString() };
  let changed = 0;
  let errors = 0;
  let latest = since ?? new Date(0).toISOString();

  try {
    const rows = await listInboxRows(since);
    for (const row of rows) {
      if (row.lastEditedTime > latest) latest = row.lastEditedTime;
      // Map Notion row → local file via brainPath OR URL
      if (!row.status || !row.brainPath) continue;
      const localSlug = extractSlugFromBrainPath(row.brainPath);
      if (!localSlug) continue;
      const entry = findEntryBySlug(localSlug);
      if (!entry) continue;

      // If Notion Status differs from local status, update local
      const notionStatus = mapNotionStatusToLocal(row.status);
      if (notionStatus && entry.frontmatter.status !== notionStatus) {
        const ok = updateEntryFrontmatter(entry.path, { status: notionStatus });
        if (ok) changed++;
        else errors++;
      }
    }
  } catch (e) {
    console.error("[brain/sync] pollNotionForChanges failed:", e);
    errors++;
  }

  return { changed, errors, latest };
}

function extractSlugFromBrainPath(p: string): string | null {
  // brain path looks like file:///Users/patricksmith2x/pg/brain/wiki/concepts/<slug>.md
  const m = p.match(/\/([^/]+)\.md$/);
  return m ? m[1] : null;
}

function mapNotionStatusToLocal(notionStatus: string): EntryStatus | null {
  // Notion has: inbox / to_process / processing / routed / killed
  // Local has: active / superseded / archived
  // Mapping: routed → active, killed → archived, others → null (don't sync)
  if (notionStatus === "routed") return "active";
  if (notionStatus === "killed") return "archived";
  return null;
}

async function findNotionPageBySourceUrl(url?: string): Promise<string | null> {
  if (!url || !notionConfigured()) return null;
  const rows = await listInboxRows();
  const hit = rows.find((r) => r.url === url);
  return hit?.pageId ?? null;
}

/**
 * Resolve absolute brain path to file URL (used by API + sync).
 */
export function entryToFileUrl(entry: BrainEntry): string {
  return `file://${entry.path}`;
}
