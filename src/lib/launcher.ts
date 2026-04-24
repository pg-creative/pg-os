import { exec } from "node:child_process";
import { promisify } from "node:util";
import { getProject } from "./projects";
import { listQueue } from "./queueStore";

const execP = promisify(exec);

async function buildContextPrompt(projectId: string, projectPath: string): Promise<string> {
  const queue = (await listQueue()).filter((q) => q.source === projectId);
  const blockers = queue.slice(0, 3).map((q) => `- ${q.title}`).join("\n");
  const parts = [
    `Resuming work on ${projectId}.`,
    blockers ? `Decisions waiting on me:\n${blockers}` : null,
    `Project path: ${projectPath}`,
  ].filter(Boolean);
  return parts.join("\n\n");
}

function escapeForAppleScript(s: string) {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

export type LaunchResult = {
  ok: boolean;
  autoLaunched: boolean;
  command: string;
  contextPrompt: string;
  error?: string;
};

/**
 * Best-effort Ghostty launch. Opens a new tab, cd's into the project, runs `claude`.
 * If osascript fails (no accessibility permission, Ghostty not installed, etc.),
 * returns autoLaunched=false so the client falls back to clipboard copy.
 */
export async function launchProject(projectId: string): Promise<LaunchResult> {
  const p = getProject(projectId);
  if (!p) {
    return { ok: false, autoLaunched: false, command: "", contextPrompt: "", error: "unknown_project" };
  }
  const contextPrompt = await buildContextPrompt(projectId, p.path);
  const command = `cd "${p.path}" && claude`;

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
    return { ok: true, autoLaunched: true, command, contextPrompt };
  } catch (err) {
    return {
      ok: true,
      autoLaunched: false,
      command,
      contextPrompt,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
