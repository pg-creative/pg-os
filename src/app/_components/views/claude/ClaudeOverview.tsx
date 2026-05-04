"use client";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useIsCloud } from "../../useIsCloud";
import { EmptyState } from "../../EmptyState";

type Narration = {
  narration: string;
  updatedAt: string;
  targets: string[];
};

/**
 * Parse a narration paragraph into ReactNodes.
 * Handles:
 *   *word*               → <em>word</em>
 *   [[label|target]]     → <button className="cl-narration-link">label</button>
 */
function renderNarrationParagraph(
  text: string,
  scrollToSection: (id: string) => void,
): ReactNode[] {
  // Token pattern: either [[label|target]] or *word*
  const TOKEN = /(\[\[([^\]|]+)\|([^\]]+)\]\])|(\*([^*]+)\*)/g;
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = TOKEN.exec(text)) !== null) {
    // Push any plain text before this token
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    if (match[1]) {
      // [[label|target]]
      const label = match[2].trim();
      const target = match[3].trim();
      nodes.push(
        <button
          key={key++}
          className="cl-narration-link"
          onClick={() => scrollToSection(target)}
        >
          {label}
        </button>,
      );
    } else if (match[4]) {
      // *emphasis*
      nodes.push(<em key={key++}>{match[5]}</em>);
    }

    lastIndex = match.index + match[0].length;
  }

  // Remaining plain text
  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}

export function ClaudeOverview() {
  const [narration, setNarration] = useState<Narration | null>(null);
  const [loading, setLoading] = useState(true);
  const [launching, setLaunching] = useState(false);
  const isCloud = useIsCloud();

  const scrollToSection = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/claude/overview/narrate", { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error("narrate fetch failed");
        return res.json() as Promise<Narration>;
      })
      .then((data) => {
        if (!cancelled) setNarration(data);
      })
      .catch(() => {
        // Fall through — render fallback prose inline rather than error
        if (!cancelled) {
          setNarration({
            narration:
              "Watching the patterns. Nothing strident this week — last review still holds.",
            updatedAt: new Date().toISOString(),
            targets: [],
          });
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const launchClaude = useCallback(async () => {
    setLaunching(true);
    try {
      const res = await fetch("/api/launch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: "claude-config" }),
      });
      const j = await res.json();
      if (!j.autoLaunched && j.command) {
        try {
          await navigator.clipboard.writeText(j.command);
        } catch {
          /* clipboard may be blocked */
        }
      }
    } finally {
      setLaunching(false);
    }
  }, []);

  return (
    <section id="cl-overview" className="card cl-card cl-overview">
      <div className="card-label">
        <span>00 // OVERVIEW</span>
        <span className="cl-tag-muted">last 7 days</span>
      </div>

      {loading ? (
        <EmptyState
          verb="Listening"
          explanation="Reading what the agents observed <em>this week</em>."
          glyph="◐"
          variant="small"
        />
      ) : narration ? (
        <div className="cl-narration" aria-live="polite">
          {narration.narration
            .split(/\n\n+/)
            .filter(Boolean)
            .map((para, i) => (
              <p key={i}>
                {renderNarrationParagraph(para, scrollToSection)}
              </p>
            ))}
        </div>
      ) : null}

      <div className="cl-overview-actions">
        {isCloud ? (
          <span className="cl-laptop-only-hint">
            Open <strong>Claude Code</strong> from your laptop —{" "}
            <code>pgos</code> in terminal opens dev server + browser.
          </span>
        ) : (
          <button className="cl-btn cl-btn-primary" onClick={launchClaude} disabled={launching}>
            {launching ? "Opening…" : "Open Claude Code →"}
          </button>
        )}
      </div>
    </section>
  );
}
