import { NextRequest, NextResponse } from "next/server";
import { clearTokens, Provider } from "@/lib/tokenStore";

export async function POST(req: NextRequest) {
  const { provider } = await req.json().catch(() => ({ provider: undefined }));
  const providers: Provider[] = provider ? [provider] : ["google", "spotify", "whoop"];
  for (const p of providers) {
    await clearTokens(p);
  }
  return NextResponse.json({ ok: true, cleared: providers });
}
