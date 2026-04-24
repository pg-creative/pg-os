import { NextResponse } from "next/server";
import { listProjectStates, ProjectState } from "@/lib/projectState";

export type ProjectsResponse = { projects: ProjectState[] };

export async function GET() {
  try {
    const projects = await listProjectStates();
    return NextResponse.json({ projects } satisfies ProjectsResponse);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: "project_state_failed", detail: msg }, { status: 500 });
  }
}
