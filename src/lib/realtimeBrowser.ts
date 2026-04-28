/**
 * realtimeBrowser.ts — Browser-side Supabase client factory for Realtime.
 *
 * RULES:
 * - Uses the PUBLISHABLE (anon) key only — never the service role key.
 * - Lazy-imports @supabase/supabase-js so it is never bundled into server pages.
 * - Returns null if url or publishableKey are missing — callers must gracefully no-op.
 * - Singleton per (url, key) pair — repeated calls with the same args return the same client.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

const _cache = new Map<string, SupabaseClient>();

/**
 * Create (or return cached) a browser-side Supabase client configured for
 * Realtime subscriptions. Uses the publishable key — safe to expose in JS bundles.
 *
 * Returns null if either argument is falsy — views must check before subscribing.
 */
export async function createBrowserSupabaseClient(
  url: string | null | undefined,
  publishableKey: string | null | undefined,
): Promise<SupabaseClient | null> {
  if (!url || !publishableKey) return null;

  const cacheKey = `${url}::${publishableKey}`;
  const cached = _cache.get(cacheKey);
  if (cached) return cached;

  // Lazy-import — only runs in browser, never in RSC / server code.
  const { createClient } = await import("@supabase/supabase-js");

  const client = createClient(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: {
      // Reconnect automatically on network interruption.
      reconnectAfterMs: (tries: number) => Math.min(1000 * 2 ** tries, 30_000),
    },
  });

  _cache.set(cacheKey, client);
  return client;
}
