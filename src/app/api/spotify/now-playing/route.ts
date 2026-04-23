import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { fetchSpotifyNowPlaying, refreshSpotifyToken, SpotifyNowPlaying } from "@/lib/spotify";

export type NowPlayingResponse =
  | { authed: false }
  | ({ authed: true } & SpotifyNowPlaying);

export async function GET() {
  let session;
  try { session = await getSession(); } catch { return NextResponse.json({ authed: false } satisfies NowPlayingResponse); }
  if (!session.spotify?.refreshToken) return NextResponse.json({ authed: false } satisfies NowPlayingResponse);

  const expired = !session.spotify.expiresAt || session.spotify.expiresAt < Date.now() + 30_000;
  let accessToken = session.spotify.accessToken ?? "";

  try {
    if (expired || !accessToken) {
      const refreshed = await refreshSpotifyToken(session.spotify.refreshToken);
      accessToken = refreshed.access_token;
      session.spotify.accessToken = accessToken;
      session.spotify.expiresAt = Date.now() + refreshed.expires_in * 1000;
      if (refreshed.refresh_token) session.spotify.refreshToken = refreshed.refresh_token;
      await session.save();
    }
    const np = await fetchSpotifyNowPlaying(accessToken);
    return NextResponse.json({ authed: true, ...np } satisfies NowPlayingResponse);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: "spotify_fetch_failed", detail: msg }, { status: 500 });
  }
}
