/**
 * copilotTools.ts — Tool schema definitions for the in-dashboard AI co-pilot.
 * All 9 tools with JSONSchema input definitions.
 * Read tools call existing API routes. Write tools use existing POST endpoints.
 */

import type { Tool } from "@anthropic-ai/sdk/resources/messages";
import os from "node:os";
import path from "node:path";
import fs from "node:fs";

// ── Tool schemas ─────────────────────────────────────────────────────────────

export const COPILOT_TOOLS: Tool[] = [
  {
    name: "read_ships",
    description:
      "Read the ship log: recent shipped items, streak, velocity, and today's status. " +
      "Use to understand what PG has shipped recently and current momentum.",
    input_schema: {
      type: "object" as const,
      properties: {
        limit: {
          type: "number",
          description: "Max ships to return (1–50, default 20)",
        },
      },
      required: [],
    },
  },
  {
    name: "read_queue",
    description:
      "Read the approval queue: pending decisions waiting for PG's attention. " +
      "Each item has a title, source, options, and how long it's been waiting.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "read_calendar",
    description:
      "Read today's Google Calendar events. Use to understand what's scheduled " +
      "and when PG has blocks of time available.",
    input_schema: {
      type: "object" as const,
      properties: {
        view: {
          type: "string",
          enum: ["today", "week"],
          description: "Time window: 'today' (default) or 'week'",
        },
      },
      required: [],
    },
  },
  {
    name: "read_vitals",
    description:
      "Read Whoop recovery and sleep data. Returns recovery score (0–100), " +
      "HRV, resting HR, and sleep quality. Use to calibrate energy expectations.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "read_signals",
    description:
      "Read recent self-improvement signals from Claude Code transcripts: " +
      "corrections, confirmations, rule violations, and behavioral patterns. " +
      "Use to understand recent AI performance trends.",
    input_schema: {
      type: "object" as const,
      properties: {
        days: {
          type: "number",
          description: "Days to look back (1–30, default 7)",
        },
      },
      required: [],
    },
  },
  {
    name: "read_recent_archive",
    description:
      "Search the Claude conversation archive (FTS5 full-text search). " +
      "Use to recall past decisions, prior art, or context from older conversations.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "Full-text search query",
        },
        limit: {
          type: "number",
          description: "Max results (1–20, default 10)",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "propose_action",
    description:
      "Write a decision or action proposal to the approval queue (~/.pg-os/queue/). " +
      "Use when a concrete decision or next step should be surfaced in the Flow tab " +
      "for PG to approve, dismiss, or act on.",
    input_schema: {
      type: "object" as const,
      properties: {
        title: {
          type: "string",
          description: "Short decision title (< 80 chars)",
        },
        source: {
          type: "string",
          description: "Project context (e.g. 'personal-os', 'heros-chronicle')",
        },
        options: {
          type: "array",
          items: { type: "string" },
          description: "List of options if this is a choice",
        },
        note: {
          type: "string",
          description: "Longer context, tradeoffs, or recommendation",
        },
      },
      required: ["title"],
    },
  },
  {
    name: "add_ship",
    description:
      "Log a shipped item to the ship log. Use when PG confirms they shipped something " +
      "or asks to log a completed task.",
    input_schema: {
      type: "object" as const,
      properties: {
        text: {
          type: "string",
          description: "What was shipped (1–500 chars)",
        },
        context: {
          type: "string",
          description:
            "Project context (e.g. 'personal-os', 'heros-chronicle', 'metrasens')",
        },
      },
      required: ["text"],
    },
  },
  {
    name: "add_queue_item",
    description:
      "Add an item directly to the approval queue. Use for decisions that need " +
      "PG's attention that aren't full proposals — quick yes/no items.",
    input_schema: {
      type: "object" as const,
      properties: {
        title: {
          type: "string",
          description: "Decision title (< 80 chars)",
        },
        source: {
          type: "string",
          description: "Project context",
        },
        options: {
          type: "array",
          items: { type: "string" },
          description: "Options to choose from",
        },
        note: {
          type: "string",
          description: "Additional context",
        },
      },
      required: ["title"],
    },
  },
];

// ── Server-side tool executors ────────────────────────────────────────────────

/** Base URL for internal API calls from server-side route handlers */
function baseUrl(): string {
  return "http://127.0.0.1:3030";
}

async function apiFetch(path: string): Promise<unknown> {
  const res = await fetch(`${baseUrl()}${path}`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`API ${path} returned ${res.status}`);
  }
  return res.json();
}

async function apiPost(path: string, body: unknown): Promise<unknown> {
  const res = await fetch(`${baseUrl()}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({})) as Record<string, unknown>;
    throw new Error(j.error as string ?? `API POST ${path} returned ${res.status}`);
  }
  return res.json();
}

export type ToolInput = Record<string, unknown>;

export async function executeTool(
  name: string,
  input: ToolInput,
): Promise<unknown> {
  switch (name) {
    case "read_ships": {
      const limit = typeof input.limit === "number" ? input.limit : 20;
      return apiFetch(`/api/ships?limit=${Math.min(50, Math.max(1, limit))}`);
    }

    case "read_queue": {
      return apiFetch("/api/queue");
    }

    case "read_calendar": {
      const view = input.view === "week" ? "week" : "today";
      return apiFetch(`/api/calendar/events?view=${view}`);
    }

    case "read_vitals": {
      return apiFetch("/api/vitals/whoop");
    }

    case "read_signals": {
      const days = typeof input.days === "number" ? input.days : 7;
      return apiFetch(`/api/claude/signals?days=${Math.min(30, Math.max(1, days))}`);
    }

    case "read_recent_archive": {
      const query = typeof input.query === "string" ? input.query.trim() : "";
      if (!query) throw new Error("query is required");
      const limit = typeof input.limit === "number" ? input.limit : 10;
      return apiFetch(
        `/api/claude/archive?search=${encodeURIComponent(query)}&limit=${Math.min(20, Math.max(1, limit))}`,
      );
    }

    case "propose_action": {
      const title = typeof input.title === "string" ? input.title.trim() : "";
      if (!title) throw new Error("title is required");
      return writeQueueFile({
        title,
        source: typeof input.source === "string" ? input.source : "copilot",
        options: Array.isArray(input.options)
          ? (input.options as string[])
          : undefined,
        note: typeof input.note === "string" ? input.note : undefined,
      });
    }

    case "add_ship": {
      const text = typeof input.text === "string" ? input.text.trim() : "";
      if (!text) throw new Error("text is required");
      return apiPost("/api/ships", {
        text,
        context: typeof input.context === "string" ? input.context : null,
      });
    }

    case "add_queue_item": {
      const title = typeof input.title === "string" ? input.title.trim() : "";
      if (!title) throw new Error("title is required");
      return apiPost("/api/queue", {
        title,
        source: typeof input.source === "string" ? input.source : "copilot",
        options: Array.isArray(input.options) ? input.options : undefined,
        note: typeof input.note === "string" ? input.note : undefined,
      });
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// ── Queue file writer (for propose_action) ───────────────────────────────────

interface QueueFileParams {
  title: string;
  source?: string;
  options?: string[];
  note?: string;
}

async function writeQueueFile(params: QueueFileParams): Promise<{ ok: boolean; id: string }> {
  const queueDir = path.join(os.homedir(), ".pg-os", "queue");
  fs.mkdirSync(queueDir, { recursive: true });

  const slug = params.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
  const id = `${slug}-${Date.now()}`;
  const filePath = path.join(queueDir, `${id}.md`);

  const createdAt = Date.now();
  const optionsYaml =
    params.options && params.options.length > 0
      ? `options: [${params.options.map((o) => `"${o.replace(/"/g, '\\"')}"`).join(", ")}]\n`
      : "";

  const content = `---
title: "${params.title.replace(/"/g, '\\"')}"
source: ${params.source ?? "copilot"}
${optionsYaml}created_at: ${createdAt}
---
${params.note ?? ""}
`.trimEnd() + "\n";

  fs.writeFileSync(filePath, content, { mode: 0o600 });
  return { ok: true, id };
}
