// /api/agent-runs
//
// POST: a launchd runner script (or any agent harness) writes one row here at
// the end of a run. Bypasses middleware via a shared secret header so headless
// scripts don't need a session cookie.
//
// GET: returns the last N runs (used by ClaudeActivity & ClaudeAgents views).

import { NextRequest, NextResponse } from "next/server";
import { listAgentRuns, recordAgentRun } from "@/lib/agentRunsStore";

const INTERNAL_SECRET = process.env.PGOS_INTERNAL_SECRET ?? process.env.PGOS_SHARED_SECRET ?? "";

export async function POST(req: NextRequest) {
  const headerSecret = req.headers.get("x-pgos-internal-secret") ?? "";
  if (!INTERNAL_SECRET || headerSecret !== INTERNAL_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  if (!body || typeof body.agent !== "string") {
    return NextResponse.json({ error: "missing agent field" }, { status: 400 });
  }
  const run = await recordAgentRun(body);
  if (!run) {
    return NextResponse.json({ error: "insert failed (db not configured?)" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, id: run.id });
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const days = Number(url.searchParams.get("days") ?? "7");
  const limit = Number(url.searchParams.get("limit") ?? "100");
  const agent = url.searchParams.get("agent") ?? undefined;
  const runs = await listAgentRuns({ days, limit, agent });
  return NextResponse.json({ runs });
}
