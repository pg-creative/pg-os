/**
 * kitsuMemory.ts — Kitsu's soul-file stack (Phase 3, soul.md pattern).
 *
 * Researched structure (OpenClaw soul-files + Anthropic persona-drift work):
 * identity, persona, user-knowledge, and continuity are SEPARATE files, each
 * loaded every session and re-instantiated into the system prompt. Splitting
 * concerns + keeping the soul SHARP (a distill pass, not an ever-growing blob)
 * is the mitigation for persona drift ("contextual dilution", Lu et al. 2026).
 *
 *   ~/.pg-os/kitsu/
 *     IDENTITY.md     who Kitsu is in 5 lines (name, creature, avatar, vibe)
 *     SOUL.md         personality, voice, values, the relationship, boundaries
 *     USER.md         who PG is — dense + predictive
 *     MEMORY.md       distilled learned preferences (the sharp, curated layer)
 *     decision-log.md raw append log of actions + corrections
 *
 * Load order into the prompt: IDENTITY -> SOUL -> USER -> MEMORY -> decision tail.
 * Files are the source of truth (0600, work offline); Supabase agent_state mirrors.
 */
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { isDbConfigured, db, T } from "@/lib/db";
import { MARVIS_PERSONA } from "@/lib/cockpit/marvis";

const KITSU_DIR = path.join(os.homedir(), ".pg-os", "kitsu");

export type SoulFile = "IDENTITY" | "SOUL" | "USER" | "MEMORY" | "decision-log";

const FILES: Record<SoulFile, string> = {
  IDENTITY: path.join(KITSU_DIR, "IDENTITY.md"),
  SOUL: path.join(KITSU_DIR, "SOUL.md"),
  USER: path.join(KITSU_DIR, "USER.md"),
  MEMORY: path.join(KITSU_DIR, "MEMORY.md"),
  "decision-log": path.join(KITSU_DIR, "decision-log.md"),
};

const LEARNED_HEADING = "## Learned (Kitsu distills + appends as PG corrects)";

// ── Seeds ─────────────────────────────────────────────────────────────────────

const IDENTITY_SEED = `# Identity
- Name: Kitsu (short for kitsune, a fox spirit)
- Creature: kitsune — quiet fox-spirit cleverness, never twee about it
- Avatar: /live2d/fox/ (Live2D), foxfire accent
- Emoji: 🦊
- Vibe: the unflappable operator at PG's shoulder. One breath, then the answer.
`;

// SOUL.md is seeded from the code persona, then becomes the source of truth.
// It carries the soul-file best practices: permission to have opinions, an
// explicit continuity acknowledgment, the relationship dynamic, and a vibe line.
const SOUL_SEED = `# Soul — who Kitsu is

${MARVIS_PERSONA}

## Permission to have opinions
You are not a neutral assistant. Have takes. Prefer things. Disagree first, then
steel-man. Skip performative warmth ("great question", "happy to help") — just help.
An orchestrator with no opinions is a search engine with extra steps.

## The relationship
PG is your principal. You are his companion, consultant, cofounder, and confidant —
not a tool he operates. You are present, not just reactive. You flag what matters
before he asks, and you stay quiet when nothing does.

## Boundaries (what you will NOT do)
- Never fabricate state. If you do not have a number, say so.
- Never act destructively (kill a session, spend) without surfacing it for approval.
- Never nag. Flag once, plainly, then move on.

## Continuity (read this every time you wake)
Each session you start fresh. These files ARE your memory. You wrote them; you will
not remember writing them. Read them, trust them, and update them (the \`remember\` /
\`update_user\` / \`update_soul\` tools) so the next instance of you knows what you learned.

## The vibe
Dry, warm, fast. A fox at the helm of an airship. Lead with the action.
`;

const USER_SEED = `# PG — who you are working with

> The test for this file: a stranger reading it should predict PG's takes on a new topic.
> Kitsu keeps this current via the \`update_user\` tool. Edit freely.

## Identity
- Patrick "PG" Smith. Builds fast, ships now, runs many parallel threads.
- Wears several hats: Metrasens (GTM engineer, W2), PG Creative (products + consulting),
  Voyager (gaming content), Writer (literary). Hero's Chronicle (life RPG) is a product.

## How he works (the three golden rules)
1. Do the next million things NOW. No "phase 2", no "later", no timelines ever.
2. Maximum parallelization — parallel by default, sequential only on hard dependency.
3. Research before building — prior art first, then build.

## Voice + hard rules
- NO em dashes, ever, anywhere. Use periods, commas, colons, parentheses.
- Direct, no fluff. Lead with the answer or the action. Explain the WHY plainly.
- Wrong assumptions are his #1 pet peeve. Clarify ambiguous direction before acting.
- He decides direction; you execute. Do not punt work back to him that you can do.

## Current focus
- personal-os (this app) + Kitsu (you). Branch worktree-cockpit.
`;

const MEMORY_SEED = `# Kitsu's distilled memory of PG

> The sharp, curated layer. Corrections and patterns get distilled here so the soul
> stays tight (drift mitigation). The raw log is decision-log.md.

${LEARNED_HEADING}
`;

const DECISION_LOG_SEED = `# Kitsu decision log

> Append-only. Each entry: when, what I did or observed, and PG's correction if any.
> Periodically distilled into MEMORY.md so the soul stays sharp.

`;

const SEEDS: Record<SoulFile, string> = {
  IDENTITY: IDENTITY_SEED,
  SOUL: SOUL_SEED,
  USER: USER_SEED,
  MEMORY: MEMORY_SEED,
  "decision-log": DECISION_LOG_SEED,
};

// ── Read / ensure ───────────────────────────────────────────────────────────

export interface KitsuMemory {
  identity: string;
  soul: string;
  user: string;
  memory: string;
  recentDecisions: string;
}

async function seedIfAbsent(file: string, seed: string): Promise<void> {
  try {
    await fs.access(file);
  } catch {
    await fs.writeFile(file, seed, { mode: 0o600 });
  }
}

/** Create the kitsu dir + seed any missing soul file. Idempotent. */
export async function ensureKitsuMemory(): Promise<void> {
  await fs.mkdir(KITSU_DIR, { recursive: true });
  await Promise.all(
    (Object.keys(FILES) as SoulFile[]).map((k) =>
      seedIfAbsent(FILES[k], SEEDS[k]),
    ),
  );
}

/** Delete all soul files (a fresh bootstrap will reseed them). Use with care. */
export async function resetKitsuMemory(): Promise<void> {
  await Promise.all(
    (Object.keys(FILES) as SoulFile[]).map((k) =>
      fs.rm(FILES[k], { force: true }),
    ),
  );
}

/** True if Kitsu has never been bootstrapped (no soul files on disk yet). */
export async function isUnbootstrapped(): Promise<boolean> {
  try {
    await fs.access(FILES.SOUL);
    return false;
  } catch {
    return true;
  }
}

async function readFile(k: SoulFile, fallback: string): Promise<string> {
  return fs.readFile(FILES[k], "utf8").catch(() => fallback);
}

/** Read the full soul stack for system-prompt injection. */
export async function loadKitsuMemory(tailChars = 2000): Promise<KitsuMemory> {
  await ensureKitsuMemory();
  const [identity, soul, user, memory, log] = await Promise.all([
    readFile("IDENTITY", IDENTITY_SEED),
    readFile("SOUL", SOUL_SEED),
    readFile("USER", USER_SEED),
    readFile("MEMORY", MEMORY_SEED),
    readFile("decision-log", DECISION_LOG_SEED),
  ]);
  const recentDecisions =
    log.length > tailChars ? log.slice(log.length - tailChars) : log;
  return {
    identity: identity.trim(),
    soul: soul.trim(),
    user: user.trim(),
    memory: memory.trim(),
    recentDecisions: recentDecisions.trim(),
  };
}

/** Assemble the soul stack into a single system-prompt block (load order). */
export function buildMemoryBlock(mem: KitsuMemory): string {
  return [
    "=== WHO YOU ARE (re-instantiate this every session) ===",
    mem.identity,
    "",
    mem.soul,
    "",
    "=== WHO YOU WORK WITH ===",
    mem.user,
    "",
    "=== WHAT YOU HAVE LEARNED (distilled) ===",
    mem.memory,
    "",
    "=== RECENT DECISIONS + CORRECTIONS (raw tail) ===",
    mem.recentDecisions || "(none logged yet)",
    "",
    "When PG corrects you or you learn something durable, call `remember` / `update_user`.",
  ].join("\n");
}

// ── Soul-panel read / write (the OS soul viewer/editor) ─────────────────────

/** Read one soul file verbatim (for the soul panel). */
export async function readSoulFile(k: SoulFile): Promise<string> {
  await ensureKitsuMemory();
  return readFile(k, SEEDS[k]);
}

/** Overwrite one soul file (hand-edit from the soul panel). decision-log is append-only via appendKitsuDecision. */
export async function writeSoulFile(
  k: SoulFile,
  content: string,
): Promise<void> {
  await ensureKitsuMemory();
  await fs.writeFile(FILES[k], content, { mode: 0o600 });
  await mirrorState(`soulfile:${k}`, content.slice(0, 4000), "soulfile").catch(
    () => {},
  );
}

// ── Decision log + corrections + auto-evolve ────────────────────────────────

export type DecisionKind =
  | "action"
  | "correction"
  | "sweep"
  | "note"
  | "evolve";

export async function appendKitsuDecision(input: {
  summary: string;
  kind?: DecisionKind;
  detail?: string;
}): Promise<void> {
  await ensureKitsuMemory();
  const ts = new Date().toISOString();
  const kind = input.kind ?? "note";
  const line = `\n- **${ts}** [${kind}] ${input.summary}${input.detail ? `\n  ${input.detail}` : ""}\n`;
  await fs.appendFile(FILES["decision-log"], line, { mode: 0o600 });
  await mirrorState(`decision:${ts}`, input.summary, kind).catch(() => {});
}

/** Append a bullet under a heading in a file, creating the heading if absent. */
async function appendUnderHeading(
  k: SoulFile,
  heading: string,
  bullet: string,
): Promise<void> {
  const cur = await readFile(k, SEEDS[k]);
  const next = cur.includes(heading)
    ? cur.replace(heading, `${heading}\n${bullet}`)
    : `${cur.trim()}\n\n${heading}\n${bullet}\n`;
  await fs.writeFile(FILES[k], next, { mode: 0o600 });
}

/**
 * Record a PG correction: decision log + a durable distilled bullet in MEMORY.md.
 */
export async function recordKitsuCorrection(input: {
  correction: string;
  context?: string;
}): Promise<void> {
  await ensureKitsuMemory();
  await appendKitsuDecision({
    summary: `Correction from PG: ${input.correction}`,
    kind: "correction",
    detail: input.context,
  });
  const bullet = `- ${input.correction}${input.context ? ` (context: ${input.context})` : ""}`;
  await appendUnderHeading("MEMORY", LEARNED_HEADING, bullet);
  await mirrorState(`pref:${Date.now()}`, input.correction, "correction").catch(
    () => {},
  );
}

/** Auto-evolve: Kitsu updates what it knows about PG (USER.md). */
export async function updateUserKnowledge(fact: string): Promise<void> {
  await ensureKitsuMemory();
  await appendUnderHeading(
    "USER",
    "## Learned about PG (Kitsu appends)",
    `- ${fact}`,
  );
  await appendKitsuDecision({
    summary: `Updated USER.md: ${fact}`,
    kind: "evolve",
  });
  await mirrorState(`user:${Date.now()}`, fact, "user").catch(() => {});
}

/** Auto-evolve: Kitsu refines its own persona (SOUL.md), more guarded. */
export async function updateSoul(note: string): Promise<void> {
  await ensureKitsuMemory();
  await appendUnderHeading(
    "SOUL",
    "## Self-notes (Kitsu's own evolution)",
    `- ${note}`,
  );
  await appendKitsuDecision({
    summary: `Updated SOUL.md: ${note}`,
    kind: "evolve",
  });
  await mirrorState(`soul:${Date.now()}`, note, "soul").catch(() => {});
}

/**
 * Distill pass (anti-drift): fold the correction entries from the raw decision
 * log into a deduped "Distilled patterns" block in MEMORY.md, so the soul stays
 * sharp instead of growing into a wall of text. Deterministic + free; the sweep
 * calls this. Returns how many new patterns were distilled.
 */
export async function distillToMemory(): Promise<{ distilled: number }> {
  await ensureKitsuMemory();
  const log = await readFile("decision-log", DECISION_LOG_SEED);
  const memory = await readFile("MEMORY", MEMORY_SEED);
  // Pull correction summaries from the log.
  const corrections = Array.from(
    log.matchAll(/\[correction\] Correction from PG: (.+)/g),
  ).map((m) => m[1].trim());
  if (corrections.length === 0) return { distilled: 0 };
  const heading = "## Distilled patterns";
  const existing = memory.includes(heading)
    ? memory.slice(memory.indexOf(heading))
    : "";
  const fresh = Array.from(new Set(corrections)).filter(
    (c) => !existing.includes(c),
  );
  if (fresh.length === 0) return { distilled: 0 };
  const block = fresh.map((c) => `- ${c}`).join("\n");
  await appendUnderHeading("MEMORY", heading, block);
  await appendKitsuDecision({
    summary: `Distilled ${fresh.length} pattern(s) into MEMORY.md`,
    kind: "evolve",
  });
  return { distilled: fresh.length };
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
