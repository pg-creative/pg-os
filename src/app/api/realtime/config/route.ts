/**
 * GET /api/realtime/config
 *
 * Returns the PUBLISHABLE keys for both Supabase projects so browser clients
 * can open Realtime WebSocket connections.
 *
 * NEVER returns service-role keys or any secret.
 * If a publishable key env var is not set, its value is returned as null —
 * views must gracefully no-op rather than attempt to subscribe.
 */
import { NextResponse } from "next/server";

export interface RealtimeConfig {
  pgosUrl: string | null;
  pgosPublishableKey: string | null;
  hcUrl: string | null;
  hcPublishableKey: string | null;
}

export async function GET(): Promise<NextResponse<RealtimeConfig>> {
  return NextResponse.json({
    pgosUrl: process.env.PGOS_SUPABASE_URL ?? null,
    pgosPublishableKey: process.env.PGOS_SUPABASE_PUBLISHABLE_KEY ?? null,
    hcUrl: process.env.HC_SUPABASE_URL ?? null,
    hcPublishableKey: process.env.HC_SUPABASE_PUBLISHABLE_KEY ?? null,
  });
}
