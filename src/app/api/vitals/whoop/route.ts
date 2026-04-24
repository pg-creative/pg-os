import { NextResponse } from "next/server";
import { getTokens, isExpired, refreshAndStore } from "@/lib/tokenStore";
import { fetchWhoopVitals, refreshWhoopToken, WhoopVitals } from "@/lib/whoop";

export type VitalsResponse =
  | { authed: false }
  | ({ authed: true } & WhoopVitals);

export async function GET() {
  const current = await getTokens("whoop");
  if (!current?.refreshToken) return NextResponse.json({ authed: false } satisfies VitalsResponse);

  try {
    const tokens = isExpired(current)
      ? await refreshAndStore("whoop", refreshWhoopToken)
      : current;
    const accessToken = tokens.accessToken;
    if (!accessToken) return NextResponse.json({ authed: false } satisfies VitalsResponse);

    const vitals = await fetchWhoopVitals(accessToken);
    return NextResponse.json({ authed: true, ...vitals } satisfies VitalsResponse);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: "whoop_fetch_failed", detail: msg }, { status: 500 });
  }
}
