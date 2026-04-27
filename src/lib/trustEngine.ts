import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  getTrustState,
  writeTrustState,
  getProposals,
  writeProposals,
  logDecision,
  type Proposal,
  type TrustState,
} from "./claudeStore";
import { addQueueItem } from "./queueStore";

// Track A3 — trust autonomy graduation engine.
//
// processAutoExecuteCycle() reads trust-state.json, finds categories where
// auto_execute is on and approvals have hit the threshold, then walks
// pending-proposals.json. For each proposal in those categories it surfaces
// a queue item (so PG still has the final word) and logs the auto-execute
// decision to Supabase when configured. It NEVER edits rule files directly.
//
// File-backed proposals are removed once handled so subsequent cycles don't
// re-process them.

const LOCK_PATH = path.join(os.tmpdir(), "autonomy.lock");

export type CycleResult = {
  processed: number;
  skipped: number;
  errors: string[];
  details: Array<{
    description: string;
    category: string;
    action: "queued" | "logged" | "skipped";
    note?: string;
  }>;
};

async function acquireLock(): Promise<{ release: () => Promise<void> } | null> {
  try {
    // O_EXCL fails if file exists — that's our lock.
    const handle = await fs.open(LOCK_PATH, "wx");
    await handle.write(`${process.pid} ${new Date().toISOString()}\n`);
    await handle.close();
    return {
      release: async () => {
        try {
          await fs.unlink(LOCK_PATH);
        } catch {
          /* lock already gone — fine */
        }
      },
    };
  } catch {
    return null;
  }
}

function isCategoryReady(state: TrustState, category: string): boolean {
  const cat = state.categories[category];
  if (!cat) return false;
  return cat.auto_execute === true && cat.approvals >= cat.threshold;
}

async function handleProposal(
  proposal: Proposal,
): Promise<{ action: "queued" | "logged"; note?: string }> {
  const id = `auto-${proposal.category}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 6)}`;

  // For destructive-ish categories we surface as a queue item — never
  // mutate rules/ files or memory directly. memory-cleanup is logged only
  // (the dedicated cleanup agent will do its own pass).
  if (proposal.category === "rule-promotion" || proposal.category === "config-fix") {
    await addQueueItem({
      id,
      title: `Auto-promoted ${proposal.category}: ${proposal.description}`.slice(0, 200),
      source: "auto-trust",
      options: ["confirm", "reject"],
      note: [
        `Category: ${proposal.category}`,
        `Source: ${proposal.source}`,
        `Occurrences: ${proposal.occurrences}`,
        "",
        proposal.evidence ?? "",
      ]
        .filter(Boolean)
        .join("\n"),
    });
    return { action: "queued", note: `Queue id ${id}` };
  }

  // memory-cleanup and any other category: log only.
  return { action: "logged" };
}

export async function processAutoExecuteCycle(): Promise<CycleResult> {
  const result: CycleResult = { processed: 0, skipped: 0, errors: [], details: [] };

  const lock = await acquireLock();
  if (!lock) {
    result.errors.push("autonomy lock already held — another cycle is running");
    return result;
  }

  try {
    const trust = await getTrustState();
    if (!trust) return result; // nothing to do

    const proposals = await getProposals();
    if (proposals.length === 0) return result;

    const remaining: Proposal[] = [];

    for (const proposal of proposals) {
      if (!isCategoryReady(trust, proposal.category)) {
        remaining.push(proposal);
        result.skipped += 1;
        continue;
      }

      try {
        const outcome = await handleProposal(proposal);
        await logDecision({
          kind: "auto-execute",
          ref_id: undefined,
          detail: {
            category: proposal.category,
            description: proposal.description,
            source: proposal.source,
            outcome: outcome.action,
            note: outcome.note,
          },
          taken_by: "auto-trust",
        });

        // Append to trust-category history so the dashboard reflects
        // autonomous activity right alongside PG's own approvals.
        const cat = trust.categories[proposal.category];
        if (cat) {
          cat.history.push({
            date: new Date().toISOString().slice(0, 10),
            action: "auto-execute",
            proposal: proposal.description,
            by: "auto-trust",
          });
        }

        result.processed += 1;
        result.details.push({
          description: proposal.description,
          category: proposal.category,
          action: outcome.action,
          note: outcome.note,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        result.errors.push(`${proposal.description}: ${msg}`);
        // Keep the proposal pending so a future cycle (or PG manually) can retry.
        remaining.push(proposal);
        result.details.push({
          description: proposal.description,
          category: proposal.category,
          action: "skipped",
          note: msg,
        });
      }
    }

    if (result.processed > 0) {
      // Persist updated trust history alongside the new pending list.
      trust.last_updated = new Date().toISOString();
      await writeTrustState(trust);
      await writeProposals(remaining);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    result.errors.push(msg);
  } finally {
    await lock.release();
  }

  return result;
}
