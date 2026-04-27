import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Single-user app. Service role key. RLS is off — the Next.js middleware
// enforces single-user gating via a shared-secret cookie.

let _client: SupabaseClient | null = null;

export function db(): SupabaseClient {
  if (_client) return _client;

  const url = process.env.PGOS_SUPABASE_URL;
  const key = process.env.PGOS_SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing PGOS_SUPABASE_URL or PGOS_SUPABASE_SERVICE_ROLE_KEY env vars. " +
      "Set them in .env.local for dev or in Vercel project settings for production. " +
      "See supabase/README.md for setup steps.",
    );
  }

  _client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { "x-application": "pg-os" } },
  });
  return _client;
}

export function isDbConfigured(): boolean {
  return !!(process.env.PGOS_SUPABASE_URL && process.env.PGOS_SUPABASE_SERVICE_ROLE_KEY);
}

// Type-friendly table names. Matches supabase/migrations/001_init.sql.
export const T = {
  ships: "ships",
  queue_items: "queue_items",
  oauth_tokens: "oauth_tokens",
  proposals_log: "proposals_log",
  decisions_log: "decisions_log",
  trust_categories: "trust_categories",
  agent_runs: "agent_runs",
  push_subscriptions: "push_subscriptions",
  mode_state: "mode_state",
} as const;
