"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TimelineFilters } from "../TimelineFilters";
import { TimelineRow } from "../TimelineRow";

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

  const allRows = useMemo(() => [...(data?.rows ?? []), ...olderRows], [data, olderRows]);
  const counts = data?.counts ?? {};

  return (
    <div className="view view-timeline timeline-view">
      <div className="view-header">
        <h1 className="view-title">
          Timeline · <em>fourteen</em> days
        </h1>
        <div className="view-sub">EVERY SURFACE · ONE THREAD</div>
      </div>

      <TimelineFilters selected={filters} counts={counts} onToggle={handleToggle} />

      {loading ? (
        <div className="timeline-loading" role="status">
          loading the thread…
        </div>
      ) : error ? (
        <div className="timeline-error" role="alert">
          timeline unavailable — {error}
        </div>
      ) : allRows.length === 0 ? (
        <div className="timeline-empty">
          <p className="timeline-empty-text">
            <em>Nothing</em> yet. Stay tuned.
          </p>
        </div>
      ) : (
        <>
          <ol
            className="timeline-feed"
            role="feed"
            aria-busy={loadingMore}
            aria-label="Unified activity timeline"
          >
            {allRows.map((row) => (
              <TimelineRow key={row.id} row={row} isNew={newIds.has(row.id)} />
            ))}
          </ol>

          {data?.hasMore ? (
            <div className="timeline-loadmore-wrap">
              <button
                type="button"
                className="timeline-loadmore"
                onClick={loadOlder}
                disabled={loadingMore}
              >
                {loadingMore ? "loading older…" : "load older"}
              </button>
            </div>
          ) : (
            <div className="timeline-end">end of the 14-day window.</div>
          )}
        </>
      )}
    </div>
  );
}
