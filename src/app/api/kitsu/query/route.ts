/**
 * POST /api/kitsu/query
 *
 * Streams Kitsu Agent SDK responses as Server-Sent Events.
 * SSE event shape mirrors /api/copilot/chat so the UI can adopt it in Phase 2
 * with minimal changes.
 *
 * Request body:
 *   { messages: Array<{role: "user"|"assistant", content: string}>, sessionId?: string }
 *
 * SSE events (each line: "data: <JSON>\n\n"):
 *   { type: "session_id", session_id: string }   -- first event; caller stores for resume
 *   { type: "text", delta: string }               -- assistant text chunk
 *   { type: "tool_start", name: string }          -- Kitsu called a tool
 *   { type: "tool_end", name: string, ok: boolean, error?: string }
 *   { type: "done", result: string, cost_usd: number, num_turns: number }
 *   { type: "error", error: string }
 */

import { NextRequest } from "next/server";
import { streamKitsu } from "@/lib/kitsu/kitsuAgent";
import type { MessageParam } from "@anthropic-ai/sdk/resources/messages";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: { messages?: MessageParam[]; sessionId?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Normalise messages to simple {role, content} pairs
  const rawMessages = body.messages;
  if (!Array.isArray(rawMessages) || rawMessages.length === 0) {
    return new Response(JSON.stringify({ error: "messages array required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Convert SDK MessageParam to the simpler shape streamKitsu expects.
  // Content may be a string or an array of content blocks; flatten to string.
  const messages = rawMessages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content:
        typeof m.content === "string"
          ? m.content
          : Array.isArray(m.content)
          ? m.content
              .map((b) =>
                typeof b === "object" && b !== null && "text" in b
                  ? (b as { text: string }).text
                  : "",
              )
              .join("")
          : String(m.content),
    }));

  const sessionId = typeof body.sessionId === "string" ? body.sessionId : undefined;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: unknown) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(data)}\n\n`),
        );
      };

      try {
        for await (const event of streamKitsu({ messages, sessionId })) {
          send(event);
          // Close stream after final event
          if (event.type === "done" || event.type === "error") {
            break;
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("[kitsu/query] unhandled error:", msg);
        send({ type: "error", error: msg });
      } finally {
        controller.close();
      }
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
