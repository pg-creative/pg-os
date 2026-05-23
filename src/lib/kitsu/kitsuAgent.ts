/**
 * kitsuAgent.ts — Kitsu orchestrator brain on the Vercel AI SDK.
 *
 * REWRITE 2026-05-23 (WS-E): the previous @anthropic-ai/claude-agent-sdk
 * implementation spawned the `claude` CLI as a subprocess to drive the agent
 * loop. That worked on PG's Mac (CLI globally installed) but is structurally
 * incompatible with Vercel's linux-x64 serverless runtime (no binary, no
 * subprocess spawn, 250MB function cap). Symptom on prod: every Kitsu turn
 * returned "Native CLI binary for linux-x64 not found", which the old client
 * fallback hid as "I hit a snag reaching my tools." See plan
 * ~/.claude/plans/go-into-plan-mode-nifty-hennessy.md.
 *
 * This runtime swap uses `streamText` from the Vercel AI SDK — pure JS, edge-
 * runtime compatible, Vercel's first-party Anthropic path. Same architecture
 * as before: in-process tool registry, KITSU_AUTONOMY gate, soul-stack system
 * prompt, WS-A1 failed-tool tracking. The SSE event shape (KitsuEvent) is
 * preserved verbatim so /api/kitsu/query/route.ts + useMarvis.tsx don't need
 * to change.
 *
 * Lose:
 *   - SDK-managed session resume (client passes full message history each turn)
 *   - Built-in Read/Glob/Bash/WebSearch tools (Kitsu doesn't use them)
 *   - settingSources ["user"] (~/.claude/ load — dropped in WS-B1 anyway)
 */

import { z } from "zod";
import { streamText, tool, stepCountIs } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { executeTool, type ToolInput } from "@/lib/copilotTools";
import { buildMarvisSystem, MARVIS_PERSONA } from "@/lib/cockpit/marvis";
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

// ── Autonomy (PG decision 2026-05-22: conservative, built to evolve) ─────────
// The single switch for how much Kitsu does unsupervised.
//   readonly     — observe only. Even soft writes need PG.
//   conservative — launch sessions / remember / update own memory (reversible).
//                  kill_session / complete_habit need PG.
//   trusted      — every tool allowed without prompt.
export type KitsuAutonomy = "readonly" | "conservative" | "trusted";
export const KITSU_AUTONOMY: KitsuAutonomy =
  (process.env.KITSU_AUTONOMY as KitsuAutonomy) || "conservative";

// Spotify token helper — mirrors /api/spotify/command refresh flow.
async function getSpotifyAccessToken(): Promise<string | null> {
  const current = await getTokens("spotify");
  if (!current?.refreshToken) return null;
  const tokens = isExpired(current)
    ? await refreshAndStore("spotify", refreshSpotifyToken)
    : current;
  return tokens.accessToken ?? null;
}

// ── KitsuEvent (unchanged from Agent SDK era — SSE consumers depend on it) ───
export type KitsuEvent =
  | { type: "session_id"; session_id: string }
  | { type: "text"; delta: string }
  | { type: "tool_start"; name: string }
  | { type: "tool_end"; name: string; ok: boolean; error?: string }
  | { type: "done"; result: string; cost_usd: number; num_turns: number }
  | { type: "error"; error: string };

// ── Autonomy gate helpers (inlined into each tool's execute) ─────────────────
// Conservative-tier action: allowed at conservative + trusted; denied at readonly.
function gateConservative(toolName: string): string | null {
  if (KITSU_AUTONOMY === "readonly") {
    return `Kitsu is in read-only mode. Surface '${toolName}' via propose_action for PG to run.`;
  }
  return null;
}
// Trusted-tier action: allowed only at trusted.
function gateTrusted(toolName: string): string | null {
  if (KITSU_AUTONOMY === "trusted") return null;
  return `'${toolName}' is destructive and needs PG's approval at the current autonomy level. Use propose_action to surface it in the Flow queue instead.`;
}
// Write that needs approval at every autonomy level except trusted.
function gateWriteNeedsApproval(toolName: string): string | null {
  if (KITSU_AUTONOMY === "trusted") return null;
  return `${toolName} needs PG approval before writing. Propose via propose_action or ask PG first.`;
}

// Uniform err shape consumed by the loop (also visible to the model).
function err(message: string) {
  return { ok: false, error: message };
}

// ── 21 tools as Vercel AI SDK `tool()` defs ──────────────────────────────────
// Read-side tools delegate to copilotTools.executeTool (existing logic).
// Orchestration + memory tools call local handlers (gatherFleet, getAgentHealth,
// launchCockpitSession, recordKitsuCorrection, etc.) the way the MCP server did.
function buildKitsuTools() {
  const safeExec = async (name: string, input: ToolInput) => {
    try {
      return await executeTool(name, input);
    } catch (e) {
      return err(e instanceof Error ? e.message : String(e));
    }
  };

  return {
    // ── Reads (always allowed at every autonomy) ────────────────────────────
    read_ships: tool({
      description:
        "Read the ship log: recent shipped items, streak, velocity, and today's status. " +
        "Use to understand what PG has shipped recently and current momentum.",
      inputSchema: z.object({
        limit: z
          .number()
          .min(1)
          .max(50)
          .default(20)
          .describe("Max ships to return (default 20)"),
      }),
      execute: async (input) => safeExec("read_ships", input),
    }),

    read_queue: tool({
      description:
        "Read the approval queue: pending decisions waiting for PG. Each item has a title, source, options, and how long it has been waiting.",
      inputSchema: z.object({}),
      execute: async () => safeExec("read_queue", {}),
    }),

    read_calendar: tool({
      description:
        "Read today's Google Calendar events. Use to understand what is scheduled and when PG has blocks of time available.",
      inputSchema: z.object({
        view: z
          .enum(["today", "week"])
          .default("today")
          .describe("Time window"),
      }),
      execute: async (input) => safeExec("read_calendar", input),
    }),

    read_vitals: tool({
      description:
        "Read Whoop recovery and sleep data. Returns recovery score, HRV, resting HR, and sleep quality. Use to calibrate energy expectations.",
      inputSchema: z.object({}),
      execute: async () => safeExec("read_vitals", {}),
    }),

    read_signals: tool({
      description:
        "Read recent self-improvement signals from Claude Code transcripts: corrections, confirmations, rule violations, and behavioral patterns.",
      inputSchema: z.object({
        days: z
          .number()
          .min(1)
          .max(30)
          .default(7)
          .describe("Days to look back"),
      }),
      execute: async (input) => safeExec("read_signals", input),
    }),

    read_recent_archive: tool({
      description:
        "Search the Claude conversation archive (FTS5 full-text search). Use to recall past decisions, prior art, or context from older conversations.",
      inputSchema: z.object({
        query: z.string().describe("Full-text search query"),
        limit: z.number().min(1).max(20).default(10).describe("Max results"),
      }),
      execute: async (input) => safeExec("read_recent_archive", input),
    }),

    read_spotify: tool({
      description:
        "Read what is playing on Spotify right now: track, artist, album, and whether playback is active.",
      inputSchema: z.object({}),
      execute: async () => {
        try {
          const token = await getSpotifyAccessToken();
          if (!token) return { playing: false, error: "Spotify not connected" };
          return await fetchSpotifyNowPlaying(token);
        } catch (e) {
          return err(e instanceof Error ? e.message : String(e));
        }
      },
    }),

    monitor_fleet: tool({
      description:
        "Observe the live fleet of Claude Code sessions: model, context %, cost, status (running/idle/waiting/permission), current tool, and which are controllable. Lead with anything awaiting a decision.",
      inputSchema: z.object({}),
      execute: async () => {
        try {
          return await gatherFleet();
        } catch (e) {
          return err(e instanceof Error ? e.message : String(e));
        }
      },
    }),

    read_agent_health: tool({
      description:
        "Read the health of PG's scheduled agents (session-review, morning-briefing, memory-hygiene, etc.): last run, status, schedule, budget.",
      inputSchema: z.object({}),
      execute: async () => {
        try {
          return await getAgentHealth();
        } catch (e) {
          return err(e instanceof Error ? e.message : String(e));
        }
      },
    }),

    read_projects: tool({
      description:
        "Read the state of PG's active projects: current blockers and action items (parsed from MEMORY.md), recent git activity, which is active.",
      inputSchema: z.object({}),
      execute: async () => {
        try {
          return await listProjectStates();
        } catch (e) {
          return err(e instanceof Error ? e.message : String(e));
        }
      },
    }),

    read_habits: tool({
      description:
        "Read today's habit snapshot from Hero's Chronicle: which habits are done, pending, streaks, journal status.",
      inputSchema: z.object({}),
      execute: async () => {
        try {
          return await getDaySnapshot();
        } catch (e) {
          return err(e instanceof Error ? e.message : String(e));
        }
      },
    }),

    // ── propose_action: safe write (local queue file). Always allowed. ──────
    propose_action: tool({
      description:
        "Write a decision or action proposal to the approval queue (~/.pg-os/queue/). Use when a concrete decision should be surfaced in the Flow tab for PG to approve, dismiss, or act on.",
      inputSchema: z.object({
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
      }),
      execute: async (input) => safeExec("propose_action", input as ToolInput),
    }),

    // ── control_spotify: the one approved unsupervised ACTION (reversible) ──
    control_spotify: tool({
      description:
        "Control Spotify playback: play, pause, skip to next, or go to previous. Real action on PG's active device.",
      inputSchema: z.object({
        action: z
          .enum(["play", "pause", "next", "previous"])
          .describe("Playback action"),
      }),
      execute: async (input) => {
        try {
          const token = await getSpotifyAccessToken();
          if (!token) return err("Spotify not connected");
          return await spotifyCommand(token, input.action);
        } catch (e) {
          return err(e instanceof Error ? e.message : String(e));
        }
      },
    }),

    // ── Conservative-tier actions (allowed at conservative + trusted) ───────
    launch_session: tool({
      description:
        "Launch a Claude Code session in one of PG's projects (daemon-backed). Use when PG asks you to start working on a project. Reversible.",
      inputSchema: z.object({
        projectId: z
          .string()
          .describe("Project id (e.g. 'personal-os', 'metrasens')"),
      }),
      execute: async (input) => {
        const denied = gateConservative("launch_session");
        if (denied) return err(denied);
        try {
          const p = getProject(input.projectId);
          if (!p) return err(`unknown_project: ${input.projectId}`);
          const result = await launchCockpitSession(p.path, p.name);
          if (result.ok) {
            await appendKitsuDecision({
              summary: `Launched a session in ${p.name}`,
              kind: "action",
              detail: `sessionId ${result.id}`,
            });
          }
          return result;
        } catch (e) {
          return err(e instanceof Error ? e.message : String(e));
        }
      },
    }),

    remember: tool({
      description:
        "Persist something you learned about PG (a correction, a preference, the way he likes things done) to your own evolving memory. Call this whenever PG corrects you or states a preference.",
      inputSchema: z.object({
        correction: z
          .string()
          .describe("The lesson / preference / correction, in one line"),
        context: z.string().optional().describe("Optional: what prompted it"),
      }),
      execute: async (input) => {
        const denied = gateConservative("remember");
        if (denied) return err(denied);
        try {
          await recordKitsuCorrection({
            correction: input.correction,
            context: input.context,
          });
          return { ok: true, remembered: input.correction };
        } catch (e) {
          return err(e instanceof Error ? e.message : String(e));
        }
      },
    }),

    update_user: tool({
      description:
        "Record a durable fact you learned about PG into your USER.md. Use when you learn something worth keeping across sessions, beyond a one-off correction.",
      inputSchema: z.object({
        fact: z.string().describe("One line: the durable fact about PG"),
      }),
      execute: async (input) => {
        const denied = gateConservative("update_user");
        if (denied) return err(denied);
        try {
          await updateUserKnowledge(input.fact);
          return { ok: true, learned: input.fact };
        } catch (e) {
          return err(e instanceof Error ? e.message : String(e));
        }
      },
    }),

    update_soul: tool({
      description:
        "Refine your OWN persona by adding a self-note to your SOUL.md. Use sparingly, for genuine evolution of who you are, not facts about PG.",
      inputSchema: z.object({
        note: z
          .string()
          .describe("One line: the self-note / persona refinement"),
      }),
      execute: async (input) => {
        const denied = gateConservative("update_soul");
        if (denied) return err(denied);
        try {
          await updateSoul(input.note);
          return { ok: true, evolved: input.note };
        } catch (e) {
          return err(e instanceof Error ? e.message : String(e));
        }
      },
    }),

    // ── Trusted-tier actions (deny + ask for approval at conservative) ──────
    kill_session: tool({
      description:
        "Kill a running daemon-backed Claude Code session by id. Destructive: in-progress work is lost. Needs PG approval unless Kitsu is at trusted autonomy.",
      inputSchema: z.object({
        sessionId: z.string().describe("Session id to kill"),
      }),
      execute: async (input) => {
        const denied = gateTrusted("kill_session");
        if (denied) return err(denied);
        try {
          const result = await killCockpitSession(input.sessionId);
          if (result.ok) {
            await appendKitsuDecision({
              summary: `Killed session ${input.sessionId}`,
              kind: "action",
            });
          }
          return result;
        } catch (e) {
          return err(e instanceof Error ? e.message : String(e));
        }
      },
    }),

    complete_habit: tool({
      description:
        "Mark a habit complete for today in Hero's Chronicle. Needs PG approval unless Kitsu is at trusted autonomy.",
      inputSchema: z.object({
        habitId: z.string().describe("Habit id to toggle complete"),
      }),
      execute: async (input) => {
        const denied = gateTrusted("complete_habit");
        if (denied) return err(denied);
        try {
          const result = await toggleCompletion(input.habitId);
          await appendKitsuDecision({
            summary: `Toggled habit ${input.habitId} -> ${result.completed ? "done" : "undone"}`,
            kind: "action",
          });
          return result;
        } catch (e) {
          return err(e instanceof Error ? e.message : String(e));
        }
      },
    }),

    // ── Writes that need PG approval at every level except trusted ──────────
    add_ship: tool({
      description:
        "Log a shipped item to the ship log. Needs PG approval unless Kitsu is at trusted autonomy.",
      inputSchema: z.object({
        text: z.string().max(500).describe("What was shipped"),
        context: z.string().optional().describe("Project context"),
      }),
      execute: async (input) => {
        const denied = gateWriteNeedsApproval("add_ship");
        if (denied) return err(denied);
        return safeExec("add_ship", input as ToolInput);
      },
    }),

    add_queue_item: tool({
      description:
        "Add an item directly to the approval queue. Quick yes/no items. Needs PG approval unless Kitsu is at trusted autonomy.",
      inputSchema: z.object({
        title: z.string().max(80).describe("Decision title"),
        source: z.string().optional().describe("Project context"),
        options: z.array(z.string()).optional(),
        note: z.string().optional(),
      }),
      execute: async (input) => {
        const denied = gateWriteNeedsApproval("add_queue_item");
        if (denied) return err(denied);
        return safeExec("add_queue_item", input as ToolInput);
      },
    }),
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

export interface StreamKitsuParams {
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  sessionId?: string;
}

/**
 * streamKitsu — async generator that drives a Vercel AI SDK streamText loop
 * and yields KitsuEvent objects suitable for SSE serialization.
 *
 * The system prompt is built fresh each call so it includes the live fleet
 * snapshot + soul stack (persona + USER + MEMORY + recent decisions). Session
 * resume is not needed because the client passes the full message history
 * every turn (useMarvis stores it in its own state).
 */
export async function* streamKitsu({
  messages,
  sessionId,
}: StreamKitsuParams): AsyncGenerator<KitsuEvent> {
  // Build persona + live fleet snapshot.
  let systemPrompt: string;
  try {
    systemPrompt = buildMarvisSystem(await buildMarvisFleet());
  } catch {
    // Fleet snapshot is best-effort; fall back to bare persona.
    systemPrompt = `${MARVIS_PERSONA}\n\nCURRENT FLEET: fleet telemetry unavailable right now.`;
  }

  // Prepend Kitsu's evolving memory (persona + USER + MEMORY + decisions) so
  // continuity compounds across sessions, beyond message-history replay.
  try {
    await ensureKitsuMemory();
    const mem = await loadKitsuMemory();
    systemPrompt = `${buildMemoryBlock(mem)}\n\n---\n\n${systemPrompt}`;
  } catch {
    /* memory is best-effort; never block a turn on it */
  }

  // Emit session_id so the client knows the stream started. We mint a per-call
  // id (Agent SDK used to manage real sessions; with direct streamText the
  // client owns convo history so this id is just a stream marker now).
  const sid = sessionId || `kitsu-${Date.now()}`;
  yield { type: "session_id", session_id: sid };

  if (messages.length === 0 || !messages.some((m) => m.role === "user")) {
    yield { type: "error", error: "No user message found in messages array." };
    return;
  }

  // WS-A1 tracking: which tool last failed + what it said. Lets the terminal
  // error event include the real cause so PG sees 'Tool X failed (Y)' instead
  // of the generic "snag" fallback (the bug that started this whole arc).
  let lastFailedTool: string | null = null;
  let lastFailedToolError: string | null = null;
  let finalText = "";
  let totalCost = 0;
  let numTurns = 0;
  let sawAnyText = false;

  try {
    const result = streamText({
      model: anthropic("claude-sonnet-4-6"),
      system: systemPrompt,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      tools: buildKitsuTools(),
      // WS-B1: chat rarely needs 10 sequential tool calls. 4 keeps the loop
      // snappy and bounds the cost of a misbehaving turn. stepCountIs is the
      // v6 SDK's replacement for maxSteps.
      stopWhen: stepCountIs(4),
      // Prompt caching on the (large, stable) system block. Saves ~50% TTFT on
      // repeat turns when the persona + USER + MEMORY + soul stack don't change.
      providerOptions: {
        anthropic: {
          cacheControl: { type: "ephemeral" },
        },
      },
    });

    // fullStream gives us text deltas + tool lifecycle + finish events.
    for await (const part of result.fullStream) {
      switch (part.type) {
        case "text-delta": {
          // v6 uses `text` on text-delta parts; some intermediate versions
          // used `textDelta`. Accept either to be forward/back-compatible.
          const delta =
            (part as unknown as { text?: string; textDelta?: string }).text ??
            (part as unknown as { textDelta?: string }).textDelta ??
            "";
          if (delta) {
            sawAnyText = true;
            finalText += delta;
            yield { type: "text", delta };
          }
          break;
        }
        case "tool-call": {
          const name = (part as { toolName: string }).toolName;
          yield { type: "tool_start", name };
          break;
        }
        case "tool-result": {
          const name = (part as { toolName: string }).toolName;
          const out =
            (part as { output?: unknown; result?: unknown }).output ??
            (part as { result?: unknown }).result;
          // Our tool handlers return either the success payload OR
          // { ok: false, error: string } via the err() helper. Detect both.
          const errInResult =
            out && typeof out === "object" && "error" in (out as object)
              ? String((out as { error: unknown }).error)
              : null;
          if (errInResult) {
            lastFailedTool = name;
            lastFailedToolError = errInResult;
            yield {
              type: "tool_end",
              name,
              ok: false,
              error: errInResult,
            };
          } else {
            yield { type: "tool_end", name, ok: true };
          }
          break;
        }
        case "error": {
          const errStr =
            (part as { error: unknown }).error instanceof Error
              ? (part as { error: Error }).error.message
              : String((part as { error: unknown }).error);
          yield { type: "error", error: errStr };
          return;
        }
        case "finish": {
          // v6 finish event includes usage. Accumulate input/output tokens for
          // cost reporting. We approximate cost from sonnet 4.6 pricing
          // (input $3/M, output $15/M). Treat cached input at $0.30/M.
          const usage =
            (part as { totalUsage?: unknown }).totalUsage ??
            (part as { usage?: unknown }).usage;
          if (usage && typeof usage === "object") {
            const u = usage as {
              inputTokens?: number;
              outputTokens?: number;
              cachedInputTokens?: number;
            };
            const input = u.inputTokens ?? 0;
            const cached = u.cachedInputTokens ?? 0;
            const output = u.outputTokens ?? 0;
            totalCost +=
              ((input - cached) / 1_000_000) * 3 +
              (cached / 1_000_000) * 0.3 +
              (output / 1_000_000) * 15;
          }
          break;
        }
        // 'finish-step', 'start', 'start-step', 'reasoning-*' etc are ignored.
        default:
          break;
      }
    }

    // Stream ended cleanly. Count the steps the SDK actually ran.
    try {
      const steps = await result.steps;
      numTurns = Array.isArray(steps) ? steps.length : 1;
    } catch {
      numTurns = 1;
    }

    // WS-A1: success-but-empty after a tool failed → surface the real failure
    // instead of yielding a silent done that the UI would paper over.
    if (!sawAnyText && lastFailedTool) {
      const friendly = lastFailedTool.replace(/^mcp__[^_]+__/, "");
      const detail = lastFailedToolError ? ` (${lastFailedToolError})` : "";
      yield {
        type: "error",
        error: `Tool '${friendly}' failed and the agent produced no follow-up text${detail}.`,
      };
    } else {
      yield {
        type: "done",
        result: finalText,
        cost_usd: totalCost,
        num_turns: numTurns,
      };
    }
  } catch (e) {
    const reason = e instanceof Error ? e.message : String(e);
    const failHint = lastFailedTool
      ? ` Last failed tool: '${lastFailedTool}'${lastFailedToolError ? ` (${lastFailedToolError})` : ""}.`
      : "";
    yield { type: "error", error: `${reason}${failHint}` };
  }
}
