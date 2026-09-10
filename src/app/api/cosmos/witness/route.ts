/**
 * POST /api/cosmos/witness — the weather, written.
 *
 * EXTENDS: `src/app/api/kitsu/sweep/route.ts`'s shape (a POST that a launchd job
 * curls, silently no-ops when nothing is running) and `src/lib/projectState.ts`'s
 * git reading. The witness itself is Kitsu's 03:10 job (plan 8c), so this route is
 * the seam, not a second agent.
 *
 * ROUND 2.1: it writes. The Critic's deduction 4 was that "`weather` reaches the
 * manifest and is read by nothing; `state/weather.json` is all null", and a dry
 * run that has never once written the file is a seam nobody has tested. This POST
 * now computes the five fields COSMOLOGY.md names and lands them in
 * `state/weather.json`, committed on the current branch and never pushed, exactly
 * like attention. `?dry=1` keeps the old behaviour for a look without a write.
 *
 * It still runs no agent, generates no plate, and
 * `scripts/com.pgos.witness.plist` is drafted and not installed.
 *
 * The rules it will inherit when it does write, from 7g-1 and 7h:
 *   may write:  chapters/*.md with status: draft, state/*.json, straight to main
 *   never:      post, spend, delete, edit config, write outside cosmos
 *   never:      LEARNING.md (only the Scribe writes it, quoting PG)
 *   never:      `touched:` by a hand, `season_started_at` into Hero's Chronicle
 *
 * ONE CHAPTER FOLDER, and it is `chapters/`. This line said `myth/drafts/*.md`
 * for a round after that folder was deleted (the Critic's deduction 12: "two docs
 * that lie"). `.githooks/pre-commit` is the version of this rule that bites: with
 * WITNESS=1 set it refuses canon text and accepts `chapters/*.md` only when the
 * STAGED blob carries `status: draft`.
 * And the shape of what it reports: weather only. No threshold, no streak, no
 * grade, no scolding. A missed night is a still sky, never a morning message.
 */

import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { NextRequest, NextResponse } from "next/server";
import {
  cosmosRoot,
  readMonuments,
  readWorlds,
  seasonOf,
} from "../../../../lib/cosmos/vault";
import { writeWeather } from "../../../../lib/cosmos/state";
import { getTokens, isExpired, refreshAndStore } from "@/lib/tokenStore";
import { fetchWhoopVitals, refreshWhoopToken } from "@/lib/whoop";

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

/**
 * Whoop recovery, through the token store the OS already owns.
 *
 * witness/PROMPT.md, verbatim: "A dead token means `recovery: null` and the sky
 * does not shift. No error surface." No token, an expired refresh, a 500 from
 * Whoop: all of them are null and none of them is an error. The body is the only
 * signal the cosmos takes from outside PG's own files, and it is allowed to be
 * missing.
 */
async function whoopRecovery(): Promise<number | null> {
  try {
    const current = await getTokens("whoop");
    if (!current?.refreshToken) return null;
    const tokens = isExpired(current)
      ? await refreshAndStore("whoop", refreshWhoopToken)
      : current;
    if (!tokens.accessToken) return null;
    const vitals = await fetchWhoopVitals(tokens.accessToken);
    return typeof vitals.recovery === "number" ? vitals.recovery : null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const dry = req.nextUrl.searchParams.get("dry") === "1";
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

  const recovery = await whoopRecovery();

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

  if (!dry) await writeWeather(weather);

  return NextResponse.json({
    ok: true,
    dryRun: dry,
    wrote: dry ? null : path.join(root, "state", "weather.json"),
    weather,
    read: {
      worlds: readWorlds(root).length,
      monuments: monuments.length,
      lastJournalPage: lastPage,
      lastShip,
      commitsLast7Days: commits,
    },
  });
}
