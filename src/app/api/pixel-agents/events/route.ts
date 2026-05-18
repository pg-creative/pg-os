/**
 * SSE endpoint — server-push of pixel-agents state to the React client.
 *
 * Uses Node runtime (filesystem + chokidar require it). Streams until the
 * client disconnects; each connection registers a controller on the
 * pixel-agents singleton which broadcasts state changes to all controllers.
 */

import { NextRequest } from "next/server";
import { getInstance } from "@/lib/pixelAgents";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  const instance = getInstance();

  let myController: ReadableStreamDefaultController<Uint8Array> | null = null;
  let heartbeat: ReturnType<typeof setInterval> | null = null;
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      myController = controller;
      instance.addClient(controller);
      heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": ping\n\n"));
        } catch {
          if (heartbeat) clearInterval(heartbeat);
        }
      }, 25_000);
    },
    cancel() {
      if (heartbeat) clearInterval(heartbeat);
      if (myController) instance.removeClient(myController);
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
