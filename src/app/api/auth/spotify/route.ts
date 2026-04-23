import { NextResponse } from "next/server";
import { spotifyAuthUrl } from "@/lib/spotify";

export async function GET() {
  try {
    const state = Math.random().toString(36).slice(2);
    return NextResponse.redirect(spotifyAuthUrl(state));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return NextResponse.redirect(new URL(`/?auth=spotify_error&reason=${encodeURIComponent(msg)}`, "http://localhost:3030"));
  }
}
