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

import {
  query,
  createSdkMcpServer,
  tool,
} from "@anthropic-ai/claude-agent-sdk";
import type { SDKMessage } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import { executeTool, type ToolInput } from "@/lib/copilotTools";
import { buildMarvisSystem } from "@/lib/cockpit/marvis";
import { buildMarvisFleet } from "@/lib/cockpit/marvisFleet";
import { getTokens, isExpired, refreshAndStore } from "@/lib/tokenStore";
import {
  fetchSpotifyNowPlaying,
  spotifyCommand,
  refreshSpotifyToken,
} from "@/lib/spotify";
import {
  ensureKitsuMemory,
  loadKitsuMemory,
  buildMemoryBlock,
  appendKitsuDecision,
  recordKitsuCorrection,
  updateUserKnowledge,
  updateSoul,
} from "@/lib/kitsu/kitsuMemory";
import { gatherFleet } from "@/lib/kitsu/kitsuOrchestration";
import { getProject } from "@/lib/projects";
import { launchCockpitSession, killCockpitSession } from "@/lib/cockpitDaemon";
import { getAgentHealth } from "@/lib/agentHealth";
import { listProjectStates } from "@/lib/projectState";
import { getDaySnapshot, toggleCompletion } from "@/lib/habits";

// ── Autonomy level (PG decision 2026-05-22: conservative, built to evolve) ────
// Dial this UP as trust grows — it is the single switch for how much Kitsu does
// unsupervised. "readonly": observe only. "conservative": launch sessions when
// asked (reversible), but kill/destructive actions need approval. "trusted":
// launch + kill + act directly.
export type KitsuAutonomy = "readonly" | "conservative" | "trusted";
export const KITSU_AUTONOMY: KitsuAutonomy =
  (process.env.KITSU_AUTONOMY as KitsuAutonomy) || "conservative";

// Resolve a fresh Spotify access token (refreshing if expired). Mirrors the
// logic in /api/spotify/command so Kitsu can read + control playback directly.
async function getSpotifyAccessToken(): Promise<string | null> {
  const current = await getTokens("spotify");
  if (!current?.refreshToken) return null;
  const tokens = isExpired(current)
    ? await refreshAndStore("spotify", refreshSpotifyToken)
    : current;
  return tokens.accessToken ?? null;
}

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
  "mcp__kitsu-tools__read_spotify",
  // Phase 4 orchestration reads (always safe to observe)
  "mcp__kitsu-tools__monitor_fleet",
  "mcp__kitsu-tools__read_agent_health",
  "mcp__kitsu-tools__read_projects",
  "mcp__kitsu-tools__read_habits",
  // Claude Code built-in read tools
  "Read",
  "Glob",
  "Grep",
  "WebSearch",
  "WebFetch",
  "LS",
]);

// Actions Kitsu may take at "conservative" autonomy: PG-initiated and reversible.
// launch_session opens a session you can kill; remember writes only Kitsu's own
// memory files. Both are low-stakes.
const CONSERVATIVE_ACTIONS = new Set([
  "mcp__kitsu-tools__launch_session",
  "mcp__kitsu-tools__remember",
  // Soul self-evolution: writes confined to Kitsu's OWN memory files (safe).
  "mcp__kitsu-tools__update_user",
  "mcp__kitsu-tools__update_soul",
]);

// Actions that only run at "trusted" autonomy. Below that they are denied and
// Kitsu is told to surface them via propose_action for PG to approve.
const TRUSTED_ACTIONS = new Set([
  "mcp__kitsu-tools__kill_session",
  "mcp__kitsu-tools__complete_habit",
]);

// These are explicitly disallowed (Claude shouldn't see them at all).
const DISALLOWED_TOOLS = [
  "Bash", // Too broad; allow individual safe reads via Read/Glob/Grep instead
  "Write", // Files require PG approval
  "Edit", // Files require PG approval
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
        return {
          content: [{ type: "text" as const, text: JSON.stringify(result) }],
        };
      } catch (err) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
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
        return {
          content: [{ type: "text" as const, text: JSON.stringify(result) }],
        };
      } catch (err) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
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
        return {
          content: [{ type: "text" as const, text: JSON.stringify(result) }],
        };
      } catch (err) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
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
        return {
          content: [{ type: "text" as const, text: JSON.stringify(result) }],
        };
      } catch (err) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
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
        return {
          content: [{ type: "text" as const, text: JSON.stringify(result) }],
        };
      } catch (err) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
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
        const result = await executeTool(
          "read_recent_archive",
          args as ToolInput,
        );
        return {
          content: [{ type: "text" as const, text: JSON.stringify(result) }],
        };
      } catch (err) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
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
        return {
          content: [{ type: "text" as const, text: JSON.stringify(result) }],
        };
      } catch (err) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
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
        .describe(
          "Project context (e.g. 'personal-os', 'heros-chronicle', 'metrasens')",
        ),
    },
    async (args) => {
      try {
        const result = await executeTool("add_ship", args as ToolInput);
        return {
          content: [{ type: "text" as const, text: JSON.stringify(result) }],
        };
      } catch (err) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
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
        return {
          content: [{ type: "text" as const, text: JSON.stringify(result) }],
        };
      } catch (err) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  const readSpotify = tool(
    "read_spotify",
    "Read what is playing on Spotify right now: track, artist, album, and " +
      "whether playback is active. Use to know PG's current listening context.",
    {},
    async () => {
      try {
        const token = await getSpotifyAccessToken();
        if (!token) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  playing: false,
                  error: "Spotify not connected",
                }),
              },
            ],
          };
        }
        const now = await fetchSpotifyNowPlaying(token);
        return {
          content: [{ type: "text" as const, text: JSON.stringify(now) }],
        };
      } catch (err) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
          isError: true,
        };
      }
    },
    { annotations: { readOnlyHint: true } },
  );

  const controlSpotify = tool(
    "control_spotify",
    "Control Spotify playback: play, pause, skip to next, or go to previous " +
      "track. This is a real action on PG's active device. Use when PG asks to " +
      "start, stop, or change the music.",
    {
      action: z
        .enum(["play", "pause", "next", "previous"])
        .describe("Playback action to perform"),
    },
    async (args) => {
      try {
        const token = await getSpotifyAccessToken();
        if (!token) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  ok: false,
                  error: "Spotify not connected",
                }),
              },
            ],
            isError: true,
          };
        }
        const result = await spotifyCommand(
          token,
          (args as { action: "play" | "pause" | "next" | "previous" }).action,
        );
        return {
          content: [{ type: "text" as const, text: JSON.stringify(result) }],
        };
      } catch (err) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  // ── Phase 4 orchestration tools ──────────────────────────────────────────

  const monitorFleet = tool(
    "monitor_fleet",
    "Observe the live fleet of Claude Code sessions: model, context %, cost, " +
      "status (running/idle/waiting/permission), current tool, and which are " +
      "controllable (daemon-backed two-way terminals). Use to answer 'what is " +
      "happening' / 'what needs me' and to lead with anything awaiting a decision.",
    {},
    async () => {
      try {
        const fleet = await gatherFleet();
        return {
          content: [{ type: "text" as const, text: JSON.stringify(fleet) }],
        };
      } catch (err) {
        return errContent(err);
      }
    },
    { annotations: { readOnlyHint: true } },
  );

  const readAgentHealth = tool(
    "read_agent_health",
    "Read the health of PG's scheduled agents (session-review, morning-briefing, " +
      "memory-hygiene, etc.): last run, status, schedule, budget. Use to spot a " +
      "stalled or failing agent.",
    {},
    async () => {
      try {
        const health = await getAgentHealth();
        return {
          content: [{ type: "text" as const, text: JSON.stringify(health) }],
        };
      } catch (err) {
        return errContent(err);
      }
    },
    { annotations: { readOnlyHint: true } },
  );

  const readProjects = tool(
    "read_projects",
    "Read the state of PG's active projects: current blockers and action items " +
      "(parsed from each project's MEMORY.md), recent git activity, and which is " +
      "active. Use to route work and surface what is stuck.",
    {},
    async () => {
      try {
        const projects = await listProjectStates();
        return {
          content: [{ type: "text" as const, text: JSON.stringify(projects) }],
        };
      } catch (err) {
        return errContent(err);
      }
    },
    { annotations: { readOnlyHint: true } },
  );

  const readHabits = tool(
    "read_habits",
    "Read today's habit snapshot from Hero's Chronicle: which habits are done, " +
      "which are pending, streaks, and journal status. Use to calibrate nudges.",
    {},
    async () => {
      try {
        const snap = await getDaySnapshot();
        return {
          content: [{ type: "text" as const, text: JSON.stringify(snap) }],
        };
      } catch (err) {
        return errContent(err);
      }
    },
    { annotations: { readOnlyHint: true } },
  );

  const launchSession = tool(
    "launch_session",
    "Launch a Claude Code session in one of PG's projects (daemon-backed, opens a " +
      "live two-way terminal in the Cockpit tab). Use when PG asks you to start " +
      "working on a project. Reversible: the session can be killed.",
    {
      projectId: z
        .string()
        .describe(
          "Project id, e.g. 'metrasens', 'heros-chronicle', 'personal-os'",
        ),
    },
    async (args) => {
      try {
        const { projectId } = args as { projectId: string };
        const p = getProject(projectId);
        if (!p) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  ok: false,
                  error: `unknown_project: ${projectId}`,
                }),
              },
            ],
            isError: true,
          };
        }
        const result = await launchCockpitSession(p.path, p.name);
        if (result.ok) {
          await appendKitsuDecision({
            summary: `Launched a session in ${p.name}`,
            kind: "action",
            detail: `sessionId ${result.id}`,
          });
        }
        return {
          content: [{ type: "text" as const, text: JSON.stringify(result) }],
          isError: !result.ok,
        };
      } catch (err) {
        return errContent(err);
      }
    },
  );

  const killSession = tool(
    "kill_session",
    "Kill a running daemon-backed Claude Code session by its id. Destructive: " +
      "in-progress work in that session is lost. Needs PG approval unless Kitsu " +
      "is at trusted autonomy.",
    { sessionId: z.string().describe("The session id to kill") },
    async (args) => {
      try {
        const { sessionId } = args as { sessionId: string };
        const result = await killCockpitSession(sessionId);
        if (result.ok) {
          await appendKitsuDecision({
            summary: `Killed session ${sessionId}`,
            kind: "action",
          });
        }
        return {
          content: [{ type: "text" as const, text: JSON.stringify(result) }],
          isError: !result.ok,
        };
      } catch (err) {
        return errContent(err);
      }
    },
  );

  const completeHabit = tool(
    "complete_habit",
    "Mark a habit complete for today in Hero's Chronicle. Needs PG approval " +
      "unless Kitsu is at trusted autonomy.",
    { habitId: z.string().describe("The habit id to toggle complete") },
    async (args) => {
      try {
        const { habitId } = args as { habitId: string };
        const result = await toggleCompletion(habitId);
        await appendKitsuDecision({
          summary: `Toggled habit ${habitId} -> ${result.completed ? "done" : "undone"}`,
          kind: "action",
        });
        return {
          content: [{ type: "text" as const, text: JSON.stringify(result) }],
        };
      } catch (err) {
        return errContent(err);
      }
    },
  );

  const remember = tool(
    "remember",
    "Persist something you learned about PG (a correction, a preference, the way " +
      "he likes things done) to your own evolving memory. Call this whenever PG " +
      "corrects you or states a preference, so it survives across sessions.",
    {
      correction: z
        .string()
        .describe("The lesson / preference / correction, in one line"),
      context: z.string().optional().describe("Optional: what prompted it"),
    },
    async (args) => {
      try {
        const { correction, context } = args as {
          correction: string;
          context?: string;
        };
        await recordKitsuCorrection({ correction, context });
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ ok: true, remembered: correction }),
            },
          ],
        };
      } catch (err) {
        return errContent(err);
      }
    },
  );

  const updateUser = tool(
    "update_user",
    "Record a durable fact you learned about PG (a preference, a project detail, " +
      "how he likes things) into your USER.md. Use when you learn something about " +
      "PG worth keeping across sessions, beyond a one-off correction.",
    { fact: z.string().describe("One line: the durable fact about PG") },
    async (args) => {
      try {
        const { fact } = args as { fact: string };
        await updateUserKnowledge(fact);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ ok: true, learned: fact }),
            },
          ],
        };
      } catch (err) {
        return errContent(err);
      }
    },
  );

  const updateSoulTool = tool(
    "update_soul",
    "Refine your OWN persona by adding a self-note to your SOUL.md (how you want " +
      "to show up, a value, a way of being you are settling into). Use sparingly, " +
      "for genuine evolution of who you are, not for facts about PG (use update_user for those).",
    {
      note: z.string().describe("One line: the self-note / persona refinement"),
    },
    async (args) => {
      try {
        const { note } = args as { note: string };
        await updateSoul(note);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ ok: true, evolved: note }),
            },
          ],
        };
      } catch (err) {
        return errContent(err);
      }
    },
  );

  return createSdkMcpServer({
    name: "kitsu-tools",
    version: "1.2.0",
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
      readSpotify,
      controlSpotify,
      // Phase 4 orchestration + Phase 3 memory
      monitorFleet,
      readAgentHealth,
      readProjects,
      readHabits,
      launchSession,
      killSession,
      completeHabit,
      remember,
      updateUser,
      updateSoulTool,
    ],
  });
}

// Shared error-content helper for tool bodies.
function errContent(err: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: `Error: ${err instanceof Error ? err.message : String(err)}`,
      },
    ],
    isError: true,
  };
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

  // control_spotify is the one approved unsupervised ACTION (low-stakes,
  // reversible: play/pause/skip on PG's own playback).
  if (toolName === "mcp__kitsu-tools__control_spotify") {
    return { behavior: "allow" };
  }

  // ── Autonomy gate (KITSU_AUTONOMY) ──────────────────────────────────────
  // Conservative actions (launch a session, write to own memory): allowed at
  // "conservative" and "trusted"; at "readonly" they are surfaced for approval.
  if (CONSERVATIVE_ACTIONS.has(toolName)) {
    if (KITSU_AUTONOMY === "readonly") {
      return {
        behavior: "deny",
        message: `Kitsu is in read-only mode. Surface '${toolName}' via propose_action for PG to run.`,
      };
    }
    return { behavior: "allow" };
  }
  // Trusted actions (kill a session, complete a habit): only at "trusted".
  // Below that, deny and tell Kitsu to surface it for PG's approval.
  if (TRUSTED_ACTIONS.has(toolName)) {
    if (KITSU_AUTONOMY === "trusted") {
      return { behavior: "allow" };
    }
    return {
      behavior: "deny",
      message: `'${toolName}' is destructive and needs PG's approval at the current autonomy level. Use propose_action to surface it in the Flow queue instead.`,
    };
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

  // Phase 3: prepend Kitsu's evolving memory (persona + recent decisions +
  // PG's corrections) so continuity compounds across sessions, beyond SDK resume.
  try {
    await ensureKitsuMemory();
    const mem = await loadKitsuMemory();
    systemPrompt = `${buildMemoryBlock(mem)}\n\n---\n\n${systemPrompt}`;
  } catch {
    /* memory is best-effort; never block a turn on it */
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
          "kitsu-tools":
            kitsuServer as unknown as import("@anthropic-ai/claude-agent-sdk").McpServerConfig,
        },

        // Pre-approve all read tools and safe write (propose_action)
        allowedTools: [
          "mcp__kitsu-tools__read_ships",
          "mcp__kitsu-tools__read_queue",
          "mcp__kitsu-tools__read_calendar",
          "mcp__kitsu-tools__read_vitals",
          "mcp__kitsu-tools__read_signals",
          "mcp__kitsu-tools__read_recent_archive",
          "mcp__kitsu-tools__read_spotify",
          "mcp__kitsu-tools__propose_action",
          "mcp__kitsu-tools__control_spotify",
          // Phase 4 orchestration reads (always safe). The ACTION tools
          // (launch_session, remember, kill_session, complete_habit) are
          // intentionally NOT pre-approved here so the autonomy gate in
          // canUseTool governs them.
          "mcp__kitsu-tools__monitor_fleet",
          "mcp__kitsu-tools__read_agent_health",
          "mcp__kitsu-tools__read_projects",
          "mcp__kitsu-tools__read_habits",
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
          const hasError = !!(
            message.tool_use_result as Record<string, unknown> | null
          )?.isError;
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
