// /api/claude/activity
//
// Returns a unified timeline of recent activity for the Claude tab — agent
// runs, queue items, decisions, telegram events. Each artifact carries
// enough context that PG OS can render it as a clickable node and expand
// inline without an extra fetch.

import { NextRequest, NextResponse } from "next/server";
import { listAgentRuns } from "@/lib/agentRunsStore";
import { listAllQueueItems } from "@/lib/queueStore";
import { db, isDbConfigured, T } from "@/lib/db";

type ActivityNode = {
  kind: "agent_run" | "queue_item" | "decision" | "telegram_event";
  id: string;
  timestamp: string;
  title: string;
  agent?: string;
  status?: string;
  summary?: string;
  body_md?: string;
  source?: string;
  decision?: string | null;
  decided_at?: string | null;
  decided_via?: string | null;
  options?: string[];
  cost_usd?: number | null;
  model?: string | null;
  notion_url?: string | null;
  links?: { kind: string; id: string; label?: string }[];
  // Full payloads for expanded views — kept compact since we cap days/limit
  related_queue_ids?: string[];
  related_telegram_event_ids?: number[];
};

async function listDecisions(days: number) {
  if (!isDbConfigured()) return [];
  const since = new Date();
  since.setDate(since.getDate() - days);
  try {
    const { data, error } = await db()
      .from(T.decisions_log)
      .select("id, kind, ref_id, detail, taken_at, taken_by, outcome")
      .gte("taken_at", since.toISOString())
      .order("taken_at", { ascending: false })
      .limit(200);
    if (error) throw error;
    return data ?? [];
  } catch (e) {
    console.error("listDecisions failed:", e);
    return [];
  }
}

async function listRecentTelegramEvents(days: number) {
  if (!isDbConfigured()) return [];
  const since = new Date();
  since.setDate(since.getDate() - days);
  try {
    const { data, error } = await db()
      .from(T.telegram_events)
      .select("id, direction, kind, ref_kind, ref_id, chat_id, message_id, payload, created_at")
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw error;
    return data ?? [];
  } catch (e) {
    console.error("listRecentTelegramEvents failed:", e);
    return [];
  }
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const days = Math.min(30, Number(url.searchParams.get("days") ?? "7"));

  const [runs, queueItems, decisions, tgEvents] = await Promise.all([
    listAgentRuns({ days, limit: 200 }),
    listAllQueueItems(),
    listDecisions(days),
    listRecentTelegramEvents(days),
  ]);

  const nodes: ActivityNode[] = [];

  // ── agent runs ──
  for (const r of runs) {
    const tgRefs = tgEvents.filter((e) => e.ref_kind === "agent_run" && e.ref_id === String(r.id));
    nodes.push({
      kind: "agent_run",
      id: `run:${r.id}`,
      timestamp: r.started_at,
      title: r.summary ?? `${r.agent} run`,
      agent: r.agent,
      status: r.status ?? undefined,
      summary: r.summary ?? undefined,
      body_md: r.body_md ?? undefined,
      cost_usd: r.cost_usd ?? null,
      model: r.model ?? null,
      notion_url: r.notion_url ?? null,
      related_telegram_event_ids: tgRefs.map((e) => e.id),
    });
  }

  // ── queue items (open + recently resolved) ──
  for (const q of queueItems) {
    const tgRefs = tgEvents.filter((e) => e.ref_kind === "queue_item" && e.ref_id === q.id);
    nodes.push({
      kind: "queue_item",
      id: `queue:${q.id}`,
      timestamp: new Date(q.created_at).toISOString(),
      title: q.title,
      source: q.source,
      summary: q.note,
      body_md: q.note,
      decision: q.decision ?? null,
      decided_at: q.decided_at ?? null,
      decided_via: q.decided_via ?? null,
      options: q.options,
      related_telegram_event_ids: tgRefs.map((e) => e.id),
    });
  }

  // ── decisions (the explicit log; queue items already carry their own decision but
  // some agents log standalone decisions like calendar_decline) ──
  for (const d of decisions) {
    nodes.push({
      kind: "decision",
      id: `decision:${d.id}`,
      timestamp: d.taken_at,
      title: `${d.kind}${d.ref_id ? ` → ${d.ref_id}` : ""}`,
      source: d.taken_by,
      summary: typeof d.detail === "string" ? d.detail : JSON.stringify(d.detail).slice(0, 280),
    });
  }

  // ── telegram events (the rich ones — taps, briefs, replies) ──
  for (const e of tgEvents) {
    // Skip if already attached to an agent_run / queue_item node — those nodes
    // surface the events via related_telegram_event_ids
    if (e.ref_kind === "agent_run" || e.ref_kind === "queue_item") continue;
    const payload = (e.payload as Record<string, unknown> | null) ?? {};
    const text = (payload.text as string) ?? (payload.body as string) ?? "(no body)";
    nodes.push({
      kind: "telegram_event",
      id: `tg:${e.id}`,
      timestamp: e.created_at,
      title: `Telegram ${e.direction === "in" ? "← " : "→ "}${e.kind}`,
      source: "telegram",
      summary: typeof text === "string" ? text.slice(0, 280) : "(payload)",
    });
  }

  nodes.sort((a, b) => (b.timestamp.localeCompare(a.timestamp)));

  return NextResponse.json({
    days,
    counts: {
      runs: runs.length,
      queue: queueItems.length,
      decisions: decisions.length,
      telegram: tgEvents.length,
    },
    nodes,
    // Expose the raw telegram events keyed by id so expanded queue/run views can
    // render the thread without another fetch.
    telegram_events_by_id: Object.fromEntries(tgEvents.map((e) => [e.id, e])),
  });
}
