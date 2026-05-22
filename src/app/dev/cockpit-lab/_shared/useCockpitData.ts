"use client";

/**
 * useCockpitData — shared live-data hook for the Cockpit redesign bake-off.
 *
 * Extracted from CockpitView so every /dev/cockpit-lab variant renders the SAME
 * real data (telemetry + activity + daemon control state) and only differs in
 * composition. Same join logic as the production view.
 */

import { useCallback, useEffect, useState } from "react";

export type Telemetry = {
  sessionId: string;
  live: boolean;
  ageMs: number;
  sessionName: string | null;
  modelName: string | null;
  effort: string | null;
  projectLabel: string;
  worktree: string | null;
  branch: string | null;
  contextUsedPct: number;
  exceeds200k: boolean;
  costUsd: number;
  linesAdded: number | null;
  linesRemoved: number | null;
  fastMode: boolean;
  thinking: boolean;
  fiveHour: { usedPercentage: number; resetsAt: number | null } | null;
  sevenDay: { usedPercentage: number; resetsAt: number | null } | null;
};

export type ActivitySession = {
  id: string;
  status: "running" | "idle";
  lastUserMsg?: string;
  currentTool?: string;
};

export type DaemonInfo = {
  running: boolean;
  port: number;
  token: string | null;
  wsBase: string;
  httpBase: string;
};

export type Card = Telemetry & {
  currentTool?: string;
  lastUserMsg?: string;
  activityStatus?: "running" | "idle";
  controllable: boolean;
  running: boolean;
};

async function getJSON<T>(url: string, init?: RequestInit): Promise<T | null> {
  try {
    const r = await fetch(url, { cache: "no-store", ...init });
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch {
    return null;
  }
}

export interface CockpitData {
  cards: Card[];
  daemon: DaemonInfo | null;
  loaded: boolean;
  controllableCount: number;
  runningCount: number;
  refresh: () => Promise<void>;
}

export function useCockpitData(): CockpitData {
  const [cards, setCards] = useState<Card[]>([]);
  const [daemon, setDaemon] = useState<DaemonInfo | null>(null);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    const [tele, acts, dinfo] = await Promise.all([
      getJSON<{ sessions: Telemetry[] }>("/api/cockpit/telemetry"),
      getJSON<{ sessions: ActivitySession[] }>("/api/sessions"),
      getJSON<DaemonInfo>("/api/cockpit/daemon"),
    ]);
    setDaemon(dinfo);

    let controllable = new Set<string>();
    if (dinfo?.running && dinfo.token) {
      const list = await getJSON<{ sessions: { id: string }[] }>(
        `${dinfo.httpBase}/sessions`,
        { headers: { "x-cockpit-token": dinfo.token } },
      );
      if (list) controllable = new Set(list.sessions.map((s) => s.id));
    }

    const actById = new Map((acts?.sessions ?? []).map((s) => [s.id, s]));
    const merged: Card[] = (tele?.sessions ?? []).map((t) => {
      const a = actById.get(t.sessionId);
      return {
        ...t,
        currentTool: a?.currentTool,
        lastUserMsg: a?.lastUserMsg,
        activityStatus: a?.status,
        controllable: controllable.has(t.sessionId),
        running: a?.status === "running" || t.ageMs < 60_000,
      };
    });
    merged.sort(
      (x, y) =>
        Number(y.controllable) - Number(x.controllable) || x.ageMs - y.ageMs,
    );
    setCards(merged);
    setLoaded(true);
  }, []);

  useEffect(() => {
    refresh();
    const iv = setInterval(refresh, 3000);
    return () => clearInterval(iv);
  }, [refresh]);

  return {
    cards,
    daemon,
    loaded,
    controllableCount: cards.filter((c) => c.controllable).length,
    runningCount: cards.filter((c) => c.running).length,
    refresh,
  };
}

/** Demo cards so the lab is legible even with zero live sessions. */
export function demoCards(): Card[] {
  const base = (over: Partial<Card>): Card => ({
    sessionId: Math.random().toString(36).slice(2),
    live: true,
    ageMs: 120_000,
    sessionName: null,
    modelName: "opus-4.7",
    effort: null,
    projectLabel: "project",
    worktree: null,
    branch: "main",
    contextUsedPct: 40,
    exceeds200k: false,
    costUsd: 1.2,
    linesAdded: 0,
    linesRemoved: 0,
    fastMode: false,
    thinking: false,
    fiveHour: { usedPercentage: 30, resetsAt: null },
    sevenDay: { usedPercentage: 12, resetsAt: null },
    controllable: true,
    running: true,
    ...over,
  });
  return [
    base({
      projectLabel: "personal-os",
      branch: "worktree-cockpit",
      contextUsedPct: 62,
      currentTool: "Edit",
      running: true,
      costUsd: 4.75,
    }),
    base({
      projectLabel: "heros-chronicle",
      contextUsedPct: 28,
      activityStatus: "idle",
      running: false,
      controllable: false,
      lastUserMsg: "wire the journal export",
    }),
    base({
      projectLabel: "alchmy",
      contextUsedPct: 81,
      currentTool: "Bash",
      costUsd: 2.1,
      running: true,
    }),
    base({
      projectLabel: "metrasens",
      contextUsedPct: 15,
      activityStatus: "idle",
      running: false,
      controllable: false,
    }),
  ];
}
