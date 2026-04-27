import { NextRequest, NextResponse } from "next/server";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import os from "node:os";
import path from "node:path";
import fs from "node:fs";

const execP = promisify(exec);

const VALID_AGENTS = [
  "session-review",
  "morning-briefing",
  "weekly-meta-audit",
  "memory-hygiene",
  "description-optimizer",
] as const;

type AgentName = (typeof VALID_AGENTS)[number];

function escapeForAppleScript(s: string) {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const agent = body.agent as string | undefined;
  if (!agent || !(VALID_AGENTS as readonly string[]).includes(agent)) {
    return NextResponse.json({ error: "invalid_agent" }, { status: 400 });
  }

  const home = os.homedir();
  const candidates = [
    path.join(home, ".claude", "agents", agent, `run-${agent}.sh`),
    path.join(home, ".claude", "agents", `run-${agent}.sh`),
  ];
  const scriptPath = candidates.find((p) => fs.existsSync(p));
  if (!scriptPath) {
    return NextResponse.json({
      ok: false,
      autoLaunched: false,
      command: `# script not found for ${agent}`,
      error: "script_not_found",
    });
  }

  const command = `zsh "${scriptPath}"`;
  const script = [
    'tell application "Ghostty" to activate',
    "delay 0.25",
    'tell application "System Events"',
    '  keystroke "t" using command down',
    "  delay 0.35",
    `  keystroke "${escapeForAppleScript(command)}"`,
    "  key code 36",
    "end tell",
  ].join("\n");

  try {
    await execP(`osascript -e '${script.replace(/'/g, "'\\''")}'`, { timeout: 6000 });
    return NextResponse.json({ ok: true, autoLaunched: true, agent: agent as AgentName, command });
  } catch (err) {
    return NextResponse.json({
      ok: true,
      autoLaunched: false,
      agent: agent as AgentName,
      command,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
