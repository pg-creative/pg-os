"use client";
/**
 * VARIANT 2 — SKY WORLD
 * Floating parchment cards on Laputa stone tiles, deep blue→amber sunset.
 * Net-new: Flight Path arc + Cloud Bank queue + logbook drawer.
 */
import { useState } from "react";
import { useBrainEntries } from "../../../_components/views/brain/useBrainEntries";
import { useBrainMutations } from "../shared/Mutations";
import { useTheme } from "../shared/ThemeProvider";
import type { BrainEntry } from "@/lib/brain/types";

export function SkyWorldVariant() {
  const theme = useTheme();
  const { entries, filtered, filter, setFilter, loading, refresh } =
    useBrainEntries();
  const [selected, setSelected] = useState<BrainEntry | null>(null);
  const { busySlug, throwIt, defer, archive } = useBrainMutations(refresh);

  const cloudBank = entries
    .filter((e) => e.fileType === "queue" || e.frontmatter.route === "queue")
    .sort((a, b) => (b.frontmatter.score ?? 0) - (a.frontmatter.score ?? 0))
    .slice(0, 3);

  // Flight Path: chronological log along an arc
  const journey = [...entries]
    .sort((a, b) => a.modifiedAt - b.modifiedAt)
    .slice(-8);

  return (
    <div className="sky">
      <div
        className="sky-bg"
        style={{ backgroundImage: `url(${theme.hero.paths[0]})` }}
      />
      <div className="sky-veil" />
      <div className="sky-content">
        <header className="sky-mast">
          <div className="sky-eyebrow">— THE LIBRARY OF FLOATING ISLANDS —</div>
          <h1 className="sky-headline">
            {entries.length} <span>charts aboard</span>
          </h1>
          <input
            type="search"
            className="sky-search"
            placeholder="search the manifest…"
            value={filter.query}
            onChange={(e) => setFilter({ query: e.target.value })}
          />
        </header>

        {/* CLOUD BANK — queue items */}
        {cloudBank.length > 0 && (
          <section className="sky-cloud-bank">
            <div className="sky-eyebrow">cloud bank · throw next</div>
            <div className="sky-cloud-row">
              {cloudBank.map((e) => (
                <article
                  key={e.slug}
                  className="sky-cloud"
                  onClick={() => setSelected(e)}
                >
                  <div className="sky-compass">
                    {e.frontmatter.score ?? "?"}
                  </div>
                  <div className="sky-cloud-body">
                    <h3>{e.title}</h3>
                    <div className="sky-cloud-tags">
                      {(e.frontmatter.tags ?? []).slice(0, 3).map((t) => (
                        <span key={t}>#{t}</span>
                      ))}
                    </div>
                    <div className="sky-cloud-actions">
                      <button
                        type="button"
                        disabled={busySlug === e.slug}
                        onClick={(ev) => {
                          ev.stopPropagation();
                          throwIt(e.slug);
                        }}
                      >
                        set sail
                      </button>
                      <button
                        type="button"
                        disabled={busySlug === e.slug}
                        onClick={(ev) => {
                          ev.stopPropagation();
                          defer(e.slug);
                        }}
                      >
                        hold port
                      </button>
                      <button
                        type="button"
                        disabled={busySlug === e.slug}
                        onClick={(ev) => {
                          ev.stopPropagation();
                          archive(e.slug);
                        }}
                      >
                        scuttle
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* FLIGHT PATH — chronological arc */}
        {journey.length > 0 && (
          <section className="sky-flight">
            <div className="sky-eyebrow">
              flight path · recent ports of call
            </div>
            <div className="sky-arc">
              {journey.map((e, i) => (
                <button
                  key={e.slug}
                  type="button"
                  className="sky-port"
                  onClick={() => setSelected(e)}
                  style={{
                    left: `${(i / Math.max(1, journey.length - 1)) * 95 + 2}%`,
                    top: `${30 + Math.sin((i / journey.length) * Math.PI) * -22}%`,
                  }}
                  title={e.title}
                >
                  <span className="sky-port-glyph">⌖</span>
                  <span className="sky-port-label">{e.title.slice(0, 28)}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* CHARTS — main grid as floating parchment */}
        <main className="sky-charts">
          {loading && entries.length === 0 ? (
            <div className="sky-empty">unfurling the maps…</div>
          ) : filtered.length === 0 ? (
            <div className="sky-empty">no charts match this heading</div>
          ) : (
            <div className="sky-chart-grid">
              {filtered.map((e, i) => {
                const score = e.frontmatter.score ?? 0;
                const tier = score >= 14 ? "high" : score >= 10 ? "mid" : "low";
                const float = (i % 4) * 0.5;
                return (
                  <article
                    key={e.slug}
                    className={`sky-chart sky-chart-${tier}`}
                    style={{ animationDelay: `${float}s` }}
                    onClick={() => setSelected(e)}
                  >
                    <div className="sky-chart-brass" data-tier={tier}>
                      {score || "?"}
                    </div>
                    <h3 className="sky-chart-title">{e.title}</h3>
                    <div className="sky-chart-meta">
                      {e.fileType} ·{" "}
                      {(e.frontmatter.tags ?? []).slice(0, 3).join(" · ")}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {/* LOGBOOK DRAWER */}
      {selected && (
        <div
          className="sky-log-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelected(null);
          }}
        >
          <aside className="sky-log">
            <button
              type="button"
              className="sky-log-close"
              onClick={() => setSelected(null)}
            >
              ×
            </button>
            <div className="sky-log-mast">
              <div className="sky-eyebrow">
                {selected.fileType} · {selected.frontmatter.score ?? "—"}/20
              </div>
              <h2 className="sky-log-title">{selected.title}</h2>
              <div className="sky-log-tags">
                {(selected.frontmatter.tags ?? []).map((t) => (
                  <span key={t}>#{t}</span>
                ))}
              </div>
            </div>
            <div className="sky-log-actions">
              <button
                type="button"
                disabled={busySlug === selected.slug}
                onClick={() => throwIt(selected.slug)}
              >
                set sail
              </button>
              <button
                type="button"
                disabled={busySlug === selected.slug}
                onClick={() => defer(selected.slug)}
              >
                hold port
              </button>
              <button
                type="button"
                disabled={busySlug === selected.slug}
                onClick={() => archive(selected.slug)}
              >
                scuttle
              </button>
              {selected.frontmatter.source_url && (
                <a
                  href={selected.frontmatter.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="sky-log-source"
                >
                  source ↗
                </a>
              )}
            </div>
            <pre className="sky-log-body">{selected.body}</pre>
          </aside>
        </div>
      )}
    </div>
  );
}
