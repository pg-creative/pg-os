/**
 * Daily cron — scans for trigger conditions and fans out push notifications.
 *
 * Wired up in vercel.json: `{ path: "/api/cron/push-triggers", schedule: "0 8 * * *" }`.
 *
 * Triggers checked:
 *   1. Decision pile-up — unresolved queue items >7 days old
 *   2. Streak in danger — zero ships yesterday after a 3+ day streak
 *   3. Reauth needed   — any oauth token expiring within 24h
 *
 * Idempotency-light: an in-memory Map suppresses repushes within 18h for the
 * same trigger key. This is a Vercel cron, so the in-memory state is per-lambda
 * and may double-fire if the function is replicated, but for a 1x/day schedule
 * with a single user it's adequate. Future: persist in a `push_log` table.
 */
import { NextRequest, NextResponse } from "next/server";
import { isDbConfigured, db, T } from "@/lib/db";
import { sendToAll, isPushConfigured } from "@/lib/push";
import { listQueue, daysWaiting } from "@/lib/queueStore";
import { currentStreak, shippedToday } from "@/lib/shipLog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPPRESS_MS = 18 * 60 * 60 * 1000;
const lastFiredAt = new Map<string, number>();

function shouldFire(key: string): boolean {
  const last = lastFiredAt.get(key);
  if (!last) return true;
  return Date.now() - last >= SUPPRESS_MS;
}

function markFired(key: string) {
  lastFiredAt.set(key, Date.now());
}

type Trigger = {
  key: string;
  title: string;
  body: string;
  url: string;
};

async function gatherTriggers(): Promise<Trigger[]> {
  const triggers: Trigger[] = [];

  // 1. Decisions piling up
  try {
    const queue = await listQueue();
    const stale = queue.filter(
      (q) => q.resolved_at == null && daysWaiting(q) >= 7,
    );
    if (stale.length > 0) {
      triggers.push({
        key: `queue-pileup-${stale.length}`,
        title: "Decisions piling up",
        body: `${stale.length} queue item${stale.length === 1 ? "" : "s"} waiting 7+ days. Time to triage.`,
        url: "/?tab=flow",
      });
    }
  } catch (err) {
    console.error("[cron] queue scan failed:", err);
  }

  // 2. Streak in danger — yesterday had no ship but a streak existed
  try {
    const streak = await currentStreak();
    const todayShipped = await shippedToday();
    // currentStreak() counts today if shipped, else yesterday-anchored.
    // If streak >= 3 AND today has no ship yet, the streak is at risk.
    if (streak >= 3 && !todayShipped) {
      triggers.push({
        key: `streak-danger-${streak}`,
        title: "Streak in danger",
        body: `${streak}-day streak at risk. Ship something today to keep it alive.`,
        url: "/?tab=home",
      });
    }
  } catch (err) {
    console.error("[cron] streak scan failed:", err);
  }

  // 3. Token expirations within 24h
  if (isDbConfigured()) {
    try {
      const cutoff = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await db()
        .from(T.oauth_tokens)
        .select("provider, expires_at")
        .lte("expires_at", cutoff)
        .gt("expires_at", new Date().toISOString());
      if (error) throw error;
      for (const row of data ?? []) {
        triggers.push({
          key: `reauth-${row.provider}-${(row.expires_at as string).slice(0, 10)}`,
          title: `Reauth needed: ${row.provider}`,
          body: "OAuth token expires within 24h. Reconnect on the dashboard.",
          url: "/?tab=home",
        });
      }
    } catch (err) {
      console.error("[cron] token scan failed:", err);
    }
  }

  return triggers;
}

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  if (!isPushConfigured()) {
    return NextResponse.json(
      { ok: false, pushed: 0, error: "push_not_configured" },
      { status: 200 },
    );
  }

  const candidates = await gatherTriggers();
  const fireable = candidates.filter((t) => shouldFire(t.key));

  let pushed = 0;
  const results: Array<{ key: string; attempted: number; delivered: number; failed: number }> = [];
  for (const t of fireable) {
    const res = await sendToAll({ title: t.title, body: t.body, url: t.url, tag: t.key });
    if (res.delivered > 0) pushed += res.delivered;
    markFired(t.key);
    results.push({ key: t.key, attempted: res.attempted, delivered: res.delivered, failed: res.failed });
  }

  return NextResponse.json({
    ok: true,
    pushed,
    triggers: candidates.map((c) => ({
      key: c.key,
      title: c.title,
      fired: fireable.some((f) => f.key === c.key),
    })),
    results,
    suppressed: candidates.length - fireable.length,
  });
}
