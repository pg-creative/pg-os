/**
 * briefing.ts — Morning Briefing assembly + narration.
 *
 * Reads live OS state (calendar, queue, projects, yesterday's journal),
 * calls Anthropic for the narration, returns the JSON shape that
 * /briefing renders. Falls back to a static greeting when Anthropic or
 * any input source is unavailable.
 *
 * Voice rules are baked into the system prompt + defensively post-processed
 * (strip exclamation marks). See ~/.claude/rules/ai-tells-essential.md.
 */

import Anthropic from "@anthropic-ai/sdk";
import { listQueue } from "./queueStore";
import { ACTIVE_PROJECTS } from "./projects";
import { listProjectStates } from "./projectState";
import { listEventsAcrossCalendars } from "./calendarService";
import { getTokens } from "./tokenStore";
import { getDaySnapshot } from "./habits";

export interface BriefingAction {
  label: string;
  target: string | null;
}

export interface Briefing {
  greeting: string;
  subline: string;
  narration: string; // HTML — only <p> and <em> allowed
  actions: BriefingAction[];
  generated: "anthropic" | "fallback";
}

interface AssembledInputs {
  date: string;
  weekday: string;
  monthDay: string;
  events: { summary: string; start: string; allDay: boolean }[];
  queue: { title: string }[];
  projects: {
    name: string;
    sub: string;
    lastCommitMsg: string | null;
    uncommittedCount: number;
    daysUntilDeadline: number | null;
  }[];
  yesterdayJournal: string | null;
}

function todayLocal(): { iso: string; weekday: string; monthDay: string } {
  const d = new Date();
  const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const weekday = d.toLocaleDateString("en-US", { weekday: "long" });
  const monthDay = d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  });
  return { iso, weekday, monthDay };
}

function yesterdayIso(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

async function listTodayEvents(): Promise<AssembledInputs["events"]> {
  try {
    const tokens = await getTokens("google");
    if (!tokens?.refreshToken) return [];
    const now = new Date();
    const from = new Date(now);
    from.setHours(0, 0, 0, 0);
    const to = new Date(now);
    to.setHours(23, 59, 59, 999);
    const events = await listEventsAcrossCalendars(
      tokens.refreshToken,
      from,
      to,
      {
        maxResults: 12,
      },
    );
    return events.map((e) => ({
      summary: e.summary,
      start: e.start,
      allDay: e.allDay,
    }));
  } catch {
    return [];
  }
}

async function topThreeProjects(): Promise<AssembledInputs["projects"]> {
  try {
    const states = await listProjectStates();
    return [...states]
      .sort((a, b) => {
        const ad = a.daysUntilDeadline;
        const bd = b.daysUntilDeadline;
        if (ad != null && bd != null) return ad - bd;
        if (ad != null) return -1;
        if (bd != null) return 1;
        return b.uncommittedCount - a.uncommittedCount;
      })
      .slice(0, 3)
      .map((p) => ({
        name: p.name,
        sub: p.sub,
        lastCommitMsg: p.lastCommitMsg,
        uncommittedCount: p.uncommittedCount,
        daysUntilDeadline: p.daysUntilDeadline,
      }));
  } catch {
    return ACTIVE_PROJECTS.slice(0, 3).map((p) => ({
      name: p.name,
      sub: p.sub,
      lastCommitMsg: null,
      uncommittedCount: 0,
      daysUntilDeadline: null,
    }));
  }
}

async function topThreeQueue(): Promise<AssembledInputs["queue"]> {
  try {
    const items = await listQueue();
    return items.slice(0, 3).map((q) => ({ title: q.title }));
  } catch {
    return [];
  }
}

async function yesterdayJournal(): Promise<string | null> {
  try {
    const snap = await getDaySnapshot(yesterdayIso());
    if (!snap?.journal) return null;
    const t = snap.journal.cleaned_text ?? snap.journal.raw_text ?? "";
    return t.slice(0, 360);
  } catch {
    return null;
  }
}

async function assembleInputs(): Promise<AssembledInputs> {
  const { iso, weekday, monthDay } = todayLocal();
  const [events, projects, queue, journal] = await Promise.all([
    listTodayEvents(),
    topThreeProjects(),
    topThreeQueue(),
    yesterdayJournal(),
  ]);
  return {
    date: iso,
    weekday,
    monthDay,
    events,
    queue,
    projects,
    yesterdayJournal: journal,
  };
}

const SYSTEM_PROMPT = `You write the Morning Briefing for PG's personal OS dashboard.

Voice rules — non-negotiable:
- Warm but quiet. Studio Ghibli morning, not corporate dashboard.
- Second-person elided. Don't write "you have three meetings" — write "Three meetings on the calendar."
- One italic accent per sentence at most, via <em>word</em> on a single noun or verb. Use sparingly; not every sentence needs one.
- No exclamation marks anywhere. No "today's the day". No "let's dive in". No "embark", "delve", "tapestry", "beacon", "testament", "treasure trove", "realm", "indelible", "bespoke", "endeavor".
- Maximum one em dash and one semicolon in the entire narration.
- Use contractions. Include the occasional fragment.
- Take a stance. Don't hedge with "may" or "might" everywhere.

Output a single JSON object — no markdown fences, no preamble — matching exactly:
{
  "greeting": "Good morning, Patrick" or a quieter variant,
  "subline": one short line naming the weekday and how the day leans,
  "narration": "<p>...</p><p>...</p>" — exactly two short paragraphs, 5 to 7 sentences total, that name what is actually waiting today (specific projects, specific meetings, specific queue items). Plain HTML, only <p> and <em> allowed.,
  "actions": [up to 3 short labels with optional target paths — surface the top three places to land first]
}

Each action target should be a path like "/projects/<id>", "/?tab=flow", or "/?tab=projects". If unsure, set target to null.`;

function buildUserPrompt(inputs: AssembledInputs): string {
  const events =
    inputs.events.length === 0
      ? "(calendar empty or unauthed)"
      : inputs.events
          .map((e) => {
            if (e.allDay) return `  - ${e.summary} (all day)`;
            const t = e.start
              ? new Date(e.start).toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
                })
              : "";
            return `  - ${t} ${e.summary}`;
          })
          .join("\n");

  const queue =
    inputs.queue.length === 0
      ? "(queue empty)"
      : inputs.queue.map((q) => `  - ${q.title}`).join("\n");

  const projects = inputs.projects
    .map((p) => {
      const dline =
        p.daysUntilDeadline != null
          ? ` · ${p.daysUntilDeadline}d to deadline`
          : "";
      const last = p.lastCommitMsg ? ` · last: "${p.lastCommitMsg}"` : "";
      const dirty =
        p.uncommittedCount > 0 ? ` · ${p.uncommittedCount} uncommitted` : "";
      return `  - ${p.name} (${p.sub})${dline}${last}${dirty}`;
    })
    .join("\n");

  const journal = inputs.yesterdayJournal
    ? `\n\nYesterday's journal: "${inputs.yesterdayJournal}"`
    : "";

  return `Date: ${inputs.weekday}, ${inputs.monthDay} (${inputs.date})

Today's calendar:
${events}

Approval queue (top 3):
${queue}

Active projects (top 3 by priority):
${projects}${journal}

Write the briefing as a single JSON object matching the schema. No code fences.`;
}

let _client: Anthropic | null = null;
function getClient(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (!_client)
    _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _client;
}

function staticFallback(
  date: string,
  weekday: string,
  monthDay: string,
): Briefing {
  void date;
  return {
    greeting: "Good morning, Patrick",
    subline: `${weekday}, ${monthDay} — the day is open.`,
    narration:
      "<p>Quiet start. The OS hasn't pulled today's threads from <em>elsewhere</em> yet, so the picture is still loading.</p>" +
      "<p>Pick a project. Ship one thing. The rest will surface as the day moves.</p>",
    actions: [],
    generated: "fallback",
  };
}

function sanitize(s: string): string {
  return s.replace(/!/g, "").replace(/\s+/g, " ").trim();
}

export async function buildBriefing(): Promise<Briefing> {
  const inputs = await assembleInputs();
  const client = getClient();
  if (!client)
    return staticFallback(inputs.date, inputs.weekday, inputs.monthDay);

  try {
    const res = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 800,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildUserPrompt(inputs) }],
    });

    const text = res.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { text: string }).text)
      .join("")
      .trim();

    const cleaned = text
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/```\s*$/g, "")
      .trim();
    const parsed = JSON.parse(cleaned) as Partial<Briefing>;
    if (!parsed.greeting || !parsed.narration)
      throw new Error("malformed_response");

    return {
      greeting: sanitize(parsed.greeting),
      subline: sanitize(
        parsed.subline ?? `${inputs.weekday}, ${inputs.monthDay}`,
      ),
      narration: parsed.narration.replace(/!/g, ""),
      actions: (parsed.actions ?? [])
        .slice(0, 3)
        .map((a) => ({
          label: sanitize(a.label ?? ""),
          target: a.target ?? null,
        }))
        .filter((a) => a.label.length > 0),
      generated: "anthropic",
    };
  } catch {
    return staticFallback(inputs.date, inputs.weekday, inputs.monthDay);
  }
}
