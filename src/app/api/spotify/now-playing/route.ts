import { NextResponse } from "next/server";
import { getTokens, isExpired, refreshAndStore } from "@/lib/tokenStore";
import { fetchSpotifyNowPlaying, refreshSpotifyToken, SpotifyNowPlaying } from "@/lib/spotify";

export type NowPlayingResponse =
  | { authed: false }
  | ({ authed: true } & SpotifyNowPlaying);

export async function GET() {
  const current = await getTokens("spotify");
  if (!current?.refreshToken) {
    return NextResponse.json({ authed: false } satisfies NowPlayingResponse);
  }

  try {
    const tokens = isExpired(current)
      ? await refreshAndStore("spotify", refreshSpotifyToken)
      : current;
    const accessToken = tokens.accessToken;
    if (!accessToken) {
      return NextResponse.json({ authed: false } satisfies NowPlayingResponse);
    }
    const np = await fetchSpotifyNowPlaying(accessToken);
    return NextResponse.json({ authed: true, ...np } satisfies NowPlayingResponse);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: "spotify_fetch_failed", detail: msg }, { status: 500 });
  }
}
