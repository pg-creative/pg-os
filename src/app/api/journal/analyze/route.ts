import { NextRequest, NextResponse } from "next/server";
import { analyzeSentiment } from "@/lib/journalSentiment";
import { upsertJournal } from "@/lib/habits";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { date, text, persist, energyLevel } = body as {
      date?: string;
      text?: string;
      persist?: boolean;
      energyLevel?: number;
    };
    if (!date || typeof text !== "string") {
      return NextResponse.json(
        { error: "date_and_text_required" },
        { status: 400 },
      );
    }
    const result = await analyzeSentiment(text);
    if (persist !== false) {
      await upsertJournal(
        date,
        text,
        typeof energyLevel === "number" ? energyLevel : null,
        {
          cleanedText: text,
          sentimentScore: result.score,
          tags: result.tags,
          ocrModel: "pg-os-morning",
        },
      );
    }
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
