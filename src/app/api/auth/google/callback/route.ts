import { NextRequest, NextResponse } from "next/server";
import { oauthClient } from "@/lib/google";
import { getSession } from "@/lib/session";
import { google } from "googleapis";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.redirect(new URL("/?auth=error&reason=no_code", req.url));
  }
  try {
    const client = oauthClient();
    const { tokens } = await client.getToken(code);
    if (!tokens.refresh_token) {
      return NextResponse.redirect(new URL("/?auth=error&reason=no_refresh_token", req.url));
    }
    client.setCredentials(tokens);

    // Fetch email for display
    let email: string | undefined;
    try {
      const oauth2 = google.oauth2({ version: "v2", auth: client });
      const info = await oauth2.userinfo.get();
      email = info.data.email ?? undefined;
    } catch { /* non-fatal */ }

    const session = await getSession();
    session.google = {
      refreshToken: tokens.refresh_token,
      accessToken: tokens.access_token ?? undefined,
      expiresAt: tokens.expiry_date ?? undefined,
      email,
    };
    await session.save();

    return NextResponse.redirect(new URL("/?auth=ok", req.url));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return NextResponse.redirect(new URL(`/?auth=error&reason=${encodeURIComponent(msg)}`, req.url));
  }
}
