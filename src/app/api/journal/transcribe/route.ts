import { NextRequest, NextResponse } from "next/server";
import { transcribeHandwriting } from "@/lib/journalSentiment";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { images } = body as {
      images?: { mediaType: string; dataBase64: string }[];
    };
    if (!images || images.length === 0) {
      return NextResponse.json({ error: "images_required" }, { status: 400 });
    }
    const result = await transcribeHandwriting(images);
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
