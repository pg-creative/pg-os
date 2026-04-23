import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { spotifyCommand, refreshSpotifyToken } from "@/lib/spotify";

export async function POST(req: NextRequest) {
  let session;
  try { session = await getSession(); } catch { return NextResponse.json({ error: "no_session" }, { status: 401 }); }
  if (!session.spotify?.refreshToken) return NextResponse.json({ error: "not_authed" }, { status: 401 });

  const { action } = await req.json().catch(() => ({ action: "" }));
  if (!["play", "pause", "next", "previous"].includes(action)) {
    return NextResponse.json({ error: "invalid_action" }, { status: 400 });
  }

  // Refresh token if expired
  const expired = !session.spotify.expiresAt || session.spotify.expiresAt < Date.now() + 30_000;
  let accessToken = session.spotify.accessToken ?? "";
  if (expired || !accessToken) {
    try {
      const refreshed = await refreshSpotifyToken(session.spotify.refreshToken);
      accessToken = refreshed.access_token;
      session.spotify.accessToken = accessToken;
      session.spotify.expiresAt = Date.now() + refreshed.expires_in * 1000;
      if (refreshed.refresh_token) session.spotify.refreshToken = refreshed.refresh_token;
      await session.save();
    } catch (err) {
      return NextResponse.json({ error: "refresh_failed", detail: String(err) }, { status: 500 });
    }
  }

  const result = await spotifyCommand(accessToken, action as "play" | "pause" | "next" | "previous");
  if (!result.ok) {
    return NextResponse.json({ error: "command_failed", status: result.status, detail: result.error }, { status: result.status });
  }
  return NextResponse.json({ ok: true });
}
