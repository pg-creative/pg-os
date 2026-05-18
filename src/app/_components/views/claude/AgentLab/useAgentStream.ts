"use client";

/**
 * useAgentStream — shared SSE consumer for all AgentLab variants.
 * Opens /api/pixel-agents/events, reduces ServerMessage events into
 * a normalized AgentSnapshot[] keyed by agent id.
 *
 * Each variant subscribes to the same hook. The hook owns the
 * EventSource lifecycle and cleans up on unmount.
 */

import { useEffect, useReducer, useMemo } from "react";

export type AgentStatus = "idle" | "active" | "waiting" | "permission";

export type ToolCategory =
  | "read"
  | "write"
  | "bash"
  | "search"
  | "task"
  | "plan"
  | "ask"
  | "other";

export interface ToolHistoryEntry {
  toolId: string;
  toolName: string;
  toolStatus: string; // human-readable "Reading App.tsx"
  category: ToolCategory;
  startedAt: number;
  doneAt: number | null;
}

export interface AgentSnapshot {
  id: number;
  projectName: string;
  status: AgentStatus;
  currentTool: ToolHistoryEntry | null;
  toolHistory: ToolHistoryEntry[];
  toolCallCount: number;
  lastActivityAt: number;
  joinedAt: number;
}

interface State {
  agents: Map<number, AgentSnapshot>;
  connected: boolean;
}

type Action =
  | { type: "connected"; value: boolean }
  | { type: "agentCreated"; id: number; folderName?: string }
  | { type: "agentClosed"; id: number }
  | {
      type: "existingAgents";
      ids: number[];
      folderNames: Record<number, string>;
    }
  | {
      type: "agentToolStart";
      id: number;
      toolId: string;
      toolStatus: string;
    }
  | { type: "agentToolDone"; id: number; toolId: string }
  | { type: "agentToolsClear"; id: number }
  | { type: "agentStatus"; id: number; status: string }
  | { type: "agentToolPermission"; id: number }
  | { type: "agentToolPermissionClear"; id: number };

const HISTORY_CAP = 30;

const READING_TOOLS = new Set([
  "Read",
  "Grep",
  "Glob",
  "WebFetch",
  "WebSearch",
]);

function categorize(toolName: string): ToolCategory {
  if (toolName === "Read" || toolName === "Grep" || toolName === "Glob")
    return "read";
  if (
    toolName === "Write" ||
    toolName === "Edit" ||
    toolName === "MultiEdit" ||
    toolName === "NotebookEdit"
  )
    return "write";
  if (toolName === "Bash") return "bash";
  if (toolName === "WebFetch" || toolName === "WebSearch") return "search";
  if (toolName === "Task") return "task";
  if (toolName === "EnterPlanMode" || toolName === "ExitPlanMode")
    return "plan";
  if (toolName === "AskUserQuestion") return "ask";
  return "other";
}

function extractToolName(status: string): string {
  // Status strings from server parser: "Reading FOO", "Editing FOO", "Running: cmd",
  // "Searching files", "Searching code", "Fetching web content", "Searching the web",
  // "Subtask: ...", "Waiting for your answer", "Planning", "Editing notebook",
  // "Using <ToolName>"
  if (status.startsWith("Reading ")) return "Read";
  if (status.startsWith("Editing "))
    return status.includes("notebook") ? "NotebookEdit" : "Edit";
  if (status.startsWith("Writing ")) return "Write";
  if (status.startsWith("Running:")) return "Bash";
  if (status === "Searching files") return "Glob";
  if (status === "Searching code") return "Grep";
  if (status === "Fetching web content") return "WebFetch";
  if (status === "Searching the web") return "WebSearch";
  if (status.startsWith("Subtask:") || status === "Running subtask")
    return "Task";
  if (status === "Waiting for your answer") return "AskUserQuestion";
  if (status === "Planning") return "EnterPlanMode";
  if (status.startsWith("Using ")) return status.slice(6);
  return "Other";
}

function makeAgent(
  id: number,
  projectName: string,
  now: number,
): AgentSnapshot {
  return {
    id,
    projectName,
    status: "idle",
    currentTool: null,
    toolHistory: [],
    toolCallCount: 0,
    lastActivityAt: now,
    joinedAt: now,
  };
}

function reducer(state: State, action: Action): State {
  if (action.type === "connected") {
    return { ...state, connected: action.value };
  }

  const now = Date.now();
  const next = new Map(state.agents);

  switch (action.type) {
    case "agentCreated": {
      if (!next.has(action.id)) {
        next.set(
          action.id,
          makeAgent(action.id, action.folderName ?? `#${action.id}`, now),
        );
      }
      break;
    }
    case "agentClosed": {
      next.delete(action.id);
      break;
    }
    case "existingAgents": {
      for (const id of action.ids) {
        if (!next.has(id)) {
          next.set(id, makeAgent(id, action.folderNames[id] ?? `#${id}`, now));
        }
      }
      break;
    }
    case "agentToolStart": {
      const a = next.get(action.id);
      if (!a) break;
      const toolName = extractToolName(action.toolStatus);
      const entry: ToolHistoryEntry = {
        toolId: action.toolId,
        toolName,
        toolStatus: action.toolStatus,
        category: categorize(toolName),
        startedAt: now,
        doneAt: null,
      };
      const history = [...a.toolHistory, entry].slice(-HISTORY_CAP);
      next.set(action.id, {
        ...a,
        currentTool: entry,
        toolHistory: history,
        toolCallCount: a.toolCallCount + 1,
        status: READING_TOOLS.has(toolName) ? "active" : "active",
        lastActivityAt: now,
      });
      break;
    }
    case "agentToolDone": {
      const a = next.get(action.id);
      if (!a) break;
      const history = a.toolHistory.map((t) =>
        t.toolId === action.toolId ? { ...t, doneAt: now } : t,
      );
      const currentTool =
        a.currentTool && a.currentTool.toolId === action.toolId
          ? null
          : a.currentTool;
      next.set(action.id, {
        ...a,
        toolHistory: history,
        currentTool,
        lastActivityAt: now,
      });
      break;
    }
    case "agentToolsClear": {
      const a = next.get(action.id);
      if (!a) break;
      next.set(action.id, { ...a, currentTool: null, lastActivityAt: now });
      break;
    }
    case "agentStatus": {
      const a = next.get(action.id);
      if (!a) break;
      const status: AgentStatus =
        action.status === "active"
          ? "active"
          : action.status === "waiting"
            ? "waiting"
            : action.status === "permission"
              ? "permission"
              : "idle";
      next.set(action.id, { ...a, status, lastActivityAt: now });
      break;
    }
    case "agentToolPermission": {
      const a = next.get(action.id);
      if (!a) break;
      next.set(action.id, { ...a, status: "permission", lastActivityAt: now });
      break;
    }
    case "agentToolPermissionClear": {
      const a = next.get(action.id);
      if (!a) break;
      next.set(action.id, {
        ...a,
        status: a.currentTool ? "active" : "idle",
        lastActivityAt: now,
      });
      break;
    }
  }

  return { ...state, agents: next };
}

export function useAgentStream(): {
  agents: AgentSnapshot[];
  connected: boolean;
} {
  const [state, dispatch] = useReducer(reducer, {
    agents: new Map(),
    connected: false,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const es = new EventSource("/api/pixel-agents/events");

    es.onopen = () => dispatch({ type: "connected", value: true });
    es.onerror = () => dispatch({ type: "connected", value: false });

    es.onmessage = (evt) => {
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(evt.data);
      } catch {
        return;
      }
      const t = msg.type as string;
      if (t === "agentCreated")
        dispatch({
          type: "agentCreated",
          id: msg.id as number,
          folderName: msg.folderName as string | undefined,
        });
      else if (t === "agentClosed")
        dispatch({ type: "agentClosed", id: msg.id as number });
      else if (t === "existingAgents")
        dispatch({
          type: "existingAgents",
          ids: msg.agents as number[],
          folderNames: (msg.folderNames as Record<number, string>) ?? {},
        });
      else if (t === "agentToolStart")
        dispatch({
          type: "agentToolStart",
          id: msg.id as number,
          toolId: msg.toolId as string,
          toolStatus: msg.status as string,
        });
      else if (t === "agentToolDone")
        dispatch({
          type: "agentToolDone",
          id: msg.id as number,
          toolId: msg.toolId as string,
        });
      else if (t === "agentToolsClear")
        dispatch({ type: "agentToolsClear", id: msg.id as number });
      else if (t === "agentStatus")
        dispatch({
          type: "agentStatus",
          id: msg.id as number,
          status: msg.status as string,
        });
      else if (t === "agentToolPermission")
        dispatch({ type: "agentToolPermission", id: msg.id as number });
      else if (t === "agentToolPermissionClear")
        dispatch({ type: "agentToolPermissionClear", id: msg.id as number });
    };

    return () => es.close();
  }, []);

  const agents = useMemo(
    () => Array.from(state.agents.values()).sort((a, b) => a.id - b.id),
    [state.agents],
  );
  return { agents, connected: state.connected };
}
