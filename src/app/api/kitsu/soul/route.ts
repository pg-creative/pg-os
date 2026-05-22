/**
 * GET|PATCH /api/kitsu/soul — read/edit Kitsu's soul files (the OS soul panel).
 *
 * GET            -> { files: { IDENTITY, SOUL, USER, MEMORY, "decision-log" } }
 * GET ?file=SOUL -> { file: "SOUL", content }
 * PATCH { file, content } -> overwrite one editable soul file (not the append-only log).
 *
 * Lets PG SEE Kitsu's evolving soul in the OS and hand-edit it. Files are the
 * source of truth; the same files Kitsu reads on every session init.
 */
import { NextRequest, NextResponse } from "next/server";
import {
  readSoulFile,
  writeSoulFile,
  type SoulFile,
} from "@/lib/kitsu/kitsuMemory";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALL: SoulFile[] = ["IDENTITY", "SOUL", "USER", "MEMORY", "decision-log"];
// decision-log is append-only (written via appendKitsuDecision), not hand-overwritten here.
const EDITABLE: SoulFile[] = ["IDENTITY", "SOUL", "USER", "MEMORY"];

function isSoulFile(v: unknown): v is SoulFile {
  return typeof v === "string" && (ALL as string[]).includes(v);
}

export async function GET(req: NextRequest) {
  const file = req.nextUrl.searchParams.get("file");
  if (file) {
    if (!isSoulFile(file))
      return NextResponse.json({ error: "unknown_file" }, { status: 400 });
    return NextResponse.json({ file, content: await readSoulFile(file) });
  }
  const entries = await Promise.all(
    ALL.map(async (k) => [k, await readSoulFile(k)] as const),
  );
  return NextResponse.json({ files: Object.fromEntries(entries) });
}

export async function PATCH(req: NextRequest) {
  let body: { file?: string; content?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  if (!isSoulFile(body.file) || !(EDITABLE as string[]).includes(body.file)) {
    return NextResponse.json({ error: "file_not_editable" }, { status: 400 });
  }
  if (typeof body.content !== "string") {
    return NextResponse.json({ error: "content_required" }, { status: 400 });
  }
  await writeSoulFile(body.file, body.content);
  return NextResponse.json({ ok: true, file: body.file });
}
