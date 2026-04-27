#!/usr/bin/env node
/**
 * migrate-ships-to-supabase.mjs — One-time port of ~/.pg-os/ships.db → Supabase ships table.
 *
 * Run AFTER:
 *   1. supabase/migrations/001_init.sql is applied
 *   2. PGOS_SUPABASE_URL + PGOS_SUPABASE_SERVICE_ROLE_KEY are set in .env.local
 *
 * Idempotent: skips ships whose (text, created_at) tuple already exists in Supabase.
 *
 * Usage (Node 22+ has --env-file built in):
 *   node --env-file=.env.local scripts/migrate-ships-to-supabase.mjs            # dry run
 *   node --env-file=.env.local scripts/migrate-ships-to-supabase.mjs --apply    # actually inserts
 */
import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import os from "node:os";
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const SQLITE = path.join(os.homedir(), ".pg-os", "ships.db");
const APPLY = process.argv.includes("--apply");

const url = process.env.PGOS_SUPABASE_URL;
const key = process.env.PGOS_SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing PGOS_SUPABASE_URL or PGOS_SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}
if (!fs.existsSync(SQLITE)) {
  console.error(`No sqlite file at ${SQLITE} — nothing to migrate.`);
  process.exit(0);
}

const sb = createClient(url, key, { auth: { persistSession: false } });
const db = new DatabaseSync(SQLITE, { readOnly: true });

const rows = db.prepare("SELECT id, text, context, created_at FROM ships ORDER BY created_at ASC").all();
console.log(`Found ${rows.length} ships in sqlite (${SQLITE})`);

if (!APPLY) {
  console.log("\nDRY RUN — nothing inserted. Re-run with --apply to migrate.");
  console.log("First 5 rows preview:");
  for (const r of rows.slice(0, 5)) {
    console.log(`  ${new Date(r.created_at).toISOString()} · ${r.context ?? "(no ctx)"} · ${r.text.slice(0, 70)}`);
  }
  process.exit(0);
}

let inserted = 0;
let skipped = 0;
let failed = 0;

for (const r of rows) {
  const iso = new Date(r.created_at).toISOString();
  // Check existence by exact match on (text, created_at)
  const { data: existing, error: checkErr } = await sb
    .from("ships")
    .select("id")
    .eq("text", r.text)
    .eq("created_at", iso)
    .limit(1);
  if (checkErr) {
    console.error(`Check failed for row ${r.id}: ${checkErr.message}`);
    failed++;
    continue;
  }
  if (existing && existing.length > 0) {
    skipped++;
    continue;
  }
  const { error: insErr } = await sb.from("ships").insert({
    text: r.text,
    context: r.context,
    source: "sqlite-migration",
    created_at: iso,
  });
  if (insErr) {
    console.error(`Insert failed for row ${r.id}: ${insErr.message}`);
    failed++;
  } else {
    inserted++;
  }
}

console.log(`\nDone. inserted=${inserted}, skipped=${skipped}, failed=${failed}`);
db.close();
