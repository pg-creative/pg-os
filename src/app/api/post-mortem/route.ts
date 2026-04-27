import { NextRequest, NextResponse } from "next/server";
import { listDuePostMortems, recordOutcome, type PostMortemOutcome } from "@/lib/postMortem";

export async function GET() {
  const due = await listDuePostMortems();
  return NextResponse.json({ due });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const id = typeof body.id === "number" ? body.id : Number(body.id);
  const outcome = body.outcome as PostMortemOutcome | undefined;
  const reflection =
    typeof body.reflection === "string" && body.reflection.trim().length > 0
      ? body.reflection.trim().slice(0, 2000)
      : undefined;

  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  }
  if (outcome !== "worked" && outcome !== "didnt-work" && outcome !== "unclear") {
    return NextResponse.json({ error: "invalid_outcome" }, { status: 400 });
  }

  const result = await recordOutcome({ id, outcome, reflection });
  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? "failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
