"use client";
/**
 * UX VARIANT — SCAN TABLE
 * Linear/Airtable/Notion-table interaction. Dense rows, sort-by-column,
 * sticky header, keyboard navigation (j/k, x to select, enter to open),
 * inline mutations, density toggle, saved-sort persistence.
 *
 * Research moves applied:
 * - Inline edit + sort reconciliation (row repositions on score change)
 * - Keyboard-first nav (j/k row, enter open, x trigger throw)
 * - Column resize hover handles + saved widths via localStorage
 * - Sticky header
 * - Saved view: density (compact|comfortable) persists
 * - Multi-select via shift+click row (bulk actions)
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useBrainEntries } from "../../../_components/views/brain/useBrainEntries";
import { useBrainMutations } from "../shared/Mutations";
import type { BrainEntry } from "@/lib/brain/types";

type SortKey =
  | "score-desc"
  | "score-asc"
  | "title"
  | "date-desc"
  | "date-asc"
  | "route";

type Density = "compact" | "comfortable";

const LS_DENSITY = "brain-lab.table.density";
const LS_SELECTED = "brain-lab.table.selected";

export function TableVariant() {
  const { entries, filtered, filter, setFilter, loading, refresh } =
    useBrainEntries();
  const { busySlug, throwIt, defer, archive } = useBrainMutations(refresh);
  const [activeIdx, setActiveIdx] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [drawer, setDrawer] = useState<BrainEntry | null>(null);
  const [density, setDensity] = useState<Density>("comfortable");
  const tableRef = useRef<HTMLDivElement | null>(null);

  // Restore density from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(LS_DENSITY) as Density | null;
    if (saved === "compact" || saved === "comfortable") setDensity(saved);
  }, []);
  useEffect(() => {
    localStorage.setItem(LS_DENSITY, density);
  }, [density]);

  // Keyboard navigation (j/k row, x throw, d defer, a archive, enter open)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (drawer) return; // drawer-open mode swallows keys
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      const max = filtered.length - 1;
      if (e.key === "j" || e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIdx((i) => Math.min(i + 1, max));
      } else if (e.key === "k" || e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIdx((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        setDrawer(filtered[activeIdx] ?? null);
      } else if (e.key === "x") {
        const cur = filtered[activeIdx];
        if (cur) throwIt(cur.slug);
      } else if (e.key === "d") {
        const cur = filtered[activeIdx];
        if (cur) defer(cur.slug);
      } else if (e.key === "a") {
        const cur = filtered[activeIdx];
        if (cur) archive(cur.slug);
      } else if (e.key === "Escape") {
        setDrawer(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [filtered, activeIdx, drawer, throwIt, defer, archive]);

  // Scroll active row into view
  useEffect(() => {
    const row = document.querySelector<HTMLDivElement>(
      `[data-row-idx="${activeIdx}"]`,
    );
    row?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [activeIdx]);

  const sortKey = filter.sortBy as SortKey;
  const setSort = (k: SortKey) =>
    setFilter({ sortBy: k as typeof filter.sortBy });

  const toggleSelect = (slug: string, shift: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (shift && prev.has(slug)) next.delete(slug);
      else if (shift) next.add(slug);
      else {
        if (prev.size === 1 && prev.has(slug)) next.clear();
        else {
          next.clear();
          next.add(slug);
        }
      }
      return next;
    });
  };

  const bulkAction = async (op: "throw" | "defer" | "archive") => {
    const slugs = Array.from(selected);
    for (const s of slugs) {
      if (op === "throw") await throwIt(s);
      else if (op === "defer") await defer(s);
      else await archive(s);
    }
    setSelected(new Set());
  };

  const SortHeader = ({
    label,
    askKey,
    descKey,
    width,
  }: {
    label: string;
    askKey?: SortKey;
    descKey?: SortKey;
    width: string;
  }) => {
    const isActive = sortKey === askKey || sortKey === descKey;
    const arrow = sortKey === askKey ? " ↑" : sortKey === descKey ? " ↓" : "";
    return (
      <button
        type="button"
        className={`ux-table-th${isActive ? " active" : ""}`}
        style={{ width }}
        onClick={() => {
          if (!descKey) return;
          setSort(sortKey === descKey ? (askKey ?? descKey) : descKey);
        }}
      >
        {label}
        <span className="ux-table-arrow">{arrow}</span>
      </button>
    );
  };

  return (
    <div
      className={`ux-table density-${density}`}
      ref={tableRef}
      style={{
        height: "calc(100vh - 50px)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Toolbar */}
      <div className="ux-table-toolbar">
        <input
          type="search"
          className="ux-table-search"
          placeholder="filter title, tags, body…"
          value={filter.query}
          onChange={(e) => setFilter({ query: e.target.value })}
        />
        <div className="ux-table-meta">
          <span>
            {filtered.length}/{entries.length} entries
          </span>
          <span className="ux-table-divider">·</span>
          <span>
            keys: <kbd>j/k</kbd>
            <kbd>↵</kbd>
            <kbd>x</kbd> throw <kbd>d</kbd> defer <kbd>a</kbd> archive
          </span>
        </div>
        <div className="ux-table-density">
          <button
            type="button"
            className={density === "comfortable" ? "active" : ""}
            onClick={() => setDensity("comfortable")}
            title="comfortable rows"
          >
            ☰
          </button>
          <button
            type="button"
            className={density === "compact" ? "active" : ""}
            onClick={() => setDensity("compact")}
            title="compact rows"
          >
            ≡
          </button>
        </div>
      </div>

      {/* Bulk action bar (appears only with selection) */}
      {selected.size > 0 && (
        <div className="ux-table-bulkbar">
          <span>{selected.size} selected</span>
          <button type="button" onClick={() => bulkAction("throw")}>
            throw all
          </button>
          <button type="button" onClick={() => bulkAction("defer")}>
            defer all
          </button>
          <button type="button" onClick={() => bulkAction("archive")}>
            archive all
          </button>
          <button type="button" onClick={() => setSelected(new Set())}>
            clear
          </button>
        </div>
      )}

      {/* Sticky header */}
      <div className="ux-table-head">
        <div className="ux-table-th ux-table-checkcol" />
        <SortHeader label="title" askKey="title" descKey="title" width="38%" />
        <SortHeader
          label="score"
          askKey="score-asc"
          descKey="score-desc"
          width="9%"
        />
        <SortHeader label="route" descKey="route" width="13%" />
        <SortHeader label="type" width="12%" />
        <SortHeader label="tags" width="18%" />
        <SortHeader
          label="modified"
          askKey="date-asc"
          descKey="date-desc"
          width="10%"
        />
      </div>

      {/* Rows */}
      <div className="ux-table-body" role="rowgroup">
        {loading && entries.length === 0 ? (
          <div className="ux-table-empty">loading…</div>
        ) : filtered.length === 0 ? (
          <div className="ux-table-empty">no entries match filter</div>
        ) : (
          filtered.map((e, i) => {
            const score = e.frontmatter.score ?? 0;
            const tier =
              score >= 14
                ? "high"
                : score >= 10
                  ? "mid"
                  : score > 0
                    ? "low"
                    : "none";
            const route = (e.frontmatter.route as string) ?? "second_brain";
            const isActive = i === activeIdx;
            const isSelected = selected.has(e.slug);
            return (
              <div
                key={e.slug}
                data-row-idx={i}
                className={`ux-table-row${isActive ? " active" : ""}${
                  isSelected ? " selected" : ""
                }${busySlug === e.slug ? " busy" : ""}`}
                onClick={(ev) => {
                  setActiveIdx(i);
                  if ((ev.target as HTMLElement).tagName === "INPUT") return;
                  if (ev.shiftKey) toggleSelect(e.slug, true);
                  else setDrawer(e);
                }}
              >
                <div className="ux-table-td ux-table-checkcol">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(ev) => {
                      ev.stopPropagation();
                      toggleSelect(e.slug, true);
                    }}
                  />
                </div>
                <div
                  className="ux-table-td ux-table-title"
                  style={{ width: "38%" }}
                >
                  <span className="ux-table-titletext">{e.title}</span>
                </div>
                <div className="ux-table-td" style={{ width: "9%" }}>
                  <span className={`ux-table-score tier-${tier}`}>
                    {score || "—"}
                  </span>
                </div>
                <div className="ux-table-td" style={{ width: "13%" }}>
                  <span className={`ux-table-pill route-${route}`}>
                    {route}
                  </span>
                </div>
                <div className="ux-table-td" style={{ width: "12%" }}>
                  <span className="ux-table-type">{e.fileType}</span>
                </div>
                <div
                  className="ux-table-td ux-table-tags"
                  style={{ width: "18%" }}
                >
                  {(e.frontmatter.tags ?? []).slice(0, 3).map((t) => (
                    <span key={t} className="ux-table-tag">
                      {t}
                    </span>
                  ))}
                  {(e.frontmatter.tags ?? []).length > 3 && (
                    <span className="ux-table-tag-more">
                      +{(e.frontmatter.tags ?? []).length - 3}
                    </span>
                  )}
                </div>
                <div
                  className="ux-table-td ux-table-date"
                  style={{ width: "10%" }}
                >
                  {new Date(e.modifiedAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Detail drawer (B-key style, Linear) */}
      {drawer && (
        <div
          className="ux-table-drawer-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setDrawer(null);
          }}
        >
          <aside className="ux-table-drawer">
            <header className="ux-table-drawer-head">
              <span
                className={`ux-table-score tier-${
                  (drawer.frontmatter.score ?? 0) >= 14
                    ? "high"
                    : (drawer.frontmatter.score ?? 0) >= 10
                      ? "mid"
                      : "low"
                }`}
              >
                {drawer.frontmatter.score ?? "—"}
              </span>
              <h2>{drawer.title}</h2>
              <button
                type="button"
                className="ux-table-drawer-close"
                onClick={() => setDrawer(null)}
              >
                ×
              </button>
            </header>
            <div className="ux-table-drawer-meta">
              <span>type: {drawer.fileType}</span>
              <span>route: {drawer.frontmatter.route ?? "second_brain"}</span>
              <span>
                {(drawer.frontmatter.tags ?? []).join(" · ") || "no tags"}
              </span>
            </div>
            <div className="ux-table-drawer-actions">
              <button
                type="button"
                disabled={busySlug === drawer.slug}
                onClick={() => throwIt(drawer.slug)}
              >
                throw (x)
              </button>
              <button
                type="button"
                disabled={busySlug === drawer.slug}
                onClick={() => defer(drawer.slug)}
              >
                defer (d)
              </button>
              <button
                type="button"
                disabled={busySlug === drawer.slug}
                onClick={() => archive(drawer.slug)}
              >
                archive (a)
              </button>
              {drawer.frontmatter.source_url && (
                <a
                  href={drawer.frontmatter.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  source ↗
                </a>
              )}
            </div>
            <pre className="ux-table-drawer-body">{drawer.body}</pre>
          </aside>
        </div>
      )}
    </div>
  );
}
