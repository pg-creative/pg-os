import { NextRequest, NextResponse } from "next/server";
import { spawn, execFileSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import fs from "node:fs";

const VALID_AGENTS = [
  "session-review",
  "morning-briefing",
  "weekly-meta-audit",
  "memory-hygiene",
  "description-optimizer",
] as const;

type AgentName = (typeof VALID_AGENTS)[number];

function findScript(agent: AgentName): string | null {
  const home = os.homedir();
  const candidates = [
    path.join(home, ".claude", "agents", agent, `run-${agent}.sh`),
    path.join(home, ".claude", "agents", `run-${agent}.sh`),
  ];
  return candidates.find((p) => fs.existsSync(p)) ?? null;
}

function logPathFor(agent: AgentName): string {
  const today = new Date().toISOString().slice(0, 10);
  return path.join(os.homedir(), ".claude", "logs", `${agent}-${today}.log`);
}

// Dashboard-owned lock prevents API-level double-spawn.
// agent-runner.sh has its own /tmp/${agent}.lock for cron-vs-cron protection;
// keeping ours separate avoids interfering with that semantics.
function dashLockPath(agent: AgentName): string {
  return path.join("/tmp", `${agent}.dashlock`);
}

function existingPidForAgent(agent: AgentName, scriptPath: string): number | null {
  // First, check our dashboard lock for fast positive case.
  const lock = dashLockPath(agent);
  try {
    const raw = fs.readFileSync(lock, "utf8").trim();
    const pid = parseInt(raw, 10);
    if (Number.isFinite(pid)) {
      try {
        process.kill(pid, 0);
        return pid;
      } catch {
        // stale, fall through and clean up below
        try { fs.unlinkSync(lock); } catch { /* race */ }
      }
    }
  } catch { /* no dashlock */ }

  // Belt-and-suspenders: also check pgrep in case the cron path started one.
  try {
    const out = execFileSync("pgrep", ["-f", scriptPath], { encoding: "utf8" });
    const pid = out.trim().split("\n").map((s) => parseInt(s, 10)).find((n) => Number.isFinite(n));
    return pid ?? null;
  } catch {
    return null;
  }
}

function tryAcquireDashLock(agent: AgentName, pid: number): boolean {
  const lock = dashLockPath(agent);
  try {
    // O_WRONLY | O_CREAT | O_EXCL — atomic.
    const fd = fs.openSync(lock, "wx", 0o600);
    fs.writeSync(fd, String(pid));
    fs.closeSync(fd);
    return true;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const agent = body.agent as string | undefined;
  if (!agent || !(VALID_AGENTS as readonly string[]).includes(agent)) {
    return NextResponse.json({ error: "invalid_agent" }, { status: 400 });
  }
  const agentName = agent as AgentName;

  const scriptPath = findScript(agentName);
  if (!scriptPath) {
    return NextResponse.json(
      { ok: false, error: "script_not_found", agent: agentName },
      { status: 404 },
    );
  }

  // Already running? (covers both dashboard- and cron-launched runs)
  const existing = existingPidForAgent(agentName, scriptPath);
  if (existing) {
    return NextResponse.json({
      ok: true,
      alreadyRunning: true,
      pid: existing,
      logFile: logPathFor(agentName),
      agent: agentName,
    });
  }

  const logFile = logPathFor(agentName);
  fs.mkdirSync(path.dirname(logFile), { recursive: true });
  const out = fs.openSync(logFile, "a");

  // Mark the launch in the log so PG can see this came from the dashboard.
  const stamp = new Date().toISOString();
  fs.writeSync(out, `\n${stamp} [dashboard] launching ${agentName} via spawn\n`);

  let pid: number | undefined;
  try {
    const child = spawn("zsh", [scriptPath], {
      detached: true,
      stdio: ["ignore", out, out],
      env: { ...process.env },
    });
    pid = child.pid;
    if (!pid) throw new Error("spawn returned no pid");

    // Acquire dashboard lock with the child PID. If a competing request beat us
    // to it (race in the ~1ms window), kill our spawn and report alreadyRunning.
    if (!tryAcquireDashLock(agentName, pid)) {
      try { process.kill(pid, "SIGTERM"); } catch { /* already gone */ }
      fs.closeSync(out);
      const winnerPid = existingPidForAgent(agentName, scriptPath);
      return NextResponse.json({
        ok: true,
        alreadyRunning: true,
        pid: winnerPid ?? 0,
        logFile,
        agent: agentName,
      });
    }
    child.unref();

    // Best-effort cleanup of the dashlock when child exits. Note: child is
    // detached, so we may not always see the exit; agent-runner.sh's own EXIT
    // trap handles its lock, and our dashlock will be GC'd next time we check.
    child.once("exit", () => {
      try { fs.unlinkSync(dashLockPath(agentName)); } catch { /* gone */ }
    });
  } catch (err) {
    fs.closeSync(out);
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
        agent: agentName,
      },
      { status: 500 },
    );
  }

  fs.closeSync(out);

  return NextResponse.json({
    ok: true,
    spawned: true,
    pid,
    logFile,
    agent: agentName,
  });
}
