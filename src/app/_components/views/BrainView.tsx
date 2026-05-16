"use client";
import { useCallback, useState } from "react";
import { useBrainEntries } from "./brain/useBrainEntries";
import { BrainEntryCard } from "./brain/BrainEntryCard";
import { BrainFilters } from "./brain/BrainFilters";
import { BrainQueuePanel } from "./brain/BrainQueuePanel";
import { BrainFlowDiagram } from "./brain/BrainFlowDiagram";
import type { BrainEntry } from "@/lib/brain/types";

export function BrainView() {
  const {
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
  } = useBrainEntries();

  const [selected, setSelected] = useState<BrainEntry | null>(null);
  const [drawerBusy, setDrawerBusy] = useState(false);

  const handleMutate = useCallback(
    async (slug: string, patch: { status?: string; route?: string }) => {
      setDrawerBusy(true);
      try {
        const r = await fetch(`/api/brain/entry/${encodeURIComponent(slug)}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(patch),
        });
        const data = await r.json();
        if (!data.ok && !data.local) {
          console.error("[brain] mutation failed", data);
        }
        // SSE will fire refresh; force one anyway
        refresh();
      } finally {
        setDrawerBusy(false);
      }
    },
    [refresh],
  );

  return (
    <section
      id="view-brain"
      role="tabpanel"
      aria-labelledby="tab-brain"
      className="view view-brain"
    >
      <div className="brain-topbar">
        <h1 className="brain-title">
          <span className="brain-glyph">◉</span> BRAIN
          <span className="brain-subtitle">
            karpathy substrate · dartboard pipeline · local-md canonical
          </span>
        </h1>
        <div className="brain-stats-bar">
          <div className="brain-stat">
            <div className="brain-stat-num">{stats.total}</div>
            <div className="brain-stat-label">entries</div>
          </div>
          <div className="brain-stat">
            <div className="brain-stat-num">{stats.queueCount}</div>
            <div className="brain-stat-label">queued</div>
          </div>
          <div className="brain-stat">
            <div className="brain-stat-num">{stats.seedlingCount}</div>
            <div className="brain-stat-label">seedlings</div>
          </div>
          <div className="brain-stat">
            <div className="brain-stat-num">{stats.averageScore}</div>
            <div className="brain-stat-label">avg score</div>
          </div>
          <div
            className={`brain-notion-status${notionConfigured ? " ok" : " off"}`}
            title={
              notionConfigured
                ? "Notion sync enabled — changes mirror to Brain Inbox"
                : "Notion sync OFF — set NOTION_TOKEN env var"
            }
          >
            notion {notionConfigured ? "✓" : "—"}
          </div>
        </div>
        <input
          type="search"
          className="brain-search"
          placeholder="Search title, tags, body..."
          value={filter.query}
          onChange={(e) => setFilter({ query: e.target.value })}
        />
      </div>

      <BrainFlowDiagram />

      {error && <div className="brain-error">Error: {error}</div>}

      <div className="brain-layout">
        <aside className="brain-rail-left">
          <BrainFilters
            filter={filter}
            setFilter={setFilter}
            allTags={allTags}
          />
        </aside>

        <main className="brain-grid">
          {loading && entries.length === 0 ? (
            <div className="brain-loading">Loading entries...</div>
          ) : filtered.length === 0 ? (
            <div className="brain-empty">
              {entries.length === 0
                ? "No brain entries yet. Drop something in Notion + /sweep-inbox."
                : "No entries match the current filter."}
            </div>
          ) : (
            <div className="brain-card-grid">
              {filtered.map((e) => (
                <BrainEntryCard
                  key={e.slug}
                  entry={e}
                  onClick={() => setSelected(e)}
                />
              ))}
            </div>
          )}
        </main>

        <aside className="brain-rail-right">
          <BrainQueuePanel
            entries={entries}
            onSelect={setSelected}
            onMutate={handleMutate}
          />
        </aside>
      </div>

      {selected && (
        <div
          className="brain-drawer-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelected(null);
          }}
        >
          <div className="brain-drawer" role="dialog" aria-modal="true">
            <div className="brain-drawer-head">
              <h2 className="brain-drawer-title">{selected.title}</h2>
              <button
                type="button"
                className="brain-drawer-close"
                onClick={() => setSelected(null)}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="brain-drawer-meta">
              <span>Score: {selected.frontmatter.score ?? "—"}/20</span>
              <span>Route: {selected.frontmatter.route ?? "—"}</span>
              <span>Filter: {selected.frontmatter.filter ?? "—"}</span>
              <span>Quality: {selected.frontmatter.source_quality ?? "—"}</span>
              <span>Status: {selected.frontmatter.status ?? "—"}</span>
              {selected.frontmatter.source_url && (
                <a
                  className="brain-drawer-link"
                  href={selected.frontmatter.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  source ↗
                </a>
              )}
            </div>
            <div className="brain-drawer-tags">
              {(selected.frontmatter.tags ?? []).map((t) => (
                <span key={t} className="brain-tag-chip">
                  #{t}
                </span>
              ))}
            </div>
            <div className="brain-drawer-actions">
              <button
                type="button"
                disabled={drawerBusy}
                onClick={() =>
                  handleMutate(selected.slug, {
                    status: "active",
                    route: "queue",
                  })
                }
              >
                Throw it
              </button>
              <button
                type="button"
                disabled={drawerBusy}
                onClick={() =>
                  handleMutate(selected.slug, { status: "active" })
                }
              >
                Defer
              </button>
              <button
                type="button"
                disabled={drawerBusy}
                onClick={() =>
                  handleMutate(selected.slug, { status: "archived" })
                }
              >
                Archive
              </button>
            </div>
            <div className="brain-drawer-body">
              <pre>{selected.body}</pre>
            </div>
            <div className="brain-drawer-path">
              <code>{selected.relativePath}</code>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
