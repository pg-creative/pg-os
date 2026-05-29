// Server-side assembly of Marvis's live "fleet" view — what he can see when he
// answers "what's happening." Joins authoritative telemetry (vitals) with the
// jsonl activity tail (current tool / status). Kept separate from marvis.ts so
// the persona/types stay importable anywhere (this file is server-only — it
// reads the filesystem).

import { readSessionTelemetry } from "@/lib/cockpitTelemetry";
import { listLiveSessions } from "@/lib/sessions";
import type { MarvisSession } from "./marvis";

export async function buildMarvisFleet(): Promise<MarvisSession[]> {
  const [tele, acts] = await Promise.all([
    readSessionTelemetry(),
    listLiveSessions(),
  ]);
  const actById = new Map(acts.map((a) => [a.id, a]));

  return tele.map((t): MarvisSession => {
    const a = actById.get(t.sessionId);
    // Normalize a spoken-friendly status. (controllable is best-effort false
    // here — Marvis's conversation doesn't depend on it; the grid shows it.)
    const status = a?.currentTool
      ? "active"
      : a?.status === "running"
        ? "running"
        : (a?.status ?? "idle");
    return {
      projectLabel: t.projectLabel,
      modelName: t.modelName,
      contextUsedPct: t.contextUsedPct,
      costUsd: t.costUsd,
      currentTool: a?.currentTool,
      status,
      controllable: false,
      branch: t.branch,
    };
  });
}
