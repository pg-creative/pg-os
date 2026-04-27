import { NextResponse } from "next/server";
import { getProposals, getRecentFindings, getRecentStats, getReviewLog } from "@/lib/claudeStore";
import { getAgentHealth } from "@/lib/agentHealth";
import { getArchiveStats } from "@/lib/claudeArchive";

export async function GET() {
  const [proposals, signals, stats, agents, reviewLog] = await Promise.all([
    getProposals(),
    getRecentFindings(7),
    getRecentStats(7),
    getAgentHealth(),
    getReviewLog(60),
  ]);
  const archive = getArchiveStats();

  let recentCorrections = 0;
  let recentConfirmations = 0;
  for (const s of signals) {
    if (s.signals?.includes("correction")) recentCorrections += 1;
    if (s.signals?.includes("confirmation")) recentConfirmations += 1;
  }
  // Stats can also have aggregate counts when signal_details aren't extracted
  let statsCorrections = 0;
  let statsConfirmations = 0;
  for (const r of stats) {
    statsCorrections += r.corrections ?? 0;
    statsConfirmations += r.confirmations ?? 0;
  }

  const healthy = agents.filter((a) => a.lastStatus === "ok").length;
  const errored = agents.filter((a) => a.lastStatus === "error" || a.lastStatus === "timeout").length;

  // Find last review date in review-log.md tail
  let lastReviewDate: string | null = null;
  const dateMatches = reviewLog.match(/^#{2,3}\s+(\d{4}-\d{2}-\d{2})/gm);
  if (dateMatches && dateMatches.length) {
    const last = dateMatches[dateMatches.length - 1];
    const m = last.match(/(\d{4}-\d{2}-\d{2})/);
    if (m) lastReviewDate = m[1];
  }

  return NextResponse.json({
    proposalCount: proposals.length,
    proposalsByType: countBy(proposals.map((p) => p.type)),
    recentCorrections: Math.max(recentCorrections, statsCorrections),
    recentConfirmations: Math.max(recentConfirmations, statsConfirmations),
    sessionsAnalyzed: stats.length,
    agentSummary: { total: agents.length, healthy, errored },
    archiveSize: archive
      ? { conversations: archive.totalConversations, messages: archive.totalMessages }
      : null,
    lastReviewDate,
  });
}

function countBy<T extends string>(arr: T[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const v of arr) out[v] = (out[v] ?? 0) + 1;
  return out;
}
