import { NextResponse } from "next/server";
import { storeSummary } from "@/lib/tokenStore";

/**
 * Diagnostic endpoint. Shows connection status for each provider
 * without exposing any actual tokens. Useful for the StatusView tile.
 */
export async function GET() {
  try {
    const providers = await storeSummary();
    return NextResponse.json({ ok: true, providers });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
