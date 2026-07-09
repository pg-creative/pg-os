import os from "node:os";
import path from "node:path";

// Personal workspace root. The tree lived at ~/CEREBRUM until the 2026-07-07
// machine migration renamed it to ~/pg. Every dashboard read that hangs off the
// personal workspace resolves through this one constant, so a future move is a
// single-line change (or a PG_ROOT env override) instead of chasing string
// literals across the codebase.
export const PG_ROOT = process.env.PG_ROOT || path.join(os.homedir(), "pg");

// Join path segments onto the workspace root.
export function pgPath(...segments: string[]): string {
  return path.join(PG_ROOT, ...segments);
}
