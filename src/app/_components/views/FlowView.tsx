"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useMode } from "../ModeProvider";
import { type BrandMode, MODE_CONFIG, applyModeFilter } from "../../../lib/modes";

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
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/ships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim(), context: context || null }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Ship failed");
      }
      setText("");
      setContext("");
      setConfirmed(true);
      setTimeout(() => setConfirmed(false), 2000);
      await fetchShips();
    } catch (e) {
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
            className={`fl-btn fl-btn-primary fl-submit${confirmed ? " fl-confirm" : ""}`}
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
      <ul className="fl-ships">
        {recent.map((s) => (
          <li key={s.id} className="fl-ship">
            <span className="fl-ship-text">{s.text}</span>
            <span className="fl-ship-meta">
              {s.context && <span className="fl-ship-ctx">{s.context}</span>}
              <span className="fl-ship-time">{relTime(s.created_at)}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Approval Queue Card ───────────────────────────────────────────────────────

function ApprovalQueueCard({ brand }: { brand: BrandMode | null }) {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const handleDismiss = useCallback(async (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    try {
      const res = await fetch(`/api/queue?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
    } catch {
      await fetchQueue();
    }
  }, [fetchQueue]);

  const handleDecide = useCallback((item: QueueItem) => {
    window.alert(item.note ?? item.title);
  }, []);

  // Filter queue by brand mode's project ids (match source field)
  const filteredItems = applyModeFilter(items, brand, "source" as keyof QueueItem);
  const count = filteredItems.length;

  return (
    <div className="card">
      <div className="card-label">
        <span>02 // APPROVAL QUEUE</span>
        <span className="fl-tag-count">{count} WAITING</span>
      </div>

      {error && <span className="flow-error">{error}</span>}

      {!loading && count === 0 && (
        <p className="fl-empty">Queue is empty. Nothing waiting on you.</p>
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
                    className="fl-btn fl-btn-danger"
                    onClick={() => handleDismiss(item.id)}
                  >
                    DISMISS
                  </button>
                  <button
                    className="fl-btn fl-btn-primary"
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
