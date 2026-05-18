"use client";
/**
 * VARIANT 1 — SCHOLAR STUDY
 * Howl-library at golden hour. Cream paper backdrop, Cormorant Garamond serif,
 * royal-purple wax-seal CTAs. Cards as parchment leaves on a desk.
 *
 * Net-new sections per spec:
 *  - "Currently Reading" pinned stack
 *  - Bookshelf tag rail
 *  - Book-spread drawer
 */

import { useState, useMemo } from "react";
import { useBrainEntries } from "../../../_components/views/brain/useBrainEntries";
import { useBrainMutations } from "../shared/Mutations";
import { useTheme } from "../shared/ThemeProvider";
import type { BrainEntry } from "@/lib/brain/types";

export function ScholarStudyVariant() {
  const theme = useTheme();
  const { entries, filtered, filter, setFilter, allTags, loading, refresh } =
    useBrainEntries();
  const [selected, setSelected] = useState<BrainEntry | null>(null);
  const { busySlug, throwIt, defer, archive } = useBrainMutations(refresh);

  const topScore = entries.reduce(
    (max, e) => Math.max(max, e.frontmatter.score ?? 0),
    0,
  );

  const currentlyReading = useMemo(
    () =>
      entries
        .filter(
          (e) =>
            e.fileType === "queue" ||
            e.frontmatter.route === "queue" ||
            e.frontmatter.tags?.includes("seedling"),
        )
        .sort((a, b) => (b.frontmatter.score ?? 0) - (a.frontmatter.score ?? 0))
        .slice(0, 3),
    [entries],
  );

  return (
    <div
      className="scholar"
      style={{ backgroundImage: `url(${theme.hero.paths[0]})` }}
    >
      <div className="scholar-veil" />
      <div className="scholar-content">
        {/* MAST */}
        <header className="scholar-mast">
          <div className="scholar-eyebrow">
            BRAIN LIBRARY · DARTBOARD PIPELINE
          </div>
          <h1 className="scholar-headline">
            <span className="scholar-headline-num">{topScore}</span>
            <span className="scholar-headline-slash">/20</span>
            <span className="scholar-headline-text">
              the highest-scored manuscript in your library
            </span>
          </h1>
          <div className="scholar-mast-stats">
            <div className="scholar-stat">
              <div className="scholar-stat-num">{entries.length}</div>
              <div className="scholar-stat-label">manuscripts filed</div>
            </div>
            <div className="scholar-divider" />
            <div className="scholar-stat">
              <div className="scholar-stat-num">{currentlyReading.length}</div>
              <div className="scholar-stat-label">on the desk</div>
            </div>
            <div className="scholar-divider" />
            <div className="scholar-stat">
              <div className="scholar-stat-num">{allTags.length}</div>
              <div className="scholar-stat-label">domains catalogued</div>
            </div>
          </div>
        </header>

        {/* CURRENTLY READING STACK */}
        {currentlyReading.length > 0 && (
          <section className="scholar-reading">
            <div className="scholar-eyebrow">currently reading</div>
            <div className="scholar-reading-stack">
              {currentlyReading.map((e, i) => (
                <article
                  key={e.slug}
                  className={`scholar-reading-card scholar-reading-card-${i}`}
                  onClick={() => setSelected(e)}
                >
                  <div
                    className="scholar-seal scholar-seal-tier-{tier}"
                    data-score={e.frontmatter.score ?? 0}
                  >
                    {e.frontmatter.score ?? "?"}
                  </div>
                  <h3 className="scholar-reading-title">{e.title}</h3>
                  <div className="scholar-reading-meta">
                    {e.fileType} ·{" "}
                    {(e.frontmatter.tags ?? []).slice(0, 3).join(" · ")}
                  </div>
                  <div className="scholar-reading-actions">
                    <button
                      type="button"
                      disabled={busySlug === e.slug}
                      onClick={(ev) => {
                        ev.stopPropagation();
                        throwIt(e.slug);
                      }}
                    >
                      Throw it
                    </button>
                    <button
                      type="button"
                      disabled={busySlug === e.slug}
                      onClick={(ev) => {
                        ev.stopPropagation();
                        defer(e.slug);
                      }}
                    >
                      Defer
                    </button>
                    <button
                      type="button"
                      disabled={busySlug === e.slug}
                      onClick={(ev) => {
                        ev.stopPropagation();
                        archive(e.slug);
                      }}
                    >
                      Archive
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* SEARCH + FILTERS */}
        <section className="scholar-controls">
          <input
            type="search"
            className="scholar-search"
            placeholder="search the catalogue — titles, tags, body"
            value={filter.query}
            onChange={(e) => setFilter({ query: e.target.value })}
          />
        </section>

        {/* DESK GRID */}
        <main className="scholar-desk">
          {loading && entries.length === 0 ? (
            <div className="scholar-empty">opening the library…</div>
          ) : filtered.length === 0 ? (
            <div className="scholar-empty">
              No manuscripts match this query.
            </div>
          ) : (
            <div className="scholar-grid">
              {filtered.map((e, i) => {
                const score = e.frontmatter.score ?? 0;
                const tier = score >= 14 ? "high" : score >= 10 ? "mid" : "low";
                const rotation = ((i % 5) - 2) * 0.7;
                return (
                  <article
                    key={e.slug}
                    className={`scholar-card scholar-card-${tier}`}
                    style={{ transform: `rotate(${rotation}deg)` }}
                    onClick={() => setSelected(e)}
                  >
                    <div className="scholar-card-seal" data-tier={tier}>
                      {score || "—"}
                    </div>
                    <div className="scholar-card-body">
                      <h3 className="scholar-card-title">{e.title}</h3>
                      <div className="scholar-card-tags">
                        {(e.frontmatter.tags ?? []).slice(0, 4).map((t) => (
                          <span key={t} className="scholar-card-tag">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {/* BOOK-SPREAD DRAWER */}
      {selected && (
        <div
          className="scholar-book-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelected(null);
          }}
        >
          <aside className="scholar-book">
            <button
              type="button"
              className="scholar-book-close"
              onClick={() => setSelected(null)}
            >
              ×
            </button>
            <div className="scholar-book-recto">
              <div className="scholar-eyebrow">
                {selected.fileType} · score {selected.frontmatter.score ?? "—"}
                /20
              </div>
              <h2 className="scholar-book-title">{selected.title}</h2>
              <div className="scholar-book-tags">
                {(selected.frontmatter.tags ?? []).map((t) => (
                  <span key={t} className="scholar-card-tag">
                    {t}
                  </span>
                ))}
              </div>
              <div className="scholar-book-actions">
                <button
                  type="button"
                  disabled={busySlug === selected.slug}
                  onClick={() => throwIt(selected.slug)}
                >
                  Throw it
                </button>
                <button
                  type="button"
                  disabled={busySlug === selected.slug}
                  onClick={() => defer(selected.slug)}
                >
                  Defer
                </button>
                <button
                  type="button"
                  disabled={busySlug === selected.slug}
                  onClick={() => archive(selected.slug)}
                >
                  Archive
                </button>
                {selected.frontmatter.source_url && (
                  <a
                    href={selected.frontmatter.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="scholar-book-source"
                  >
                    source ↗
                  </a>
                )}
              </div>
            </div>
            <div className="scholar-book-verso">
              <pre>{selected.body}</pre>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
