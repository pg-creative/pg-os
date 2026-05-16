"use client";
import { useEffect, useState, useMemo, useCallback } from "react";
import type {
  BrainEntry,
  BrainFilterState,
  BrainStats,
  Route,
  FileType,
  SourceQuality,
} from "@/lib/brain/types";

interface UseBrainEntriesResult {
  entries: BrainEntry[];
  filtered: BrainEntry[];
  stats: BrainStats;
  allTags: string[];
  filter: BrainFilterState;
  setFilter: (
    patch:
      | Partial<BrainFilterState>
      | ((s: BrainFilterState) => BrainFilterState),
  ) => void;
  loading: boolean;
  error: string | null;
  refresh: () => void;
  notionConfigured: boolean | null;
}

const DEFAULT_FILTER: BrainFilterState = {
  routes: [],
  fileTypes: [],
  tags: [],
  sourceQualities: [],
  seedlingOnly: false,
  query: "",
  sortBy: "score-desc",
};

export function useBrainEntries(): UseBrainEntriesResult {
  const [entries, setEntries] = useState<BrainEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilterState] = useState<BrainFilterState>(DEFAULT_FILTER);
  const [notionConfigured, setNotionConfigured] = useState<boolean | null>(
    null,
  );
  const [lastSyncTime, setLastSyncTime] = useState<string | undefined>(
    undefined,
  );

  const refresh = useCallback(async () => {
    try {
      const r = await fetch("/api/brain/entries", { cache: "no-store" });
      if (!r.ok) throw new Error(`fetch failed: ${r.status}`);
      const data = await r.json();
      setEntries(data.entries ?? []);
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? "failed to load entries");
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    refresh();
  }, [refresh]);

  // SSE: live update on local md changes
  useEffect(() => {
    const es = new EventSource("/api/brain/events");
    es.addEventListener("refresh", () => refresh());
    es.addEventListener("error", () => {
      /* swallow; reconnects automatically */
    });
    return () => es.close();
  }, [refresh]);

  // Notion config probe (one-shot)
  useEffect(() => {
    fetch("/api/brain/notion-sync")
      .then((r) => r.json())
      .then((d) => setNotionConfigured(Boolean(d.configured)))
      .catch(() => setNotionConfigured(false));
  }, []);

  // Notion poll every 30s
  useEffect(() => {
    if (!notionConfigured) return;
    const tick = async () => {
      try {
        const r = await fetch("/api/brain/notion-sync", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ since: lastSyncTime }),
        });
        const data = await r.json();
        if (data.ok && data.latest) setLastSyncTime(data.latest);
        if (data.ok && data.changed > 0) {
          // local md got updated; SSE will fire its own refresh, but force one in case
          refresh();
        }
      } catch {
        /* swallow */
      }
    };
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [notionConfigured, lastSyncTime, refresh]);

  const setFilter = useCallback(
    (
      patch:
        | Partial<BrainFilterState>
        | ((s: BrainFilterState) => BrainFilterState),
    ) => {
      setFilterState((prev) =>
        typeof patch === "function" ? patch(prev) : { ...prev, ...patch },
      );
    },
    [],
  );

  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const e of entries) {
      for (const t of e.frontmatter.tags ?? []) set.add(t);
    }
    return Array.from(set).sort();
  }, [entries]);

  const stats: BrainStats = useMemo(() => {
    const init: BrainStats = {
      total: entries.length,
      byRoute: { second_brain: 0, queue: 0, kill: 0 },
      byFileType: {
        sources: 0,
        concepts: 0,
        playbooks: 0,
        synthesis: 0,
        queue: 0,
      },
      bySourceQuality: { verified: 0, unverified: 0, hype: 0 },
      seedlingCount: 0,
      queueCount: 0,
      averageScore: 0,
    };
    let sumScore = 0;
    let count = 0;
    for (const e of entries) {
      const route = (e.frontmatter.route as Route) ?? "second_brain";
      init.byRoute[route] = (init.byRoute[route] ?? 0) + 1;
      const ft = e.fileType as FileType;
      init.byFileType[ft] = (init.byFileType[ft] ?? 0) + 1;
      const sq = e.frontmatter.source_quality as SourceQuality | undefined;
      if (sq) init.bySourceQuality[sq] = (init.bySourceQuality[sq] ?? 0) + 1;
      if (e.frontmatter.tags?.includes("seedling")) init.seedlingCount++;
      if (route === "queue" || e.fileType === "queue") init.queueCount++;
      if (typeof e.frontmatter.score === "number") {
        sumScore += e.frontmatter.score;
        count++;
      }
    }
    init.averageScore =
      count > 0 ? Math.round((sumScore / count) * 10) / 10 : 0;
    return init;
  }, [entries]);

  const filtered = useMemo(() => {
    let out = entries;
    if (filter.routes.length)
      out = out.filter((e) =>
        filter.routes.includes(
          (e.frontmatter.route as Route) ?? "second_brain",
        ),
      );
    if (filter.fileTypes.length)
      out = out.filter((e) =>
        filter.fileTypes.includes(e.fileType as FileType),
      );
    if (filter.tags.length)
      out = out.filter((e) =>
        filter.tags.some((t) => (e.frontmatter.tags ?? []).includes(t)),
      );
    if (filter.sourceQualities.length)
      out = out.filter((e) =>
        e.frontmatter.source_quality
          ? filter.sourceQualities.includes(
              e.frontmatter.source_quality as SourceQuality,
            )
          : false,
      );
    if (filter.seedlingOnly)
      out = out.filter((e) => e.frontmatter.tags?.includes("seedling"));
    if (filter.query.trim()) {
      const q = filter.query.trim().toLowerCase();
      out = out.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          (e.frontmatter.tags ?? []).some((t) => t.toLowerCase().includes(q)) ||
          e.body.toLowerCase().includes(q),
      );
    }
    const sorted = [...out];
    sorted.sort((a, b) => {
      const sa = a.frontmatter.score ?? -1;
      const sb = b.frontmatter.score ?? -1;
      switch (filter.sortBy) {
        case "score-desc":
          return sb - sa;
        case "score-asc":
          return sa - sb;
        case "date-desc":
          return b.modifiedAt - a.modifiedAt;
        case "date-asc":
          return a.modifiedAt - b.modifiedAt;
        case "title":
          return a.title.localeCompare(b.title);
      }
    });
    return sorted;
  }, [entries, filter]);

  return {
    entries,
    filtered,
    stats,
    allTags,
    filter,
    setFilter,
    loading,
    error,
    refresh,
    notionConfigured,
  };
}
