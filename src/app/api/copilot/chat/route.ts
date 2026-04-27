/**
 * POST /api/copilot/chat
 * Streams Anthropic Messages API responses with tool use support.
 * Uses claude-sonnet-4-6 with prompt caching on the system prompt block.
 */

import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { assembleCopilotContext } from "@/lib/copilotContext";
import { COPILOT_TOOLS, executeTool, ToolInput } from "@/lib/copilotTools";
import type {
  MessageParam,
  ContentBlock,
  ToolUseBlock,
} from "@anthropic-ai/sdk/resources/messages";

const MODEL = "claude-sonnet-4-6";
const MAX_TOKENS = 2048;
// Max tool-call rounds before forcing a final answer
const MAX_TOOL_ROUNDS = 5;

// Singleton client — reused across requests in the same server process
let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  let body: { messages?: MessageParam[] };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const userMessages = body.messages;
  if (!Array.isArray(userMessages) || userMessages.length === 0) {
    return new Response(JSON.stringify({ error: "messages array required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Assemble context (reads live state: ships, queue counts)
  const ctx = await assembleCopilotContext();

  // Build cached system prompt block (prompt caching — ephemeral cache)
  const systemBlock = [
    {
      type: "text" as const,
      text: ctx.systemPrompt,
      cache_control: { type: "ephemeral" as const },
    },
  ];

  // Streaming SSE response
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: unknown) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(data)}\n\n`),
        );
      };

      try {
        const anthropic = getClient();
        let messages: MessageParam[] = [...userMessages];
        let round = 0;
        let totalInputTokens = 0;
        let totalOutputTokens = 0;
        let totalCacheRead = 0;
        let totalCacheCreation = 0;

        while (round < MAX_TOOL_ROUNDS) {
          round++;

          // ── Agentic loop: stream one turn ─────────────────────────────────
          const textChunks: string[] = [];
          const toolUses: ToolUseBlock[] = [];
          let stopReason: string | null = null;

          const streamResponse = await anthropic.messages.stream({
            model: MODEL,
            max_tokens: MAX_TOKENS,
            system: systemBlock,
            tools: COPILOT_TOOLS,
            messages,
          });

          for await (const event of streamResponse) {
            if (event.type === "content_block_start") {
              if (event.content_block.type === "tool_use") {
                // Start of a tool call — notify client
                send({
                  type: "tool_start",
                  name: event.content_block.name,
                  id: event.content_block.id,
                });
              }
            } else if (event.type === "content_block_delta") {
              if (event.delta.type === "text_delta") {
                send({ type: "text", delta: event.delta.text });
                textChunks.push(event.delta.text);
              }
            } else if (event.type === "message_stop") {
              // noop — we get the final message below
            }
          }

          // Get the final accumulated message for tool use extraction
          const finalMsg = await streamResponse.finalMessage();
          stopReason = finalMsg.stop_reason;

          // Accumulate token usage
          const usage = finalMsg.usage;
          totalInputTokens += usage.input_tokens;
          totalOutputTokens += usage.output_tokens;
          if ("cache_read_input_tokens" in usage) {
            totalCacheRead += (usage as { cache_read_input_tokens?: number }).cache_read_input_tokens ?? 0;
          }
          if ("cache_creation_input_tokens" in usage) {
            totalCacheCreation += (usage as { cache_creation_input_tokens?: number }).cache_creation_input_tokens ?? 0;
          }

          // Extract tool use blocks from the final message
          for (const block of finalMsg.content) {
            if (block.type === "tool_use") {
              toolUses.push(block);
            }
          }

          // ── Handle tool calls ─────────────────────────────────────────────
          if (stopReason === "tool_use" && toolUses.length > 0) {
            // Append assistant turn to messages
            messages.push({ role: "assistant", content: finalMsg.content as ContentBlock[] });

            // Execute all tool calls in parallel
            const toolResults = await Promise.all(
              toolUses.map(async (toolUse) => {
                send({
                  type: "tool_call",
                  name: toolUse.name,
                  input: toolUse.input,
                });
                try {
                  const result = await executeTool(toolUse.name, toolUse.input as ToolInput);
                  send({ type: "tool_result", name: toolUse.name, ok: true });
                  return {
                    type: "tool_result" as const,
                    tool_use_id: toolUse.id,
                    content: JSON.stringify(result),
                  };
                } catch (err) {
                  const errMsg = err instanceof Error ? err.message : String(err);
                  send({ type: "tool_result", name: toolUse.name, ok: false, error: errMsg });
                  return {
                    type: "tool_result" as const,
                    tool_use_id: toolUse.id,
                    content: JSON.stringify({ error: errMsg }),
                    is_error: true,
                  };
                }
              }),
            );

            // Append tool results and continue the loop
            messages.push({ role: "user", content: toolResults });
            continue; // next round
          }

          // ── End of turn (stop_reason == "end_turn" or no tools) ──────────
          break;
        }

        // Cost logging
        console.log("[copilot/chat] completion", {
          model: MODEL,
          input_tokens: totalInputTokens,
          output_tokens: totalOutputTokens,
          cache_read: totalCacheRead,
          cache_creation: totalCacheCreation,
          rounds: round,
        });

        send({
          type: "done",
          usage: {
            input_tokens: totalInputTokens,
            output_tokens: totalOutputTokens,
            cache_read: totalCacheRead,
            cache_creation: totalCacheCreation,
          },
        });
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.error("[copilot/chat] error:", errMsg);
        send({ type: "error", error: errMsg });
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
