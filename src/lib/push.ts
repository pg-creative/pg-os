/**
 * Web push helper — VAPID-signed delivery via web-push, fanned out from
 * Supabase push_subscriptions when configured.
 *
 * Env required:
 *   VAPID_PUBLIC   — base64url public key (also exposed to the client)
 *   VAPID_PRIVATE  — base64url private key (server-only)
 *   VAPID_SUBJECT  — optional, defaults to mailto:pg@pgsmith.com
 *
 * If the keys aren't set we log a warning once and turn into a no-op so the
 * dashboard keeps working in dev.
 */
import * as webpush from "web-push";
import type { PushSubscription } from "web-push";
import { db, isDbConfigured, T } from "./db";

let _configured: boolean | null = null;
let _warned = false;

export function isPushConfigured(): boolean {
  if (_configured !== null) return _configured;
  const pub = process.env.VAPID_PUBLIC;
  const priv = process.env.VAPID_PRIVATE;
  if (!pub || !priv) {
    if (!_warned) {
      console.warn(
        "[push] VAPID_PUBLIC / VAPID_PRIVATE not set. Push delivery disabled. " +
          "Generate keys with `npx web-push generate-vapid-keys` and add to .env.local.",
      );
      _warned = true;
    }
    _configured = false;
    return false;
  }
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:pg@pgsmith.com",
    pub,
    priv,
  );
  _configured = true;
  return true;
}

export type PushSubscriptionRow = {
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent: string | null;
  label: string | null;
  created_at: string;
  last_seen_at: string;
};

export type SendResult = {
  endpoint: string;
  ok: boolean;
  status?: number;
  error?: string;
};

function rowToSubscription(row: { endpoint: string; p256dh: string; auth: string }): PushSubscription {
  return {
    endpoint: row.endpoint,
    keys: { p256dh: row.p256dh, auth: row.auth },
  };
}

export async function listSubscriptions(): Promise<PushSubscriptionRow[]> {
  if (!isDbConfigured()) {
    return [];
  }
  const { data, error } = await db()
    .from(T.push_subscriptions)
    .select("endpoint, p256dh, auth, user_agent, label, created_at, last_seen_at")
    .order("last_seen_at", { ascending: false });
  if (error) throw new Error(`listSubscriptions failed: ${error.message}`);
  return (data ?? []) as PushSubscriptionRow[];
}

export async function upsertSubscription(input: {
  endpoint: string;
  p256dh: string;
  auth: string;
  label?: string | null;
  user_agent?: string | null;
}): Promise<void> {
  if (!isDbConfigured()) {
    console.warn("[push] no Supabase configured — subscription not persisted");
    return;
  }
  const now = new Date().toISOString();
  const { error } = await db()
    .from(T.push_subscriptions)
    .upsert(
      {
        endpoint: input.endpoint,
        p256dh: input.p256dh,
        auth: input.auth,
        label: input.label ?? null,
        user_agent: input.user_agent ?? null,
        last_seen_at: now,
      },
      { onConflict: "endpoint" },
    );
  if (error) throw new Error(`upsertSubscription failed: ${error.message}`);
}

async function deleteSubscription(endpoint: string): Promise<void> {
  if (!isDbConfigured()) return;
  await db().from(T.push_subscriptions).delete().eq("endpoint", endpoint);
}

export type PushPayload = {
  title: string;
  body?: string;
  url?: string;
  tag?: string;
};

export async function sendPush(args: {
  endpoint: string;
  p256dh: string;
  auth: string;
  payload: PushPayload;
}): Promise<SendResult> {
  if (!isPushConfigured()) {
    return { endpoint: args.endpoint, ok: false, error: "push_not_configured" };
  }
  try {
    const sub = rowToSubscription({ endpoint: args.endpoint, p256dh: args.p256dh, auth: args.auth });
    await webpush.sendNotification(sub, JSON.stringify(args.payload));
    return { endpoint: args.endpoint, ok: true, status: 201 };
  } catch (err) {
    const e = err as { statusCode?: number; body?: string; message?: string };
    const status = e.statusCode;
    // 404/410 = endpoint dead, prune it
    if (status === 404 || status === 410) {
      await deleteSubscription(args.endpoint).catch(() => {});
    }
    return {
      endpoint: args.endpoint,
      ok: false,
      status,
      error: e.message || e.body || "send_failed",
    };
  }
}

export async function sendToAll(payload: PushPayload): Promise<{
  attempted: number;
  delivered: number;
  failed: number;
  results: SendResult[];
}> {
  if (!isDbConfigured()) {
    console.warn("[push] no subscriptions store, skipping fanout");
    return { attempted: 0, delivered: 0, failed: 0, results: [] };
  }
  const subs = await listSubscriptions();
  if (subs.length === 0) {
    return { attempted: 0, delivered: 0, failed: 0, results: [] };
  }
  const results = await Promise.all(
    subs.map((s) =>
      sendPush({ endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth, payload }),
    ),
  );
  const delivered = results.filter((r) => r.ok).length;
  return {
    attempted: results.length,
    delivered,
    failed: results.length - delivered,
    results,
  };
}

export function getVapidPublicKey(): string | null {
  return process.env.VAPID_PUBLIC || null;
}
