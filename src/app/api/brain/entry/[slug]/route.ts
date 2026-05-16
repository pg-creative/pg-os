// GET /api/brain/entry/[slug]  — read single entry
// PATCH /api/brain/entry/[slug] — mutate entry frontmatter + mirror to Notion

import { NextResponse } from "next/server";
import { findEntryBySlug } from "@/lib/brain/parser";
import { applyLocalMutation } from "@/lib/brain/sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  const { slug } = await ctx.params;
  const entry = findEntryBySlug(slug);
  if (!entry) {
    return NextResponse.json({ error: "entry not found" }, { status: 404 });
  }
  return NextResponse.json({ entry });
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  const { slug } = await ctx.params;
  try {
    const body = await req.json();
    const result = await applyLocalMutation({
      slug,
      patch: {
        status: body.status,
        route: body.route,
        notes: body.notes,
      },
      notionPageId: body.notionPageId,
    });
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "failed to mutate entry" },
      { status: 500 },
    );
  }
}
