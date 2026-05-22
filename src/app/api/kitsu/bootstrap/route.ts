/**
 * POST /api/kitsu/bootstrap — initialize (or reset) Kitsu's soul files.
 *
 * Maps to Anthropic's "initializer agent" pattern for long-running agents: on
 * first run, set up the environment (seed IDENTITY/SOUL/USER/MEMORY/decision-log).
 * Because the seeds are drawn from PG's real config, this is "confirm + refine"
 * rather than blank-slate. Body { reset: true } wipes first for a clean re-bootstrap.
 *
 * Returns whether Kitsu was unbootstrapped before this call so the UI can decide
 * to run the short onboarding interview (the conversational refinement) in chat.
 */
import { NextRequest, NextResponse } from "next/server";
import {
  ensureKitsuMemory,
  isUnbootstrapped,
  resetKitsuMemory,
  loadKitsuMemory,
} from "@/lib/kitsu/kitsuMemory";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: { reset?: boolean } = {};
  try {
    body = await req.json();
  } catch {
    /* empty body is fine */
  }

  const wasUnbootstrapped = await isUnbootstrapped();
  if (body.reset) await resetKitsuMemory();
  await ensureKitsuMemory();
  const mem = await loadKitsuMemory();

  return NextResponse.json({
    ok: true,
    wasUnbootstrapped: body.reset ? true : wasUnbootstrapped,
    files: ["IDENTITY", "SOUL", "USER", "MEMORY", "decision-log"],
    // A small preview so the UI can show what Kitsu starts from.
    preview: {
      identity: mem.identity.slice(0, 400),
      soul: mem.soul.slice(0, 400),
    },
  });
}
