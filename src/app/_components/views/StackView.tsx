"use client";
import { useEffect, useMemo, useState } from "react";

type Verdict = "INSTALL" | "CONDITIONAL" | "DEFER" | "SKIP" | "PENDING";

type EvalRecord = {
  id: string;
  title: string;
  category: string;
  score: string;
  source: string;
  lens: string;
  install: string;
  verdict: Verdict;
  verdictText: string;
  raw: string;
};

type StackData = {
  brain: string;
  brainMtime: string | null;
  evals: EvalRecord[];
  status: Record<string, "pending" | "installed" | "passed">;
  lastRun: string | null;
  nextScheduled: string;
};

const CATEGORIES = [
  "All",
  "Plugin",
  "Skill",
  "MCP",
  "Fix",
  "Marketplace",
] as const;
type Category = (typeof CATEGORIES)[number];

const VERDICT_META: Record<
  Verdict,
  { glyph: string; label: string; tone: string }
> = {
  INSTALL: { glyph: "✓", label: "Install", tone: "go" },
  CONDITIONAL: { glyph: "~", label: "Conditional", tone: "warn" },
  DEFER: { glyph: "○", label: "Defer", tone: "hold" },
  SKIP: { glyph: "✕", label: "Skip", tone: "stop" },
  PENDING: { glyph: "?", label: "Pending", tone: "neutral" },
};

const STATUS_META: Record<string, { glyph: string; label: string }> = {
  pending: { glyph: "○", label: "Pending" },
  installed: { glyph: "●", label: "Installed" },
  passed: { glyph: "—", label: "Passed" },
};

export function StackView() {
  const [data, setData] = useState<StackData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Category>("All");
  const [openEval, setOpenEval] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/claude/stack", { cache: "no-store" })
      .then((res) => res.json())
      .then((d: StackData) => {
        if (!cancelled) setData(d);
      })
      .catch(() => {
        // Render empty state if API fails
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredEvals = useMemo(() => {
    if (!data) return [];
    if (filter === "All") return data.evals;
    return data.evals.filter((e) => e.category === filter);
  }, [data, filter]);

  const counts = useMemo(() => {
    if (!data) return {} as Record<string, number>;
    const c: Record<string, number> = { All: data.evals.length };
    for (const e of data.evals) c[e.category] = (c[e.category] ?? 0) + 1;
    return c;
  }, [data]);

  async function setStatus(
    evalId: string,
    newStatus: "pending" | "installed" | "passed",
  ) {
    const res = await fetch("/api/claude/stack", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ evalId, status: newStatus }),
    });
    if (res.ok && data) {
      const updated = await res.json();
      setData({ ...data, status: updated.status });
    }
  }

  if (loading) {
    return (
      <section
        className="view"
        id="view-stack"
        role="tabpanel"
        aria-labelledby="tab-stack"
      >
        <h1 className="view-title">Stack</h1>
        <p className="view-empty">Loading the field map…</p>
      </section>
    );
  }

  if (!data) {
    return (
      <section
        className="view"
        id="view-stack"
        role="tabpanel"
        aria-labelledby="tab-stack"
      >
        <h1 className="view-title">Stack</h1>
        <p className="view-empty">Couldn&apos;t reach the stack API.</p>
      </section>
    );
  }

  return (
    <section
      className="view stack-view"
      id="view-stack"
      role="tabpanel"
      aria-labelledby="tab-stack"
    >
      <header className="stack-header">
        <div>
          <h1 className="view-title">Stack</h1>
          <p className="stack-sub">
            Claude Code extension landscape — plugins, skills, MCPs. Three
            lenses: novel-since-last-rebuild, community-favored,
            best-fit-for-PG.
          </p>
        </div>
        <div className="stack-meta">
          <span className="stack-meta-line">
            <span className="stack-meta-label">Last run</span>
            <span className="stack-meta-value">{data.lastRun ?? "—"}</span>
          </span>
          <span className="stack-meta-line">
            <span className="stack-meta-label">Next scheduled</span>
            <span className="stack-meta-value">{data.nextScheduled}</span>
          </span>
        </div>
      </header>

      <nav className="stack-tabs" role="tablist" aria-label="Stack categories">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            role="tab"
            aria-selected={filter === c}
            className={`stack-tab${filter === c ? " active" : ""}`}
            onClick={() => setFilter(c)}
          >
            {c}
            {typeof counts[c] === "number" && (
              <span className="stack-tab-count">{counts[c]}</span>
            )}
          </button>
        ))}
      </nav>

      <div className="stack-grid">
        {filteredEvals.map((e) => {
          const v = VERDICT_META[e.verdict];
          const itemStatus = data.status[e.id] ?? "pending";
          const s = STATUS_META[itemStatus];
          const isOpen = openEval === e.id;
          return (
            <article
              key={e.id}
              className={`stack-card stack-card-${v.tone}${isOpen ? " open" : ""}`}
            >
              <button
                className="stack-card-summary"
                onClick={() => setOpenEval(isOpen ? null : e.id)}
                aria-expanded={isOpen}
              >
                <div className="stack-card-top">
                  <span className={`stack-verdict stack-verdict-${v.tone}`}>
                    {v.glyph} {v.label}
                  </span>
                  <span className="stack-score">{e.score}</span>
                </div>
                <h3 className="stack-card-title">{e.title}</h3>
                <div className="stack-card-meta">
                  <span className="stack-pill">{e.category}</span>
                  <span className="stack-pill stack-pill-lens">{e.lens}</span>
                  <span className={`stack-status stack-status-${itemStatus}`}>
                    {s.glyph} {s.label}
                  </span>
                </div>
                <p className="stack-card-verdict">
                  {e.verdictText.slice(0, 220)}
                </p>
              </button>

              {isOpen && (
                <div className="stack-card-body">
                  {e.install && (
                    <pre className="stack-install">
                      <code>{e.install}</code>
                    </pre>
                  )}
                  <pre className="stack-raw">{e.raw}</pre>
                  <div className="stack-actions">
                    <button
                      className={`stack-act${itemStatus === "installed" ? " active" : ""}`}
                      onClick={() => setStatus(e.id, "installed")}
                    >
                      ● Installed
                    </button>
                    <button
                      className={`stack-act${itemStatus === "passed" ? " active" : ""}`}
                      onClick={() => setStatus(e.id, "passed")}
                    >
                      — Passed
                    </button>
                    <button
                      className={`stack-act${itemStatus === "pending" ? " active" : ""}`}
                      onClick={() => setStatus(e.id, "pending")}
                    >
                      ○ Reset
                    </button>
                  </div>
                </div>
              )}
            </article>
          );
        })}
        {filteredEvals.length === 0 && (
          <p className="view-empty">No items in this category.</p>
        )}
      </div>

      <details className="stack-report">
        <summary>Full landscape report (brain entry)</summary>
        <pre className="stack-report-body">{data.brain}</pre>
      </details>
    </section>
  );
}
