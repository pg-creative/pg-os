/**
 * Rule engine — iterates RULES, applies each according to its schedule, and
 * either emits queue files (real run) or returns a summary (dry run).
 *
 * Per-rule errors are caught so one bad rule doesn't take down the cron tick.
 *
 * Output side-effects: writes idempotent queue files at
 *   ~/.pg-os/queue/cross-tab-<rule.id>-<YYYYMMDD>.md
 * with frontmatter (title, source, options, created_at). If the file already
 * exists for today, the rule run is treated as a no-op (already fired).
 */
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { RULES } from "./rules/index";

export type RuleContext = { now: Date };

export type RuleAction = {
  kind: "queue_item";
  title: string;
  source: string;
  options?: string[];
  note?: string;
};

export type Rule = {
  id: string;
  name: string;
  schedule: "hourly" | "daily" | "weekly:sun";
  evaluate: (ctx: RuleContext) => Promise<RuleAction | null>;
};

export type RuleResult = {
  rule_id: string;
  rule_name: string;
  schedule: Rule["schedule"];
  scheduled_now: boolean;
  fired: boolean;
  dry: boolean;
  action?: RuleAction;
  written_path?: string;
  skipped_reason?: "not_scheduled" | "already_fired_today" | "no_action";
  error?: string;
};

const QUEUE_DIR = path.join(os.homedir(), ".pg-os", "queue");

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function ymd(d: Date): string {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}

function isScheduledNow(rule: Rule, now: Date): boolean {
  if (rule.schedule === "hourly") return true;
  if (rule.schedule === "daily") return now.getHours() === 0;
  if (rule.schedule === "weekly:sun") return now.getDay() === 0;
  return false;
}

async function ensureQueueDir(): Promise<void> {
  await fs.mkdir(QUEUE_DIR, { recursive: true, mode: 0o700 });
}

async function fileExists(p: string): Promise<boolean> {
  try {
    await fs.stat(p);
    return true;
  } catch {
    return false;
  }
}

function escapeMeta(value: string): string {
  return value.replace(/"/g, '\\"');
}

function formatFrontmatter(
  action: RuleAction,
  createdAt: number,
): string {
  const lines = [
    "---",
    `title: "${escapeMeta(action.title)}"`,
    `source: ${action.source}`,
  ];
  if (action.options && action.options.length > 0) {
    lines.push(
      `options: [${action.options
        .map((o) => `"${escapeMeta(o)}"`)
        .join(", ")}]`,
    );
  }
  lines.push(`created_at: ${createdAt}`);
  lines.push("---");
  return lines.join("\n");
}

async function writeQueueFile(
  ruleId: string,
  action: RuleAction,
  now: Date,
): Promise<{ written: boolean; path: string }> {
  await ensureQueueDir();
  const filename = `cross-tab-${ruleId}-${ymd(now)}.md`;
  const target = path.join(QUEUE_DIR, filename);
  if (await fileExists(target)) {
    return { written: false, path: target };
  }
  const frontmatter = formatFrontmatter(action, now.getTime());
  const body = action.note ? `\n${action.note}\n` : "\n";
  await fs.writeFile(target, `${frontmatter}\n${body}`, { mode: 0o600 });
  return { written: true, path: target };
}

export async function runRules(opts: {
  now?: Date;
  dryRun?: boolean;
}): Promise<RuleResult[]> {
  const now = opts.now ?? new Date();
  const dryRun = !!opts.dryRun;
  const results: RuleResult[] = [];

  for (const rule of RULES) {
    const scheduled = isScheduledNow(rule, now);
    if (!scheduled) {
      results.push({
        rule_id: rule.id,
        rule_name: rule.name,
        schedule: rule.schedule,
        scheduled_now: false,
        fired: false,
        dry: dryRun,
        skipped_reason: "not_scheduled",
      });
      continue;
    }
    try {
      const action = await rule.evaluate({ now });
      if (!action) {
        results.push({
          rule_id: rule.id,
          rule_name: rule.name,
          schedule: rule.schedule,
          scheduled_now: true,
          fired: false,
          dry: dryRun,
          skipped_reason: "no_action",
        });
        continue;
      }
      if (dryRun) {
        results.push({
          rule_id: rule.id,
          rule_name: rule.name,
          schedule: rule.schedule,
          scheduled_now: true,
          fired: true,
          dry: true,
          action,
        });
        continue;
      }
      // reconcileJanitor handles its own side-effects; treat its action.kind
      // (still 'queue_item' for type-uniformity) as a status only — the rule
      // already moved files. We don't write a queue item for janitor.
      if (rule.id === "reconcile-janitor") {
        results.push({
          rule_id: rule.id,
          rule_name: rule.name,
          schedule: rule.schedule,
          scheduled_now: true,
          fired: true,
          dry: false,
          action,
        });
        continue;
      }
      const { written, path: writtenPath } = await writeQueueFile(rule.id, action, now);
      results.push({
        rule_id: rule.id,
        rule_name: rule.name,
        schedule: rule.schedule,
        scheduled_now: true,
        fired: written,
        dry: false,
        action,
        written_path: writtenPath,
        skipped_reason: written ? undefined : "already_fired_today",
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "unknown error";
      results.push({
        rule_id: rule.id,
        rule_name: rule.name,
        schedule: rule.schedule,
        scheduled_now: true,
        fired: false,
        dry: dryRun,
        error: msg,
      });
    }
  }
  return results;
}
