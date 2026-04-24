import { NextRequest, NextResponse } from "next/server";
import { spotifyAuthUrl } from "@/lib/spotify";

export async function GET(req: NextRequest) {
  try {
    const state = Math.random().toString(36).slice(2);
    return NextResponse.redirect(spotifyAuthUrl(state));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    // Redirect errors back to the same origin the request came from (not hardcoded localhost).
    return NextResponse.redirect(
      new URL(`/?auth=spotify_error&reason=${encodeURIComponent(msg)}`, req.url),
    );
  }
}
