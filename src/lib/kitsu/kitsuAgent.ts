/**
 * kitsuAgent.ts -- Kitsu orchestrator brain, built on the Claude Agent SDK.
 *
 * This is ADDITIVE. The existing /api/copilot/chat route, useMarvis.tsx,
 * and MarvisCorner.tsx are untouched. Phase 2 wires the UI.
 *
 * What this module does:
 *   - Wraps the Agent SDK query() in an async generator that yields
 *     structured SSE-friendly events (text deltas, tool notices, done, error).
 *   - Builds Kitsu's system prompt from the same buildMarvisSystem() persona
 *     already used by the existing copilot, injected via the systemPrompt option.
 *   - Defines the 9 copilot tools as an in-process MCP server via
 *     createSdkMcpServer + tool(), reusing existing executeTool() logic.
 *   - Mounts PG's ~/.claude/ settings (skills, CLAUDE.md, plugins) by
 *     including "user" in settingSources so they load automatically.
 *   - Conservative canUseTool: read-only tools auto-allow; write/mutating
 *     tools are denied with a clear "needs PG approval" reason.
 *   - Captures session_id from the init system message and supports resume.
 */

import { query, createSdkMcpServer, tool } from "@anthropic-ai/claude-agent-sdk";
import type { SDKMessage } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import { executeTool, type ToolInput } from "@/lib/copilotTools";
import { buildMarvisSystem } from "@/lib/cockpit/marvis";
import { buildMarvisFleet } from "@/lib/cockpit/marvisFleet";

// ── Event types yielded by streamKitsu ───────────────────────────────────────

export type KitsuEvent =
  | { type: "session_id"; session_id: string }
  | { type: "text"; delta: string }
  | { type: "tool_start"; name: string }
  | { type: "tool_end"; name: string; ok: boolean; error?: string }
  | { type: "done"; result: string; cost_usd: number; num_turns: number }
  | { type: "error"; error: string };

// ── Tool names (read-only vs write) ──────────────────────────────────────────

// These are auto-allowed: they only read data, no side effects.
const READ_ONLY_TOOLS = new Set([
  "mcp__kitsu-tools__read_ships",
  "mcp__kitsu-tools__read_queue",
  "mcp__kitsu-tools__read_calendar",
  "mcp__kitsu-tools__read_vitals",
  "mcp__kitsu-tools__read_signals",
  "mcp__kitsu-tools__read_recent_archive",
  // Claude Code built-in read tools
  "Read",
  "Glob",
  "Grep",
  "WebSearch",
  "WebFetch",
  "LS",
]);

// These are explicitly disallowed (Claude shouldn't see them at all).
const DISALLOWED_TOOLS = [
  "Bash",   // Too broad; allow individual safe reads via Read/Glob/Grep instead
  "Write",  // Files require PG approval
  "Edit",   // Files require PG approval
  "NotebookEdit",
];

// propose_action is allowed (writes to local queue file, safe).
// add_ship / add_queue_item require PG approval.
const WRITE_TOOLS_NEEDING_APPROVAL = new Set([
  "mcp__kitsu-tools__add_ship",
  "mcp__kitsu-tools__add_queue_item",
]);

// ── In-process MCP server with the 9 copilot tools ───────────────────────────

function buildKitsuMcpServer() {
  const readShips = tool(
    "read_ships",
    "Read the ship log: recent shipped items, streak, velocity, and today's status. " +
      "Use to understand what PG has shipped recently and current momentum.",
    {
      limit: z
        .number()
        .min(1)
        .max(50)
        .default(20)
        .describe("Max ships to return (default 20)"),
    },
    async (args) => {
      try {
        const result = await executeTool("read_ships", args as ToolInput);
        return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
      } catch (err) {
        return {
          content: [{ type: "text" as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }],
          isError: true,
        };
      }
    },
    { annotations: { readOnlyHint: true } },
  );

  const readQueue = tool(
    "read_queue",
    "Read the approval queue: pending decisions waiting for PG's attention. " +
      "Each item has a title, source, options, and how long it has been waiting.",
    {},
    async () => {
      try {
        const result = await executeTool("read_queue", {});
        return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
      } catch (err) {
        return {
          content: [{ type: "text" as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }],
          isError: true,
        };
      }
    },
    { annotations: { readOnlyHint: true } },
  );

  const readCalendar = tool(
    "read_calendar",
    "Read today's Google Calendar events. Use to understand what is scheduled " +
      "and when PG has blocks of time available.",
    {
      view: z
        .enum(["today", "week"])
        .default("today")
        .describe("Time window: 'today' (default) or 'week'"),
    },
    async (args) => {
      try {
        const result = await executeTool("read_calendar", args as ToolInput);
        return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
      } catch (err) {
        return {
          content: [{ type: "text" as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }],
          isError: true,
        };
      }
    },
    { annotations: { readOnlyHint: true } },
  );

  const readVitals = tool(
    "read_vitals",
    "Read Whoop recovery and sleep data. Returns recovery score (0-100), " +
      "HRV, resting HR, and sleep quality. Use to calibrate energy expectations.",
    {},
    async () => {
      try {
        const result = await executeTool("read_vitals", {});
        return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
      } catch (err) {
        return {
          content: [{ type: "text" as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }],
          isError: true,
        };
      }
    },
    { annotations: { readOnlyHint: true } },
  );

  const readSignals = tool(
    "read_signals",
    "Read recent self-improvement signals from Claude Code transcripts: " +
      "corrections, confirmations, rule violations, and behavioral patterns. " +
      "Use to understand recent AI performance trends.",
    {
      days: z
        .number()
        .min(1)
        .max(30)
        .default(7)
        .describe("Days to look back (default 7)"),
    },
    async (args) => {
      try {
        const result = await executeTool("read_signals", args as ToolInput);
        return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
      } catch (err) {
        return {
          content: [{ type: "text" as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }],
          isError: true,
        };
      }
    },
    { annotations: { readOnlyHint: true } },
  );

  const readRecentArchive = tool(
    "read_recent_archive",
    "Search the Claude conversation archive (FTS5 full-text search). " +
      "Use to recall past decisions, prior art, or context from older conversations.",
    {
      query: z.string().describe("Full-text search query"),
      limit: z
        .number()
        .min(1)
        .max(20)
        .default(10)
        .describe("Max results (default 10)"),
    },
    async (args) => {
      try {
        const result = await executeTool("read_recent_archive", args as ToolInput);
        return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
      } catch (err) {
        return {
          content: [{ type: "text" as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }],
          isError: true,
        };
      }
    },
    { annotations: { readOnlyHint: true } },
  );

  const proposeAction = tool(
    "propose_action",
    "Write a decision or action proposal to the approval queue (~/.pg-os/queue/). " +
      "Use when a concrete decision or next step should be surfaced in the Flow tab " +
      "for PG to approve, dismiss, or act on.",
    {
      title: z.string().max(80).describe("Short decision title (< 80 chars)"),
      source: z
        .string()
        .default("kitsu")
        .describe("Project context (e.g. 'personal-os', 'heros-chronicle')"),
      options: z
        .array(z.string())
        .optional()
        .describe("List of options if this is a choice"),
      note: z
        .string()
        .optional()
        .describe("Longer context, tradeoffs, or recommendation"),
    },
    async (args) => {
      try {
        const result = await executeTool("propose_action", args as ToolInput);
        return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
      } catch (err) {
        return {
          content: [{ type: "text" as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }],
          isError: true,
        };
      }
    },
  );

  const addShip = tool(
    "add_ship",
    "Log a shipped item to the ship log. Use when PG confirms they shipped something " +
      "or asks to log a completed task.",
    {
      text: z.string().max(500).describe("What was shipped (1-500 chars)"),
      context: z
        .string()
        .optional()
        .describe("Project context (e.g. 'personal-os', 'heros-chronicle', 'metrasens')"),
    },
    async (args) => {
      try {
        const result = await executeTool("add_ship", args as ToolInput);
        return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
      } catch (err) {
        return {
          content: [{ type: "text" as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }],
          isError: true,
        };
      }
    },
  );

  const addQueueItem = tool(
    "add_queue_item",
    "Add an item directly to the approval queue. Use for decisions that need " +
      "PG's attention that are not full proposals -- quick yes/no items.",
    {
      title: z.string().max(80).describe("Decision title (< 80 chars)"),
      source: z.string().optional().describe("Project context"),
      options: z
        .array(z.string())
        .optional()
        .describe("Options to choose from"),
      note: z.string().optional().describe("Additional context"),
    },
    async (args) => {
      try {
        const result = await executeTool("add_queue_item", args as ToolInput);
        return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
      } catch (err) {
        return {
          content: [{ type: "text" as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }],
          isError: true,
        };
      }
    },
  );

  return createSdkMcpServer({
    name: "kitsu-tools",
    version: "1.0.0",
    tools: [
      readShips,
      readQueue,
      readCalendar,
      readVitals,
      readSignals,
      readRecentArchive,
      proposeAction,
      addShip,
      addQueueItem,
    ],
  });
}

// Singleton MCP server -- created once per process
let _kitsuMcpServer: ReturnType<typeof createSdkMcpServer> | null = null;
function getKitsuMcpServer() {
  if (!_kitsuMcpServer) {
    _kitsuMcpServer = buildKitsuMcpServer();
  }
  return _kitsuMcpServer;
}

// ── Permission callback ───────────────────────────────────────────────────────

const canUseTool: Parameters<typeof query>[0]["options"] extends infer O
  ? O extends { canUseTool?: infer C }
    ? C
    : never
  : never = async (toolName, _input, _opts) => {
  // Auto-allow all read-only tools
  if (READ_ONLY_TOOLS.has(toolName)) {
    return { behavior: "allow" };
  }

  // propose_action is safe: writes only to local queue
  if (toolName === "mcp__kitsu-tools__propose_action") {
    return { behavior: "allow" };
  }

  // Write tools that add persistent records require PG approval
  if (WRITE_TOOLS_NEEDING_APPROVAL.has(toolName)) {
    return {
      behavior: "deny",
      message: `${toolName} needs PG approval before writing. Propose via propose_action or ask PG first.`,
    };
  }

  // MCP tools from external servers (Notion, Gmail, etc.) -- deny writes, allow reads
  if (toolName.startsWith("mcp__")) {
    const lowerName = toolName.toLowerCase();
    const isLikelyRead =
      lowerName.includes("_get") ||
      lowerName.includes("_list") ||
      lowerName.includes("_search") ||
      lowerName.includes("_read") ||
      lowerName.includes("_query") ||
      lowerName.includes("_fetch");
    if (isLikelyRead) {
      return { behavior: "allow" };
    }
    return {
      behavior: "deny",
      message: `External MCP write tool '${toolName}' needs PG approval. Surface via propose_action.`,
    };
  }

  // Anything else (unrecognized built-ins) -- deny with explanation
  return {
    behavior: "deny",
    message: `Tool '${toolName}' is not pre-approved for Kitsu. PG can expand the allow list.`,
  };
};

// ── Public API ────────────────────────────────────────────────────────────────

export interface StreamKitsuParams {
  /** Conversation messages: role "user" | "assistant" */
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  /** Session ID to resume (from a previous streamKitsu call). Optional. */
  sessionId?: string;
}

/**
 * streamKitsu -- async generator that drives the Agent SDK query() loop
 * and yields KitsuEvent objects suitable for SSE serialization.
 *
 * The system prompt is built fresh each call so it includes the live
 * fleet snapshot (same as the existing copilot's "marvis" mode).
 *
 * Sessions: capture the "session_id" event's value and pass it back
 * as sessionId on the next call to resume context.
 */
export async function* streamKitsu({
  messages,
  sessionId,
}: StreamKitsuParams): AsyncGenerator<KitsuEvent> {
  // Build the persona + live fleet snapshot as the system prompt
  let systemPrompt: string;
  try {
    systemPrompt = buildMarvisSystem(await buildMarvisFleet());
  } catch {
    // Fleet snapshot is best-effort; fall back to bare persona
    const { MARVIS_PERSONA } = await import("@/lib/cockpit/marvis");
    systemPrompt = `${MARVIS_PERSONA}\n\nCURRENT FLEET: fleet telemetry unavailable right now.`;
  }

  // Build the user prompt from the last user message in the array.
  // The Agent SDK takes a single prompt string; prior turns are context
  // that would be loaded via session resume. For multi-turn we rely on
  // resume (sessionId) which replays the full JSONL history.
  const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
  const prompt = lastUserMsg?.content ?? "";
  if (!prompt) {
    yield { type: "error", error: "No user message found in messages array." };
    return;
  }

  const kitsuServer = getKitsuMcpServer();

  try {
    const sdkQuery = query({
      prompt,
      options: {
        systemPrompt,

        // Mount Kitsu's 9 custom tools as an in-process MCP server.
        // createSdkMcpServer already returns { type: "sdk", name, instance },
        // so pass it directly as the value in mcpServers.
        mcpServers: {
          "kitsu-tools": kitsuServer as unknown as import("@anthropic-ai/claude-agent-sdk").McpServerConfig,
        },

        // Pre-approve all read tools and safe write (propose_action)
        allowedTools: [
          "mcp__kitsu-tools__read_ships",
          "mcp__kitsu-tools__read_queue",
          "mcp__kitsu-tools__read_calendar",
          "mcp__kitsu-tools__read_vitals",
          "mcp__kitsu-tools__read_signals",
          "mcp__kitsu-tools__read_recent_archive",
          "mcp__kitsu-tools__propose_action",
          "Read",
          "Glob",
          "Grep",
          "WebSearch",
          "WebFetch",
        ],

        // Remove dangerous built-ins from Claude's context entirely
        disallowedTools: DISALLOWED_TOOLS,

        // Load user-level ~/.claude/ settings: skills, CLAUDE.md, plugins, .mcp.json.
        // "project" would load the worktree's .claude/ (skip -- less relevant here).
        // "user" loads ~/.claude/settings.json and ~/.mcp.json.
        settingSources: ["user"],

        // Conservative mode: anything not pre-approved hits canUseTool and gets denied
        permissionMode: "dontAsk",

        // canUseTool is the final gate for anything that slips through
        canUseTool,

        // Resume prior session if provided (restores full JSONL context)
        ...(sessionId ? { resume: sessionId } : {}),

        // Reasonable defaults
        maxTurns: 10,
      },
    });

    let activeToolName: string | null = null;

    for await (const message of sdkQuery as AsyncIterable<SDKMessage>) {
      if (message.type === "system" && message.subtype === "init") {
        // Capture session_id for the caller to store and resume later
        yield { type: "session_id", session_id: message.session_id };
        continue;
      }

      if (message.type === "assistant") {
        // Stream text deltas from assistant content blocks
        for (const block of message.message.content) {
          if (block.type === "text") {
            // Yield the full text as a single delta (Agent SDK gives us
            // complete assistant messages, not per-token streams)
            yield { type: "text", delta: block.text };
          }
          if (block.type === "tool_use") {
            activeToolName = block.name;
            yield { type: "tool_start", name: block.name };
          }
        }
        continue;
      }

      if (message.type === "user") {
        // Tool results come back as user messages with tool_use_result
        if (message.isSynthetic && activeToolName) {
          const hasError = !!(message.tool_use_result as Record<string, unknown> | null)?.isError;
          yield {
            type: "tool_end",
            name: activeToolName,
            ok: !hasError,
          };
          activeToolName = null;
        }
        continue;
      }

      if (message.type === "result") {
        if (message.subtype === "success") {
          yield {
            type: "done",
            result: message.result,
            cost_usd: message.total_cost_usd,
            num_turns: message.num_turns,
          };
        } else {
          // SDKResultError does not expose .result -- use subtype + is_error
          yield {
            type: "error",
            error: `Agent ended with status: ${message.subtype}${message.is_error ? " (execution error)" : ""}.`,
          };
        }
        return;
      }
    }
  } catch (err) {
    yield {
      type: "error",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
