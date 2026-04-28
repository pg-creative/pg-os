/**
 * realtime.ts — Typed Supabase Realtime channel helpers (server-safe types only).
 *
 * This file contains ONLY types and pure helper functions.
 * It does NOT import @supabase/supabase-js directly — callers pass the client in.
 * Safe to import from both server and client code.
 */

import type { SupabaseClient, RealtimeChannel } from "@supabase/supabase-js";

// ─── Table names ─────────────────────────────────────────────────────────────

/** PG OS Supabase tables that support realtime subscriptions. */
export const PGOS_REALTIME_TABLES = {
  ships: "ships",
  queue_items: "queue_items",
  tasks: "tasks",
} as const;

/** Hero's Chronicle Supabase tables that support realtime subscriptions. */
export const HC_REALTIME_TABLES = {
  habits: "habits",
  habit_completions: "habit_completions",
} as const;

// ─── Channel helpers ──────────────────────────────────────────────────────────

export type RealtimeChangeEvent = "INSERT" | "UPDATE" | "DELETE" | "*";

export interface SubscribeTableOptions {
  /** The Supabase client (browser-side, created with publishable key). */
  client: SupabaseClient;
  /** Unique channel name — use `${table}-${userId}` or similar to avoid collisions. */
  channelName: string;
  /** Schema to listen on (almost always "public"). */
  schema?: string;
  /** Table name to watch. */
  table: string;
  /** Row-level filter string, e.g. "user_id=eq.abc123". Optional. */
  filter?: string;
  /** Which DML events to listen to. Defaults to "*" (all). */
  events?: RealtimeChangeEvent[];
  /** Called on any matching change. */
  onchange: () => void;
}

/**
 * Open a Postgres Changes channel on any table.
 * Returns the RealtimeChannel so the caller can removeChannel() on unmount.
 *
 * Usage:
 *   const ch = subscribeTable({ client, channelName: "habits-user1", table: "habits", filter: "user_id=eq.user1", onchange: refetch });
 *   // on unmount:
 *   client.removeChannel(ch);
 */
export function subscribeTable({
  client,
  channelName,
  schema = "public",
  table,
  filter,
  events = ["*"],
  onchange,
}: SubscribeTableOptions): RealtimeChannel {
  let channel = client.channel(channelName);

  for (const event of events) {
    channel = channel.on(
      "postgres_changes",
      {
        event,
        schema,
        table,
        ...(filter ? { filter } : {}),
      },
      () => onchange(),
    );
  }

  channel.subscribe();
  return channel;
}

/**
 * Subscribe to multiple tables on the same channel.
 * Useful when a view needs to react to changes in 2 related tables
 * (e.g. ships + queue_items) without opening 2 separate WebSocket channels.
 */
export interface MultiTableSubscribeOptions {
  client: SupabaseClient;
  channelName: string;
  schema?: string;
  tables: Array<{ table: string; filter?: string; events?: RealtimeChangeEvent[] }>;
  onchange: () => void;
}

export function subscribeMultipleTables({
  client,
  channelName,
  schema = "public",
  tables,
  onchange,
}: MultiTableSubscribeOptions): RealtimeChannel {
  let channel = client.channel(channelName);

  for (const entry of tables) {
    const evts = entry.events ?? (["*"] as RealtimeChangeEvent[]);
    for (const event of evts) {
      channel = channel.on(
        "postgres_changes",
        {
          event,
          schema,
          table: entry.table,
          ...(entry.filter ? { filter: entry.filter } : {}),
        },
        () => onchange(),
      );
    }
  }

  channel.subscribe();
  return channel;
}
