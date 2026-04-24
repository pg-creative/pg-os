import { NextRequest, NextResponse } from "next/server";
import { getTokens, isExpired, refreshAndStore } from "@/lib/tokenStore";
import { spotifyCommand, refreshSpotifyToken } from "@/lib/spotify";

export async function POST(req: NextRequest) {
  const current = await getTokens("spotify");
  if (!current?.refreshToken) return NextResponse.json({ error: "not_authed" }, { status: 401 });

  const { action } = await req.json().catch(() => ({ action: "" }));
  if (!["play", "pause", "next", "previous"].includes(action)) {
    return NextResponse.json({ error: "invalid_action" }, { status: 400 });
  }

  try {
    const tokens = isExpired(current)
      ? await refreshAndStore("spotify", refreshSpotifyToken)
      : current;
    const accessToken = tokens.accessToken;
    if (!accessToken) return NextResponse.json({ error: "no_access_token" }, { status: 401 });

    const result = await spotifyCommand(accessToken, action as "play" | "pause" | "next" | "previous");
    if (!result.ok) {
      return NextResponse.json(
        { error: "command_failed", status: result.status, detail: result.error },
        { status: result.status },
      );
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: "refresh_failed", detail: msg }, { status: 500 });
  }
}
