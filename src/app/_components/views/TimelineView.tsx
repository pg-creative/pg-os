"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TimelineFilters } from "../TimelineFilters";
import { TimelineRow } from "../TimelineRow";
import { TabShell } from "../bento/TabShell";
import { BentoBox } from "../bento/BentoBox";
import { useEmaki } from "../bento/emakiContext";

export type TimelineSource =
  | "ship"
  | "queue"
  | "agent_run"
  | "decision"
  | "telegram"
  | "capture";

export type TimelineRow = {
  source: TimelineSource;
  id: string;
  timestamp: string;
  title: string;
  summary?: string;
  body_md?: string;
  meta?: string;
  status?: string;
  href?: string;
  agent?: string;
  decision?: string | null;
  cost_usd?: number | null;
  model?: string | null;
};

type TimelineResponse = {
  days: number;
  limit: number;
  counts: Partial<Record<TimelineSource | "total", number>>;
  rows: TimelineRow[];
  nextCursor: string | null;
  hasMore: boolean;
};

const PAGE_SIZE = 50;
const WINDOW_DAYS = 14;
const FILTER_PARAM = "filters";

function readFiltersFromUrl(): Set<TimelineSource> {
  if (typeof window === "undefined") return new Set();
  const raw = new URLSearchParams(window.location.search).get(FILTER_PARAM);
  if (!raw) return new Set();
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean) as TimelineSource[],
  );
}

function syncFiltersToUrl(filters: Set<TimelineSource>) {
  if (typeof window === "undefined") return;
  try {
    const url = new URL(window.location.href);
    if (filters.size === 0) url.searchParams.delete(FILTER_PARAM);
    else url.searchParams.set(FILTER_PARAM, Array.from(filters).join(","));
    window.history.replaceState(null, "", url);
  } catch {
    /* SSR or restricted */
  }
}

export function TimelineView() {
  const [filters, setFilters] = useState<Set<TimelineSource>>(new Set());
  const [data, setData] = useState<TimelineResponse | null>(null);
  const [olderRows, setOlderRows] = useState<TimelineRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const lastIdsRef = useRef<Set<string>>(new Set());

  // Hydrate filters from URL on mount
  useEffect(() => {
    setFilters(readFiltersFromUrl());
    const onPop = () => setFilters(readFiltersFromUrl());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const filterParam = useMemo(() => Array.from(filters).join(","), [filters]);

  const fetchTimeline = useCallback(
    async (signal?: AbortSignal) => {
      const qs = new URLSearchParams({
        days: String(WINDOW_DAYS),
        limit: String(PAGE_SIZE),
      });
      if (filterParam) qs.set("filters", filterParam);
      const res = await fetch(`/api/timeline?${qs.toString()}`, { signal });
      if (!res.ok) throw new Error(`timeline fetch failed: ${res.status}`);
      return (await res.json()) as TimelineResponse;
    },
    [filterParam],
  );

  // Initial + filter-change load
  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    setError(null);
    setOlderRows([]);
    fetchTimeline(ctrl.signal)
      .then((d) => {
        setData(d);
        lastIdsRef.current = new Set(d.rows.map((r) => r.id));
        setLoading(false);
      })
      .catch((e: Error) => {
        if (e.name === "AbortError") return;
        setError(e.message);
        setLoading(false);
      });
    return () => ctrl.abort();
  }, [fetchTimeline]);

  // SSE subscription — refetch on event without full re-render
  useEffect(() => {
    if (typeof window === "undefined") return;
    let es: EventSource | null = null;
    try {
      es = new EventSource("/api/timeline/events");
    } catch {
      return;
    }
    let debounce: ReturnType<typeof setTimeout> | null = null;
    const refresh = () => {
      if (debounce) clearTimeout(debounce);
      debounce = setTimeout(() => {
        fetchTimeline()
          .then((d) => {
            setData((prev) => {
              const prevIds = new Set(prev?.rows.map((r) => r.id) ?? []);
              const fresh = d.rows.filter((r) => !prevIds.has(r.id));
              if (fresh.length > 0) {
                setNewIds(new Set(fresh.map((r) => r.id)));
                // Clear stagger marks after animation window
                window.setTimeout(() => setNewIds(new Set()), 1400);
              }
              return d;
            });
            lastIdsRef.current = new Set(d.rows.map((r) => r.id));
          })
          .catch(() => {
            /* SSE refresh errors are non-fatal */
          });
      }, 200);
    };
    es.addEventListener("refresh", refresh);
    es.onerror = () => {
      /* let browser auto-reconnect */
    };
    return () => {
      if (debounce) clearTimeout(debounce);
      es?.close();
    };
  }, [fetchTimeline]);

  const handleToggle = useCallback((id: TimelineSource | "all") => {
    setFilters((prev) => {
      const next = new Set(prev);
      if (id === "all") {
        next.clear();
      } else if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      syncFiltersToUrl(next);
      return next;
    });
  }, []);

  const loadOlder = useCallback(async () => {
    if (!data?.nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const qs = new URLSearchParams({
        days: String(WINDOW_DAYS),
        limit: String(PAGE_SIZE),
        before: data.nextCursor,
      });
      if (filterParam) qs.set("filters", filterParam);
      const res = await fetch(`/api/timeline?${qs.toString()}`);
      if (!res.ok) throw new Error(`older fetch failed: ${res.status}`);
      const next = (await res.json()) as TimelineResponse;
      setOlderRows((prev) => [...prev, ...next.rows]);
      setData((prev) =>
        prev
          ? { ...prev, nextCursor: next.nextCursor, hasMore: next.hasMore }
          : next,
      );
    } catch {
      /* swallow — user can retry */
    } finally {
      setLoadingMore(false);
    }
  }, [data, filterParam, loadingMore]);

  const allRows = useMemo(
    () => [...(data?.rows ?? []), ...olderRows],
    [data, olderRows],
  );
  const counts = data?.counts ?? {};
  const total = counts.total ?? allRows.length;

  const eyebrow = `CHRONICLE // ${WINDOW_DAYS}-DAY WINDOW`;

  return (
    <TabShell
      title="Timeline"
      eyebrow={eyebrow}
      actions={
        <TimelineFilters
          selected={filters}
          counts={counts}
          onToggle={handleToggle}
        />
      }
    >
      <TimelineFeed
        loading={loading}
        error={error}
        allRows={allRows}
        newIds={newIds}
        hasMore={data?.hasMore ?? false}
        loadingMore={loadingMore}
        loadOlder={loadOlder}
        total={total}
      />
    </TabShell>
  );
}

// Inner component so useEmaki() runs inside EmakiProvider (TabShell wraps it)
function TimelineFeed({
  loading,
  error,
  allRows,
  newIds,
  hasMore,
  loadingMore,
  loadOlder,
  total,
}: {
  loading: boolean;
  error: string | null;
  allRows: TimelineRow[];
  newIds: Set<string>;
  hasMore: boolean;
  loadingMore: boolean;
  loadOlder: () => void;
  total: number;
}) {
  const { tk } = useEmaki();

  if (loading) {
    return (
      <BentoBox cols={12} eyebrow="01 // EVENTS" kanji="時系列">
        <div
          role="status"
          style={{
            color: tk.textMuted,
            fontStyle: "italic",
            padding: "20px 0",
            textAlign: "center",
            fontFamily: "var(--mono), ui-monospace, monospace",
            fontSize: "var(--text-xs)",
          }}
        >
          loading the thread...
        </div>
      </BentoBox>
    );
  }

  if (error) {
    return (
      <BentoBox cols={12} eyebrow="01 // ERROR" kanji="時系列">
        <div
          role="alert"
          style={{
            color: tk.foxfire,
            fontFamily: "var(--mono), ui-monospace, monospace",
            fontSize: "var(--text-xs)",
            padding: "20px 0",
            textAlign: "center",
          }}
        >
          timeline unavailable — {error}
        </div>
      </BentoBox>
    );
  }

  if (allRows.length === 0) {
    return (
      <BentoBox cols={12} eyebrow="01 // EVENTS" kanji="時系列">
        <div
          style={{
            color: tk.textMuted,
            fontStyle: "italic",
            padding: "20px 0",
            textAlign: "center",
            fontSize: "var(--text-sm)",
          }}
        >
          Nothing yet. Stay tuned.
        </div>
      </BentoBox>
    );
  }

  return (
    <BentoBox
      cols={12}
      eyebrow="01 // EVENTS"
      kanji="時系列"
      count={`${total} events`}
      scroll
      style={{ maxHeight: "calc(100vh - 260px)", minHeight: 320 }}
    >
      <ol
        role="feed"
        aria-busy={loadingMore}
        aria-label="Unified activity timeline"
        style={{ listStyle: "none", margin: 0, padding: 0 }}
      >
        {allRows.map((row) => (
          <TimelineRow key={row.id} row={row} isNew={newIds.has(row.id)} />
        ))}
      </ol>

      {hasMore ? (
        <div style={{ paddingTop: 16, textAlign: "center" }}>
          <button
            type="button"
            onClick={loadOlder}
            disabled={loadingMore}
            style={{
              background: "transparent",
              border: `1px solid ${tk.divider}`,
              borderRadius: 6,
              color: loadingMore ? tk.textMuted : tk.accent,
              fontFamily: "var(--mono), ui-monospace, monospace",
              fontSize: "var(--text-xs)",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              padding: "6px 18px",
              cursor: loadingMore ? "default" : "pointer",
              opacity: loadingMore ? 0.6 : 1,
              transition: "opacity 160ms ease",
            }}
          >
            {loadingMore ? "loading older..." : "load older"}
          </button>
        </div>
      ) : (
        <div
          style={{
            paddingTop: 16,
            textAlign: "center",
            fontFamily: "var(--mono), ui-monospace, monospace",
            fontSize: "var(--text-2xs)",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: tk.textMuted,
          }}
        >
          end of the 14-day window.
        </div>
      )}
    </BentoBox>
  );
}
