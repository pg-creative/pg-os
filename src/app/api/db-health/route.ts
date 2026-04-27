import { NextResponse } from "next/server";
import { db, isDbConfigured, T } from "@/lib/db";

const TABLES = Object.values(T);

export async function GET() {
  if (!isDbConfigured()) {
    return NextResponse.json({
      ok: false,
      configured: false,
      message:
        "PGOS_SUPABASE_URL and/or PGOS_SUPABASE_SERVICE_ROLE_KEY missing. " +
        "See supabase/README.md.",
    });
  }

  const client = db();
  const checks: Array<{ table: string; ok: boolean; error?: string; rows?: number }> = [];

  for (const table of TABLES) {
    try {
      // count: "exact", head: true → only fetches the count, no rows
      const { count, error } = await client
        .from(table)
        .select("*", { count: "exact", head: true });
      if (error) {
        checks.push({ table, ok: false, error: error.message });
      } else {
        checks.push({ table, ok: true, rows: count ?? 0 });
      }
    } catch (err) {
      checks.push({ table, ok: false, error: err instanceof Error ? err.message : String(err) });
    }
  }

  const allOk = checks.every((c) => c.ok);
  return NextResponse.json({
    ok: allOk,
    configured: true,
    tables: checks.length,
    checks,
  });
}
