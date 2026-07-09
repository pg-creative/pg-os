import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";

export const dynamic = "force-dynamic";

// Scans the PixelLab output dir and returns a manifest of every sprite +
// its animation frames, so the client plays whatever actually generated.
// Files: "<slug>.png" (base), "<slug>-<action>-<i>.png" (animation frames).
// This is the app's own gitignored PixelLab output under public/, so resolve it
// from the repo root (process.cwd()) rather than a hardcoded home path.
const DIR = path.join(process.cwd(), "public", "agent-office", "pixel");
const FRAME_RE = /^(.+?)-(idle|talk)-(\d+)\.png$/;

export async function GET() {
  let files: string[] = [];
  try {
    files = await fs.readdir(DIR);
  } catch {
    return NextResponse.json({ sprites: [] });
  }
  const map: Record<
    string,
    { slug: string; base: string | null; actions: Record<string, string[]> }
  > = {};
  for (const f of files) {
    if (!f.endsWith(".png")) continue;
    const m = f.match(FRAME_RE);
    if (m) {
      const [, slug, action, idx] = m;
      map[slug] ??= { slug, base: null, actions: {} };
      (map[slug].actions[action] ??= [])[Number(idx)] =
        `/agent-office/pixel/${f}`;
    } else {
      const slug = f.replace(/\.png$/, "");
      map[slug] ??= { slug, base: null, actions: {} };
      map[slug].base = `/agent-office/pixel/${f}`;
    }
  }
  const sprites = Object.values(map).map((s) => ({
    ...s,
    actions: Object.fromEntries(
      Object.entries(s.actions).map(([k, v]) => [k, v.filter(Boolean)]),
    ),
  }));
  return NextResponse.json({ sprites });
}
