// /api/timeline/events
//
// SSE channel for the unified Timeline view. Mirrors /api/projects/events but
// listens to all the sources the Timeline aggregates: capture log file
// (~/.pg-os/captures.jsonl), queue dir (~/.pg-os/queue/), and the local sqlite
// ships db. Cloud sources (agent_runs, decisions, telegram) are nudged via a
// 30s heartbeat-refresh — Supabase Realtime would be the next upgrade, but
// poll-on-tick is enough for the personal-os single-user case.
//
// Client listens via EventSource; on each "refresh" event, refetches /api/timeline.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isLocal() {
  return !process.env.VERCEL;
}

const HOME = os.homedir();
const CAPTURE_LOG = path.join(HOME, ".pg-os", "captures.jsonl");
const QUEUE_DIR = path.join(HOME, ".pg-os", "queue");
const SHIPS_DB = path.join(HOME, ".pg-os", "ships.db");

export async function GET(req: Request) {
  if (!isLocal()) {
    return new Response("watch unavailable in cloud runtime", { status: 501 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const watchers: fs.FSWatcher[] = [];
      let closed = false;

      const send = (event: string, data: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${data}\n\n`));
        } catch {
          /* controller may be closed mid-write — swallow */
        }
      };

      // Initial hello
      send("ready", "connected");

      // Debounce — many writes can land in milliseconds
      let debounceTimer: NodeJS.Timeout | null = null;
      const scheduleRefresh = (reason: string) => {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          send("refresh", reason);
          debounceTimer = null;
        }, 250);
      };

      // Watch local files. Each may not yet exist — that's fine, watch fails silently.
      const targets: { path: string; reason: string }[] = [
        { path: CAPTURE_LOG, reason: "capture" },
        { path: QUEUE_DIR, reason: "queue" },
        { path: SHIPS_DB, reason: "ship" },
      ];

      for (const t of targets) {
        try {
          if (!fs.existsSync(t.path)) continue;
          const w = fs.watch(t.path, { persistent: false }, () => scheduleRefresh(t.reason));
          w.on("error", () => {
            /* file may be transient; non-fatal */
          });
          watchers.push(w);
        } catch {
          /* skip silently */
        }
      }

      // Cloud sources (agent_runs, decisions, telegram events) — Supabase
      // Realtime would be the right upgrade. For now, soft-poll every 30s by
      // emitting a refresh tick. Cheap and matches the existing activity
      // refresh cadence in ClaudeActivity.
      const cloudTick = setInterval(() => send("refresh", "cloud-tick"), 30_000);

      // Heartbeat every 25s so proxies / browser keep the connection alive
      const heartbeat = setInterval(() => send("ping", String(Date.now())), 25_000);

      const cleanup = () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        clearInterval(cloudTick);
        if (debounceTimer) clearTimeout(debounceTimer);
        for (const w of watchers) {
          try {
            w.close();
          } catch {
            /* noop */
          }
        }
        try {
          controller.close();
        } catch {
          /* noop */
        }
      };

      req.signal.addEventListener("abort", cleanup);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
