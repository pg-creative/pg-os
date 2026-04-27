import { NextRequest, NextResponse } from "next/server";
import { isDbConfigured } from "@/lib/db";
import { listSubscriptions, upsertSubscription, getVapidPublicKey } from "@/lib/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SubscribePayload = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  label?: string;
  user_agent?: string;
};

export async function POST(req: NextRequest) {
  let body: SubscribePayload;
  try {
    body = (await req.json()) as SubscribePayload;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!body?.endpoint || !body?.keys?.p256dh || !body?.keys?.auth) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  if (!isDbConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        error: "supabase_not_configured",
        hint: "Set PGOS_SUPABASE_URL and PGOS_SUPABASE_SERVICE_ROLE_KEY to persist subscriptions.",
      },
      { status: 503 },
    );
  }

  try {
    await upsertSubscription({
      endpoint: body.endpoint,
      p256dh: body.keys.p256dh,
      auth: body.keys.auth,
      label: body.label,
      user_agent: body.user_agent ?? req.headers.get("user-agent"),
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "subscribe_failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function GET() {
  if (!isDbConfigured()) {
    return NextResponse.json({
      configured: false,
      vapid_public: getVapidPublicKey(),
      count: 0,
      subscriptions: [],
    });
  }
  try {
    const subs = await listSubscriptions();
    return NextResponse.json({
      configured: true,
      vapid_public: getVapidPublicKey(),
      count: subs.length,
      subscriptions: subs.map((s) => ({
        endpoint: s.endpoint,
        label: s.label,
        user_agent: s.user_agent,
        created_at: s.created_at,
        last_seen_at: s.last_seen_at,
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "list_failed";
    return NextResponse.json({ configured: true, error: message }, { status: 500 });
  }
}
