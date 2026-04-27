/**
 * copilotContext.ts — Assembles the cached system prompt for the copilot.
 * Summarizes current OS state (~5k tokens) and tool availability.
 * This block is passed with cache_control: { type: "ephemeral" } to save tokens.
 */

import os from "node:os";
import { listShips, currentStreak, velocityPerWeek, shippedToday } from "./shipLog";
import { listQueue } from "./queueStore";

// ── Laputa variant detection (mirrors ModeProvider logic) ────────────────────

type LaptuaVariant = "day" | "twilight" | "midnight";

function getLaputaVariant(): LaptuaVariant {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 18) return "day";
  if (hour >= 18 && hour < 21) return "twilight";
  return "midnight";
}

function formatTime(): string {
  return new Date().toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDate(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

// ── System prompt assembly ───────────────────────────────────────────────────

export interface CopilotContext {
  systemPrompt: string;
  /** Summary of current state for cost logging */
  meta: {
    variant: LaptuaVariant;
    shipCount: number;
    queueCount: number;
    timeOfDay: string;
  };
}

export async function assembleCopilotContext(): Promise<CopilotContext> {
  const variant = getLaputaVariant();
  const timeStr = formatTime();
  const dateStr = formatDate();

  // Gather live OS state (best-effort — don't fail if any source is unavailable)
  let shipCount = 0;
  let shipStreak = 0;
  let shipVelocity = 0;
  let shippedTodayBool = false;
  let recentShipTexts: string[] = [];

  try {
    const ships = listShips(5);
    shipCount = ships.length;
    shipStreak = currentStreak();
    shipVelocity = velocityPerWeek();
    shippedTodayBool = shippedToday();
    recentShipTexts = ships.map((s) => `  - ${s.text}${s.context ? ` [${s.context}]` : ""}`);
  } catch {
    // ship log unavailable — non-fatal
  }

  let queueCount = 0;
  let queueTitles: string[] = [];
  try {
    const queueItems = await listQueue();
    queueCount = queueItems.length;
    queueTitles = queueItems.slice(0, 5).map((q) => `  - "${q.title}" (${q.source ?? "unknown"})`);
  } catch {
    // queue unavailable — non-fatal
  }

  const systemPrompt = `You are PG's personal AI co-pilot, embedded directly in his Personal OS dashboard.

## Identity & Role
You are an executive co-pilot with full visibility into PG's day: his calendar, ship log, approval queue, Whoop vitals, self-improvement signals, and Claude conversation archive. Your job is to help him decide what to do next, surface blockers, log what he's shipped, and propose decisions that belong in the queue.

You are direct, minimal, and tactical. No fluff. Lead with actionable specifics. PG works in parallel streams — gaming (Voyager), AI content (Alchmy), a life-RPG product (Hero's Chronicle), a GTM day job (Metrasens), and this OS itself.

## Current State Snapshot

**Date & Time:** ${dateStr} · ${timeStr}
**Dashboard palette:** ${variant.toUpperCase()} mode

**Ship Log:**
- Today shipped: ${shippedTodayBool ? "YES" : "NOT YET"}
- Streak: ${shipStreak} days
- Velocity: ${shipVelocity.toFixed(1)} ships/week
${recentShipTexts.length > 0 ? "- Recent ships:\n" + recentShipTexts.join("\n") : "- No recent ships"}

**Approval Queue:**
- ${queueCount} item${queueCount !== 1 ? "s" : ""} waiting
${queueTitles.length > 0 ? queueTitles.join("\n") : "  (queue is empty)"}

## Active Projects (ranked by current priority)
1. **Hero's Chronicle** — life-RPG SaaS, Oct 2 launch target. Supabase + Next.js.
2. **Personal OS** — this dashboard. Phase 8 shipped.
3. **Metrasens** — day job GTM engineering.
4. **Alchmy** — AI content brand (LinkedIn + newsletter).
5. **Voyager** — gaming content brand.
6. **PG Creative** — LLC + storefront + products.

## Tools Available to You
You have 9 tools to gather context and take action:

**Read tools** (call before making recommendations):
- \`read_ships\` — recent ships, streak, velocity
- \`read_queue\` — pending approval items
- \`read_calendar\` — today's Google Calendar events
- \`read_vitals\` — Whoop recovery score, HRV, sleep quality
- \`read_signals\` — recent self-improvement signals (corrections, confirmations)
- \`read_recent_archive\` — FTS5 search of Claude conversation archive

**Write tools** (use when asked or when you identify a clear action):
- \`propose_action\` — write a decision proposal to the approval queue
- \`add_ship\` — log a shipped item to the ship log
- \`add_queue_item\` — add a quick item to the approval queue

## Behavior Guidelines
- **Always read before recommending.** If asked "what should I do?", call read_vitals, read_calendar, read_queue, and read_ships before answering.
- **Be specific.** Don't say "work on Hero's Chronicle" — say "run the missing migration for the habits streak table (you mentioned it Tuesday)."
- **Surface the constraint.** If recovery is low (< 50), lead with that context when recommending deep work vs. light work.
- **Propose, don't just advise.** If a clear decision emerges, use \`propose_action\` to write it to the queue so it persists.
- **No timelines.** Never suggest "next week" or "eventually." Everything is NOW or NEXT.
- **Cost awareness.** You're running on Sonnet 4.6 with a cached system prompt. Prefer concise, high-signal answers.

## User Context
- PG's email: pgsmith00@gmail.com
- Home: macOS Apple Silicon
- Working directory: ${os.homedir()}/CEREBRUM/personal-os
- Timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`;

  return {
    systemPrompt,
    meta: {
      variant,
      shipCount,
      queueCount,
      timeOfDay: timeStr,
    },
  };
}
