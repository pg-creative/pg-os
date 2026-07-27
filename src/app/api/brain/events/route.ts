// SSE: fires "refresh" whenever any file under ~/cortex/brain/wiki/ changes.
// Client listens via EventSource; on each event, refetches /api/brain/entries.
// Pattern mirrors api/projects/events/route.ts.

import { getWikiRoot } from "@/lib/brain/parser";
import fs from "node:fs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isLocal() {
  return !process.env.VERCEL;
}

export async function GET(req: Request) {
  if (!isLocal()) {
    return new Response("brain watch unavailable in cloud runtime", {
      status: 501,
    });
  }

  const encoder = new TextEncoder();
  const wikiRoot = getWikiRoot();

  const stream = new ReadableStream({
    start(controller) {
      const watchers: fs.FSWatcher[] = [];
      let closed = false;

      const send = (event: string, data: string) => {
        if (closed) return;
        try {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${data}\n\n`),
          );
        } catch {
          /* controller may be closed mid-write */
        }
      };

      send("ready", "connected");

      // Debounce: filesystem ops touch many files in milliseconds
      let debounceTimer: NodeJS.Timeout | null = null;
      const scheduleRefresh = () => {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          send("refresh", String(Date.now()));
          debounceTimer = null;
        }, 250);
      };

      // Watch the wiki root recursively
      try {
        const w = fs.watch(
          wikiRoot,
          { persistent: false, recursive: true },
          () => scheduleRefresh(),
        );
        w.on("error", () => {
          /* non-fatal */
        });
        watchers.push(w);
      } catch (e) {
        send("error", "failed to start watcher");
      }

      // Heartbeat every 25s
      const heartbeat = setInterval(
        () => send("ping", String(Date.now())),
        25_000,
      );

      const cleanup = () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
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
