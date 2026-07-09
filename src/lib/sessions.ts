// Live Claude Code session detection — scan ~/.claude/projects/*/sessions/*.jsonl
// for jsonl files modified within the last N minutes. Tail-read the file
// (cheap, last 64KB) so large transcripts don't blow context.

import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import os from "node:os";

const PROJECTS_ROOT = path.join(os.homedir(), ".claude", "projects");
const ACTIVE_WINDOW_MS = 5 * 60_000; // 5 min
const TAIL_BYTES = 64 * 1024; // 64KB

export type LiveSession = {
  id: string;
  project: string; // human-readable folder name
  rawPath: string; // original encoded folder
  lastActivity: string; // ISO
  lastActivityMs: number;
  status: "running" | "idle";
  lastUserMsg?: string;
  lastAssistantText?: string;
  currentTool?: string;
  fileSize: number;
};

function decodeProjectName(encoded: string): string {
  // Claude Code encodes project paths like "-Users-patricksmith2x-pg-foo-bar".
  // Split on "-" and rejoin with "/" gives a Unix path; we only need the
  // last segment for display.
  if (!encoded.startsWith("-")) return encoded;
  const parts = encoded.slice(1).split("-");
  return parts[parts.length - 1] || encoded;
}

async function tailRead(filePath: string, bytes: number): Promise<string> {
  const stat = await fsp.stat(filePath);
  const start = Math.max(0, stat.size - bytes);
  const fd = await fsp.open(filePath, "r");
  try {
    const buf = Buffer.alloc(stat.size - start);
    await fd.read(buf, 0, buf.length, start);
    return buf.toString("utf8");
  } finally {
    await fd.close();
  }
}

type Turn = {
  type?: string;
  message?: { role?: string; content?: unknown };
  toolUseResult?: unknown;
};

function parseTurns(tail: string): Turn[] {
  // Tail-read may chop the first line — drop it.
  const lines = tail.split("\n").slice(1);
  const turns: Turn[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      turns.push(JSON.parse(trimmed) as Turn);
    } catch {
      /* skip malformed */
    }
  }
  return turns;
}

function pluckLastUserMsg(turns: Turn[]): string | undefined {
  for (let i = turns.length - 1; i >= 0; i--) {
    const t = turns[i];
    if (t?.message?.role === "user") {
      const content = t.message.content;
      if (typeof content === "string") return content.slice(0, 140);
      if (Array.isArray(content)) {
        const first = content.find(
          (c) => typeof c === "object" && c && "text" in c,
        );
        if (first && typeof first === "object" && "text" in first) {
          const txt = (first as { text?: unknown }).text;
          if (typeof txt === "string") return txt.slice(0, 140);
        }
      }
    }
  }
  return undefined;
}

function pluckCurrentTool(turns: Turn[]): string | undefined {
  // Look for an unmatched tool_use (no following tool_result with same id).
  // For tail-read we just pluck the most recent tool_use name.
  for (let i = turns.length - 1; i >= 0; i--) {
    const content = turns[i]?.message?.content;
    if (Array.isArray(content)) {
      for (const c of content) {
        if (
          typeof c === "object" &&
          c &&
          "type" in c &&
          (c as { type?: string }).type === "tool_use"
        ) {
          const name = (c as { name?: string }).name;
          if (typeof name === "string") return name;
        }
      }
    }
  }
  return undefined;
}

export async function listLiveSessions(): Promise<LiveSession[]> {
  if (!fs.existsSync(PROJECTS_ROOT)) return [];
  const cutoff = Date.now() - ACTIVE_WINDOW_MS;
  const out: LiveSession[] = [];

  let projectDirs: string[];
  try {
    projectDirs = await fsp.readdir(PROJECTS_ROOT);
  } catch {
    return [];
  }

  for (const projectFolder of projectDirs) {
    const sessionsDir = path.join(PROJECTS_ROOT, projectFolder);
    let stat;
    try {
      stat = await fsp.stat(sessionsDir);
    } catch {
      continue;
    }
    if (!stat.isDirectory()) continue;

    let files: string[];
    try {
      files = await fsp.readdir(sessionsDir);
    } catch {
      continue;
    }

    for (const file of files) {
      if (!file.endsWith(".jsonl")) continue;
      const full = path.join(sessionsDir, file);
      let st;
      try {
        st = await fsp.stat(full);
      } catch {
        continue;
      }
      if (st.mtimeMs < cutoff) continue;

      let lastUserMsg: string | undefined;
      let currentTool: string | undefined;
      try {
        const tail = await tailRead(full, TAIL_BYTES);
        const turns = parseTurns(tail);
        lastUserMsg = pluckLastUserMsg(turns);
        currentTool = pluckCurrentTool(turns);
      } catch {
        /* unable to parse — keep entry without details */
      }

      const ageMs = Date.now() - st.mtimeMs;
      out.push({
        id: file.replace(/\.jsonl$/, ""),
        project: decodeProjectName(projectFolder),
        rawPath: projectFolder,
        lastActivity: new Date(st.mtimeMs).toISOString(),
        lastActivityMs: st.mtimeMs,
        status: ageMs < 60_000 ? "running" : "idle",
        lastUserMsg,
        currentTool,
        fileSize: st.size,
      });
    }
  }

  out.sort((a, b) => b.lastActivityMs - a.lastActivityMs);
  return out;
}
