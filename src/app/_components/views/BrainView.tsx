"use client";
import { useCallback, useState } from "react";
import { useBrainEntries } from "./brain/useBrainEntries";
import { BrainEntryCard } from "./brain/BrainEntryCard";
import { BrainFilters } from "./brain/BrainFilters";
import { BrainQueuePanel } from "./brain/BrainQueuePanel";
import { BrainFlowDiagram } from "./brain/BrainFlowDiagram";
import type { BrainEntry } from "@/lib/brain/types";
import { TabShell } from "../bento/TabShell";
import { BentoBox } from "../bento/BentoBox";
import { useEmaki } from "../bento/emakiContext";

// Inner component so useEmaki() runs inside EmakiProvider (provided by TabShell).
function BrainContent() {
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
  const [syncStatus, setSyncStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const { tk } = useEmaki();

  const handleNotionSync = useCallback(async () => {
    setSyncStatus("loading");
    try {
      const r = await fetch("/api/brain/notion-sync", { method: "POST" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      refresh();
      setSyncStatus("done");
      setTimeout(() => setSyncStatus("idle"), 2200);
    } catch (err) {
      console.error("[brain] notion-sync failed", err);
      setSyncStatus("error");
      setTimeout(() => setSyncStatus("idle"), 3000);
    }
  }, [refresh]);

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
        refresh();
      } finally {
        setDrawerBusy(false);
      }
    },
    [refresh],
  );

  return (
    <>
      {/* Flow diagram spans full width above the bento grid */}
      <BentoBox cols={12} eyebrow="00 // PIPELINE" kanji="脳">
        <BrainFlowDiagram />
      </BentoBox>

      {error && (
        <BentoBox cols={12}>
          <span
            style={{
              color: "#B8536F",
              fontFamily: "var(--mono), ui-monospace, monospace",
              fontSize: "var(--text-xs)",
            }}
          >
            Error: {error}
          </span>
        </BentoBox>
      )}

      {/* Notion sync button -- sits above the filter column */}
      {notionConfigured && (
        <BentoBox cols={3}>
          <button
            type="button"
            onClick={handleNotionSync}
            disabled={syncStatus === "loading"}
            aria-label="Sync entries from Notion"
            style={{
              width: "100%",
              background: "transparent",
              border: `1px solid ${syncStatus === "error" ? "#B8536F" : syncStatus === "done" ? tk.gold : tk.divider}`,
              borderRadius: 6,
              color:
                syncStatus === "error"
                  ? "#B8536F"
                  : syncStatus === "done"
                    ? tk.gold
                    : syncStatus === "loading"
                      ? tk.textMuted
                      : tk.accent,
              cursor: syncStatus === "loading" ? "default" : "pointer",
              fontFamily: "var(--mono), ui-monospace, monospace",
              fontSize: "var(--text-xs)",
              letterSpacing: "0.08em",
              opacity: syncStatus === "loading" ? 0.6 : 1,
              padding: "6px 12px",
              transition: "opacity 160ms ease, border-color 200ms ease, color 200ms ease",
            }}
          >
            {syncStatus === "loading"
              ? "Syncing..."
              : syncStatus === "done"
                ? "Synced"
                : syncStatus === "error"
                  ? "Sync failed"
                  : "Sync Notion"}
          </button>
        </BentoBox>
      )}

      {/* Filters tile */}
      <BentoBox cols={3} eyebrow="01 // FILTERS" kanji="絞">
        <BrainFilters filter={filter} setFilter={setFilter} allTags={allTags} />
      </BentoBox>

      {/* Entry list tile */}
      <BentoBox
        cols={6}
        eyebrow="02 // ENTRIES"
        count={`${filtered.length} / ${entries.length}`}
        scroll
        style={{ minHeight: 420 }}
      >
        {loading && entries.length === 0 ? (
          <div
            style={{
              color: tk.textMuted,
              fontStyle: "italic",
              padding: "20px 0",
              textAlign: "center",
            }}
          >
            Loading entries...
          </div>
        ) : filtered.length === 0 ? (
          <div
            style={{
              color: tk.textMuted,
              fontStyle: "italic",
              padding: "20px 0",
              textAlign: "center",
            }}
          >
            {entries.length === 0
              ? "No brain entries yet. Drop something in Notion + /sweep-inbox."
              : "No entries match the current filter."}
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr",
              gap: 8,
            }}
          >
            {filtered.map((e) => (
              <BrainEntryCard
                key={e.slug}
                entry={e}
                onClick={() => setSelected(e)}
              />
            ))}
          </div>
        )}
      </BentoBox>

      {/* Queue panel tile */}
      <BentoBox
        cols={3}
        eyebrow="03 // QUEUE"
        count={stats.queueCount}
        kanji="列"
        scroll
        style={{ minHeight: 420 }}
      >
        <BrainQueuePanel
          entries={entries}
          onSelect={setSelected}
          onMutate={handleMutate}
        />
      </BentoBox>

      {/* Detail drawer — rendered as an overlay portal-style div */}
      {selected && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelected(null);
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 200,
            background: "rgba(0,0,0,0.55)",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              background: tk.panelBg,
              borderTop: `1px solid ${tk.divider}`,
              borderLeft: `1px solid ${tk.divider}`,
              borderRight: `1px solid ${tk.divider}`,
              borderRadius: "12px 12px 0 0",
              width: "100%",
              maxWidth: 680,
              maxHeight: "80vh",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            {/* Drawer head */}
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                padding: "16px 20px 12px",
                borderBottom: `1px solid ${tk.divider}`,
                flexShrink: 0,
              }}
            >
              <h2
                style={{
                  margin: 0,
                  flex: 1,
                  fontFamily: "var(--serif), Georgia, serif",
                  fontSize: "var(--text-lg)",
                  fontWeight: 500,
                  color: tk.textPrimary,
                  lineHeight: 1.3,
                }}
              >
                {selected.title}
              </h2>
              <button
                type="button"
                onClick={() => setSelected(null)}
                aria-label="Close"
                style={{
                  background: "transparent",
                  border: `1px solid ${tk.divider}`,
                  borderRadius: 6,
                  color: tk.textMuted,
                  cursor: "pointer",
                  fontSize: "var(--text-base)",
                  lineHeight: 1,
                  padding: "2px 8px",
                  flexShrink: 0,
                }}
              >
                ×
              </button>
            </div>

            {/* Meta row */}
            <div
              style={{
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
                padding: "10px 20px",
                borderBottom: `1px solid ${tk.divider}`,
                fontFamily: "var(--mono), ui-monospace, monospace",
                fontSize: "var(--text-2xs)",
                color: tk.textMuted,
                letterSpacing: "0.06em",
                flexShrink: 0,
              }}
            >
              <span>Score: {selected.frontmatter.score ?? "—"}/20</span>
              <span>Route: {selected.frontmatter.route ?? "—"}</span>
              <span>Filter: {selected.frontmatter.filter ?? "—"}</span>
              <span>Quality: {selected.frontmatter.source_quality ?? "—"}</span>
              <span>Status: {selected.frontmatter.status ?? "—"}</span>
              {selected.frontmatter.source_url && (
                <a
                  href={selected.frontmatter.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: tk.accent, textDecoration: "none" }}
                >
                  source ↗
                </a>
              )}
            </div>

            {/* Tags */}
            {(selected.frontmatter.tags ?? []).length > 0 && (
              <div
                style={{
                  display: "flex",
                  gap: 6,
                  flexWrap: "wrap",
                  padding: "8px 20px",
                  borderBottom: `1px solid ${tk.divider}`,
                  flexShrink: 0,
                }}
              >
                {(selected.frontmatter.tags ?? []).map((t) => (
                  <span
                    key={t}
                    style={{
                      fontFamily: "var(--mono), ui-monospace, monospace",
                      fontSize: "var(--text-2xs)",
                      letterSpacing: "0.06em",
                      color: tk.gold,
                      border: `1px solid ${tk.gold}`,
                      borderRadius: 4,
                      padding: "1px 6px",
                      opacity: 0.85,
                    }}
                  >
                    #{t}
                  </span>
                ))}
              </div>
            )}

            {/* Actions */}
            <div
              style={{
                display: "flex",
                gap: 8,
                padding: "10px 20px",
                borderBottom: `1px solid ${tk.divider}`,
                flexShrink: 0,
              }}
            >
              {[
                {
                  label: "Throw it",
                  patch: { status: "active", route: "queue" } as {
                    status?: string;
                    route?: string;
                  },
                },
                {
                  label: "Defer",
                  patch: { status: "active" } as {
                    status?: string;
                    route?: string;
                  },
                },
                {
                  label: "Archive",
                  patch: { status: "archived" } as {
                    status?: string;
                    route?: string;
                  },
                },
              ].map(({ label, patch }) => (
                <button
                  key={label}
                  type="button"
                  disabled={drawerBusy}
                  onClick={() => handleMutate(selected.slug, patch)}
                  style={{
                    background: "transparent",
                    border: `1px solid ${tk.accent}`,
                    borderRadius: 6,
                    color: tk.accent,
                    cursor: drawerBusy ? "default" : "pointer",
                    fontFamily: "var(--mono), ui-monospace, monospace",
                    fontSize: "var(--text-xs)",
                    letterSpacing: "0.08em",
                    opacity: drawerBusy ? 0.5 : 1,
                    padding: "5px 12px",
                    transition: "opacity 160ms ease",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Body */}
            <div style={{ flex: 1, overflowY: "auto", padding: "14px 20px" }}>
              <pre
                style={{
                  margin: 0,
                  fontFamily: "var(--mono), ui-monospace, monospace",
                  fontSize: "var(--text-xs)",
                  color: tk.textSub,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  lineHeight: 1.7,
                }}
              >
                {selected.body}
              </pre>
            </div>

            {/* Path footer */}
            <div
              style={{
                padding: "8px 20px",
                borderTop: `1px solid ${tk.divider}`,
                fontFamily: "var(--mono), ui-monospace, monospace",
                fontSize: "var(--text-2xs)",
                color: tk.textMuted,
                flexShrink: 0,
              }}
            >
              <code>{selected.relativePath}</code>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function BrainView() {
  // Stats for the eyebrow are derived inside BrainContent after the hook runs.
  // We use a wrapper that passes a static eyebrow; the tile counts are in BentoBox headers.
  return <BrainViewShell />;
}

// Separate so we can call useEmaki (inside EmakiProvider from TabShell) for the
// eyebrow stat string — the hook itself is in BrainContent; here we just render.
function BrainViewShell() {
  return (
    <TabShell
      title="Brain"
      eyebrow="SUBSTRATE // karpathy wiki · dartboard pipeline"
      actions={<BrainSearchAction />}
    >
      <BrainContent />
    </TabShell>
  );
}

// Search input rendered inside the actions slot (right of title).
// Needs its own hook call because it also shares the filter state — but the
// hook is called INSIDE BrainContent which owns the state. So we lift search
// into BrainContent and pass it via the actions prop by rendering a portal-style
// approach: the search lives at the top of BrainContent's returned fragment,
// INSIDE TabShell via the children prop, not the actions prop.
//
// Simplest correct fix: BrainContent is children (has access to TabShell's
// provider), so we just render the search inside a BentoBox or pass it via
// a context. For now, the search input is embedded in a dedicated tile.
// (The actions slot could hold a controlled input only if state were lifted further;
//  that would require restructuring the hook. This approach is functionally identical.)
function BrainSearchAction() {
  // This component runs inside EmakiProvider so useEmaki is safe.
  const { tk } = useEmaki();
  return (
    <span
      style={{
        fontFamily: "var(--mono), ui-monospace, monospace",
        fontSize: "var(--text-2xs)",
        color: tk.textMuted,
        letterSpacing: "0.1em",
      }}
    >
      ◉ BRAIN
    </span>
  );
}
