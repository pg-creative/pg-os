import { NextRequest, NextResponse } from "next/server";
import { oauthClient } from "@/lib/google";
import { setTokens } from "@/lib/tokenStore";
import { google } from "googleapis";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.redirect(
      new URL("/?auth=error&reason=no_code", req.url),
    );
  }
  try {
    const client = oauthClient();
    const { tokens } = await client.getToken(code);
    if (!tokens.refresh_token) {
      // Google only issues refresh_token on first consent. Force re-consent if missing.
      return NextResponse.redirect(
        new URL(
          "/?auth=error&reason=no_refresh_token_revoke_and_retry",
          req.url,
        ),
      );
    }
    client.setCredentials(tokens);

    let email: string | undefined;
    try {
      const oauth2 = google.oauth2({ version: "v2", auth: client });
      const info = await oauth2.userinfo.get();
      email = info.data.email ?? undefined;
    } catch {
      /* non-fatal */
    }

    await setTokens("google", {
      refreshToken: tokens.refresh_token,
      accessToken: tokens.access_token ?? undefined,
      expiresAt: tokens.expiry_date ?? undefined,
      email,
      scope: tokens.scope ?? undefined,
    });

    return NextResponse.redirect(new URL("/?auth=google_ok", req.url));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return NextResponse.redirect(
      new URL(`/?auth=error&reason=${encodeURIComponent(msg)}`, req.url),
    );
  }
}
