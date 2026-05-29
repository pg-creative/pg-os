// Cockpit telemetry reader — the AUTHORITATIVE per-session vitals source.
//
// The global statusLine hook (~/.claude/statusline.sh) writes each session's
// full telemetry JSON to ~/.pg-os/sessions/<session_id>.json on every render.
// That payload is the ONLY reliable source for token/context/cost numbers —
// parsing .jsonl transcripts undercounts tokens ~46x, so we never do that here.
//
// Staleness is detected by file mtime (statusLine overwrites the file on every
// render, so mtime ≈ "last status-bar draw"). A session that exited leaves a
// stale file behind, so we treat anything older than LIVE_WINDOW_MS as ended.
// We never delete the files — their staleness IS the signal.

import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import os from "node:os";

const SESSIONS_DIR = path.join(os.homedir(), ".pg-os", "sessions");
const LIVE_WINDOW_MS = 5 * 60_000; // 5 min — matches sessions.ts active window

// ---- Raw statusLine payload shape (subset we consume) ----

interface RawTelemetry {
  session_id?: string;
  transcript_path?: string;
  cwd?: string;
  agent_type?: string;
  session_name?: string;
  effort?: { level?: string };
  model?: { id?: string; display_name?: string };
  workspace?: {
    current_dir?: string;
    project_dir?: string;
    git_worktree?: string;
  };
  version?: string;
  cost?: {
    total_cost_usd?: number;
    total_duration_ms?: number;
    total_api_duration_ms?: number;
    total_lines_added?: number;
    total_lines_removed?: number;
  };
  context_window?: {
    total_input_tokens?: number;
    total_output_tokens?: number;
    context_window_size?: number;
    used_percentage?: number;
    remaining_percentage?: number;
  };
  exceeds_200k_tokens?: boolean;
  fast_mode?: boolean;
  thinking?: { enabled?: boolean };
  rate_limits?: {
    five_hour?: { used_percentage?: number; resets_at?: number };
    seven_day?: { used_percentage?: number; resets_at?: number };
  };
  worktree?: {
    name?: string;
    path?: string;
    branch?: string;
    original_cwd?: string;
  };
}

// ---- Normalized shape the cockpit consumes ----

export interface RateWindow {
  usedPercentage: number;
  /** epoch seconds when the window resets */
  resetsAt: number | null;
}

export interface SessionTelemetry {
  sessionId: string;
  /** ms since the statusLine last wrote this file */
  ageMs: number;
  /** mtime of the telemetry file (ms) */
  renderedAtMs: number;
  /** age < LIVE_WINDOW_MS — the status bar drew recently */
  live: boolean;

  sessionName: string | null;
  modelId: string | null;
  modelName: string | null;
  agentType: string | null;
  effort: string | null;
  version: string | null;

  cwd: string | null;
  projectDir: string | null;
  /** short basename of cwd/project for display */
  projectLabel: string;
  worktree: string | null;
  branch: string | null;
  transcriptPath: string | null;

  contextUsedPct: number;
  contextWindowSize: number | null;
  exceeds200k: boolean;
  inputTokens: number | null;
  outputTokens: number | null;

  costUsd: number;
  durationMs: number | null;
  apiDurationMs: number | null;
  linesAdded: number | null;
  linesRemoved: number | null;

  fastMode: boolean;
  thinking: boolean;

  fiveHour: RateWindow | null;
  sevenDay: RateWindow | null;
}

function basenameOf(p?: string | null): string {
  if (!p) return "";
  const trimmed = p.replace(/\/+$/, "");
  const seg = trimmed.split("/").filter(Boolean);
  return seg[seg.length - 1] ?? "";
}

function normalize(
  raw: RawTelemetry,
  fileSessionId: string,
  renderedAtMs: number,
): SessionTelemetry {
  const ageMs = Date.now() - renderedAtMs;
  const cwd = raw.workspace?.current_dir ?? raw.cwd ?? null;
  const projectDir = raw.workspace?.project_dir ?? null;
  // Prefer worktree.original_cwd basename so worktree sessions group under their
  // real project name rather than a ".claude/worktrees/<x>" leaf.
  const projectLabel =
    basenameOf(raw.worktree?.original_cwd) ||
    basenameOf(projectDir) ||
    basenameOf(cwd) ||
    fileSessionId.slice(0, 8);

  const mapWindow = (
    w?: { used_percentage?: number; resets_at?: number },
  ): RateWindow | null =>
    w
      ? {
          usedPercentage: w.used_percentage ?? 0,
          resetsAt: w.resets_at ?? null,
        }
      : null;

  return {
    sessionId: raw.session_id ?? fileSessionId,
    ageMs,
    renderedAtMs,
    live: ageMs < LIVE_WINDOW_MS,

    sessionName: raw.session_name ?? null,
    modelId: raw.model?.id ?? null,
    modelName: raw.model?.display_name ?? null,
    agentType: raw.agent_type ?? null,
    effort: raw.effort?.level ?? null,
    version: raw.version ?? null,

    cwd,
    projectDir,
    projectLabel,
    worktree: raw.worktree?.name ?? raw.workspace?.git_worktree ?? null,
    branch: raw.worktree?.branch ?? null,
    transcriptPath: raw.transcript_path ?? null,

    contextUsedPct: raw.context_window?.used_percentage ?? 0,
    contextWindowSize: raw.context_window?.context_window_size ?? null,
    exceeds200k: raw.exceeds_200k_tokens ?? false,
    inputTokens: raw.context_window?.total_input_tokens ?? null,
    outputTokens: raw.context_window?.total_output_tokens ?? null,

    costUsd: raw.cost?.total_cost_usd ?? 0,
    durationMs: raw.cost?.total_duration_ms ?? null,
    apiDurationMs: raw.cost?.total_api_duration_ms ?? null,
    linesAdded: raw.cost?.total_lines_added ?? null,
    linesRemoved: raw.cost?.total_lines_removed ?? null,

    fastMode: raw.fast_mode ?? false,
    thinking: raw.thinking?.enabled ?? false,

    fiveHour: mapWindow(raw.rate_limits?.five_hour),
    sevenDay: mapWindow(raw.rate_limits?.seven_day),
  };
}

/**
 * Read every telemetry file in ~/.pg-os/sessions. By default returns only
 * "live" sessions (status bar drawn within LIVE_WINDOW_MS); pass
 * { includeStale: true } to get everything (e.g. a recent-sessions history).
 * Sorted most-recently-rendered first.
 */
export async function readSessionTelemetry(
  opts: { includeStale?: boolean } = {},
): Promise<SessionTelemetry[]> {
  if (!fs.existsSync(SESSIONS_DIR)) return [];

  let files: string[];
  try {
    files = await fsp.readdir(SESSIONS_DIR);
  } catch {
    return [];
  }

  const out: SessionTelemetry[] = [];
  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    const full = path.join(SESSIONS_DIR, file);
    let st: fs.Stats;
    try {
      st = await fsp.stat(full);
    } catch {
      continue;
    }
    if (!st.isFile()) continue;

    let raw: RawTelemetry;
    try {
      const txt = await fsp.readFile(full, "utf8");
      raw = JSON.parse(txt) as RawTelemetry;
    } catch {
      continue; // mid-write or malformed — skip this tick
    }

    const fileSessionId = file.replace(/\.json$/, "");
    const t = normalize(raw, fileSessionId, st.mtimeMs);
    if (!opts.includeStale && !t.live) continue;
    out.push(t);
  }

  out.sort((a, b) => b.renderedAtMs - a.renderedAtMs);
  return out;
}

/** Look up a single session's telemetry by id (live or stale). */
export async function getSessionTelemetry(
  sessionId: string,
): Promise<SessionTelemetry | null> {
  const full = path.join(SESSIONS_DIR, `${sessionId}.json`);
  try {
    const st = await fsp.stat(full);
    const raw = JSON.parse(await fsp.readFile(full, "utf8")) as RawTelemetry;
    return normalize(raw, sessionId, st.mtimeMs);
  } catch {
    return null;
  }
}
