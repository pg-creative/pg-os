import { NextResponse } from "next/server";
import { listCockpitSessions, daemonUp } from "@/lib/cockpitDaemon";
import { ACTIVE_PROJECTS } from "@/lib/projects";

export const dynamic = "force-dynamic";

/**
 * Server-side proxy of the daemon session list, enriched with the projectId each
 * session belongs to (matched by cwd === project.path). Lets the Projects tab
 * show a "live in Cockpit" badge with a single fetch and no token in the browser.
 */
export async function GET() {
  const [running, sessions] = await Promise.all([daemonUp(), listCockpitSessions()]);
  const enriched = sessions
    .filter((s) => !s.dead)
    .map((s) => {
      const project = ACTIVE_PROJECTS.find((p) => p.path === s.cwd);
      return {
        id: s.id,
        cwd: s.cwd,
        label: s.label,
        projectId: project?.id ?? null,
        createdAt: s.createdAt ?? null,
      };
    });
  return NextResponse.json({ running, sessions: enriched });
}
