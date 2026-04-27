import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

const AGENTS_DIR = path.join(os.homedir(), ".claude", "agents");
const SI_DIR = path.join(os.homedir(), ".claude", "self-improvement", "data");

export type AgentHealth = {
  name: string;
  description: string;
  model: string;
  schedule: string;
  lastRun: string | null;
  lastStatus: "ok" | "error" | "timeout" | "unknown";
  lastError?: string;
  budget: string;
};

const META: Record<string, { schedule: string; budget: string }> = {
  "session-review": { schedule: "nightly 10:30pm", budget: "$1" },
  "morning-briefing": { schedule: "daily 8am", budget: "$0.50" },
  "weekly-meta-audit": { schedule: "Sundays 9pm", budget: "$2" },
  "memory-hygiene": { schedule: "Sundays 10pm", budget: "$5" },
  "description-optimizer": { schedule: "on-demand", budget: "$0.75" },
};

function parseFrontmatter(raw: string): Record<string, string> {
  if (!raw.startsWith("---\n")) return {};
  const end = raw.indexOf("\n---", 4);
  if (end === -1) return {};
  const head = raw.slice(4, end);
  const meta: Record<string, string> = {};
  for (const line of head.split("\n")) {
    const m = line.match(/^([a-zA-Z_]+):\s*(.*)$/);
    if (!m) continue;
    meta[m[1]] = m[2].trim().replace(/^"|"$/g, "");
  }
  return meta;
}

async function readDefinitionFile(name: string): Promise<{ description: string; model: string }> {
  // Try root .md (e.g. ~/.claude/agents/session-review.md), then nested.
  const candidates = [
    path.join(AGENTS_DIR, `${name}.md`),
    path.join(AGENTS_DIR, name, `${name}.md`),
  ];
  for (const file of candidates) {
    try {
      const raw = await fs.readFile(file, "utf8");
      const meta = parseFrontmatter(raw);
      return {
        description: meta.description ?? "",
        model: meta.model ?? "sonnet",
      };
    } catch {
      /* try next */
    }
  }
  return { description: "", model: "sonnet" };
}

// Explicit failure markers — only these trigger an error status.
// Substrings like "permission errors" (a sub-section heading inside a successful run)
// or "memory-hygiene-2026-04-12.md" (a path) must NOT trigger.
const FAILURE_MARKERS = [
  /\bFAILED\b/,
  /\bABORTED\b/,
  /\bexit (?:code )?[1-9]/,
  /\bAPI Error\b/i,
  /^Error:/m,
  /\bUnhandled (?:exception|rejection)\b/i,
  /\bcommand not found\b/,
];
const TIMEOUT_MARKERS = [
  /\bStream idle timeout\b/i,
  /\bidle timeout\b/i,
  /\brequest timed out\b/i,
];

function classifyBlock(block: string): { status: AgentHealth["lastStatus"]; error?: string } {
  for (const re of TIMEOUT_MARKERS) {
    const m = block.match(re);
    if (m) return { status: "timeout", error: "Stream idle timeout — partial response" };
  }
  for (const re of FAILURE_MARKERS) {
    const m = block.match(re);
    if (m) {
      const idx = m.index ?? 0;
      const snippet = block.slice(idx, idx + 160).split("\n")[0].trim();
      return { status: "error", error: snippet };
    }
  }
  return { status: "ok" };
}

function isPerAgentLog(log: string, name: string): boolean {
  // The log files like memory-hygiene-log.md are dedicated to one agent.
  // If the H1 contains the agent's words, treat dates anywhere in the file as runs of THIS agent.
  const firstHeader = log.split("\n").find((l) => l.startsWith("# ")) ?? "";
  const norm = firstHeader.toLowerCase().replace(/-/g, " ");
  return norm.includes(name.replace(/-/g, " "));
}

function lastDateInLog(log: string): string | null {
  // Find every YYYY-MM-DD anywhere in the file, return the maximum.
  const matches = log.match(/\b(\d{4}-\d{2}-\d{2})\b/g);
  if (!matches || !matches.length) return null;
  return matches.sort().slice(-1)[0];
}

function findAgentMentions(
  log: string,
  name: string,
): { lastRun: string | null; status: AgentHealth["lastStatus"]; error?: string } {
  if (!log.trim()) return { lastRun: null, status: "unknown" };

  // Per-agent log file (e.g. memory-hygiene-log.md) — single owner, every dated run is theirs.
  if (isPerAgentLog(log, name)) {
    const lastRun = lastDateInLog(log);
    if (!lastRun) return { lastRun: null, status: "unknown" };
    // Slice the log to ONLY the section for the most recent run by splitting on heading
    // boundaries that contain that date.
    const idx = log.lastIndexOf(lastRun);
    const lineStart = log.lastIndexOf("\n", idx) + 1;
    const headerLineEnd = log.indexOf("\n", idx);
    const lastBlock = log.slice(headerLineEnd === -1 ? lineStart : headerLineEnd + 1);
    const cls = classifyBlock(lastBlock);
    return { lastRun, ...cls };
  }

  // Multi-agent log (e.g. review-log.md). Split on date-anchored headings;
  // attribute a block to an agent only if the agent name appears OUTSIDE a file-path mention.
  const lines = log.split("\n");
  const blocks: { date: string; body: string }[] = [];
  let currentDate: string | null = null;
  let currentBuf: string[] = [];

  const headingDateRe = /^#{1,4}\s+.*?(\d{4}-\d{2}-\d{2})/;
  const flush = () => {
    if (currentDate) blocks.push({ date: currentDate, body: currentBuf.join("\n") });
  };
  for (const line of lines) {
    const dm = line.match(headingDateRe);
    if (dm) {
      flush();
      currentDate = dm[1];
      currentBuf = [];
    } else {
      currentBuf.push(line);
    }
  }
  flush();

  let lastRun: string | null = null;
  let status: AgentHealth["lastStatus"] = "unknown";
  let error: string | undefined;
  for (const b of blocks) {
    if (!mentionsAgent(b.body, name)) continue;
    if (lastRun === null || b.date > lastRun) {
      lastRun = b.date;
      const cls = classifyBlock(b.body);
      status = cls.status;
      error = cls.error;
    }
  }
  return { lastRun, status, error };
}

function mentionsAgent(body: string, name: string): boolean {
  // Match agent name as a word, but NOT inside `agent-name-YYYY-MM-DD.md` style file paths.
  const re = new RegExp(`(?<![\\w-])${name}(?![\\w-])`, "i");
  return re.test(body);
}

export async function getAgentHealth(): Promise<AgentHealth[]> {
  const reviewLog = await fs.readFile(path.join(SI_DIR, "review-log.md"), "utf8").catch(() => "");
  const auditLog = await fs.readFile(path.join(SI_DIR, "weekly-audit-log.md"), "utf8").catch(() => "");
  const memLog = await fs.readFile(path.join(SI_DIR, "memory-hygiene-log.md"), "utf8").catch(() => "");

  const out: AgentHealth[] = [];
  for (const name of Object.keys(META)) {
    const { description, model } = await readDefinitionFile(name);
    const meta = META[name];

    let log = reviewLog;
    if (name === "weekly-meta-audit") log = auditLog || reviewLog;
    if (name === "memory-hygiene") log = memLog || reviewLog;

    const { lastRun, status, error } = findAgentMentions(log, name);

    out.push({
      name,
      description: description || `Agent: ${name}`,
      model,
      schedule: meta.schedule,
      lastRun,
      lastStatus: status,
      lastError: error,
      budget: meta.budget,
    });
  }
  return out;
}
