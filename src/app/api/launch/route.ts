import { NextRequest, NextResponse } from "next/server";
import { launchProject } from "@/lib/launcher";
import { getProject } from "@/lib/projects";
import { launchCockpitSession } from "@/lib/cockpitDaemon";

/**
 * Launch a Claude Code session in a project.
 *   target "ghostty" (default): AppleScript -> new Ghostty tab running `claude`.
 *   target "cockpit": daemon-backed tmux session that streams into the Cockpit
 *     tab's live two-way terminal. Returns the sessionId so the client can deep
 *     link to it (?tab=cockpit, sessionStorage select key).
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const projectId = typeof body.projectId === "string" ? body.projectId : "";
  const target = body.target === "cockpit" ? "cockpit" : "ghostty";
  if (!projectId) return NextResponse.json({ error: "projectId_required" }, { status: 400 });

  if (target === "cockpit") {
    const p = getProject(projectId);
    if (!p) return NextResponse.json({ error: "unknown_project" }, { status: 404 });
    const result = await launchCockpitSession(p.path, p.name);
    if (!result.ok) {
      // Daemon down or token missing: tell the client so it can fall back to Ghostty.
      return NextResponse.json(
        { ok: false, target, error: result.error, hint: "Cockpit daemon unreachable. Start it: pnpm cockpit:daemon" },
        { status: 503 },
      );
    }
    return NextResponse.json({ ok: true, target, sessionId: result.id, attachCommand: result.attachCommand });
  }

  const result = await launchProject(projectId);
  return NextResponse.json({ ...result, target });
}
