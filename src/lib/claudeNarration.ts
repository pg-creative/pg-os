/**
 * claudeNarration.ts — Narrated Claude Overview assembly.
 *
 * Gathers self-improvement signals (proposals, trust state, findings, stats,
 * recent session-review agent runs) and calls Anthropic for a short
 * contemplative narration in PG's voice. Falls back gracefully when the
 * API key is absent or the call fails.
 *
 * Server-only — do NOT import from client components.
 */

import Anthropic from "@anthropic-ai/sdk";
import { getProposals, getTrustState, getRecentFindings, getRecentStats } from "./claudeStore";
import { listAgentRuns } from "./agentRunsStore";

export type Narration = {
  narration: string;
  updatedAt: string;
  targets: string[];
};

const FALLBACK: Narration = {
  narration:
    "Watching the patterns. Nothing strident this week — last review still holds.",
  updatedAt: new Date().toISOString(),
  targets: [],
};

const VALID_TARGETS = new Set([
  "cl-activity",
  "cl-overview",
  "cl-proposals",
  "cl-trust",
  "cl-agents",
  "cl-signals",
  "cl-skills",
  "cl-archive",
]);

const SYSTEM_PROMPT = `You write the narrated overview for PG's personal OS — the Claude tab's opening observation.

Voice rules — non-negotiable:
- Tone: contemplative, observational, slightly weary like a watchman at dawn. Studio Ghibli mood — quiet, specific, no urgency.
- Dense prose. Contractions. The occasional fragment is fine. No fluff, no padding.
- Second-person elided. Don't write "you have three proposals" — write "Three proposals are sitting in the queue."
- No exclamation marks anywhere. None.
- Banned openings: "Ah,", "I'm thrilled", "Great question", "Certainly", "Of course", "Let me".
- Banned closings: "Hope this helps", "Let me know if", "Feel free to".
- Banned words: embark, delve, tapestry, beacon, testament, treasure trove, realm, indelible, bespoke, endeavor, leverage, utilize.
- Maximum one em dash and one semicolon in the entire output.
- At most one italic accent per sentence, via *word* on a single noun or verb. Use sparingly.
- Take a stance. Don't hedge with "may" or "might" everywhere.

Output format — strict:
- 5 to 7 sentences, plain prose only. No headings, no bullet points, no JSON.
- Wrap key concepts as [[label|target]] where target is one of exactly these IDs:
  cl-activity, cl-overview, cl-proposals, cl-trust, cl-agents, cl-signals, cl-skills, cl-archive
- Reference 2-3 concrete proposals or findings by name (pull from the input data).
- Italicize emphasized words inline via *word* — the frontend renders these to <em>.
- Do NOT wrap your output in any code fences or quotes. Output the prose directly.

Topic: what the agents *observed* this week. What's accumulating. What's holding. What deserves attention.`;

function sanitize(s: string): string {
  return s.replace(/!/g, "").replace(/\s+/g, " ").trim();
}

function extractTargets(text: string): string[] {
  const matches = [...text.matchAll(/\[\[([^\]|]+)\|([^\]]+)\]\]/g)];
  const seen = new Set<string>();
  for (const m of matches) {
    const t = m[2].trim();
    if (VALID_TARGETS.has(t)) seen.add(t);
  }
  return [...seen];
}

let _client: Anthropic | null = null;
function getClient(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (!_client) _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _client;
}

export async function buildNarration(_opts?: { force?: boolean }): Promise<Narration> {
  const client = getClient();
  if (!client) return { ...FALLBACK, updatedAt: new Date().toISOString() };

  // Gather inputs in parallel
  const [proposals, trustState, findings, stats, sessionReviewRuns] = await Promise.all([
    getProposals().catch(() => []),
    getTrustState().catch(() => null),
    getRecentFindings(7).catch(() => []),
    getRecentStats(7).catch(() => []),
    listAgentRuns({ agent: "session-review", limit: 3 }).catch(() => []),
  ]);

  // Top 5 proposals by occurrences
  const topProposals = [...proposals]
    .sort((a, b) => (b.occurrences ?? 1) - (a.occurrences ?? 1))
    .slice(0, 5);

  // Split findings into corrections vs confirmations
  const corrections = findings.filter((f) => f.signals?.includes("correction"));
  const confirmations = findings.filter((f) => f.signals?.includes("confirmation"));

  const inputPayload = {
    proposals: topProposals.map((p) => ({
      description: p.description,
      category: p.category,
      type: p.type,
      occurrences: p.occurrences ?? 1,
    })),
    trustCategories: trustState
      ? Object.entries(trustState.categories).map(([name, cat]) => ({
          name,
          approvals: cat.approvals,
          rejections: cat.rejections,
          auto_execute: cat.auto_execute,
        }))
      : [],
    corrections: corrections.slice(0, 10).map((c) => ({
      pattern: c.signal_details?.find((d) => d.type === "correction")?.pattern ?? "",
      project: c.project,
      timestamp: c.timestamp,
    })),
    confirmations: confirmations.slice(0, 10).map((c) => ({
      pattern: c.signal_details?.find((d) => d.type === "confirmation")?.pattern ?? "",
      project: c.project,
      timestamp: c.timestamp,
    })),
    sessionsAnalyzed: stats.length,
    recentSessionReviews: sessionReviewRuns.map((r) => ({
      started_at: r.started_at,
      status: r.status,
      summary: r.summary ?? null,
    })),
  };

  try {
    const res = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 800,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Here is this week's self-improvement data. Write the narrated overview.\n\n${JSON.stringify(inputPayload, null, 2)}`,
        },
      ],
    });

    const raw = res.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { text: string }).text)
      .join("")
      .trim();

    // Strip any accidental code fences
    const cleaned = sanitize(raw.replace(/^```[^\n]*\n?/m, "").replace(/```\s*$/m, "").trim());
    const targets = extractTargets(cleaned);

    return {
      narration: cleaned,
      updatedAt: new Date().toISOString(),
      targets,
    };
  } catch {
    return { ...FALLBACK, updatedAt: new Date().toISOString() };
  }
}
