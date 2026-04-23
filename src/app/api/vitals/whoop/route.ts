import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { fetchWhoopVitals, refreshWhoopToken, WhoopVitals } from "@/lib/whoop";

export type VitalsResponse =
  | { authed: false }
  | ({ authed: true } & WhoopVitals);

export async function GET() {
  let session;
  try { session = await getSession(); } catch { return NextResponse.json({ authed: false } satisfies VitalsResponse); }
  if (!session.whoop?.refreshToken) return NextResponse.json({ authed: false } satisfies VitalsResponse);

  const expired = !session.whoop.expiresAt || session.whoop.expiresAt < Date.now() + 30_000;
  let accessToken = session.whoop.accessToken ?? "";

  try {
    if (expired || !accessToken) {
      const refreshed = await refreshWhoopToken(session.whoop.refreshToken);
      accessToken = refreshed.access_token;
      session.whoop.accessToken = accessToken;
      session.whoop.expiresAt = Date.now() + refreshed.expires_in * 1000;
      if (refreshed.refresh_token) session.whoop.refreshToken = refreshed.refresh_token;
      await session.save();
    }
    const vitals = await fetchWhoopVitals(accessToken);
    return NextResponse.json({ authed: true, ...vitals } satisfies VitalsResponse);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: "whoop_fetch_failed", detail: msg }, { status: 500 });
  }
}
