/**
 * GET /api/cosmos/body?id=<page id> — one page's prose, when it unfolds.
 *
 * This route exists so that prose never reaches the client bundle. `/_next` is on
 * the middleware's passthrough list and is served unauthenticated; `/api/cosmos`
 * is fail-closed. So a body that travelled in a manifest, or in a props object
 * that Next serialises into a chunk, would be a private page served without a
 * cookie. It is fetched here instead, behind the gate, one page at a time, only
 * when PG stands still long enough to open it.
 *
 * The body comes back as BLOCKS, not markdown, so the scene never needs a
 * markdown renderer in the client bundle (remark and rehype are deliberately not
 * installed). Two shapes, which is what the vault pages actually use: a quote and
 * a paragraph.
 */

import { NextRequest, NextResponse } from "next/server";
import { cosmosRoot, readPageBody } from "../../../../lib/cosmos/vault";

export const dynamic = "force-dynamic";

export interface BodyBlock {
  quote: boolean;
  text: string;
}

/** Paragraph splitting, blockquote markers stripped, HTML comments dropped. */
export function toBlocks(body: string): BodyBlock[] {
  const blocks: BodyBlock[] = [];
  for (const raw of body.split(/\n{2,}/)) {
    const chunk = raw.trim();
    if (!chunk || chunk.startsWith("<!--")) continue;
    const quote = chunk.startsWith(">");
    const text = chunk
      .split("\n")
      .map((l) => (quote ? l.replace(/^>\s?/, "") : l))
      .join(" ")
      .trim();
    if (text) blocks.push({ quote, text });
  }
  return blocks;
}

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return new NextResponse(null, { status: 404 });

  const page = readPageBody(id, cosmosRoot());
  if (!page) return new NextResponse(null, { status: 404 });

  return NextResponse.json(
    {
      id: page.id,
      title: page.title,
      type: page.type,
      world: page.world,
      blocks: toBlocks(page.body),
    },
    {
      headers: {
        // Private prose. Never let a proxy or a preview card hold a copy.
        "Cache-Control": "private, no-store",
        "Referrer-Policy": "no-referrer",
      },
    },
  );
}
