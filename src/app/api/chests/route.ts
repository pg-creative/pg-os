import { NextRequest, NextResponse } from "next/server";
import { connected } from "@/lib/hcSupabase";
import {
  getChestCatalog,
  getCoinsBalance,
  getDailyPullStatus,
  getRecentPulls,
  openChest,
  pullChest,
  type ChestType,
} from "@/lib/chests";

export async function GET() {
  if (!connected()) {
    return NextResponse.json({
      connected: false,
      hint: "Add HC_SUPABASE_SERVICE_ROLE_KEY to .env.local",
      catalog: getChestCatalog(),
      coins: 0,
      dailyPulls: { used: 0, cap: 5 },
      recentPulls: [],
    });
  }
  try {
    const [coins, dailyPulls, recentPulls] = await Promise.all([
      getCoinsBalance(),
      getDailyPullStatus(),
      getRecentPulls(10),
    ]);
    return NextResponse.json({
      connected: true,
      catalog: getChestCatalog(),
      coins,
      dailyPulls,
      recentPulls,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ connected: true, error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!connected()) {
    return NextResponse.json(
      { error: "hc_not_connected", hint: "Add HC_SUPABASE_SERVICE_ROLE_KEY to .env.local" },
      { status: 503 },
    );
  }
  const body = await req.json().catch(() => ({}));
  const action = body.action as string | undefined;
  try {
    if (action === "pull") {
      const chestType = body.chestType as ChestType;
      if (!chestType) return NextResponse.json({ error: "chestType_required" }, { status: 400 });
      const result = await pullChest(chestType);
      return NextResponse.json({ ok: true, pull: result });
    }
    if (action === "open") {
      const pullId = body.pullId as string;
      if (!pullId) return NextResponse.json({ error: "pullId_required" }, { status: 400 });
      const reward = await openChest(pullId);
      return NextResponse.json({ ok: true, reward });
    }
    return NextResponse.json({ error: "unknown_action" }, { status: 400 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    const status = msg === "insufficient_coins" || msg === "daily_cap_reached" ? 400 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
