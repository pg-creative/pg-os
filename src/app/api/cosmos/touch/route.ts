/**
 * POST /api/cosmos/touch — attention, and nothing else.
 *
 * EXTENDS: `src/app/api/capture/route.ts`, the existing pattern of a small POST
 * that writes one file under a known root and returns what it did.
 *
 * It writes `state/attention.json`, which is `{ page_id: last_touched }`. Mist is
 * a function of days since touched and it NEVER deletes: a key only ever gets a
 * newer timestamp, and nothing here removes one.
 *
 * It does NOT write `touched:` into a page's frontmatter. SCHEMA.md is explicit
 * that the witness owns that field and a hand never writes it, so the panel
 * records that PG looked and stops there.
 */

import fs from "node:fs";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { cosmosRoot, readPages, readWorlds } from "../../../../lib/cosmos/vault";

export const dynamic = "force-dynamic";

/** Only ids that are real pages get written, so a stray POST cannot grow the file. */
function knownPageIds(root: string): Set<string> {
  const ids = new Set<string>();
  for (const w of readWorlds(root)) {
    if (w.status === "unbuilt") continue;
    for (const p of readPages(w.id, { drafts: true }, root)) ids.add(p.id);
  }
  return ids;
}

export async function POST(req: NextRequest) {
  let body: { id?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad json" }, { status: 400 });
  }

  const id = typeof body.id === "string" ? body.id : null;
  if (!id) return NextResponse.json({ ok: false, error: "no id" }, { status: 400 });

  const root = cosmosRoot();
  if (!knownPageIds(root).has(id)) {
    return NextResponse.json({ ok: false, error: "unknown page" }, { status: 404 });
  }

  const dir = path.join(root, "state");
  const file = path.join(dir, "attention.json");
  await fs.promises.mkdir(dir, { recursive: true });

  let current: Record<string, string> = {};
  try {
    current = JSON.parse(await fs.promises.readFile(file, "utf8"));
  } catch {
    current = {};
  }

  const now = new Date().toISOString();
  current[id] = now;

  // Sorted keys so a diff of this file reads as a change of attention rather
  // than a reshuffle of the whole object.
  const sorted = Object.fromEntries(
    Object.entries(current).sort(([a], [b]) => a.localeCompare(b)),
  );
  await fs.promises.writeFile(file, JSON.stringify(sorted, null, 2) + "\n");

  return NextResponse.json({ ok: true, id, touched: now });
}
