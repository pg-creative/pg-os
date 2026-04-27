import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const VALID_AGENTS = new Set([
  "session-review",
  "morning-briefing",
  "weekly-meta-audit",
  "memory-hygiene",
  "description-optimizer",
]);

export async function GET(req: NextRequest) {
  const agent = req.nextUrl.searchParams.get("agent");
  if (!agent || !VALID_AGENTS.has(agent)) {
    return NextResponse.json({ error: "invalid_agent" }, { status: 400 });
  }
  const linesRaw = req.nextUrl.searchParams.get("lines");
  let lines = linesRaw ? parseInt(linesRaw, 10) : 30;
  if (!Number.isFinite(lines) || lines < 1) lines = 30;
  if (lines > 200) lines = 200;

  const today = new Date().toISOString().slice(0, 10);
  const logFile = path.join(os.homedir(), ".claude", "logs", `${agent}-${today}.log`);

  try {
    const raw = await fs.readFile(logFile, "utf8");
    const all = raw.split("\n");
    const tail = all.slice(-lines).join("\n");
    return NextResponse.json({ logFile, tail, lines: all.length });
  } catch {
    return NextResponse.json({ logFile, tail: "", lines: 0, missing: true });
  }
}
