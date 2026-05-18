"use client";
/**
 * UX VARIANT — SWIPE DECK
 * Tinder-for-brain-entries. One full-screen card at a time, decisive gestures.
 * - Drag right (or →) = throw to brain
 * - Drag left  (or ←) = archive
 * - Drag down  (or ↓) = defer
 * - Drag up    (or ↑) = open detail
 * Progress dot/counter, 1-step undo, next-card peek behind, threshold-based
 * commit + color flash on hint.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useBrainEntries } from "../../../_components/views/brain/useBrainEntries";
import { useBrainMutations } from "../shared/Mutations";
import type { BrainEntry } from "@/lib/brain/types";

type Decision = "throw" | "archive" | "defer" | "open";
type HistoryItem = { entry: BrainEntry; decision: Decision };

const COMMIT_THRESHOLD = 110;
const HINT_THRESHOLD = 36;

export function SwipeDeckVariant() {
  const { filtered, loading, refresh } = useBrainEntries();
  const { busySlug, throwIt, defer, archive } = useBrainMutations(refresh);
  const [cursor, setCursor] = useState(0);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [drag, setDrag] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [detailOpen, setDetailOpen] = useState<BrainEntry | null>(null);
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);

  // Sorted by score-desc so the user triages high-signal first
  const deck = useMemo(
    () =>
      [...filtered].sort(
        (a, b) => (b.frontmatter.score ?? 0) - (a.frontmatter.score ?? 0),
      ),
    [filtered],
  );

  const current = deck[cursor];
  const next1 = deck[cursor + 1];
  const next2 = deck[cursor + 2];
  const remaining = Math.max(0, deck.length - cursor);

  const commit = useCallback(
    async (decision: Decision) => {
      if (!current || busySlug === current.slug) return;
      setHistory((h) => [{ entry: current, decision }, ...h].slice(0, 10));
      if (decision === "throw") await throwIt(current.slug);
      else if (decision === "archive") await archive(current.slug);
      else if (decision === "defer") await defer(current.slug);
      else if (decision === "open") {
        setDetailOpen(current);
        return;
      }
      setCursor((c) => c + 1);
      setDrag({ x: 0, y: 0 });
    },
    [current, busySlug, throwIt, archive, defer],
  );

  const undo = useCallback(() => {
    if (history.length === 0) return;
    setHistory((h) => h.slice(1));
    setCursor((c) => Math.max(0, c - 1));
  }, [history]);

  // Pointer drag
  const onPointerDown = (e: React.PointerEvent) => {
    if (!current) return;
    dragStart.current = { x: e.clientX, y: e.clientY };
    setDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging || !dragStart.current) return;
    setDrag({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y,
    });
  };
  const onPointerUp = () => {
    if (!dragging) return;
    setDragging(false);
    const { x, y } = drag;
    const ax = Math.abs(x);
    const ay = Math.abs(y);
    if (ax > COMMIT_THRESHOLD || ay > COMMIT_THRESHOLD) {
      if (ax > ay) {
        commit(x > 0 ? "throw" : "archive");
      } else {
        commit(y > 0 ? "defer" : "open");
      }
    } else {
      setDrag({ x: 0, y: 0 });
    }
    dragStart.current = null;
  };

  // Keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (detailOpen) {
        if (e.key === "Escape") setDetailOpen(null);
        return;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        commit("throw");
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        commit("archive");
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        commit("defer");
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        commit("open");
      } else if (e.key === "u" || (e.metaKey && e.key === "z")) {
        e.preventDefault();
        undo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [commit, undo, detailOpen]);

  if (loading && deck.length === 0) {
    return <div className="ux-swipe-loading">loading deck…</div>;
  }
  if (!current) {
    return (
      <div className="ux-swipe-empty">
        <div className="ux-swipe-empty-glyph">∎</div>
        <h2>deck cleared</h2>
        <p>{deck.length} entries triaged this session.</p>
        {history.length > 0 && (
          <button type="button" onClick={undo} className="ux-swipe-undo-cta">
            ↺ undo last ({history[0].decision})
          </button>
        )}
      </div>
    );
  }

  // Hint colors based on drag axis dominance
  const ax = Math.abs(drag.x);
  const ay = Math.abs(drag.y);
  let hint: Decision | null = null;
  if (ax > HINT_THRESHOLD || ay > HINT_THRESHOLD) {
    if (ax > ay) hint = drag.x > 0 ? "throw" : "archive";
    else hint = drag.y > 0 ? "defer" : "open";
  }
  const rotation = drag.x / 18; // gentle rotation as you drag
  const cardTransform = `translate(${drag.x}px, ${drag.y}px) rotate(${rotation}deg)`;
  const cardOpacity = Math.max(0.3, 1 - Math.max(ax, ay) / 480);

  const tier = (s: number) => (s >= 14 ? "high" : s >= 10 ? "mid" : "low");

  const renderMiniCard = (e: BrainEntry, depth: number) => (
    <div
      key={e.slug}
      className="ux-swipe-card-peek"
      style={{
        transform: `translateY(${depth * 14}px) scale(${1 - depth * 0.04})`,
        opacity: 1 - depth * 0.3,
        zIndex: 5 - depth,
      }}
    >
      <div className="ux-swipe-card-peekrow">
        <span
          className={`ux-swipe-score tier-${tier(e.frontmatter.score ?? 0)}`}
        >
          {e.frontmatter.score ?? "—"}
        </span>
        <span className="ux-swipe-card-peektitle">{e.title}</span>
      </div>
    </div>
  );

  return (
    <div className="ux-swipe">
      {/* Top bar — progress + counter + undo */}
      <header className="ux-swipe-head">
        <div className="ux-swipe-counter">
          <span className="ux-swipe-counter-num">{cursor + 1}</span>
          <span className="ux-swipe-counter-sep"> / </span>
          <span className="ux-swipe-counter-tot">{deck.length}</span>
          <span className="ux-swipe-counter-left">{remaining - 1} left</span>
        </div>
        <div className="ux-swipe-progress">
          <div
            className="ux-swipe-progress-fill"
            style={{
              width: `${((cursor + 1) / Math.max(1, deck.length)) * 100}%`,
            }}
          />
        </div>
        <button
          type="button"
          className="ux-swipe-undo"
          onClick={undo}
          disabled={history.length === 0}
        >
          ↺ undo {history[0] ? `(${history[0].decision})` : ""}
        </button>
      </header>

      {/* Stage */}
      <div className="ux-swipe-stage">
        {/* Hint quadrants */}
        <div className={`ux-swipe-hint top${hint === "open" ? " active" : ""}`}>
          <span>↑</span> open
        </div>
        <div
          className={`ux-swipe-hint bottom${hint === "defer" ? " active" : ""}`}
        >
          <span>↓</span> defer
        </div>
        <div
          className={`ux-swipe-hint left${hint === "archive" ? " active" : ""}`}
        >
          <span>←</span> archive
        </div>
        <div
          className={`ux-swipe-hint right${hint === "throw" ? " active" : ""}`}
        >
          <span>→</span> throw to brain
        </div>

        {/* Peek cards behind */}
        {next2 && renderMiniCard(next2, 2)}
        {next1 && renderMiniCard(next1, 1)}

        {/* Active card */}
        <div
          ref={cardRef}
          className={`ux-swipe-card${dragging ? " dragging" : ""} hint-${hint ?? "none"}`}
          style={{ transform: cardTransform, opacity: cardOpacity }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <div className="ux-swipe-card-toprow">
            <span
              className={`ux-swipe-card-score tier-${tier(current.frontmatter.score ?? 0)}`}
            >
              {current.frontmatter.score ?? "—"}
              <small>/20</small>
            </span>
            <span className="ux-swipe-card-type">{current.fileType}</span>
            <span className="ux-swipe-card-route">
              {current.frontmatter.route ?? "second_brain"}
            </span>
          </div>
          <h2 className="ux-swipe-card-title">{current.title}</h2>
          <div className="ux-swipe-card-tags">
            {(current.frontmatter.tags ?? []).map((t) => (
              <span key={t}>#{t}</span>
            ))}
          </div>
          <p className="ux-swipe-card-summary">
            {current.body.slice(0, 280)}
            {current.body.length > 280 ? "…" : ""}
          </p>
        </div>
      </div>

      {/* Bottom action ring (click alternatives to drag) */}
      <footer className="ux-swipe-foot">
        <button
          type="button"
          className="ux-swipe-btn archive"
          onClick={() => commit("archive")}
          disabled={busySlug === current.slug}
          title="← or click"
        >
          ←<small>archive</small>
        </button>
        <button
          type="button"
          className="ux-swipe-btn defer"
          onClick={() => commit("defer")}
          disabled={busySlug === current.slug}
          title="↓ or click"
        >
          ↓<small>defer</small>
        </button>
        <button
          type="button"
          className="ux-swipe-btn open"
          onClick={() => commit("open")}
          disabled={busySlug === current.slug}
          title="↑ or click"
        >
          ↑<small>open</small>
        </button>
        <button
          type="button"
          className="ux-swipe-btn throw"
          onClick={() => commit("throw")}
          disabled={busySlug === current.slug}
          title="→ or click"
        >
          →<small>throw</small>
        </button>
      </footer>

      {detailOpen && (
        <div
          className="ux-swipe-detail-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setDetailOpen(null);
          }}
        >
          <aside className="ux-swipe-detail">
            <button
              type="button"
              className="ux-swipe-detail-close"
              onClick={() => setDetailOpen(null)}
            >
              ×
            </button>
            <h2>{detailOpen.title}</h2>
            <pre className="ux-swipe-detail-body">{detailOpen.body}</pre>
          </aside>
        </div>
      )}
    </div>
  );
}
