import { NextResponse } from "next/server";
import { getSkillPerformance, getActiveRules } from "@/lib/claudeStore";

export async function GET() {
  const events = await getSkillPerformance(500);
  const counts = new Map<string, number>();
  for (const e of events) {
    if (e.event !== "invoked") continue;
    counts.set(e.skill, (counts.get(e.skill) ?? 0) + 1);
  }
  const topSkills = Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  const ruleFiles = await getActiveRules();
  const rules = ruleFiles.map((f) => ({
    file: f,
    title: f
      .replace(/\.md$/, "")
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" "),
  }));

  return NextResponse.json({
    events: events.slice(-100),
    topSkills,
    totalInvocations: events.filter((e) => e.event === "invoked").length,
    rules,
  });
}
