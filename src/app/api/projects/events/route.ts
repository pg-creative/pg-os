import { ACTIVE_PROJECTS } from "@/lib/projects";
import fs from "node:fs";
import path from "node:path";

// SSE stream that fires "refresh" events whenever any active project's git
// state changes. Local-only — Vercel's serverless filesystem can't watch
// files reliably and git data isn't present there anyway. The client
// listens via EventSource; on each event, it refetches /api/projects.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isLocal() {
  // VERCEL=1 in Vercel runtime; absence implies local node server
  return !process.env.VERCEL;
}

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

      // Initial hello so the client knows the stream is open
      send("ready", "connected");

      // Debounce — git ops touch many files in milliseconds; coalesce
      let debounceTimer: NodeJS.Timeout | null = null;
      const scheduleRefresh = (projectId: string) => {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          send("refresh", projectId);
          debounceTimer = null;
        }, 250);
      };

      // Per-project: watch .git/logs/HEAD (commits, switches, resets) and
      // .git/index (staged-file changes — drives uncommittedCount).
      // Also watch CLAUDE.md / MEMORY.md for memory-section reads.
      for (const p of ACTIVE_PROJECTS) {
        const targets = [
          path.join(p.path, ".git", "logs", "HEAD"),
          path.join(p.path, ".git", "index"),
          path.join(p.path, "CLAUDE.md"),
          path.join(p.path, "MEMORY.md"),
          path.join(p.path, ".claude", "MEMORY.md"),
        ];
        for (const t of targets) {
          try {
            const w = fs.watch(t, { persistent: false }, () => scheduleRefresh(p.id));
            w.on("error", () => { /* file may not exist; non-fatal */ });
            watchers.push(w);
          } catch {
            /* file may not exist (project missing .git, no MEMORY); skip silently */
          }
        }
      }

      // Heartbeat every 25s so proxies / browser keep the connection alive
      const heartbeat = setInterval(() => send("ping", String(Date.now())), 25_000);

      const cleanup = () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        if (debounceTimer) clearTimeout(debounceTimer);
        for (const w of watchers) {
          try { w.close(); } catch { /* noop */ }
        }
        try { controller.close(); } catch { /* noop */ }
      };

      // Client disconnect
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
