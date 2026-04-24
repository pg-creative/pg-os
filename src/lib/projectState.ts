import { exec } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs/promises";
import path from "node:path";
import { ACTIVE_PROJECTS, ProjectConfig } from "./projects";
import { countBySource } from "./queueStore";

const execP = promisify(exec);

async function gitState(projectPath: string) {
  try {
    await fs.access(path.join(projectPath, ".git")).catch(() => {
      throw new Error("not_a_git_repo");
    });
    const [statusRes, logRes] = await Promise.all([
      execP("git status --porcelain", { cwd: projectPath, timeout: 4000 }).catch(() => ({ stdout: "" })),
      execP("git log -1 --format='%ct|%s'", { cwd: projectPath, timeout: 4000 }).catch(() => ({ stdout: "" })),
    ]);
    const uncommittedCount = statusRes.stdout.split("\n").filter((l) => l.trim()).length;
    const logLine = logRes.stdout.trim();
    let lastCommitAt: number | null = null;
    let lastCommitMsg: string | null = null;
    if (logLine) {
      const m = logLine.match(/^(\d+)\|(.+)$/);
      if (m) {
        lastCommitAt = Number(m[1]) * 1000;
        lastCommitMsg = m[2];
      }
    }
    return { uncommittedCount, lastCommitAt, lastCommitMsg };
  } catch {
    return { uncommittedCount: 0, lastCommitAt: null, lastCommitMsg: null };
  }
}

async function readMemorySnippet(projectPath: string): Promise<string | null> {
  const candidates = [
    path.join(projectPath, ".claude", "MEMORY.md"),
    path.join(projectPath, "MEMORY.md"),
  ];
  for (const c of candidates) {
    try {
      const raw = await fs.readFile(c, "utf8");
      for (const line of raw.split("\n")) {
        const t = line.trim();
        if (!t) continue;
        if (t.startsWith("#")) continue;
        // Strip markdown link syntax for a cleaner read
        const clean = t.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/^[-*]\s*/, "");
        return clean.slice(0, 140);
      }
    } catch { /* try next */ }
  }
  return null;
}

export type ProjectState = ProjectConfig & {
  uncommittedCount: number;
  lastCommitAt: number | null;
  lastCommitMsg: string | null;
  memorySnippet: string | null;
  queueCount: number;
  daysUntilDeadline: number | null;
};

function daysUntilDeadline(deadline?: string): number | null {
  if (!deadline) return null;
  const t = Date.parse(deadline);
  if (Number.isNaN(t)) return null;
  return Math.ceil((t - Date.now()) / 86_400_000);
}

export async function listProjectStates(): Promise<ProjectState[]> {
  const queueCounts = await countBySource();
  const states = await Promise.all(
    ACTIVE_PROJECTS.map(async (p) => {
      const [git, memorySnippet] = await Promise.all([gitState(p.path), readMemorySnippet(p.path)]);
      return {
        ...p,
        ...git,
        memorySnippet,
        queueCount: queueCounts[p.id] ?? 0,
        daysUntilDeadline: daysUntilDeadline(p.deadline),
      };
    }),
  );
  return states;
}
