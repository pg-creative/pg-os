import { NextRequest, NextResponse } from "next/server";
import { exchangeWhoopCode } from "@/lib/whoop";
import { setTokens } from "@/lib/tokenStore";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const err = req.nextUrl.searchParams.get("error");
  if (err) return NextResponse.redirect(new URL(`/?auth=whoop_error&reason=${err}`, req.url));
  if (!code) return NextResponse.redirect(new URL("/?auth=whoop_error&reason=no_code", req.url));

  try {
    const tokens = await exchangeWhoopCode(code);
    await setTokens("whoop", {
      refreshToken: tokens.refresh_token,
      accessToken: tokens.access_token,
      expiresAt: Date.now() + tokens.expires_in * 1000,
    });
    return NextResponse.redirect(new URL("/?auth=whoop_ok", req.url));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return NextResponse.redirect(new URL(`/?auth=whoop_error&reason=${encodeURIComponent(msg)}`, req.url));
  }
}
