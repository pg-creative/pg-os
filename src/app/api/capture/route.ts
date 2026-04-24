import { NextRequest, NextResponse } from "next/server";
import { routeCapture, CaptureDestination } from "@/lib/capture";

const VALID: CaptureDestination[] = ["ship", "queue", "essay", "linkedin", "yuriko", "hc-journal"];

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const destination = body.destination as CaptureDestination;
  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!VALID.includes(destination)) {
    return NextResponse.json({ error: "invalid_destination", valid: VALID }, { status: 400 });
  }
  if (!text) {
    return NextResponse.json({ error: "text_required" }, { status: 400 });
  }
  const result = await routeCapture(destination, text, {
    title: body.title,
    source: body.source,
    energyLevel: body.energyLevel,
  });
  if (!result.ok) {
    return NextResponse.json(result, { status: 500 });
  }
  return NextResponse.json(result);
}
