"use client";
/**
 * VARIANT 4 — SCRIPTORIUM
 * Illuminated manuscript desk + hex-grid map wall.
 * Net-new: Marginalia annotations + Codex spread + wax-seal tiers.
 */
import { useState } from "react";
import { useBrainEntries } from "../../../_components/views/brain/useBrainEntries";
import { useBrainMutations } from "../shared/Mutations";
import { useTheme } from "../shared/ThemeProvider";
import type { BrainEntry } from "@/lib/brain/types";

const SEAL_LABEL = { high: "ruby", mid: "amber", low: "sapphire", kill: "lead" };

export function ScriptoriumVariant() {
  const theme = useTheme();
  const { entries, filtered, filter, setFilter, loading, refresh } = useBrainEntries();
  const [selected, setSelected] = useState<BrainEntry | null>(null);
  const [view, setView] = useState<"leaves" | "codex">("leaves");
  const { busySlug, throwIt, defer, archive } = useBrainMutations(refresh);

  const codexEntries = [...entries].sort((a, b) =>
    a.title.localeCompare(b.title)
  );

  return (
    <div className="scrip" style={{ backgroundImage: `url(${theme.hero.paths[0]})` }}>
      <div className="scrip-veil" />
      <div className="scrip-content">
        <header className="scrip-mast">
          <div className="scrip-eyebrow">— Codex Cerebri · MMXXVI —</div>
          <h1 className="scrip-headline">{entries.length} <span>Illuminations</span></h1>
          <div className="scrip-controls">
            <input
              type="search"
              className="scrip-search"
              placeholder="dictum quaere…"
              value={filter.query}
              onChange={(e) => setFilter({ query: e.target.value })}
            />
            <div className="scrip-view-toggle">
              <button type="button" className={view === "leaves" ? "active" : ""} onClick={() => setView("leaves")}>Leaves</button>
              <button type="button" className={view === "codex" ? "active" : ""} onClick={() => setView("codex")}>Codex</button>
            </div>
          </div>
        </header>

        {view === "leaves" ? (
          <main className="scrip-leaves">
            {loading && entries.length === 0 ? (
              <div className="scrip-empty">illuminating the leaves…</div>
            ) : filtered.length === 0 ? (
              <div className="scrip-empty">non est responsum</div>
            ) : (
              <div className="scrip-leaf-grid">
                {filtered.map((e) => {
                  const score = e.frontmatter.score ?? 0;
                  const tier = score >= 14 ? "high" : score >= 10 ? "mid" : "low";
                  const dropCap = e.title.charAt(0).toUpperCase();
                  return (
                    <article key={e.slug} className={`scrip-leaf scrip-leaf-${tier}`} onClick={() => setSelected(e)}>
                      <div className={`scrip-seal scrip-seal-${tier}`} data-tier={tier}>
                        <span className="scrip-seal-num">{score || "—"}</span>
                        <span className="scrip-seal-label">{SEAL_LABEL[tier as keyof typeof SEAL_LABEL]}</span>
                      </div>
                      <div className="scrip-leaf-body">
                        <span className="scrip-drop">{dropCap}</span>
                        <h3 className="scrip-leaf-title">{e.title.slice(1)}</h3>
                        <div className="scrip-leaf-marginalia">
                          {e.fileType} · {(e.frontmatter.tags ?? []).slice(0, 4).join(" · ")}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </main>
        ) : (
          <main className="scrip-codex">
            <div className="scrip-codex-heading">— Indices Codicis —</div>
            <ol className="scrip-codex-list">
              {codexEntries.map((e) => (
                <li key={e.slug} onClick={() => setSelected(e)}>
                  <span className="scrip-codex-folio">f. {String(codexEntries.indexOf(e) + 1).padStart(3, "0")}</span>
                  <span className="scrip-codex-title">{e.title}</span>
                  <span className="scrip-codex-meta">{e.fileType}</span>
                  <span className="scrip-codex-score">{e.frontmatter.score ?? "—"}/20</span>
                </li>
              ))}
            </ol>
          </main>
        )}
      </div>

      {/* MANUSCRIPT PAGE DRAWER */}
      {selected && (
        <div className="scrip-page-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setSelected(null); }}>
          <aside className="scrip-page">
            <button type="button" className="scrip-page-close" onClick={() => setSelected(null)}>×</button>
            <div className="scrip-page-margin">
              <div className="scrip-eyebrow">{selected.fileType} · {selected.frontmatter.score ?? "—"}/20</div>
              <div className="scrip-page-tags">
                {(selected.frontmatter.tags ?? []).map((t) => <span key={t}>{t}</span>)}
              </div>
              <div className="scrip-page-actions">
                <button type="button" disabled={busySlug === selected.slug} onClick={() => throwIt(selected.slug)}>illuminate</button>
                <button type="button" disabled={busySlug === selected.slug} onClick={() => defer(selected.slug)}>defer</button>
                <button type="button" disabled={busySlug === selected.slug} onClick={() => archive(selected.slug)}>seal</button>
                {selected.frontmatter.source_url && (
                  <a href={selected.frontmatter.source_url} target="_blank" rel="noopener noreferrer">fons ↗</a>
                )}
              </div>
            </div>
            <div className="scrip-page-vellum">
              <span className="scrip-drop scrip-drop-page">{selected.title.charAt(0).toUpperCase()}</span>
              <h2 className="scrip-page-title">{selected.title.slice(1)}</h2>
              <pre className="scrip-page-body">{selected.body}</pre>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
