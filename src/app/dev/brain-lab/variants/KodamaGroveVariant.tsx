"use client";
/**
 * VARIANT 3 — KODAMA GROVE
 * Forest floor canvas, entries as kodama spirits.
 * Net-new: Spirit Council voting + Trail history.
 */
import { useState, useMemo } from "react";
import { useBrainEntries } from "../../../_components/views/brain/useBrainEntries";
import { useBrainMutations } from "../shared/Mutations";
import { useTheme } from "../shared/ThemeProvider";
import type { BrainEntry } from "@/lib/brain/types";

export function KodamaGroveVariant() {
  const theme = useTheme();
  const { entries, filtered, filter, setFilter, loading, refresh } =
    useBrainEntries();
  const [selected, setSelected] = useState<BrainEntry | null>(null);
  const [trail, setTrail] = useState<string[]>([]); // visited slugs
  const { busySlug, throwIt, defer, archive } = useBrainMutations(refresh);

  const handleSelect = (e: BrainEntry) => {
    setSelected(e);
    setTrail((t) => [e.slug, ...t.filter((s) => s !== e.slug)].slice(0, 6));
  };

  const council = useMemo(
    () =>
      entries
        .filter(
          (e) =>
            e.fileType === "queue" ||
            e.frontmatter.route === "queue" ||
            e.frontmatter.tags?.includes("seedling"),
        )
        .sort((a, b) => (b.frontmatter.score ?? 0) - (a.frontmatter.score ?? 0))
        .slice(0, 5),
    [entries],
  );

  return (
    <div
      className="grove"
      style={{ backgroundImage: `url(${theme.hero.paths[0]})` }}
    >
      <div className="grove-mist" />
      <div className="grove-content">
        <header className="grove-mast">
          <div className="grove-eyebrow">— THE GROVE OF GATHERED SPIRITS —</div>
          <h1 className="grove-headline">
            {entries.length}
            <span> kodama assembled</span>
          </h1>
          <input
            type="search"
            className="grove-search"
            placeholder="whisper through the grove…"
            value={filter.query}
            onChange={(e) => setFilter({ query: e.target.value })}
          />
        </header>

        {/* SPIRIT COUNCIL — queue items */}
        {council.length > 0 && (
          <section className="grove-council">
            <div className="grove-eyebrow">spirit council · convened</div>
            <div className="grove-council-ring">
              {council.map((e) => {
                const score = e.frontmatter.score ?? 0;
                const tier = score >= 14 ? "high" : score >= 10 ? "mid" : "low";
                return (
                  <article
                    key={e.slug}
                    className={`grove-kodama grove-kodama-${tier}`}
                    onClick={() => handleSelect(e)}
                  >
                    <div className="grove-kodama-rune" data-tier={tier}>
                      {score || "?"}
                    </div>
                    <div className="grove-kodama-name">{e.title}</div>
                    <div className="grove-kodama-actions">
                      <button
                        type="button"
                        disabled={busySlug === e.slug}
                        onClick={(ev) => {
                          ev.stopPropagation();
                          throwIt(e.slug);
                        }}
                      >
                        summon
                      </button>
                      <button
                        type="button"
                        disabled={busySlug === e.slug}
                        onClick={(ev) => {
                          ev.stopPropagation();
                          defer(e.slug);
                        }}
                      >
                        linger
                      </button>
                      <button
                        type="button"
                        disabled={busySlug === e.slug}
                        onClick={(ev) => {
                          ev.stopPropagation();
                          archive(e.slug);
                        }}
                      >
                        fade
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {/* TRAIL — recent visits */}
        {trail.length > 0 && (
          <section className="grove-trail">
            <div className="grove-eyebrow">
              trail · your route through the grove
            </div>
            <div className="grove-footsteps">
              {trail.map((slug, i) => {
                const e = entries.find((x) => x.slug === slug);
                if (!e) return null;
                return (
                  <button
                    key={slug}
                    type="button"
                    className="grove-step"
                    onClick={() => handleSelect(e)}
                    style={{ opacity: 1 - i * 0.12 }}
                  >
                    <span className="grove-step-glyph">✦</span>
                    {e.title.slice(0, 32)}
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* GROVE — main grid */}
        <main className="grove-field">
          {loading && entries.length === 0 ? (
            <div className="grove-empty">the spirits gather…</div>
          ) : filtered.length === 0 ? (
            <div className="grove-empty">no spirits answer this call</div>
          ) : (
            <div className="grove-grid">
              {filtered.map((e) => {
                const score = e.frontmatter.score ?? 0;
                const tier = score >= 14 ? "high" : score >= 10 ? "mid" : "low";
                return (
                  <article
                    key={e.slug}
                    className={`grove-tablet grove-tablet-${tier}`}
                    onClick={() => handleSelect(e)}
                  >
                    <div className="grove-rune" data-tier={tier}>
                      {score || "?"}
                    </div>
                    <h3 className="grove-tablet-title">{e.title}</h3>
                    <div className="grove-tablet-tags">
                      {(e.frontmatter.tags ?? []).slice(0, 4).map((t) => (
                        <span key={t}>{t}</span>
                      ))}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {/* CLEARING DRAWER */}
      {selected && (
        <div
          className="grove-clearing-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelected(null);
          }}
        >
          <aside className="grove-clearing">
            <button
              type="button"
              className="grove-clearing-close"
              onClick={() => setSelected(null)}
            >
              ×
            </button>
            <div className="grove-eyebrow">
              {selected.fileType} · score {selected.frontmatter.score ?? "—"}/20
            </div>
            <h2 className="grove-clearing-title">{selected.title}</h2>
            <div className="grove-tablet-tags">
              {(selected.frontmatter.tags ?? []).map((t) => (
                <span key={t}>{t}</span>
              ))}
            </div>
            <div className="grove-clearing-actions">
              <button
                type="button"
                disabled={busySlug === selected.slug}
                onClick={() => throwIt(selected.slug)}
              >
                summon
              </button>
              <button
                type="button"
                disabled={busySlug === selected.slug}
                onClick={() => defer(selected.slug)}
              >
                linger
              </button>
              <button
                type="button"
                disabled={busySlug === selected.slug}
                onClick={() => archive(selected.slug)}
              >
                fade
              </button>
              {selected.frontmatter.source_url && (
                <a
                  href={selected.frontmatter.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="grove-clearing-source"
                >
                  source ↗
                </a>
              )}
            </div>
            <pre className="grove-clearing-body">{selected.body}</pre>
          </aside>
        </div>
      )}
    </div>
  );
}
