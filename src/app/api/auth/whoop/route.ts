import { NextResponse } from "next/server";
import { whoopAuthUrl } from "@/lib/whoop";

export async function GET() {
  try {
    const state = Math.random().toString(36).slice(2);
    return NextResponse.redirect(whoopAuthUrl(state));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return NextResponse.redirect(new URL(`/?auth=whoop_error&reason=${encodeURIComponent(msg)}`, "http://localhost:3030"));
  }
}
