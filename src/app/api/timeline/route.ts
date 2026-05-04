// /api/timeline
//
// Unified chronological feed across all PG OS surfaces — ships, queue items
// (resolved + open), agent runs, decisions_log entries, telegram events, and
// captures. 14-day window by default, paginated. Builds on the same join
// pattern as /api/claude/activity but widens scope to ALL sources, not just
// the Claude observatory subset.

import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { listAgentRuns } from "@/lib/agentRunsStore";
import { listAllQueueItems } from "@/lib/queueStore";
import { listShips } from "@/lib/shipLog";
import { db, isDbConfigured, T } from "@/lib/db";

export type TimelineSource =
  | "ship"
  | "queue"
  | "agent_run"
  | "decision"
  | "telegram"
  | "capture";

export type TimelineRow = {
  source: TimelineSource;
  id: string;
  timestamp: string; // ISO
  title: string;
  summary?: string;
  body_md?: string;
  meta?: string;
  status?: string;
  href?: string;
  agent?: string;
  decision?: string | null;
  cost_usd?: number | null;
  model?: string | null;
};

const CAPTURE_LOG = path.join(os.homedir(), ".pg-os", "captures.jsonl");

type CaptureEntry = {
  ts?: number;
  timestamp?: string;
  destination?: string;
  text?: string;
  body?: string;
  source?: string;
};

function readCaptureLog(sinceMs: number): CaptureEntry[] {
  try {
    if (!fs.existsSync(CAPTURE_LOG)) return [];
    const raw = fs.readFileSync(CAPTURE_LOG, "utf8");
    const out: CaptureEntry[] = [];
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const parsed = JSON.parse(trimmed) as CaptureEntry;
        const ts =
          typeof parsed.ts === "number"
            ? parsed.ts
            : parsed.timestamp
              ? new Date(parsed.timestamp).getTime()
              : 0;
        if (ts >= sinceMs) out.push({ ...parsed, ts });
      } catch {
        // skip malformed line
      }
    }
    return out;
  } catch {
    return [];
  }
}

async function listDecisions(sinceIso: string) {
  if (!isDbConfigured()) return [];
  try {
    const { data, error } = await db()
      .from(T.decisions_log)
      .select("id, kind, ref_id, detail, taken_at, taken_by, outcome")
      .gte("taken_at", sinceIso)
      .order("taken_at", { ascending: false })
      .limit(500);
    if (error) throw error;
    return data ?? [];
  } catch (e) {
    console.error("timeline.listDecisions failed:", e);
    return [];
  }
}

async function listTelegramEvents(sinceIso: string) {
  if (!isDbConfigured()) return [];
  try {
    const { data, error } = await db()
      .from(T.telegram_events)
      .select("id, direction, kind, ref_kind, ref_id, payload, created_at")
      .gte("created_at", sinceIso)
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw error;
    return data ?? [];
  } catch (e) {
    console.error("timeline.listTelegramEvents failed:", e);
    return [];
  }
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const days = Math.min(60, Math.max(1, Number(url.searchParams.get("days") ?? "14")));
  const limit = Math.min(500, Math.max(10, Number(url.searchParams.get("limit") ?? "50")));
  const before = url.searchParams.get("before"); // ISO — paginate older
  const filtersParam = url.searchParams.get("filters");
  const filters = filtersParam
    ? new Set(filtersParam.split(",").map((s) => s.trim()).filter(Boolean) as TimelineSource[])
    : null;

  const sinceMs = Date.now() - days * 24 * 60 * 60 * 1000;
  const sinceIso = new Date(sinceMs).toISOString();

  const [runs, queueItems, ships, decisions, tgEvents, captures] = await Promise.all([
    listAgentRuns({ days, limit: 200 }).catch(() => []),
    listAllQueueItems().catch(() => []),
    listShips(200).catch(() => []),
    listDecisions(sinceIso),
    listTelegramEvents(sinceIso),
    Promise.resolve(readCaptureLog(sinceMs)),
  ]);

  const rows: TimelineRow[] = [];

  // ── ships ──
  if (!filters || filters.has("ship")) {
    for (const s of ships) {
      const ts = new Date(s.created_at).toISOString();
      if (new Date(ts).getTime() < sinceMs) continue;
      rows.push({
        source: "ship",
        id: `ship:${s.id}`,
        timestamp: ts,
        title: s.text,
        summary: s.context ?? undefined,
        meta: (s.source ?? "ship").toUpperCase(),
      });
    }
  }

  // ── queue items (open + resolved within window) ──
  if (!filters || filters.has("queue")) {
    for (const q of queueItems) {
      const tsRaw = q.decided_at ?? q.created_at;
      if (!tsRaw) continue;
      const tsDate = new Date(tsRaw);
      if (Number.isNaN(tsDate.getTime())) continue;
      const ts = tsDate.toISOString();
      if (tsDate.getTime() < sinceMs) continue;
      const statusLabel = q.decision
        ? `RESOLVED · ${String(q.decision).toUpperCase()}`
        : "OPEN";
      rows.push({
        source: "queue",
        id: `queue:${q.id}`,
        timestamp: ts,
        title: q.title,
        summary: q.note,
        body_md: q.note,
        meta: `${(q.source ?? "queue").toUpperCase()} · ${statusLabel}`,
        status: q.decision ?? "open",
        decision: q.decision ?? null,
        href: "/?tab=flow",
      });
    }
  }

  // ── agent runs ──
  if (!filters || filters.has("agent_run")) {
    for (const r of runs) {
      rows.push({
        source: "agent_run",
        id: `run:${r.id}`,
        timestamp: r.started_at,
        title: r.summary ?? `${r.agent} run`,
        summary: r.summary ?? undefined,
        body_md: r.body_md ?? undefined,
        meta: `${r.agent.toUpperCase()} · ${(r.status ?? "ok").toUpperCase()}`,
        status: r.status ?? undefined,
        agent: r.agent,
        cost_usd: r.cost_usd ?? null,
        model: r.model ?? null,
        href: r.notion_url ?? "/?tab=claude",
      });
    }
  }

  // ── decisions ──
  if (!filters || filters.has("decision")) {
    for (const d of decisions) {
      rows.push({
        source: "decision",
        id: `decision:${d.id}`,
        timestamp: d.taken_at,
        title: `${d.kind}${d.ref_id ? ` → ${d.ref_id}` : ""}`,
        summary:
          typeof d.detail === "string" ? d.detail : JSON.stringify(d.detail).slice(0, 280),
        meta: `${(d.taken_by ?? "decision").toUpperCase()}${d.outcome ? ` · ${String(d.outcome).toUpperCase()}` : ""}`,
      });
    }
  }

  // ── telegram events (skip ones already attached to runs/queue) ──
  if (!filters || filters.has("telegram")) {
    for (const e of tgEvents) {
      if (e.ref_kind === "agent_run" || e.ref_kind === "queue_item") continue;
      const payload = (e.payload as Record<string, unknown> | null) ?? {};
      const text = (payload.text as string) ?? (payload.body as string) ?? "(no body)";
      rows.push({
        source: "telegram",
        id: `tg:${e.id}`,
        timestamp: e.created_at,
        title: `Telegram ${e.direction === "in" ? "← incoming" : "→ outgoing"} · ${e.kind}`,
        summary: typeof text === "string" ? text.slice(0, 280) : "(payload)",
        body_md: typeof text === "string" ? text : undefined,
        meta: `${(e.kind ?? "telegram").toUpperCase()}`,
      });
    }
  }

  // ── captures (file-backed, ~/.pg-os/captures.jsonl) ──
  if (!filters || filters.has("capture")) {
    for (const c of captures) {
      const ts = new Date(c.ts ?? 0).toISOString();
      const text = c.text ?? c.body ?? "(empty)";
      rows.push({
        source: "capture",
        id: `capture:${c.ts}`,
        timestamp: ts,
        title: text.slice(0, 120),
        summary: text.length > 120 ? text : undefined,
        body_md: text,
        meta: `CAPTURE · ${(c.destination ?? "—").toUpperCase()}`,
      });
    }
  }

  rows.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  // Pagination cursor (?before=ISO)
  let paginated = rows;
  if (before) paginated = rows.filter((r) => r.timestamp < before);

  const page = paginated.slice(0, limit);
  const hasMore = paginated.length > limit;
  const nextCursor = hasMore ? page[page.length - 1]?.timestamp ?? null : null;

  return NextResponse.json({
    days,
    limit,
    counts: {
      ship: rows.filter((r) => r.source === "ship").length,
      queue: rows.filter((r) => r.source === "queue").length,
      agent_run: rows.filter((r) => r.source === "agent_run").length,
      decision: rows.filter((r) => r.source === "decision").length,
      telegram: rows.filter((r) => r.source === "telegram").length,
      capture: rows.filter((r) => r.source === "capture").length,
      total: rows.length,
    },
    rows: page,
    nextCursor,
    hasMore,
  });
}
