import { NextResponse } from "next/server";
import { readFile, readdir, stat } from "fs/promises";
import { homedir } from "os";
import path from "path";
import { pgPath } from "@/lib/paths";

const BRAIN_ENTRY = pgPath(
  "brain/wiki/synthesis/claude-extension-landscape-2026-05-15.md",
);
const EVALS_DIR = path.join(homedir(), ".claude/skill-evals-2026-05-15");
const STATUS_FILE = path.join(homedir(), ".pg-os/extensions-status.json");

type Verdict = "INSTALL" | "CONDITIONAL" | "DEFER" | "SKIP" | "PENDING";

type EvalRecord = {
  id: string;
  title: string;
  category: string;
  score: string;
  source: string;
  lens: string;
  install: string;
  verdict: Verdict;
  verdictText: string;
  raw: string;
};

function parseEval(filename: string, content: string): EvalRecord {
  const id = filename.replace(/\.md$/, "");
  const titleMatch = content.match(
    /^# (?:5Q Eval — |P0 (?:Fix Queue|—) )(.+)$/m,
  );
  const title = titleMatch?.[1] ?? id;

  const metaMatch = content.match(
    /\*\*Category:\*\*\s*([^·\n]+?)\s*·\s*\*\*Score:\*\*\s*([^·\n]+?)\s*·\s*\*\*Source:\*\*\s*`?([^`·\n]+?)`?\s*·\s*\*\*Lens:\*\*\s*(.+)$/m,
  );
  const installMatch = content.match(/\*\*Install:\*\*\s*(.+)$/m);
  const verdictSection = content.match(
    /##\s+Verdict\s*\n+([^\n]+(?:\n[^\n#]+)*)/,
  );

  let verdict: Verdict = "PENDING";
  let verdictText = "";
  if (verdictSection) {
    verdictText = verdictSection[1].trim();
    if (verdictText.startsWith("✅")) verdict = "INSTALL";
    else if (verdictText.startsWith("⚠️")) verdict = "CONDITIONAL";
    else if (verdictText.startsWith("🟡")) verdict = "DEFER";
    else if (verdictText.startsWith("🚫") || verdictText.startsWith("❌"))
      verdict = "SKIP";
  }

  const category =
    metaMatch?.[1]?.trim() ??
    (id.startsWith("plugin-")
      ? "Plugin"
      : id.startsWith("skill-")
        ? "Skill"
        : id.startsWith("mcp-")
          ? "MCP"
          : id.startsWith("fix-")
            ? "Fix"
            : id.startsWith("connect-")
              ? "Marketplace"
              : "Other");

  return {
    id,
    title,
    category,
    score: metaMatch?.[2]?.trim() ?? "—",
    source: metaMatch?.[3]?.trim() ?? "—",
    lens: metaMatch?.[4]?.trim() ?? "—",
    install: installMatch?.[1]?.trim() ?? "",
    verdict,
    verdictText,
    raw: content,
  };
}

export async function GET() {
  let brain = "";
  let brainMtime: string | null = null;
  try {
    brain = await readFile(BRAIN_ENTRY, "utf-8");
    const s = await stat(BRAIN_ENTRY);
    brainMtime = s.mtime.toISOString();
  } catch {
    brain =
      "# No landscape report found\n\nRun the monthly refresh agent or create the brain entry.";
  }

  let evals: EvalRecord[] = [];
  try {
    const files = await readdir(EVALS_DIR);
    const mdFiles = files.filter((f) => f.endsWith(".md"));
    evals = await Promise.all(
      mdFiles.map(async (f) => {
        const content = await readFile(path.join(EVALS_DIR, f), "utf-8");
        return parseEval(f, content);
      }),
    );
  } catch {
    evals = [];
  }

  let status: Record<string, "pending" | "installed" | "passed"> = {};
  try {
    const raw = await readFile(STATUS_FILE, "utf-8");
    status = JSON.parse(raw);
  } catch {
    status = {};
  }

  return NextResponse.json({
    brain,
    brainMtime,
    evals,
    status,
    lastRun: brainMtime ? brainMtime.slice(0, 10) : null,
    nextScheduled: "2026-06-15", // monthly cadence, 15th of each month
  });
}

export async function POST(req: Request) {
  const { evalId, status: newStatus } = (await req.json()) as {
    evalId: string;
    status: "pending" | "installed" | "passed";
  };
  if (!evalId || !["pending", "installed", "passed"].includes(newStatus)) {
    return NextResponse.json({ error: "bad input" }, { status: 400 });
  }

  let status: Record<string, string> = {};
  try {
    const raw = await readFile(STATUS_FILE, "utf-8");
    status = JSON.parse(raw);
  } catch {
    // file may not exist yet
  }
  status[evalId] = newStatus;

  const { writeFile, mkdir } = await import("fs/promises");
  await mkdir(path.dirname(STATUS_FILE), { recursive: true });
  await writeFile(STATUS_FILE, JSON.stringify(status, null, 2), {
    mode: 0o600,
  });

  return NextResponse.json({ ok: true, status });
}
