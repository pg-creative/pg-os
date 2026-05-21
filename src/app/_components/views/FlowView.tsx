"use client";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useMode } from "../ModeProvider";
import {
  type BrandMode,
  MODE_CONFIG,
  applyModeFilter,
} from "../../../lib/modes";
import { Skeleton } from "../Skeleton";
import { createBrowserSupabaseClient } from "../../../lib/realtimeBrowser";
import { subscribeMultipleTables } from "../../../lib/realtime";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { RealtimeConfig } from "../../api/realtime/config/route";
import { DecideDialog } from "../flow/DecideDialog";
import { TriageMode } from "../flow/TriageMode";
import { showToast } from "../Toast";
import { TabShell } from "../bento/TabShell";
import { BentoBox } from "../bento/BentoBox";
import { useEmaki } from "../bento/emakiContext";

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

function waitLabel(createdAt: number): string {
  const days = Math.floor((Date.now() - createdAt) / 86_400_000);
  return `waiting ${days}d`;
}

function waitColor(
  createdAt: number,
  tk: ReturnType<typeof useEmaki>["tk"],
): string {
  const days = Math.floor((Date.now() - createdAt) / 86_400_000);
  if (days >= 14) return tk.foxfire;
  if (days >= 7) return tk.gold;
  return tk.textMuted;
}

// ── Ship Log Tile ─────────────────────────────────────────────────────────────

function ShipLogTile({ brand }: { brand: BrandMode | null }) {
  const { tk } = useEmaki();
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

  useEffect(() => {
    fetchShips();
  }, [fetchShips]);

  useEffect(() => {
    let channel: RealtimeChannel | null = null;
    let supabaseClient: import("@supabase/supabase-js").SupabaseClient | null =
      null;
    let destroyed = false;

    async function setupRealtime() {
      try {
        const res = await fetch("/api/realtime/config");
        if (!res.ok) return;
        const cfg: RealtimeConfig = await res.json();
        if (!cfg.pgosUrl || !cfg.pgosPublishableKey) return;

        const client = await createBrowserSupabaseClient(
          cfg.pgosUrl,
          cfg.pgosPublishableKey,
        );
        if (!client || destroyed) return;

        supabaseClient = client;
        channel = subscribeMultipleTables({
          client,
          channelName: "flow-realtime",
          tables: [{ table: "ships" }, { table: "queue_items" }],
          onchange: () => {
            void fetchShips();
          },
        });
      } catch {
        // Realtime is best-effort.
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

    const trimmed = text.trim();
    const ctx = context || null;
    const optimisticShip: Ship = {
      id: -Date.now(),
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
      setText(prevText);
      setContext(prevContext);
      setShipsData((prev) =>
        prev
          ? {
              ...prev,
              ships: prev.ships.filter((s) => s.id !== optimisticShip.id),
            }
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
    [handleSubmit],
  );

  const streak = shipsData?.streak ?? 0;
  const velocity = shipsData?.velocity ?? 0;
  const shippedToday = shipsData?.shippedToday ?? false;
  const allShips = shipsData?.ships.slice(0, 30) ?? [];
  const recent = applyModeFilter(
    allShips,
    brand,
    "context" as keyof Ship,
  ).slice(0, 10);

  const inputStyle: React.CSSProperties = {
    background: "rgba(0,0,0,0.18)",
    border: `1px solid ${tk.divider}`,
    borderRadius: 6,
    color: tk.textPrimary,
    fontFamily: "var(--serif), Georgia, serif",
    fontSize: "var(--text-sm)",
    padding: "8px 12px",
    outline: "none",
    resize: "none" as const,
    width: "100%",
    boxSizing: "border-box" as const,
  };

  return (
    <BentoBox
      cols={6}
      eyebrow="01 // SHIP LOG"
      kanji="出"
      count={<LivePill />}
      scroll
    >
      {/* Input */}
      <textarea
        ref={textareaRef}
        placeholder="What left your hands today?"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        rows={2}
        disabled={submitting}
        style={inputStyle}
      />
      <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
        <select
          value={context}
          onChange={(e) => setContext(e.target.value)}
          disabled={submitting}
          style={{
            ...inputStyle,
            width: "auto",
            flex: 1,
            fontFamily: "var(--mono), ui-monospace, monospace",
            fontSize: "var(--text-xs)",
          }}
        >
          {PROJECTS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
        <button
          onClick={handleSubmit}
          disabled={submitting || !text.trim()}
          style={{
            background: confirmed ? "rgba(124,154,110,0.25)" : "transparent",
            border: `1px solid ${confirmed ? "#7C9A6E" : tk.accent}`,
            borderRadius: 6,
            color: confirmed ? "#7C9A6E" : tk.accent,
            fontFamily: "var(--mono), ui-monospace, monospace",
            fontSize: "var(--text-xs)",
            letterSpacing: "0.08em",
            padding: "6px 14px",
            cursor: submitting || !text.trim() ? "default" : "pointer",
            opacity: submitting || !text.trim() ? 0.45 : 1,
            transition: "all 200ms ease",
            whiteSpace: "nowrap",
          }}
        >
          {confirmed ? "shipped ✓" : submitting ? "..." : "SHIP →"}
        </button>
      </div>
      {error && (
        <div
          style={{
            color: tk.foxfire,
            fontSize: "var(--text-xs)",
            marginTop: 4,
          }}
        >
          {error}
        </div>
      )}

      {/* Stats row */}
      <div
        style={{
          display: "flex",
          gap: 12,
          alignItems: "center",
          borderTop: `1px solid ${tk.divider}`,
          paddingTop: 10,
          marginTop: 4,
          flexWrap: "wrap",
        }}
      >
        <StreakPill streak={streak} tk={tk} />
        <span
          style={{
            fontFamily: "var(--mono), ui-monospace, monospace",
            fontSize: "var(--text-xs)",
            color: tk.textMuted,
          }}
        >
          {velocity.toFixed(1)}/wk
        </span>
        <span
          style={{
            fontFamily: "var(--mono), ui-monospace, monospace",
            fontSize: "var(--text-xs)",
            color: shippedToday ? "#7C9A6E" : tk.textMuted,
            marginLeft: "auto",
          }}
        >
          {shippedToday ? "Today ✓" : "Not today yet"}
        </span>
      </div>

      {/* Ship list */}
      {shipsData === null && !error ? (
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {Array.from({ length: 4 }).map((_, i) => (
            <li
              key={i}
              style={{ display: "flex", flexDirection: "column", gap: 4 }}
            >
              <Skeleton variant="text" width="70%" height={14} />
              <Skeleton variant="text" width="20%" height={11} />
            </li>
          ))}
        </ul>
      ) : (
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          {recent.map((s) => (
            <li
              key={s.id}
              style={{
                opacity: s.id < 0 ? 0.6 : 1,
                transition: "opacity 200ms ease",
              }}
            >
              <div
                style={{
                  fontSize: "var(--text-sm)",
                  color: tk.textPrimary,
                  lineHeight: 1.4,
                }}
              >
                {s.text}
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  marginTop: 3,
                  fontFamily: "var(--mono), ui-monospace, monospace",
                  fontSize: "var(--text-2xs)",
                  color: tk.textMuted,
                }}
              >
                {s.context && (
                  <span
                    style={{
                      color: tk.gold,
                      border: `1px solid ${tk.gold}`,
                      borderRadius: 3,
                      padding: "0 5px",
                      opacity: 0.8,
                    }}
                  >
                    {s.context}
                  </span>
                )}
                <span>{s.id < 0 ? "saving..." : relTime(s.created_at)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </BentoBox>
  );
}

// ── Approval Queue Tile ───────────────────────────────────────────────────────

function ApprovalQueueTile({ brand }: { brand: BrandMode | null }) {
  const { tk } = useEmaki();
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

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  useEffect(() => {
    let channel: RealtimeChannel | null = null;
    let supabaseClient: import("@supabase/supabase-js").SupabaseClient | null =
      null;
    let destroyed = false;

    async function setupRealtime() {
      try {
        const res = await fetch("/api/realtime/config");
        if (!res.ok) return;
        const cfg: RealtimeConfig = await res.json();
        if (!cfg.pgosUrl || !cfg.pgosPublishableKey) return;

        const client = await createBrowserSupabaseClient(
          cfg.pgosUrl,
          cfg.pgosPublishableKey,
        );
        if (!client || destroyed) return;

        supabaseClient = client;
        channel = subscribeMultipleTables({
          client,
          channelName: "queue-realtime",
          tables: [{ table: "queue_items" }],
          onchange: () => {
            void fetchQueue();
          },
        });
      } catch {
        // Realtime is best-effort.
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

  const handleDismiss = useCallback(
    async (item: QueueItem) => {
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      try {
        const res = await fetch(
          `/api/queue?id=${encodeURIComponent(item.id)}&decision=dismissed`,
          { method: "DELETE" },
        );
        if (!res.ok) throw new Error("Delete failed");
        showToast({ kind: "success", title: "Dismissed", body: item.title });
      } catch (e) {
        showToast({
          kind: "error",
          title: "Dismiss failed",
          body: e instanceof Error ? e.message : "unknown error",
        });
        await fetchQueue();
      }
    },
    [fetchQueue],
  );

  const handleDecide = useCallback((item: QueueItem) => {
    setDecideItem(item);
  }, []);

  const handleResolved = useCallback((id: string, _decision: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    setDecideItem(null);
  }, []);

  const brandFiltered = applyModeFilter(
    items,
    brand,
    "source" as keyof QueueItem,
  );

  const sources = useMemo(() => {
    const set = new Set<string>();
    for (const i of brandFiltered) if (i.source) set.add(i.source);
    return Array.from(set).sort();
  }, [brandFiltered]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = brandFiltered;
    if (sourceFilter) list = list.filter((i) => i.source === sourceFilter);
    if (q)
      list = list.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          (i.note?.toLowerCase().includes(q) ?? false),
      );
    list = [...list].sort((a, b) =>
      sort === "oldest"
        ? a.created_at - b.created_at
        : b.created_at - a.created_at,
    );
    return list;
  }, [brandFiltered, sourceFilter, search, sort]);

  const count = filteredItems.length;
  const totalCount = brandFiltered.length;

  const controlStyle: React.CSSProperties = {
    background: "rgba(0,0,0,0.18)",
    border: `1px solid ${tk.divider}`,
    borderRadius: 6,
    color: tk.textPrimary,
    fontFamily: "var(--mono), ui-monospace, monospace",
    fontSize: "var(--text-xs)",
    padding: "5px 10px",
    outline: "none",
  };

  return (
    <BentoBox
      cols={6}
      eyebrow="02 // APPROVAL QUEUE"
      kanji="決"
      count={
        count === totalCount ? `${count} WAITING` : `${count} / ${totalCount}`
      }
      scroll
    >
      {/* Controls */}
      {!loading && totalCount > 0 && (
        <div
          style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 4 }}
        >
          <input
            type="text"
            placeholder="Search queue..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search queue"
            style={{ ...controlStyle, flex: 1, minWidth: 120 }}
          />
          {sources.length > 1 && (
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              aria-label="Filter by source"
              style={controlStyle}
            >
              <option value="">All sources</option>
              {sources.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            onClick={() =>
              setSort((s) => (s === "oldest" ? "newest" : "oldest"))
            }
            title="Toggle sort order"
            style={{
              ...controlStyle,
              cursor: "pointer",
              color: tk.textMuted,
            }}
          >
            {sort === "oldest" ? "Oldest ↑" : "Newest ↓"}
          </button>
          <button
            type="button"
            onClick={() => setTriageOpen(true)}
            disabled={count === 0}
            style={{
              ...controlStyle,
              cursor: count === 0 ? "default" : "pointer",
              color: tk.accent,
              border: `1px solid ${tk.accent}`,
              opacity: count === 0 ? 0.4 : 1,
              whiteSpace: "nowrap",
            }}
          >
            Triage {count} →
          </button>
        </div>
      )}

      {error && (
        <div
          style={{
            color: tk.foxfire,
            fontSize: "var(--text-xs)",
            marginBottom: 8,
          }}
        >
          {error}
        </div>
      )}

      {loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              style={{ display: "flex", flexDirection: "column", gap: 4 }}
            >
              <Skeleton variant="text" width="60%" height={14} />
              <Skeleton variant="text" width="35%" height={11} />
            </div>
          ))}
        </div>
      )}

      {!loading && totalCount === 0 && (
        <div
          style={{
            color: tk.textMuted,
            fontStyle: "italic",
            fontSize: "var(--text-sm)",
            textAlign: "center",
            padding: "20px 0",
          }}
        >
          Queue is empty. Nothing waiting on you.
        </div>
      )}

      {!loading && totalCount > 0 && count === 0 && (
        <div
          style={{
            color: tk.textMuted,
            fontStyle: "italic",
            fontSize: "var(--text-sm)",
            textAlign: "center",
            padding: "12px 0",
          }}
        >
          No items match the current filter.
        </div>
      )}

      {count > 0 && (
        <QueueGroups
          items={filteredItems}
          onDecide={handleDecide}
          onDismiss={handleDismiss}
          onTriageGroup={(groupItems) => {
            setItems((prev) => prev);
            setTriageOpen(true);
            const src = groupItems[0]?.source ?? "";
            setSourceFilter(src);
          }}
        />
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
          onClose={() => {
            setTriageOpen(false);
            fetchQueue();
          }}
          onResolved={(id) =>
            setItems((prev) => prev.filter((i) => i.id !== id))
          }
        />
      )}
    </BentoBox>
  );
}

// ── Source-grouped queue list ────────────────────────────────────────────────

const PINNED_SOURCES = [
  "session-skill-scanner-weekly",
  "session-skill-scanner-daily",
];
const COLLAPSE_THRESHOLD = 5;

interface QueueGroupsProps {
  items: QueueItem[];
  onDecide: (item: QueueItem) => void;
  onDismiss: (item: QueueItem) => void;
  onTriageGroup: (items: QueueItem[]) => void;
}

function QueueGroups({
  items,
  onDecide,
  onDismiss,
  onTriageGroup,
}: QueueGroupsProps) {
  const groups = useMemo(() => {
    const buckets = new Map<string, QueueItem[]>();
    for (const item of items) {
      const key = item.source ?? "(other)";
      const arr = buckets.get(key) ?? [];
      arr.push(item);
      buckets.set(key, arr);
    }
    const ordered: { source: string; items: QueueItem[] }[] = [];
    for (const pinned of PINNED_SOURCES) {
      const arr = buckets.get(pinned);
      if (arr) {
        ordered.push({ source: pinned, items: arr });
        buckets.delete(pinned);
      }
    }
    const others = Array.from(buckets.entries())
      .map(([source, items]) => ({ source, items }))
      .sort(
        (a, b) =>
          b.items.length - a.items.length || a.source.localeCompare(b.source),
      );
    const otherIdx = others.findIndex((g) => g.source === "(other)");
    if (otherIdx >= 0) {
      const [other] = others.splice(otherIdx, 1);
      others.push(other);
    }
    return [...ordered, ...others];
  }, [items]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {groups.map((g) => (
        <QueueGroupSection
          key={g.source}
          source={g.source}
          items={g.items}
          defaultOpen={g.items.length < COLLAPSE_THRESHOLD}
          onDecide={onDecide}
          onDismiss={onDismiss}
          onTriageGroup={onTriageGroup}
        />
      ))}
    </div>
  );
}

interface QueueGroupSectionProps {
  source: string;
  items: QueueItem[];
  defaultOpen: boolean;
  onDecide: (item: QueueItem) => void;
  onDismiss: (item: QueueItem) => void;
  onTriageGroup: (items: QueueItem[]) => void;
}

function QueueGroupSection({
  source,
  items,
  defaultOpen,
  onDecide,
  onDismiss,
  onTriageGroup,
}: QueueGroupSectionProps) {
  const { tk } = useEmaki();
  const [open, setOpen] = useState(defaultOpen);
  const oldest = Math.max(
    ...items.map((i) => Math.floor((Date.now() - i.created_at) / 86_400_000)),
  );
  const staleColor =
    oldest >= 14 ? tk.foxfire : oldest >= 7 ? tk.gold : tk.textMuted;

  return (
    <section
      style={{
        border: `1px solid ${tk.divider}`,
        borderRadius: 6,
        overflow: "hidden",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "7px 10px",
          background: "rgba(0,0,0,0.12)",
          borderBottom: open ? `1px solid ${tk.divider}` : "none",
        }}
      >
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            flex: 1,
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 0,
            textAlign: "left",
          }}
        >
          <span
            style={{ color: tk.textMuted, fontSize: "var(--text-xs)" }}
            aria-hidden="true"
          >
            {open ? "▾" : "▸"}
          </span>
          <span
            style={{
              fontFamily: "var(--mono), ui-monospace, monospace",
              fontSize: "var(--text-2xs)",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: tk.textSub,
              flex: 1,
            }}
          >
            {source}
          </span>
          <span
            style={{
              fontFamily: "var(--mono), ui-monospace, monospace",
              fontSize: "var(--text-2xs)",
              color: tk.textMuted,
            }}
          >
            {items.length}
          </span>
          {oldest > 0 && (
            <span
              style={{
                fontFamily: "var(--mono), ui-monospace, monospace",
                fontSize: "var(--text-2xs)",
                color: staleColor,
              }}
            >
              oldest {oldest}d
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onTriageGroup(items);
          }}
          title={`Triage all ${items.length} ${source} items`}
          style={{
            background: "none",
            border: `1px solid ${tk.divider}`,
            borderRadius: 4,
            color: tk.textMuted,
            fontFamily: "var(--mono), ui-monospace, monospace",
            fontSize: "var(--text-2xs)",
            letterSpacing: "0.06em",
            padding: "2px 8px",
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          Triage {items.length} →
        </button>
      </header>

      {open && (
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {items.map((item) => (
            <li
              key={item.id}
              style={{
                padding: "9px 12px",
                borderBottom: `1px solid ${tk.divider}`,
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              <span
                style={{
                  fontSize: "var(--text-sm)",
                  color: tk.textPrimary,
                  lineHeight: 1.4,
                }}
              >
                {item.title}
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{
                    fontFamily: "var(--mono), ui-monospace, monospace",
                    fontSize: "var(--text-2xs)",
                    color: waitColor(item.created_at, tk),
                  }}
                >
                  {waitLabel(item.created_at)}
                </span>
                <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                  <button
                    onClick={() => onDismiss(item)}
                    style={{
                      background: "none",
                      border: `1px solid rgba(184,83,111,0.5)`,
                      borderRadius: 4,
                      color: "#B8536F",
                      fontFamily: "var(--mono), ui-monospace, monospace",
                      fontSize: "var(--text-2xs)",
                      letterSpacing: "0.06em",
                      padding: "2px 8px",
                      cursor: "pointer",
                    }}
                  >
                    DISMISS
                  </button>
                  <button
                    onClick={() => onDecide(item)}
                    style={{
                      background: "none",
                      border: `1px solid ${tk.accent}`,
                      borderRadius: 4,
                      color: tk.accent,
                      fontFamily: "var(--mono), ui-monospace, monospace",
                      fontSize: "var(--text-2xs)",
                      letterSpacing: "0.06em",
                      padding: "2px 8px",
                      cursor: "pointer",
                    }}
                  >
                    DECIDE →
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ── Small metric pills ────────────────────────────────────────────────────────

function LivePill() {
  const { tk } = useEmaki();
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        fontFamily: "var(--mono), ui-monospace, monospace",
        fontSize: "var(--text-2xs)",
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        color: "#7C9A6E",
        border: "1px solid rgba(124,154,110,0.4)",
        borderRadius: 999,
        padding: "2px 8px",
        background: "rgba(124,154,110,0.08)",
      }}
    >
      <span
        style={{
          width: 5,
          height: 5,
          borderRadius: "50%",
          background: "#7C9A6E",
        }}
      />
      LIVE
    </span>
  );
}

function StreakPill({
  streak,
  tk,
}: {
  streak: number;
  tk: ReturnType<typeof useEmaki>["tk"];
}) {
  const color =
    streak >= 7
      ? tk.foxfire
      : streak >= 3
        ? tk.gold
        : streak >= 1
          ? tk.accent
          : tk.textMuted;
  const glyph = streak >= 7 ? "★" : streak >= 3 ? "●" : streak >= 1 ? "◐" : "○";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        fontFamily: "var(--mono), ui-monospace, monospace",
        fontSize: "var(--text-xs)",
        color,
      }}
    >
      <span aria-hidden>{glyph}</span>
      {streak} day streak
    </span>
  );
}

// ── View ──────────────────────────────────────────────────────────────────────

export function FlowView() {
  const { brand } = useMode();
  const brandCfg = brand ? MODE_CONFIG[brand] : null;

  const eyebrow = `SHIP · DECIDE · THE TWO SPINES${brandCfg ? ` // ${brandCfg.glyph} ${brandCfg.label}` : ""}`;

  return (
    <TabShell title="Flow" eyebrow={eyebrow}>
      <ShipLogTile brand={brand} />
      <ApprovalQueueTile brand={brand} />
    </TabShell>
  );
}
