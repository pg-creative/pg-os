import { NextRequest, NextResponse } from "next/server";
import { getTrustState, writeTrustState } from "@/lib/claudeStore";

// POST /api/claude/trust/toggle  { category: string, auto_execute: boolean }
// Flips a category's auto_execute flag and returns the new trust state.

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid JSON" }, { status: 400 });
  }

  const { category, auto_execute } = (body ?? {}) as {
    category?: unknown;
    auto_execute?: unknown;
  };

  if (typeof category !== "string" || category.length === 0) {
    return NextResponse.json(
      { ok: false, error: "category (string) is required" },
      { status: 400 },
    );
  }
  if (typeof auto_execute !== "boolean") {
    return NextResponse.json(
      { ok: false, error: "auto_execute (boolean) is required" },
      { status: 400 },
    );
  }

  const trust = await getTrustState();
  if (!trust) {
    return NextResponse.json(
      { ok: false, error: "no trust state on disk yet" },
      { status: 404 },
    );
  }

  const cat = trust.categories[category];
  if (!cat) {
    return NextResponse.json(
      { ok: false, error: `unknown category: ${category}` },
      { status: 404 },
    );
  }

  cat.auto_execute = auto_execute;
  trust.last_updated = new Date().toISOString();
  await writeTrustState(trust);

  return NextResponse.json({ ok: true, trust });
}
