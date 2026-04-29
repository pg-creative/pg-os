import { NextRequest, NextResponse } from "next/server";
import { connected } from "@/lib/hcSupabase";
import {
  getAvatarState,
  getCosmeticCatalog,
  getSoulBeingName,
  setSoulBeingName,
  updateAvatarState,
} from "@/lib/avatar";

export async function GET() {
  if (!connected()) {
    return NextResponse.json({
      connected: false,
      hint: "Add HC_SUPABASE_SERVICE_ROLE_KEY to .env.local",
      state: null,
      name: null,
      catalog: getCosmeticCatalog(),
    });
  }
  try {
    const [state, name] = await Promise.all([getAvatarState(), getSoulBeingName()]);
    return NextResponse.json({
      connected: true,
      state,
      name,
      catalog: getCosmeticCatalog(),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ connected: true, error: msg }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  if (!connected()) {
    return NextResponse.json(
      { error: "hc_not_connected", hint: "Add HC_SUPABASE_SERVICE_ROLE_KEY to .env.local" },
      { status: 503 },
    );
  }
  const body = await req.json().catch(() => ({}));
  if (typeof body.name !== "string" || !body.name.trim()) {
    return NextResponse.json({ error: "name_required" }, { status: 400 });
  }
  const trimmed = body.name.trim().slice(0, 32);
  try {
    await setSoulBeingName(trimmed);
    const name = await getSoulBeingName();
    return NextResponse.json({ ok: true, name });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: msg }, { status: 500 });
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
  try {
    if (body.action === "name") {
      if (typeof body.name !== "string") return NextResponse.json({ error: "name_required" }, { status: 400 });
      await setSoulBeingName(body.name);
      const name = await getSoulBeingName();
      return NextResponse.json({ ok: true, name });
    }
    // Default: partial state update
    const partial = body as Parameters<typeof updateAvatarState>[0];
    const next = await updateAvatarState(partial);
    return NextResponse.json({ ok: true, state: next });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
