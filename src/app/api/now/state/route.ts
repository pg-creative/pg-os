/**
 * /api/now/state — cross-tab/device sync for Now Mode block state.
 *
 * GET  → returns the cookie-stored block (or { active: false })
 * POST → body: NowBlock | { clear: true } — writes a 26-min cookie
 *
 * Source of truth remains localStorage on the originating tab; this
 * endpoint just lets a fresh tab/device hydrate the active block on load.
 */

import { NextResponse, type NextRequest } from "next/server";

const COOKIE_NAME = "pg-os-now-block";
const COOKIE_MAX_AGE_S = 60 * 26; // 26 min — slightly longer than block

type NowBlock = { enteredAt: string; durationMs: number };

function isValidBlock(v: unknown): v is NowBlock {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return typeof o.enteredAt === "string" && typeof o.durationMs === "number";
}

export async function GET(req: NextRequest) {
  const raw = req.cookies.get(COOKIE_NAME)?.value;
  if (!raw) return NextResponse.json({ active: false });
  try {
    const parsed = JSON.parse(raw) as NowBlock;
    if (!isValidBlock(parsed)) return NextResponse.json({ active: false });
    const elapsed = Date.now() - new Date(parsed.enteredAt).getTime();
    if (elapsed >= parsed.durationMs) {
      return NextResponse.json({ active: false });
    }
    return NextResponse.json({ active: true, block: parsed });
  } catch {
    return NextResponse.json({ active: false });
  }
}

export async function POST(req: NextRequest) {
  let body: unknown = null;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 });
  }

  const res = NextResponse.json({ ok: true });

  // Clear case
  if (body && typeof body === "object" && (body as Record<string, unknown>).clear) {
    res.cookies.set(COOKIE_NAME, "", {
      httpOnly: false,
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
    return res;
  }

  if (!isValidBlock(body)) {
    return NextResponse.json({ ok: false, error: "invalid block" }, { status: 400 });
  }

  res.cookies.set(COOKIE_NAME, JSON.stringify(body), {
    httpOnly: false, // readable by client for diagnostics; not sensitive
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE_S,
  });
  return res;
}
