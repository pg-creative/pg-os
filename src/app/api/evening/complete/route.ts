/**
 * POST /api/evening/complete
 *
 * Marks the evening ceremony complete for today:
 * - Optionally writes a journal entry to HC Supabase via upsertJournal()
 * - Sets the per-day pg-os-evening-YYYYMMDD cookie so middleware stops
 *   redirecting to /evening for the rest of the night.
 *
 * Body (all optional):
 *   { journal?: string | null, tomorrowIntent?: string | null }
 *
 * Returns: { ok: true, wroteJournal: boolean }
 */

import { NextRequest, NextResponse } from "next/server";
import { upsertJournal } from "@/lib/habits";

function todayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function eveningCookieName(d: Date): string {
  return `pg-os-evening-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
}

export async function POST(req: NextRequest) {
  let body: { journal?: string | null; tomorrowIntent?: string | null } = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const journal = typeof body.journal === "string" ? body.journal.trim() : "";

  let wroteJournal = false;
  if (journal) {
    try {
      await upsertJournal(todayLocal(), journal, null);
      wroteJournal = true;
    } catch (err) {
      console.warn("[evening/complete] journal write failed:", err);
      // Non-fatal — the ceremony still completes.
    }
  }

  const res = NextResponse.json({ ok: true, wroteJournal });
  const cookieName = eveningCookieName(new Date());
  res.cookies.set(cookieName, "1", {
    path: "/",
    sameSite: "strict",
    secure: req.nextUrl.protocol === "https:",
    maxAge: 60 * 60 * 24,
  });
  return res;
}
