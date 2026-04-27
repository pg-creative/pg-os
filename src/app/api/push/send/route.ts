import { NextRequest, NextResponse } from "next/server";
import { isDbConfigured, db, T } from "@/lib/db";
import { sendPush, sendToAll, isPushConfigured } from "@/lib/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SendPayload = {
  endpoint?: string;
  title: string;
  body?: string;
  url?: string;
  tag?: string;
};

export async function POST(req: NextRequest) {
  let payload: SendPayload;
  try {
    payload = (await req.json()) as SendPayload;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!payload?.title) {
    return NextResponse.json({ error: "missing_title" }, { status: 400 });
  }

  if (!isPushConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        error: "push_not_configured",
        hint: "Set VAPID_PUBLIC and VAPID_PRIVATE env vars. Generate with `npx web-push generate-vapid-keys`.",
      },
      { status: 503 },
    );
  }

  const pushPayload = {
    title: payload.title,
    body: payload.body,
    url: payload.url,
    tag: payload.tag,
  };

  if (payload.endpoint) {
    if (!isDbConfigured()) {
      return NextResponse.json(
        { ok: false, error: "supabase_not_configured" },
        { status: 503 },
      );
    }
    const { data, error } = await db()
      .from(T.push_subscriptions)
      .select("endpoint, p256dh, auth")
      .eq("endpoint", payload.endpoint)
      .maybeSingle();
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ ok: false, error: "endpoint_not_found" }, { status: 404 });
    }
    const result = await sendPush({
      endpoint: data.endpoint,
      p256dh: data.p256dh,
      auth: data.auth,
      payload: pushPayload,
    });
    return NextResponse.json({ ok: result.ok, result });
  }

  const summary = await sendToAll(pushPayload);
  return NextResponse.json({ ok: summary.failed === 0, ...summary });
}
