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
 * Two debounces, because a walk is not a dwell:
 *   - the WRITE coalesces 900 ms of hero movement into one file write, and a page
 *     touch flushes immediately (a dwell is a decision, and it should land even if
 *     the tab closes a second later)
 *   - the COMMIT trails 25 s behind the last write, so a ten-minute walk is one
 *     commit and not four hundred
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

const WRITE_DEBOUNCE_MS = 900;
const COMMIT_DEBOUNCE_MS = 25_000;
const COMMIT_MESSAGE = "state: touch";

type Snapshot = Record<string, unknown>;

interface Pending {
  snapshot: Snapshot;
  writeTimer: ReturnType<typeof setTimeout> | null;
  commitTimer: ReturnType<typeof setTimeout> | null;
  writing: Promise<void> | null;
}

/**
 * Module state, one per server process. `next start` is a single process per
 * port, so this is the whole story on the mini.
 */
const pending: Pending = {
  snapshot: {},
  writeTimer: null,
  commitTimer: null,
  writing: null,
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
  await fs.promises.writeFile(stateFile(root), serialize(merged));
  scheduleCommit(root);
}

function scheduleWrite(root: string, immediate: boolean): Promise<void> {
  if (pending.writeTimer) {
    clearTimeout(pending.writeTimer);
    pending.writeTimer = null;
  }
  if (immediate) {
    pending.writing = flushWrite(root);
    return pending.writing;
  }
  pending.writeTimer = setTimeout(() => {
    pending.writeTimer = null;
    void flushWrite(root).catch(() => {});
  }, WRITE_DEBOUNCE_MS);
  // `unref` so a pending write never holds a process open.
  pending.writeTimer.unref?.();
  return Promise.resolve();
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
export async function commitState(root = cosmosRoot()): Promise<boolean> {
  try {
    await exec("git", ["-C", root, "add", "state"], { timeout: 15_000 });
    await exec(
      "git",
      ["-C", root, "commit", "-q", "-m", COMMIT_MESSAGE, "--", "state"],
      { timeout: 15_000 },
    );
    return true;
  } catch {
    // Nothing staged, an index.lock, a detached head, no git at all: all fine.
    // The file is written either way and the next touch tries again.
    return false;
  }
}

/** A dwell. Lands on disk now, because a decision should survive a closed tab. */
export async function touchPage(id: string, root = cosmosRoot()): Promise<string> {
  const now = new Date().toISOString();
  pending.snapshot[id] = now;
  await scheduleWrite(root, true);
  return now;
}

/**
 * Where PG stands. Coalesced: the scene may post this every second of a walk and
 * the disk sees one write per 900 ms.
 */
export async function setHero(hero: HeroState, root = cosmosRoot()): Promise<void> {
  pending.snapshot[HERO_KEY] = {
    world: hero.world,
    // Two decimals is a step, not a jitter, and it keeps the diff readable.
    x: Math.round(hero.x * 100) / 100,
    z: Math.round(hero.z * 100) / 100,
  };
  await scheduleWrite(root, false);
}
