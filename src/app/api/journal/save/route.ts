import { NextRequest, NextResponse } from "next/server";
import { upsertJournal } from "@/lib/habits";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { date, text, energyLevel, ocrModel } = body as {
      date?: string;
      text?: string;
      energyLevel?: number;
      ocrModel?: string;
    };
    if (!date || typeof text !== "string") {
      return NextResponse.json(
        { error: "date_and_text_required" },
        { status: 400 },
      );
    }
    await upsertJournal(
      date,
      text,
      typeof energyLevel === "number" ? energyLevel : null,
      typeof ocrModel === "string" ? { ocrModel } : undefined,
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
