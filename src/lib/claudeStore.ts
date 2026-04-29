import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { db, isDbConfigured, T } from "./db";

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
  // Local file first (laptop dev). Fall back to Supabase mirror (Vercel prod).
  try {
    const raw = await fs.readFile(path.join(SI_DIR, "pending-proposals.json"), "utf8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as Proposal[];
  } catch {
    /* fall through to supabase */
  }
  if (!isDbConfigured()) return [];
  try {
    const { data, error } = await db()
      .from(T.proposals_log)
      .select("proposal_type, category, description, evidence, source, occurrences, proposed_at, action")
      .is("action", null) // only pending
      .order("proposed_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    return (data ?? []).map((r) => ({
      type: r.proposal_type,
      category: r.category,
      description: r.description,
      evidence: r.evidence ?? undefined,
      source: r.source ?? undefined,
      occurrences: r.occurrences ?? 1,
      date: r.proposed_at,
    })) as Proposal[];
  } catch (e) {
    console.error("getProposals supabase fallback failed:", e);
    return [];
  }
}

export async function writeProposals(proposals: Proposal[]): Promise<void> {
  const target = path.join(SI_DIR, "pending-proposals.json");
  const tmp = `${target}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(proposals, null, 2), { mode: 0o600 });
  await fs.rename(tmp, target);
  // Fire-and-forget mirror to Supabase. Keeps proposals_log in sync with the
  // file-backed source of truth that agents append to.
  if (isDbConfigured()) {
    mirrorProposalsToSupabase(proposals).catch((e) =>
      console.error("claudeStore mirror failed:", e),
    );
  }
}

async function mirrorProposalsToSupabase(proposals: Proposal[]): Promise<void> {
  // For each proposal still pending, upsert into proposals_log (action=null).
  // We don't delete rows — historical proposals persist with their action.
  const rows = proposals.map((p) => ({
    proposal_type: p.type,
    category: p.category,
    description: p.description,
    evidence: p.evidence ?? null,
    source: p.source ?? null,
    occurrences: p.occurrences ?? 1,
    proposed_at: new Date(p.date).toISOString(),
    action: null,
  }));
  if (rows.length === 0) return;
  // Upsert by (description, proposed_at) — natural key for dedup
  await db().from(T.proposals_log).upsert(rows, {
    onConflict: "description,proposed_at",
    ignoreDuplicates: true,
  });
}

export async function getTrustState(): Promise<TrustState | null> {
  // Local file first. Fall back to Supabase mirror.
  try {
    const raw = await fs.readFile(path.join(SI_DIR, "trust-state.json"), "utf8");
    return JSON.parse(raw) as TrustState;
  } catch {
    /* fall through to supabase */
  }
  if (!isDbConfigured()) return null;
  try {
    const { data, error } = await db()
      .from(T.trust_categories)
      .select("category, approvals, rejections, threshold, auto_execute, history");
    if (error) throw error;
    if (!data || data.length === 0) return null;
    const categories: TrustState["categories"] = {};
    for (const row of data) {
      categories[row.category] = {
        approvals: row.approvals ?? 0,
        rejections: row.rejections ?? 0,
        threshold: row.threshold ?? 5,
        auto_execute: row.auto_execute ?? false,
        history: (row.history ?? []) as TrustState["categories"][string]["history"],
      };
    }
    return { categories, last_updated: new Date().toISOString() };
  } catch (e) {
    console.error("getTrustState supabase fallback failed:", e);
    return null;
  }
}

export async function writeTrustState(state: TrustState): Promise<void> {
  const target = path.join(SI_DIR, "trust-state.json");
  const tmp = `${target}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(state, null, 2), { mode: 0o600 });
  await fs.rename(tmp, target);
  if (isDbConfigured()) {
    mirrorTrustToSupabase(state).catch((e) =>
      console.error("claudeStore trust mirror failed:", e),
    );
  }
}

async function mirrorTrustToSupabase(state: TrustState): Promise<void> {
  const rows = Object.entries(state.categories).map(([category, cat]) => ({
    category,
    approvals: cat.approvals,
    rejections: cat.rejections,
    threshold: cat.threshold,
    auto_execute: cat.auto_execute,
    history: cat.history,
    updated_at: new Date().toISOString(),
  }));
  if (rows.length === 0) return;
  await db().from(T.trust_categories).upsert(rows, { onConflict: "category" });
}

export async function logDecision(payload: {
  kind: string;
  ref_id?: string;
  detail?: Record<string, unknown>;
  taken_by?: string;
  followup_days?: number;
}): Promise<void> {
  if (!isDbConfigured()) return;
  const followupAt = payload.followup_days
    ? new Date(Date.now() + payload.followup_days * 86_400_000).toISOString()
    : null;
  try {
    await db().from(T.decisions_log).insert({
      kind: payload.kind,
      ref_id: payload.ref_id ?? null,
      detail: payload.detail ?? {},
      taken_at: new Date().toISOString(),
      taken_by: payload.taken_by ?? "pg",
      followup_at: followupAt,
    });
  } catch (e) {
    console.error("logDecision failed:", e);
  }
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
