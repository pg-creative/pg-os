import { NextRequest, NextResponse } from "next/server";
import { exchangeSpotifyCode } from "@/lib/spotify";
import { setTokens } from "@/lib/tokenStore";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const err = req.nextUrl.searchParams.get("error");
  if (err) return NextResponse.redirect(new URL(`/?auth=spotify_error&reason=${err}`, req.url));
  if (!code) return NextResponse.redirect(new URL("/?auth=spotify_error&reason=no_code", req.url));

  try {
    const tokens = await exchangeSpotifyCode(code);
    if (!tokens.refresh_token) {
      return NextResponse.redirect(new URL("/?auth=spotify_error&reason=no_refresh_token", req.url));
    }
    await setTokens("spotify", {
      refreshToken: tokens.refresh_token,
      accessToken: tokens.access_token,
      expiresAt: Date.now() + tokens.expires_in * 1000,
    });
    return NextResponse.redirect(new URL("/?auth=spotify_ok", req.url));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return NextResponse.redirect(new URL(`/?auth=spotify_error&reason=${encodeURIComponent(msg)}`, req.url));
  }
}
