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

function findAgentMentions(log: string, name: string): { lastRun: string | null; status: AgentHealth["lastStatus"]; error?: string } {
  // Look for date headings (## YYYY-MM-DD or ### YYYY-MM-DD) where the agent name appears in the section
  const lines = log.split("\n");
  let lastRun: string | null = null;
  let status: AgentHealth["lastStatus"] = "unknown";
  let error: string | undefined;
  let currentDate: string | null = null;
  let currentBlock: string[] = [];

  const flush = () => {
    const block = currentBlock.join("\n");
    if (currentDate && block.toLowerCase().includes(name.toLowerCase())) {
      lastRun = currentDate;
      const lower = block.toLowerCase();
      if (lower.includes("stream idle") || lower.includes("idle timeout")) {
        status = "timeout";
        error = "Stream idle timeout — partial response";
      } else if (lower.includes("error") || lower.includes("failed")) {
        status = "error";
        const m = block.match(/error[:\s].{0,140}/i);
        if (m) error = m[0].slice(0, 160);
      } else if (lower.includes("complete") || lower.includes("ok") || lower.includes("done") || lower.includes("appended") || lower.includes("proposed")) {
        status = "ok";
      } else {
        status = "ok";
      }
    }
  };

  for (const line of lines) {
    const dm = line.match(/^#{2,3}\s+(\d{4}-\d{2}-\d{2})/);
    if (dm) {
      flush();
      currentDate = dm[1];
      currentBlock = [];
    } else {
      currentBlock.push(line);
    }
  }
  flush();
  return { lastRun, status, error };
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
