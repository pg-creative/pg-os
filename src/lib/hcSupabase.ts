/**
 * Supabase client for Hero's Chronicle.
 * Uses the service role key server-side to bypass RLS — single-user app,
 * PG is the only user, service role key lives in .env.local.
 *
 * If HC_SUPABASE_SERVICE_ROLE_KEY is missing, connected() returns false and
 * the Habits tab surfaces a "Connect to HC" message instead of silently failing.
 */
import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;
let _cachedUserId: string | null = null;

export function hcClient(): SupabaseClient | null {
  if (_client) return _client;
  const url = process.env.HC_SUPABASE_URL;
  const key = process.env.HC_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  _client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _client;
}

export function connected(): boolean {
  return hcClient() !== null;
}

/**
 * Resolve PG's user_id. Single-user app — grabs the first profile row.
 * Cached in memory for the lifetime of the server.
 */
export async function getUserId(): Promise<string | null> {
  if (_cachedUserId) return _cachedUserId;
  const c = hcClient();
  if (!c) return null;
  const { data, error } = await c.from("profiles").select("id").limit(1).single();
  if (error || !data) return null;
  _cachedUserId = data.id as string;
  return _cachedUserId;
}

/** For diagnostics — never exposes the actual key. */
export function status() {
  return {
    connected: connected(),
    url: process.env.HC_SUPABASE_URL ?? null,
    hasKey: !!process.env.HC_SUPABASE_SERVICE_ROLE_KEY,
  };
}
