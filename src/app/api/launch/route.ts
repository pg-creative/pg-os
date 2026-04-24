import { NextRequest, NextResponse } from "next/server";
import { launchProject } from "@/lib/launcher";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const projectId = typeof body.projectId === "string" ? body.projectId : "";
  if (!projectId) return NextResponse.json({ error: "projectId_required" }, { status: 400 });
  const result = await launchProject(projectId);
  return NextResponse.json(result);
}
