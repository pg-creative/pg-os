import { exec } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs/promises";
import path from "node:path";
import { ACTIVE_PROJECTS, ProjectConfig, getProject } from "./projects";
import { countBySource, listQueue, type QueueItem } from "./queueStore";
import { isDbConfigured } from "./db";
import { listTasks, type Task } from "./tasks";

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

async function recentCommits(projectPath: string, limit = 10): Promise<{ hash: string; subject: string; date: number }[]> {
  try {
    await fs.access(path.join(projectPath, ".git"));
    const res = await execP(
      `git log -${limit} --format='%h|%ct|%s'`,
      { cwd: projectPath, timeout: 4000 },
    ).catch(() => ({ stdout: "" }));
    return res.stdout
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((line) => {
        const m = line.match(/^([a-f0-9]+)\|(\d+)\|(.+)$/);
        if (!m) return null;
        return { hash: m[1], date: Number(m[2]) * 1000, subject: m[3] };
      })
      .filter((x): x is { hash: string; subject: string; date: number } => x !== null);
  } catch {
    return [];
  }
}

async function branchList(projectPath: string): Promise<string[]> {
  try {
    const res = await execP("git branch --format='%(refname:short)'", { cwd: projectPath, timeout: 3000 });
    return res.stdout.split("\n").map((l) => l.trim()).filter(Boolean);
  } catch {
    return [];
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

// ── Memory section parsing ────────────────────────────────────────────────────

export type ProjectMemorySections = {
  currentState: string | null; // condensed paragraph or first non-header line
  blockers: string[];          // bullets from ## Blockers / ## Blocked
  actionItems: string[];       // bullets from ## Now / ## Active / ## Action Items / ## TODO
  roadmap: string[];           // bullets from ## Roadmap / ## Next / ## Phases / ## Plan
};

const BLOCKER_HEADERS = ["blockers", "blocked", "blocked on"];
const ACTION_HEADERS = ["action items", "actions", "todo", "to do", "now", "active", "active work", "current work"];
const STATE_HEADERS = ["current state", "status", "where we are", "where things stand"];
const ROADMAP_HEADERS = ["roadmap", "next", "next steps", "phases", "plan", "what's next", "whats next"];

function normalizeHeader(line: string): string {
  return line.replace(/^#+\s*/, "").replace(/[—–:].*$/, "").trim().toLowerCase();
}

function parseSections(raw: string): { headerNorm: string; bullets: string[]; firstPara: string }[] {
  const lines = raw.split("\n");
  const out: { headerNorm: string; bullets: string[]; firstPara: string }[] = [];
  let current: { headerNorm: string; bullets: string[]; firstPara: string } | null = null;
  let paraLines: string[] = [];

  for (const line of lines) {
    if (/^#{1,6}\s/.test(line)) {
      if (current) {
        current.firstPara = paraLines.join(" ").trim();
        out.push(current);
      }
      current = { headerNorm: normalizeHeader(line), bullets: [], firstPara: "" };
      paraLines = [];
      continue;
    }
    if (!current) continue;
    const trimmed = line.trim();
    if (!trimmed) continue;
    const bullet = trimmed.match(/^[-*]\s+(.+)$/);
    if (bullet) {
      const cleaned = bullet[1]
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
        .replace(/[*_`]/g, "")
        .trim();
      if (cleaned) current.bullets.push(cleaned);
    } else if (paraLines.length < 5) {
      paraLines.push(trimmed);
    }
  }
  if (current) {
    current.firstPara = paraLines.join(" ").trim();
    out.push(current);
  }
  return out;
}

function pickSection(
  sections: { headerNorm: string; bullets: string[]; firstPara: string }[],
  headerCandidates: string[],
): { headerNorm: string; bullets: string[]; firstPara: string } | null {
  for (const candidate of headerCandidates) {
    const found = sections.find((s) => s.headerNorm === candidate || s.headerNorm.startsWith(candidate));
    if (found) return found;
  }
  return null;
}

async function readAllMemorySources(projectPath: string): Promise<string> {
  const sources = [
    path.join(projectPath, "CLAUDE.md"),
    path.join(projectPath, "MEMORY.md"),
    path.join(projectPath, ".claude", "MEMORY.md"),
  ];
  const memoryDir = path.join(projectPath, ".claude", "memory");
  try {
    const entries = await fs.readdir(memoryDir);
    for (const e of entries) {
      if (e.endsWith(".md")) sources.push(path.join(memoryDir, e));
    }
  } catch { /* no memory dir */ }

  const chunks: string[] = [];
  for (const s of sources) {
    try {
      const raw = await fs.readFile(s, "utf8");
      chunks.push(`<!-- SOURCE: ${s} -->\n${raw}`);
    } catch { /* skip */ }
  }
  return chunks.join("\n\n");
}

async function parseMemorySections(projectPath: string): Promise<ProjectMemorySections> {
  const raw = await readAllMemorySources(projectPath);
  if (!raw) {
    return { currentState: null, blockers: [], actionItems: [], roadmap: [] };
  }
  const sections = parseSections(raw);

  const blockers = pickSection(sections, BLOCKER_HEADERS);
  const actions = pickSection(sections, ACTION_HEADERS);
  const state = pickSection(sections, STATE_HEADERS);
  const roadmap = pickSection(sections, ROADMAP_HEADERS);

  let currentState: string | null = state?.firstPara ?? null;
  if (!currentState) {
    // Fallback: first non-empty body line outside headers
    for (const line of raw.split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#") || t.startsWith("<!--")) continue;
      if (t.startsWith("-") || t.startsWith("*")) continue;
      currentState = t.replace(/[*_`]/g, "").slice(0, 280);
      break;
    }
  } else if (currentState.length > 280) {
    currentState = currentState.slice(0, 280) + "…";
  }

  const cap = (xs: string[], n: number) => xs.slice(0, n).map((s) => (s.length > 200 ? s.slice(0, 200) + "…" : s));

  return {
    currentState,
    blockers: cap(blockers?.bullets ?? [], 5),
    actionItems: cap(actions?.bullets ?? [], 5),
    roadmap: cap(roadmap?.bullets ?? [], 8),
  };
}

// ── Master grid state (lightweight) ───────────────────────────────────────────

export type ProjectState = ProjectConfig & {
  uncommittedCount: number;
  lastCommitAt: number | null;
  lastCommitMsg: string | null;
  memorySnippet: string | null;
  queueCount: number;
  daysUntilDeadline: number | null;
  topBlocker: string | null;
  topActions: { id: string; title: string }[];
};

function daysUntilDeadline(deadline?: string): number | null {
  if (!deadline) return null;
  const t = Date.parse(deadline);
  if (Number.isNaN(t)) return null;
  return Math.ceil((t - Date.now()) / 86_400_000);
}

async function safeListTasks(project_id: string): Promise<Task[]> {
  if (!isDbConfigured()) return [];
  try {
    return await listTasks({ project_id });
  } catch {
    return [];
  }
}

export async function listProjectStates(): Promise<ProjectState[]> {
  const [queueCounts, allQueue] = await Promise.all([countBySource(), listQueue()]);
  const queueByProject = new Map<string, QueueItem[]>();
  for (const item of allQueue) {
    if (!item.source) continue;
    const arr = queueByProject.get(item.source) ?? [];
    arr.push(item);
    queueByProject.set(item.source, arr);
  }

  const states = await Promise.all(
    ACTIVE_PROJECTS.map(async (p) => {
      const [git, memorySnippet, projectTasks] = await Promise.all([
        gitState(p.path),
        readMemorySnippet(p.path),
        safeListTasks(p.id),
      ]);
      const queue = queueByProject.get(p.id) ?? [];
      const openTasks = projectTasks
        .filter((t) => t.status === "todo" || t.status === "doing")
        .sort((a, b) => {
          const pa = a.priority === "high" ? 0 : a.priority === "med" ? 1 : 2;
          const pb = b.priority === "high" ? 0 : b.priority === "med" ? 1 : 2;
          if (pa !== pb) return pa - pb;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
      return {
        ...p,
        ...git,
        memorySnippet,
        queueCount: queueCounts[p.id] ?? 0,
        daysUntilDeadline: daysUntilDeadline(p.deadline),
        topBlocker: queue[0]?.title ?? null,
        topActions: openTasks.slice(0, 2).map((t) => ({ id: t.id, title: t.title })),
      };
    }),
  );
  return states;
}

// ── Detail (drill-in) ─────────────────────────────────────────────────────────

export type ProjectDetail = ProjectState & {
  sections: ProjectMemorySections;
  tasks: Task[];
  queueItems: QueueItem[];
  recentCommits: { hash: string; subject: string; date: number }[];
  branches: string[];
  specsFiles: { name: string; relPath: string }[];
};

async function listSpecs(projectPath: string): Promise<{ name: string; relPath: string }[]> {
  const specsDir = path.join(projectPath, "docs", "specs");
  try {
    const entries = await fs.readdir(specsDir);
    return entries
      .filter((e) => e.endsWith(".md") && !e.startsWith("."))
      .map((e) => ({ name: e.replace(/\.md$/, "").replace(/-/g, " "), relPath: path.join("docs", "specs", e) }))
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch {
    return [];
  }
}

export async function getProjectDetail(id: string): Promise<ProjectDetail | null> {
  const cfg = getProject(id);
  if (!cfg) return null;

  const [git, memorySnippet, sections, projectTasks, allQueue, commits, branches, specs] = await Promise.all([
    gitState(cfg.path),
    readMemorySnippet(cfg.path),
    parseMemorySections(cfg.path),
    safeListTasks(cfg.id),
    listQueue(),
    recentCommits(cfg.path, 10),
    branchList(cfg.path),
    listSpecs(cfg.path),
  ]);

  const queueItems = allQueue.filter((q) => q.source === id);
  const openTasks = projectTasks
    .filter((t) => t.status === "todo" || t.status === "doing")
    .sort((a, b) => {
      const pa = a.priority === "high" ? 0 : a.priority === "med" ? 1 : 2;
      const pb = b.priority === "high" ? 0 : b.priority === "med" ? 1 : 2;
      if (pa !== pb) return pa - pb;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  return {
    ...cfg,
    ...git,
    memorySnippet,
    queueCount: queueItems.length,
    daysUntilDeadline: daysUntilDeadline(cfg.deadline),
    topBlocker: queueItems[0]?.title ?? null,
    topActions: openTasks.slice(0, 2).map((t) => ({ id: t.id, title: t.title })),
    sections,
    tasks: projectTasks,
    queueItems,
    recentCommits: commits,
    branches,
    specsFiles: specs,
  };
}
