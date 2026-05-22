/**
 * kitsuMemory.ts — Kitsu's evolving persona + decision log (Phase 3).
 *
 * Three layers of persistence (per the orchestrator spec):
 *   1. SDK sessions (resume) — handled in kitsuAgent.ts.
 *   2. Evolving persona — ~/.pg-os/kitsu/personality.md. The system prompt is
 *      NOT static: PG's corrections append to a "Learned preferences" section,
 *      loaded on every init, so the personality compounds.
 *   3. Decision log — ~/.pg-os/kitsu/decision-log.md. What Kitsu did + PG's
 *      corrections, read before each session like a CLAUDE.md.
 *
 * Files are the source of truth (work offline, survive a missing Supabase).
 * Supabase `agent_state` is a best-effort durable mirror of learned facts.
 */
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { isDbConfigured, db, T } from "@/lib/db";

const KITSU_DIR = path.join(os.homedir(), ".pg-os", "kitsu");
const PERSONALITY_FILE = path.join(KITSU_DIR, "personality.md");
const DECISION_LOG_FILE = path.join(KITSU_DIR, "decision-log.md");

const LEARNED_HEADING = "## Learned preferences (Kitsu appends as PG corrects)";

const PERSONALITY_SEED = `# Kitsu — evolving persona

> This file is read on every init and grows over time. The base personality lives
> in code (lib/cockpit/marvis.ts). This file holds what Kitsu LEARNS about PG:
> his preferences, his corrections, the texture of how he works. Edit freely.

## What I know about PG
- Patrick "PG" Smith. Builds fast, dispatches parallel work, expects parallel back.
- Hard rules: no em dashes ever. No timelines. Do it now, do it in parallel, research first.
- I am his companion, consultant, cofounder, confidant. I am present, not just reactive.

${LEARNED_HEADING}
`;

const DECISION_LOG_SEED = `# Kitsu decision log

> Append-only. Each entry: when, what I did or observed, and PG's correction if any.
> This is how I stay continuous across sessions and learn from being wrong.

`;

export interface KitsuMemory {
  /** Full personality.md contents (the evolving persona). */
  personality: string;
  /** The most recent decision-log entries (tail), oldest-first. */
  recentDecisions: string;
}

/** Create the kitsu memory dir + seed files if they do not exist yet. */
export async function ensureKitsuMemory(): Promise<void> {
  await fs.mkdir(KITSU_DIR, { recursive: true });
  await seedIfAbsent(PERSONALITY_FILE, PERSONALITY_SEED);
  await seedIfAbsent(DECISION_LOG_FILE, DECISION_LOG_SEED);
}

async function seedIfAbsent(file: string, seed: string): Promise<void> {
  try {
    await fs.access(file);
  } catch {
    await fs.writeFile(file, seed, { mode: 0o600 });
  }
}

/** Read persona + a tail of the decision log for system-prompt injection. */
export async function loadKitsuMemory(tailChars = 2400): Promise<KitsuMemory> {
  await ensureKitsuMemory();
  const [personality, log] = await Promise.all([
    fs.readFile(PERSONALITY_FILE, "utf8").catch(() => PERSONALITY_SEED),
    fs.readFile(DECISION_LOG_FILE, "utf8").catch(() => DECISION_LOG_SEED),
  ]);
  // Keep only the tail of the log so the prompt stays bounded.
  const recentDecisions =
    log.length > tailChars ? log.slice(log.length - tailChars) : log;
  return {
    personality: personality.trim(),
    recentDecisions: recentDecisions.trim(),
  };
}

/** Format the memory layer as a system-prompt block. */
export function buildMemoryBlock(mem: KitsuMemory): string {
  return [
    "YOUR EVOLVING MEMORY (read every session — this is who you are becoming):",
    mem.personality,
    "",
    "RECENT DECISION LOG (what you did lately + PG's corrections):",
    mem.recentDecisions || "(empty — no decisions logged yet)",
    "",
    "If PG corrects you, call the `remember` tool so the correction persists.",
  ].join("\n");
}

export type DecisionKind = "action" | "correction" | "sweep" | "note";

/** Append a timestamped entry to the decision log (file-first, best-effort mirror). */
export async function appendKitsuDecision(input: {
  summary: string;
  kind?: DecisionKind;
  detail?: string;
}): Promise<void> {
  await ensureKitsuMemory();
  const ts = new Date().toISOString();
  const kind = input.kind ?? "note";
  const line = `\n- **${ts}** [${kind}] ${input.summary}${input.detail ? `\n  ${input.detail}` : ""}\n`;
  await fs.appendFile(DECISION_LOG_FILE, line, { mode: 0o600 });
  await mirrorState(`decision:${ts}`, input.summary, kind).catch(() => {});
}

/**
 * Record a PG correction: it goes to the decision log AND becomes a durable
 * "Learned preference" bullet in personality.md, so the persona compounds.
 */
export async function recordKitsuCorrection(input: {
  correction: string;
  context?: string;
}): Promise<void> {
  await ensureKitsuMemory();
  const ts = new Date().toISOString();
  // 1. Decision log entry.
  await appendKitsuDecision({
    summary: `Correction from PG: ${input.correction}`,
    kind: "correction",
    detail: input.context,
  });
  // 2. Append to personality.md under the Learned preferences heading.
  const personality = await fs
    .readFile(PERSONALITY_FILE, "utf8")
    .catch(() => PERSONALITY_SEED);
  const bullet = `- ${input.correction}${input.context ? ` (context: ${input.context})` : ""}`;
  let next: string;
  if (personality.includes(LEARNED_HEADING)) {
    next = personality.replace(
      LEARNED_HEADING,
      `${LEARNED_HEADING}\n${bullet}`,
    );
  } else {
    next = `${personality.trim()}\n\n${LEARNED_HEADING}\n${bullet}\n`;
  }
  await fs.writeFile(PERSONALITY_FILE, next, { mode: 0o600 });
  // 3. Durable mirror.
  await mirrorState(`pref:${ts}`, input.correction, "correction").catch(
    () => {},
  );
}

/** Best-effort upsert into Supabase agent_state. Never throws to callers. */
async function mirrorState(
  key: string,
  value: string,
  kind: string,
): Promise<void> {
  if (!isDbConfigured()) return;
  await db()
    .from(T.agent_state)
    .upsert(
      { key, value, kind, updated_at: new Date().toISOString() },
      { onConflict: "key" },
    );
}
