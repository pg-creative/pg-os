import { NextResponse } from "next/server";
import { getProjectDetail, type ProjectDetail } from "@/lib/projectState";

export type ProjectDetailResponse = { project: ProjectDetail };

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    const project = await getProjectDetail(id);
    if (!project) {
      return NextResponse.json({ error: "not_found", id }, { status: 404 });
    }
    return NextResponse.json({ project } satisfies ProjectDetailResponse);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: "project_detail_failed", detail: msg }, { status: 500 });
  }
}
