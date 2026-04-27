import { db, isDbConfigured, T } from "./db";

// ── Types ────────────────────────────────────────────────────

export type PostMortemOutcome = "worked" | "didnt-work" | "unclear";

export type PostMortem = {
  id: number;
  kind: string;
  ref_id: string | null;
  detail: Record<string, unknown>;
  taken_at: string;        // ISO
  taken_by: string;
  followup_at: string;     // ISO
};

// ── Reads ────────────────────────────────────────────────────

/**
 * Returns up to 20 decisions whose follow-up window has elapsed and that
 * haven't yet been outcome-tagged. Graceful degradation: if Supabase isn't
 * configured we just return [].
 */
export async function listDuePostMortems(): Promise<PostMortem[]> {
  if (!isDbConfigured()) return [];
  try {
    const nowIso = new Date().toISOString();
    const { data, error } = await db()
      .from(T.decisions_log)
      .select("id, kind, ref_id, detail, taken_at, taken_by, followup_at")
      .is("outcome", null)
      .not("followup_at", "is", null)
      .lte("followup_at", nowIso)
      .order("followup_at", { ascending: true })
      .limit(20);
    if (error) throw error;
    return (data ?? []).map((r) => ({
      id: Number(r.id),
      kind: String(r.kind),
      ref_id: r.ref_id ?? null,
      detail: (r.detail ?? {}) as Record<string, unknown>,
      taken_at: r.taken_at,
      taken_by: r.taken_by,
      followup_at: r.followup_at,
    }));
  } catch (e) {
    console.error("listDuePostMortems failed:", e);
    return [];
  }
}

/**
 * Counts overdue (due now or earlier) post-mortems. Used by the daily sweep
 * cron to surface a summary without doing any mutations.
 */
export async function countOverdue(): Promise<number> {
  if (!isDbConfigured()) return 0;
  try {
    const nowIso = new Date().toISOString();
    const { count, error } = await db()
      .from(T.decisions_log)
      .select("id", { count: "exact", head: true })
      .is("outcome", null)
      .not("followup_at", "is", null)
      .lte("followup_at", nowIso);
    if (error) throw error;
    return count ?? 0;
  } catch (e) {
    console.error("countOverdue failed:", e);
    return 0;
  }
}

// ── Writes ───────────────────────────────────────────────────

export async function recordOutcome(payload: {
  id: number;
  outcome: PostMortemOutcome;
  reflection?: string;
}): Promise<{ ok: boolean; error?: string }> {
  if (!isDbConfigured()) return { ok: false, error: "db_not_configured" };
  if (!Number.isFinite(payload.id) || payload.id <= 0) {
    return { ok: false, error: "invalid_id" };
  }
  if (!["worked", "didnt-work", "unclear"].includes(payload.outcome)) {
    return { ok: false, error: "invalid_outcome" };
  }
  try {
    // Merge reflection into detail jsonb so the historical record stays intact.
    // Read the existing row first so we don't clobber the original payload.
    const { data: existing, error: readErr } = await db()
      .from(T.decisions_log)
      .select("detail")
      .eq("id", payload.id)
      .single();
    if (readErr) throw readErr;

    const mergedDetail = {
      ...((existing?.detail ?? {}) as Record<string, unknown>),
      ...(payload.reflection ? { reflection: payload.reflection } : {}),
    };

    const { error } = await db()
      .from(T.decisions_log)
      .update({
        outcome: payload.outcome,
        outcome_at: new Date().toISOString(),
        detail: mergedDetail,
      })
      .eq("id", payload.id);
    if (error) throw error;
    return { ok: true };
  } catch (e) {
    console.error("recordOutcome failed:", e);
    return { ok: false, error: "write_failed" };
  }
}
