"use client";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useMode } from "../ModeProvider";
import { type BrandMode, MODE_CONFIG, applyModeFilter } from "../../../lib/modes";
import { Skeleton } from "../Skeleton";
import { createBrowserSupabaseClient } from "../../../lib/realtimeBrowser";
import { subscribeMultipleTables } from "../../../lib/realtime";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { RealtimeConfig } from "../../api/realtime/config/route";
import { DecideDialog } from "../flow/DecideDialog";
import { TriageMode } from "../flow/TriageMode";

// ── Types ────────────────────────────────────────────────────────────────────

interface Ship {
  id: number;
  text: string;
  context: string | null;
  created_at: number;
}

interface ShipsData {
  ships: Ship[];
  streak: number;
  velocity: number;
  last30: Array<{ day: string; count: number }>;
  shippedToday: boolean;
}

interface QueueItem {
  id: string;
  title: string;
  source?: string;
  options?: string[];
  created_at: number;
  updated_at: number;
  note?: string;
}

const PROJECTS = [
  { value: "", label: "(none)" },
  { value: "metrasens", label: "metrasens" },
  { value: "heros-chronicle", label: "heros-chronicle" },
  { value: "pg-creative", label: "pg-creative" },
  { value: "voyager", label: "voyager" },
  { value: "personal-os", label: "personal-os" },
  { value: "career-ops", label: "career-ops" },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function relTime(ms: number): string {
  const diff = Date.now() - ms;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`;
  const days = Math.floor(diff / 86_400_000);
  if (days < 7) return `${days}d ago`;
  const d = new Date(ms);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function streakClass(n: number): string {
  if (n >= 7) return "fl-streak ember";
  if (n >= 3) return "fl-streak gold";
  if (n >= 1) return "fl-streak amber";
  return "fl-streak muted";
}

function waitClass(createdAt: number): string {
  const days = Math.floor((Date.now() - createdAt) / 86_400_000);
  if (days >= 14) return "fl-qwait ember";
  if (days >= 7) return "fl-qwait amber";
  return "fl-qwait muted";
}

function waitLabel(createdAt: number): string {
  const days = Math.floor((Date.now() - createdAt) / 86_400_000);
  return `waiting ${days}d`;
}

// ── Ship Log Card ─────────────────────────────────────────────────────────────

function ShipLogCard({ brand }: { brand: BrandMode | null }) {
  const [shipsData, setShipsData] = useState<ShipsData | null>(null);
  const [text, setText] = useState("");
  const [context, setContext] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const fetchShips = useCallback(async () => {
    try {
      const res = await fetch("/api/ships", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load ships");
      setShipsData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    }
  }, []);

  useEffect(() => { fetchShips(); }, [fetchShips]);

  // ── Realtime: subscribe to PG OS `ships` + `queue_items` ─────────────────
  useEffect(() => {
    let channel: RealtimeChannel | null = null;
    let supabaseClient: import("@supabase/supabase-js").SupabaseClient | null = null;
    let destroyed = false;

    async function setupRealtime() {
      try {
        const res = await fetch("/api/realtime/config");
        if (!res.ok) return;
        const cfg: RealtimeConfig = await res.json();
        if (!cfg.pgosUrl || !cfg.pgosPublishableKey) return; // graceful no-op

        const client = await createBrowserSupabaseClient(cfg.pgosUrl, cfg.pgosPublishableKey);
        if (!client || destroyed) return;

        supabaseClient = client;
        channel = subscribeMultipleTables({
          client,
          channelName: "flow-realtime",
          tables: [
            { table: "ships" },
            { table: "queue_items" },
          ],
          onchange: () => { void fetchShips(); },
        });
      } catch {
        // Realtime is best-effort — never surface errors to the user.
      }
    }

    void setupRealtime();

    return () => {
      destroyed = true;
      if (supabaseClient && channel) {
        supabaseClient.removeChannel(channel);
      }
    };
  }, [fetchShips]);

  // Auto-grow textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const lineH = 24;
    const minH = lineH * 2;
    const maxH = lineH * 6;
    el.style.height = `${Math.min(maxH, Math.max(minH, el.scrollHeight))}px`;
  }, [text]);

  const handleSubmit = useCallback(async () => {
    if (!text.trim()) return;

    // Optimistic UI: insert a synthetic ship row immediately so the user
    // sees their submission in the list. If the request fails we'll restore.
    const trimmed = text.trim();
    const ctx = context || null;
    const optimisticShip: Ship = {
      id: -Date.now(), // negative id signals "pending" / not real yet
      text: trimmed,
      context: ctx,
      created_at: Date.now(),
    };
    const prevText = text;
    const prevContext = context;
    setShipsData((prev) =>
      prev
        ? {
            ...prev,
            ships: [optimisticShip, ...prev.ships],
            shippedToday: true,
          }
        : prev,
    );
    setText("");
    setContext("");
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/ships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed, context: ctx }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Ship failed");
      }
      setConfirmed(true);
      setTimeout(() => setConfirmed(false), 2000);
      await fetchShips();
    } catch (e) {
      // Roll back the optimistic insert + restore the input
      setText(prevText);
      setContext(prevContext);
      setShipsData((prev) =>
        prev
          ? { ...prev, ships: prev.ships.filter((s) => s.id !== optimisticShip.id) }
          : prev,
      );
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setSubmitting(false);
    }
  }, [text, context, fetchShips]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  const streak = shipsData?.streak ?? 0;
  const velocity = shipsData?.velocity ?? 0;
  const shippedToday = shipsData?.shippedToday ?? false;
  const allShips = shipsData?.ships.slice(0, 30) ?? [];
  // Filter ships by brand mode (match context field against mode's project ids)
  const recent = applyModeFilter(allShips, brand, "context" as keyof Ship).slice(0, 10);

  return (
    <div className="card">
      <div className="card-label">
        <span>01 // SHIP LOG</span>
        <span className="fl-tag-live">LIVE</span>
      </div>

      {/* Input area */}
      <div className="fl-input-area">
        <textarea
          ref={textareaRef}
          className="fl-ship-input"
          placeholder="What left your hands today?"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={2}
          disabled={submitting}
        />
        <div className="fl-input-row">
          <select
            className="fl-ship-context"
            value={context}
            onChange={(e) => setContext(e.target.value)}
            disabled={submitting}
          >
            {PROJECTS.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
          <button
            className={`fl-btn fl-btn-primary fl-submit spring-hover${confirmed ? " fl-confirm" : ""}`}
            onClick={handleSubmit}
            disabled={submitting || !text.trim()}
          >
            {confirmed ? "shipped ✓" : submitting ? "…" : "SHIP →"}
          </button>
        </div>
        {error && <span className="flow-error">{error}</span>}
      </div>

      {/* Stats row */}
      <div className="fl-streak-row">
        <span className={streakClass(streak)}>{streak} day streak</span>
        <span className="fl-velocity">Velocity · {velocity.toFixed(1)}/wk</span>
        <span className={`fl-today${shippedToday ? " done" : " pending"}`}>
          {shippedToday ? "Today ✓" : "Not today yet"}
        </span>
      </div>

      {/* Recent ships */}
      {shipsData === null && !error ? (
        <ul className="fl-ships fl-ships-loading">
          {Array.from({ length: 4 }).map((_, i) => (
            <li key={i} className="fl-ship">
              <Skeleton variant="text" width="70%" height={14} />
              <Skeleton variant="text" width="20%" height={11} />
            </li>
          ))}
        </ul>
      ) : (
        <ul className="fl-ships">
          {recent.map((s) => (
            <li key={s.id} className={`fl-ship${s.id < 0 ? " fl-ship-pending" : ""}`}>
              <span className="fl-ship-text">{s.text}</span>
              <span className="fl-ship-meta">
                {s.context && <span className="fl-ship-ctx">{s.context}</span>}
                <span className="fl-ship-time">{s.id < 0 ? "saving…" : relTime(s.created_at)}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Approval Queue Card ───────────────────────────────────────────────────────

function ApprovalQueueCard({ brand }: { brand: BrandMode | null }) {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [decideItem, setDecideItem] = useState<QueueItem | null>(null);
  const [triageOpen, setTriageOpen] = useState(false);
  const [sourceFilter, setSourceFilter] = useState<string>("");
  const [search, setSearch] = useState<string>("");
  const [sort, setSort] = useState<"oldest" | "newest">("oldest");

  const fetchQueue = useCallback(async () => {
    try {
      const res = await fetch("/api/queue", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load queue");
      const data = await res.json();
      setItems(data.items ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchQueue(); }, [fetchQueue]);

  // ── Realtime: subscribe to PG OS `queue_items` ───────────────────────────
  useEffect(() => {
    let channel: RealtimeChannel | null = null;
    let supabaseClient: import("@supabase/supabase-js").SupabaseClient | null = null;
    let destroyed = false;

    async function setupRealtime() {
      try {
        const res = await fetch("/api/realtime/config");
        if (!res.ok) return;
        const cfg: RealtimeConfig = await res.json();
        if (!cfg.pgosUrl || !cfg.pgosPublishableKey) return; // graceful no-op

        const client = await createBrowserSupabaseClient(cfg.pgosUrl, cfg.pgosPublishableKey);
        if (!client || destroyed) return;

        supabaseClient = client;
        channel = subscribeMultipleTables({
          client,
          channelName: "queue-realtime",
          tables: [{ table: "queue_items" }],
          onchange: () => { void fetchQueue(); },
        });
      } catch {
        // Realtime is best-effort — never surface errors to the user.
      }
    }

    void setupRealtime();

    return () => {
      destroyed = true;
      if (supabaseClient && channel) {
        supabaseClient.removeChannel(channel);
      }
    };
  }, [fetchQueue]);

  const handleDismiss = useCallback(async (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    try {
      const res = await fetch(`/api/queue?id=${encodeURIComponent(id)}&decision=dismissed`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
    } catch {
      await fetchQueue();
    }
  }, [fetchQueue]);

  const handleDecide = useCallback((item: QueueItem) => {
    setDecideItem(item);
  }, []);

  const handleResolved = useCallback((id: string, _decision: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    setDecideItem(null);
  }, []);

  // ── Filter + sort pipeline ───────────────────────────────────────────────
  // 1. Brand-mode project filter (existing)
  // 2. Source dropdown (e.g. "session-skill-scanner-weekly")
  // 3. Search match against title (case-insensitive)
  // 4. Sort by oldest-first (default — surfaces stalest items) or newest-first
  const brandFiltered = applyModeFilter(items, brand, "source" as keyof QueueItem);

  const sources = useMemo(() => {
    const set = new Set<string>();
    for (const i of brandFiltered) if (i.source) set.add(i.source);
    return Array.from(set).sort();
  }, [brandFiltered]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = brandFiltered;
    if (sourceFilter) list = list.filter((i) => i.source === sourceFilter);
    if (q) list = list.filter((i) => i.title.toLowerCase().includes(q) || (i.note?.toLowerCase().includes(q) ?? false));
    list = [...list].sort((a, b) => sort === "oldest"
      ? a.created_at - b.created_at
      : b.created_at - a.created_at,
    );
    return list;
  }, [brandFiltered, sourceFilter, search, sort]);

  const count = filteredItems.length;
  const totalCount = brandFiltered.length;

  return (
    <div className="card">
      <div className="card-label">
        <span>02 // APPROVAL QUEUE</span>
        <span className="fl-tag-count">
          {count === totalCount ? `${count} WAITING` : `${count} / ${totalCount}`}
        </span>
      </div>

      {/* Filter + sort + triage launcher */}
      {!loading && totalCount > 0 && (
        <div className="fl-q-controls">
          <input
            type="text"
            className="fl-q-search"
            placeholder="Search queue…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search queue"
          />
          {sources.length > 1 && (
            <select
              className="fl-q-source"
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              aria-label="Filter by source"
            >
              <option value="">All sources</option>
              {sources.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          )}
          <button
            type="button"
            className="fl-q-sort"
            onClick={() => setSort((s) => (s === "oldest" ? "newest" : "oldest"))}
            title="Toggle sort order"
          >
            {sort === "oldest" ? "Oldest first ↑" : "Newest first ↓"}
          </button>
          <button
            type="button"
            className="fl-q-triage spring-hover"
            onClick={() => setTriageOpen(true)}
            disabled={count === 0}
          >
            Triage {count} →
          </button>
        </div>
      )}

      {error && <span className="flow-error">{error}</span>}

      {loading && (
        <ul className="fl-queue fl-queue-loading">
          {Array.from({ length: 3 }).map((_, i) => (
            <li key={i} className="fl-qitem">
              <Skeleton variant="text" width="60%" height={14} />
              <div style={{ height: 8 }} />
              <Skeleton variant="text" width="35%" height={11} />
            </li>
          ))}
        </ul>
      )}

      {!loading && totalCount === 0 && (
        <p className="fl-empty">Queue is empty. Nothing waiting on you.</p>
      )}

      {!loading && totalCount > 0 && count === 0 && (
        <p className="fl-empty">No items match the current filter.</p>
      )}

      {count > 0 && (
        <ul className="fl-queue">
          {filteredItems.map((item) => (
            <li key={item.id} className="fl-qitem">
              <div className="fl-qmeta-row">
                <span className="fl-qtitle">{item.title}</span>
                {item.source && (
                  <span className="fl-qsource">{item.source.toUpperCase()}</span>
                )}
              </div>
              <div className="fl-qbottom">
                <span className={waitClass(item.created_at)}>{waitLabel(item.created_at)}</span>
                <div className="fl-qactions">
                  <button
                    className="fl-btn fl-btn-danger spring-hover"
                    onClick={() => handleDismiss(item.id)}
                  >
                    DISMISS
                  </button>
                  <button
                    className="fl-btn fl-btn-primary spring-hover"
                    onClick={() => handleDecide(item)}
                  >
                    DECIDE →
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {decideItem && (
        <DecideDialog
          item={decideItem}
          onResolved={handleResolved}
          onClose={() => setDecideItem(null)}
        />
      )}

      {triageOpen && (
        <TriageMode
          initialItems={filteredItems}
          onClose={() => { setTriageOpen(false); fetchQueue(); }}
          onResolved={(id) => setItems((prev) => prev.filter((i) => i.id !== id))}
        />
      )}
    </div>
  );
}

// ── View ──────────────────────────────────────────────────────────────────────

export function FlowView() {
  const { brand } = useMode();
  const brandCfg = brand ? MODE_CONFIG[brand] : null;

  return (
    <div className="view view-flow">
      <div className="view-header">
        <h1 className="view-title">Flow</h1>
        <div className="view-sub">SHIP · DECIDE · THE TWO SPINES</div>
      </div>

      {brandCfg && (
        <div className="cm-filter-hint">
          <span className="cm-filter-glyph">{brandCfg.glyph}</span>
          {" "}filtered by {brandCfg.label}
        </div>
      )}

      <div className="view-grid two-col">
        <ShipLogCard brand={brand} />
        <ApprovalQueueCard brand={brand} />
      </div>
    </div>
  );
}
