import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

const SI_DIR = path.join(os.homedir(), ".claude", "self-improvement", "data");
const FINDINGS_DIR = path.join(SI_DIR, "findings");
const COWORK_SIGNALS = path.join(os.homedir(), ".pg-os", "claude", "cowork-signals.jsonl");

export type Signal = {
  signals: string[];
  signal_details: Array<{ type: string; pattern: string }>;
  user_text: string;
  assistant_context: string;
  timestamp: string;
  session_id: string;
  project: string;
  source?: "claude-code" | "cowork";
};

export type SessionStats = {
  session_id: string;
  project: string;
  user_messages: number;
  assistant_messages: number;
  duration_minutes: number;
  corrections: number;
  confirmations: number;
  frictions: number;
  skill_invocations: number;
  skills_used: string[];
};

export type Proposal = {
  type: string;
  category: string;
  description: string;
  evidence: string;
  date: string;
  source: string;
  occurrences: number;
};

export type TrustCategory = {
  approvals: number;
  rejections: number;
  auto_execute: boolean;
  threshold: number;
  history: Array<{ date: string; action: string; proposal: string; by: string }>;
};

export type TrustState = {
  categories: Record<string, TrustCategory>;
  last_updated: string;
};

export type SkillEvent = {
  timestamp: string;
  skill: string;
  event: string;
};

function dateStrings(days: number): string[] {
  const out: string[] = [];
  const now = new Date();
  for (let i = 0; i < days; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

async function readJsonlLines<T>(filePath: string): Promise<T[]> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const out: T[] = [];
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        out.push(JSON.parse(trimmed) as T);
      } catch {
        /* skip malformed line */
      }
    }
    return out;
  } catch {
    return [];
  }
}

export async function getProposals(): Promise<Proposal[]> {
  try {
    const raw = await fs.readFile(path.join(SI_DIR, "pending-proposals.json"), "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Proposal[]) : [];
  } catch {
    return [];
  }
}

export async function writeProposals(proposals: Proposal[]): Promise<void> {
  const target = path.join(SI_DIR, "pending-proposals.json");
  const tmp = `${target}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(proposals, null, 2), { mode: 0o600 });
  await fs.rename(tmp, target);
}

export async function getTrustState(): Promise<TrustState | null> {
  try {
    const raw = await fs.readFile(path.join(SI_DIR, "trust-state.json"), "utf8");
    return JSON.parse(raw) as TrustState;
  } catch {
    return null;
  }
}

export async function writeTrustState(state: TrustState): Promise<void> {
  const target = path.join(SI_DIR, "trust-state.json");
  const tmp = `${target}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(state, null, 2), { mode: 0o600 });
  await fs.rename(tmp, target);
}

export async function getRecentFindings(days = 7): Promise<Signal[]> {
  const dates = dateStrings(days);
  const all: Signal[] = [];
  for (const date of dates) {
    for (const prefix of ["", "backfill-"]) {
      const file = path.join(FINDINGS_DIR, `${prefix}${date}.jsonl`);
      const rows = await readJsonlLines<Signal>(file);
      for (const r of rows) all.push({ ...r, source: "claude-code" });
    }
  }
  // Cowork signals (merged, filtered to date range)
  const cowork = await readJsonlLines<Signal>(COWORK_SIGNALS);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  for (const r of cowork) {
    try {
      if (new Date(r.timestamp) >= cutoff) all.push({ ...r, source: "cowork" });
    } catch {
      /* skip bad timestamp */
    }
  }
  return all;
}

export async function getRecentStats(days = 7): Promise<SessionStats[]> {
  const dates = dateStrings(days);
  const all: SessionStats[] = [];
  for (const date of dates) {
    for (const prefix of ["", "backfill-"]) {
      const file = path.join(FINDINGS_DIR, `${prefix}${date}-stats.json`);
      try {
        const raw = await fs.readFile(file, "utf8");
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) all.push(...(arr as SessionStats[]));
      } catch {
        /* missing file is fine */
      }
    }
  }
  return all;
}

export async function getSkillPerformance(limit = 100): Promise<SkillEvent[]> {
  const rows = await readJsonlLines<SkillEvent>(path.join(SI_DIR, "skill-performance.jsonl"));
  return rows.slice(-limit);
}

export async function getReviewLog(lines = 30): Promise<string> {
  try {
    const raw = await fs.readFile(path.join(SI_DIR, "review-log.md"), "utf8");
    const all = raw.split("\n");
    return all.slice(-lines).join("\n");
  } catch {
    return "";
  }
}

export async function getActiveRules(): Promise<string[]> {
  const rulesDir = path.join(os.homedir(), ".claude", "rules");
  try {
    const files = await fs.readdir(rulesDir);
    return files.filter((f) => f.endsWith(".md")).sort();
  } catch {
    return [];
  }
}
