import os from "node:os";
import path from "node:path";

// Personal workspace root. The tree lived at ~/CEREBRUM, then ~/pg after the
// 2026-07-07 machine migration, and is ~/cortex today. Every dashboard read that
// hangs off the personal workspace resolves through this one constant, so a
// future move is a single-line change (or a PG_ROOT env override) instead of
// chasing string literals across the codebase.
//
// The default was still `~/pg` on 2026-09-09, which is a path that has not
// existed since the tree became ~/cortex: every filesystem-backed surface fell
// back to a directory that is not there whenever PG_ROOT was unset. Named as a
// bug in the plan (7i) and fixed here. `.env.local` sets PG_ROOT explicitly on
// the mini; this default is what a machine gets with no env at all.
export const PG_ROOT = process.env.PG_ROOT || path.join(os.homedir(), "cortex");

// Join path segments onto the workspace root.
export function pgPath(...segments: string[]): string {
  return path.join(PG_ROOT, ...segments);
}
