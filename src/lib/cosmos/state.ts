/**
 * The one writer for `state/attention.json`, and the git commit behind it.
 *
 * EXTENDS: `src/lib/queueStore.ts`, which already owns a file under a known root
 * and is the only thing allowed to write it. Same posture, one addition: this
 * file lives in a git repo on two machines, so writing it without committing it
 * is how the two Macs diverge and the next `git pull` refuses the file. Critic
 * round one, amendment audit D3: "the touch route writes attention.json and
 * nothing commits it".
 *
 * D3, the amendment itself: "State files and `status: draft` chapters go straight
 * to main." So the commit lands on the cosmos repo's CURRENT branch with a fixed
 * message and it is NEVER pushed from the app. Pushing is a hand's job.
 *
 * ONE DEBOUNCE, AND IT IS THE COMMIT. The COMMIT trails 25 s behind the last
 * write, so a ten-minute walk is one commit and not four hundred. Git is the
 * expensive half; the file is 2 KB and a write costs microseconds.
 *
 * THE WRITE IS NOT DEBOUNCED, and round 2.1 is why. It used to coalesce 900 ms of
 * hero movement into one write, so `POST /api/cosmos/touch` answered 200 with the
 * new position still in memory. The scene saves on `pagehide`, the browser then
 * loads the next page, and the server renders it inside those 900 ms: the reload
 * read the PREVIOUS position off disk and put him back where he started. That is
 * the never-restart proof failing, and it failed as a read-after-write race, not
 * as a lost write. Measured on this branch, `next start`, before the fix: POST
 * 200, GET /api/cosmos/manifest immediately -> the old hero; the same GET 2 s
 * later -> the new one.
 *
 * So 200 now MEANS on disk. `setHero` and `touchPage` both await a real write,
 * writes are serialised (two overlapping `writeFile`s to one path interleave),
 * and each one lands through a temp file and a rename, because `readAttentionRaw`
 * parses JSON and a reader that catches a truncated file loses the hero entirely.
 *
 * Failures are swallowed on purpose. The cartographer and PG both commit in this
 * checkout while the server is up; an index.lock collision must cost a walk
 * nothing. The next write commits what the failed one left behind.
 */

import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { cosmosRoot, HERO_KEY, type HeroState } from "./vault";

const exec = promisify(execFile);

const COMMIT_DEBOUNCE_MS = 25_000;
const COMMIT_MESSAGE = "state: touch";

type Snapshot = Record<string, unknown>;

interface Pending {
  snapshot: Snapshot;
  commitTimer: ReturnType<typeof setTimeout> | null;
  /** The write in flight, so the next one queues behind it instead of racing it. */
  writing: Promise<void>;
}

/**
 * Module state, one per server process. `next start` is a single process per
 * port, so this is the whole story on the mini. It holds NO position of its own:
 * the file is the state, and this is only a write queue. An in-memory hero would
 * be a second source of truth that a second route bundle could not see.
 */
const pending: Pending = {
  snapshot: {},
  commitTimer: null,
  writing: Promise.resolve(),
};

function stateFile(root: string): string {
  return path.join(root, "state", "attention.json");
}

function readSnapshot(root: string): Snapshot {
  try {
    const parsed = JSON.parse(fs.readFileSync(stateFile(root), "utf8"));
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

/** Sorted keys, so a diff reads as a change of attention, not a reshuffle. */
function serialize(snapshot: Snapshot): string {
  const sorted = Object.fromEntries(
    Object.entries(snapshot).sort(([a], [b]) => a.localeCompare(b)),
  );
  return JSON.stringify(sorted, null, 2) + "\n";
}

async function flushWrite(root: string): Promise<void> {
  const dir = path.join(root, "state");
  await fs.promises.mkdir(dir, { recursive: true });
  // Re-read before writing: the witness or a hand may have touched the file
  // while a walk was in flight, and attention NEVER deletes.
  const merged = { ...readSnapshot(root), ...pending.snapshot };
  pending.snapshot = {};
  // Temp file plus rename, so a manifest read that lands mid-write parses the
  // old file or the new one and never half of either. `rename` within one
  // directory is atomic on APFS.
  const file = stateFile(root);
  const tmp = `${file}.${process.pid}.tmp`;
  await fs.promises.writeFile(tmp, serialize(merged));
  await fs.promises.rename(tmp, file);
  scheduleCommit(root);
}

/**
 * Write now, and resolve when it is on disk. Serialised behind whatever write is
 * already in flight: two overlapping writes to one path interleave, and a
 * rejected one must not stall the queue, so both settle paths continue.
 */
function writeNow(root: string): Promise<void> {
  const next = pending.writing.then(
    () => flushWrite(root),
    () => flushWrite(root),
  );
  pending.writing = next.catch(() => {});
  return next;
}

function scheduleCommit(root: string): void {
  if (pending.commitTimer) clearTimeout(pending.commitTimer);
  pending.commitTimer = setTimeout(() => {
    pending.commitTimer = null;
    void commitState(root);
  }, COMMIT_DEBOUNCE_MS);
  pending.commitTimer.unref?.();
}

/**
 * `git add state && git commit -- state` on the cosmos repo's current branch.
 * The pathspec on the commit means a half-staged index belonging to somebody else
 * in this checkout is never swept into a state commit. Never pushes.
 */
export async function commitState(
  root = cosmosRoot(),
  message = COMMIT_MESSAGE,
): Promise<boolean> {
  try {
    await exec("git", ["-C", root, "add", "state"], { timeout: 15_000 });
    await exec(
      "git",
      ["-C", root, "commit", "-q", "-m", message, "--", "state"],
      { timeout: 15_000 },
    );
    return true;
  } catch {
    // Nothing staged, an index.lock, a detached head, no git at all: all fine.
    // The file is written either way and the next touch tries again.
    return false;
  }
}

/**
 * `state/weather.json`, written by the witness and by nobody else.
 *
 * The Critic's deduction 4: "weather is written by nobody and read by nobody",
 * and every field in the file was null. The witness route computes the five
 * fields COSMOLOGY.md names (`recovery`, `pages_days_ago`, `days_since_ship`,
 * `sky`, `season_day`) and this lands them, on the current branch, with the same
 * posture as attention: written immediately, committed once, never pushed.
 *
 * The whole file is REPLACED rather than merged. Attention is a memory and never
 * deletes; weather is today, and yesterday's recovery is not a thing to keep.
 */
export async function writeWeather(
  weather: Record<string, number | string | null>,
  root = cosmosRoot(),
): Promise<void> {
  const dir = path.join(root, "state");
  await fs.promises.mkdir(dir, { recursive: true });
  const sorted = Object.fromEntries(
    Object.entries(weather).sort(([a], [b]) => a.localeCompare(b)),
  );
  await fs.promises.writeFile(
    path.join(dir, "weather.json"),
    JSON.stringify(sorted, null, 2) + "\n",
  );
  await commitState(root, "state: weather");
}

/** A dwell. Lands on disk now, because a decision should survive a closed tab. */
export async function touchPage(id: string, root = cosmosRoot()): Promise<string> {
  const now = new Date().toISOString();
  pending.snapshot[id] = now;
  await writeNow(root);
  return now;
}

/**
 * Where PG stands. Lands on disk before the route answers, because the very next
 * thing that happens after a `pagehide` save is a page load that reads this file.
 * The scene posts on rest, every fifteen seconds, and on the way out, so this is
 * a handful of 2 KB writes a session and not the four hundred the old debounce
 * was written to prevent.
 */
export async function setHero(hero: HeroState, root = cosmosRoot()): Promise<void> {
  pending.snapshot[HERO_KEY] = {
    world: hero.world,
    // Two decimals is a step, not a jitter, and it keeps the diff readable.
    x: Math.round(hero.x * 100) / 100,
    z: Math.round(hero.z * 100) / 100,
  };
  await writeNow(root);
}
