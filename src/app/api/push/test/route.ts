/**
 * POST /api/push/test
 *
 * Fans out a test push notification to all subscribed devices.
 * Cookie-gated (via middleware) — not a cron endpoint.
 * Useful for verifying the end-to-end push flow after subscribing.
 */
import { NextResponse } from "next/server";
import { sendToAll, isPushConfigured } from "@/lib/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  if (!isPushConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        error: "push_not_configured",
        hint: "Set VAPID_PUBLIC and VAPID_PRIVATE env vars.",
      },
      { status: 503 },
    );
  }

  const timestamp = new Date().toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const result = await sendToAll({
    title: "Test from PG OS",
    body: `Push is working · ${timestamp}`,
    url: "/",
    tag: "pgos-test",
  });

  return NextResponse.json({
    ok: result.failed === 0 && result.attempted > 0,
    attempted: result.attempted,
    delivered: result.delivered,
    failed: result.failed,
  });
}
