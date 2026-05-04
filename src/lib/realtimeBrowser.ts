/**
 * realtimeBrowser.ts — Browser-side Supabase client factory for Realtime,
 * plus a global pause()/resume() switch for SSE EventSource handles
 * (consumed by Now Mode, T-09).
 *
 * RULES:
 * - Uses the PUBLISHABLE (anon) key only — never the service role key.
 * - Lazy-imports @supabase/supabase-js so it is never bundled into server pages.
 * - Returns null if url or publishableKey are missing — callers must gracefully no-op.
 * - Singleton per (url, key) pair — repeated calls with the same args return the same client.
 *
 * EventSource pause/resume contract:
 * - Components that open an EventSource should register it via
 *   `registerEventSource(es, factory)` so Now Mode can close+reopen on
 *   pause/resume. `factory` is a function that returns a fresh EventSource
 *   when resume() is called.
 * - `pause()` is idempotent — calling it twice in a row is a no-op.
 * - `resume()` reopens any sources that were paused; if a source was never
 *   paused (registered after pause), it is left untouched.
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

// ---------------------------------------------------------------------------
// SSE pause/resume — used by Now Mode (T-09) to silence ambient motion.
// ---------------------------------------------------------------------------

type EventSourceEntry = {
  source: EventSource | null;
  factory: () => EventSource;
};

const _sources = new Set<EventSourceEntry>();
let _paused = false;

/**
 * Register an EventSource so it participates in pause/resume. Returns an
 * unregister fn — call on component unmount.
 *
 * Usage:
 *   const es = new EventSource('/api/projects/events');
 *   const unregister = registerEventSource(es, () => new EventSource('/api/projects/events'));
 *   ...
 *   unregister(); es.close();
 */
export function registerEventSource(
  source: EventSource,
  factory: () => EventSource,
): () => void {
  const entry: EventSourceEntry = { source, factory };
  _sources.add(entry);
  return () => {
    _sources.delete(entry);
  };
}

/**
 * Close all registered EventSources. Idempotent.
 * Sources that reconnect lazily (e.g. via Supabase Realtime client) should
 * also be paused via their own API in callers; this only handles raw SSE.
 */
export function pause(): void {
  if (_paused) return;
  _paused = true;
  for (const entry of _sources) {
    try {
      entry.source?.close();
    } catch {
      /* already closed */
    }
    entry.source = null;
  }
}

/**
 * Reopen any EventSources that were closed by pause(). Idempotent.
 */
export function resume(): void {
  if (!_paused) return;
  _paused = false;
  for (const entry of _sources) {
    if (entry.source) continue; // never paused, leave it
    try {
      entry.source = entry.factory();
    } catch {
      /* factory may fail if API offline — caller can re-register later */
    }
  }
}

/** Diagnostic — true while SSE is suspended by Now Mode. */
export function isPaused(): boolean {
  return _paused;
}
