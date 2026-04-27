import { NextResponse } from "next/server";
import { getTrustState } from "@/lib/claudeStore";

export async function GET() {
  const trust = await getTrustState();
  return NextResponse.json({ trust });
}
