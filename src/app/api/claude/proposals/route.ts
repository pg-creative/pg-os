import { NextRequest, NextResponse } from "next/server";
import { getProposals, writeProposals, getTrustState, writeTrustState, logDecision, type Proposal, type TrustState } from "@/lib/claudeStore";

export async function GET() {
  const proposals = await getProposals();
  return NextResponse.json({ proposals });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const action = body.action as "approve" | "dismiss" | undefined;
  const index = typeof body.index === "number" ? body.index : -1;

  if (action !== "approve" && action !== "dismiss") {
    return NextResponse.json({ error: "invalid_action" }, { status: 400 });
  }

  const proposals = await getProposals();
  if (index < 0 || index >= proposals.length) {
    return NextResponse.json({ error: "invalid_index" }, { status: 400 });
  }

  const proposal: Proposal = proposals[index];

  if (action === "approve") {
    let trust: TrustState = (await getTrustState()) ?? {
      categories: {},
      last_updated: new Date().toISOString().slice(0, 10),
    };
    const cat = proposal.category || "general";
    if (!trust.categories[cat]) {
      trust.categories[cat] = {
        approvals: 0,
        rejections: 0,
        auto_execute: false,
        threshold: 5,
        history: [],
      };
    }
    trust.categories[cat].approvals += 1;
    trust.categories[cat].history.push({
      date: new Date().toISOString().slice(0, 10),
      action: "approve",
      proposal: proposal.description,
      by: "pg",
    });
    trust.last_updated = new Date().toISOString().slice(0, 10);
    await writeTrustState(trust);
  }

  // Remove proposal in both cases
  const next = proposals.filter((_, i) => i !== index);
  await writeProposals(next);

  // Log the decision so the post-mortem loop (Track A4) can ping in 14 days.
  // Fire-and-forget — failures shouldn't block the user.
  logDecision({
    kind: "proposal",
    ref_id: proposal.description.slice(0, 64),
    detail: {
      proposal_type: proposal.type,
      category: proposal.category,
      action,
      occurrences: proposal.occurrences,
      source: proposal.source,
    },
    followup_days: action === "approve" ? 14 : undefined,
  });

  return NextResponse.json({ ok: true, action, removed: proposal });
}
