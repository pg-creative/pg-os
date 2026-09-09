/**
 * POST /api/cosmos/witness — plumbing only. It writes nothing this round.
 *
 * EXTENDS: `src/app/api/kitsu/sweep/route.ts`'s shape (a POST that a launchd job
 * curls, silently no-ops when nothing is running) and `src/lib/projectState.ts`'s
 * git reading. The witness itself is Kitsu's 03:10 job (plan 8c), so this route is
 * the seam, not a second agent.
 *
 * Round one scope, deliberately small: recompute what `state/weather.json` WOULD
 * say from the vault, the LEDGER and `git log`, and return it. Nothing is written,
 * no agent runs, no plate is generated, and `scripts/com.pgos.witness.plist` is
 * drafted but not installed.
 *
 * The rules it will inherit when it does write, from 7g-1 and 7h:
 *   may write:  myth/drafts/*.md with status: draft, state/*.json, straight to main
 *   never:      post, spend, delete, edit config, write outside cosmos
 *   never:      LEARNING.md (only the Scribe writes it, quoting PG)
 *   never:      `touched:` by a hand, `season_started_at` into Hero's Chronicle
 * And the shape of what it reports: weather only. No threshold, no streak, no
 * grade, no scolding. A missed night is a still sky, never a morning message.
 */

import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { NextResponse } from "next/server";
import {
  cosmosRoot,
  readMonuments,
  readWorlds,
  seasonOf,
} from "../../../../lib/cosmos/vault";

const exec = promisify(execFile);

export const dynamic = "force-dynamic";

/** The three repos the witness reads. It never writes to self or knowledge. */
const READ_REPOS = ["cosmos", "self", "knowledge", "personal-os", "forge"];

function daysBetween(a: Date, b: Date): number {
  return Math.floor((a.getTime() - b.getTime()) / 86_400_000);
}

/** Most recent evening page under knowledge/journal/pages, by filename date. */
function lastJournalPage(workspace: string): string | null {
  const dir = path.join(workspace, "knowledge", "journal", "pages");
  if (!fs.existsSync(dir)) return null;
  const dates = fs
    .readdirSync(dir)
    .map((f) => f.match(/^(\d{4}-\d{2}-\d{2})\.md$/)?.[1])
    .filter((d): d is string => Boolean(d))
    .sort();
  return dates.length ? dates[dates.length - 1] : null;
}

/** Commits across the workspace since a date. Read only: `git log`, nothing else. */
async function commitsSince(workspace: string, since: string): Promise<number> {
  let total = 0;
  for (const repo of READ_REPOS) {
    const dir = path.join(workspace, repo);
    if (!fs.existsSync(path.join(dir, ".git"))) continue;
    try {
      const { stdout } = await exec(
        "git",
        ["-C", dir, "log", `--since=${since}`, "--oneline"],
        { maxBuffer: 4 * 1024 * 1024 },
      );
      total += stdout.trim() ? stdout.trim().split("\n").length : 0;
    } catch {
      /* a repo that will not read is a null, never an error surface */
    }
  }
  return total;
}

/**
 * Birthday quarters are a PURE FUNCTION of the date. Nothing is written to Hero's
 * Chronicle: writing `season_started_at` there resets tier ratchets, which is a
 * wipe, and tiers are grades (plan 7h, D14).
 *
 * The arithmetic itself moved to `lib/cosmos/vault.ts` in round two, so this
 * route's `season_day` and the thread panel's season name cannot drift apart.
 * Round one had two copies of it; `seasonOf` is the one.
 */
function seasonDay(now: Date): number {
  return seasonOf(now).day;
}

export async function POST() {
  const root = cosmosRoot();
  const workspace = path.resolve(root, "..");
  const now = new Date();

  const lastPage = lastJournalPage(workspace);
  const monuments = readMonuments(root, 400);
  const lastShip = monuments.length ? monuments[monuments.length - 1].date : null;

  const pagesDaysAgo = lastPage ? daysBetween(now, new Date(lastPage)) : null;
  const daysSinceShip = lastShip ? daysBetween(now, new Date(lastShip)) : null;

  const since = new Date(now.getTime() - 7 * 86_400_000).toISOString().slice(0, 10);
  const commits = await commitsSince(workspace, since);

  /**
   * Whoop is the only body signal and it is allowed to be missing: a dead token
   * means recovery null and the sky does not shift. No error surface.
   */
  const recovery: number | null = null;

  // Sky is a name the scene maps to mist density, never a score.
  const sky =
    daysSinceShip !== null && daysSinceShip > 6
      ? "settled"
      : pagesDaysAgo !== null && pagesDaysAgo <= 1
        ? "clear"
        : "soft";

  const weather = {
    recovery,
    pages_days_ago: pagesDaysAgo,
    days_since_ship: daysSinceShip,
    sky,
    season_day: seasonDay(now),
  };

  return NextResponse.json({
    ok: true,
    dryRun: true,
    note: "Round one: this route computes and returns weather. It writes nothing.",
    wouldWrite: {
      file: path.join(root, "state", "weather.json"),
      contents: weather,
    },
    read: {
      worlds: readWorlds(root).length,
      monuments: monuments.length,
      lastJournalPage: lastPage,
      lastShip,
      commitsLast7Days: commits,
    },
  });
}
