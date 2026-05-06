"use client";
import { useCallback, useRef } from "react";
import { TABS, useActiveTab, Tab } from "./useActiveTab";

/**
 * Tabs render as <a href="?tab=..."> so they navigate even if React
 * hydration fails (e.g. on iOS Safari with stale SW cache, network
 * stutter, or any other client-JS failure mode). When JS is alive,
 * onClick prevents default and uses the SPA path. This is the only
 * pattern that survives "site loaded but JS dead" failure on iOS.
 */
export function TabBar() {
  const { active, setActive } = useActiveTab();
  const tabRefs = useRef<(HTMLAnchorElement | null)[]>([]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLAnchorElement>, idx: number) => {
      const n = TABS.length;
      let nextIdx = -1;
      if (e.key === "ArrowRight") nextIdx = (idx + 1) % n;
      else if (e.key === "ArrowLeft") nextIdx = (idx - 1 + n) % n;
      else if (e.key === "Home") nextIdx = 0;
      else if (e.key === "End") nextIdx = n - 1;
      else return;
      e.preventDefault();
      const nextId: Tab = TABS[nextIdx].id;
      setActive(nextId);
      tabRefs.current[nextIdx]?.focus();
    },
    [setActive],
  );

  return (
    <div
      className="tabbar"
      role="tablist"
      aria-label="Primary navigation"
    >
      {TABS.map((t, i) => {
        const isActive = active === t.id;
        return (
          <a
            key={t.id}
            ref={(el) => { tabRefs.current[i] = el; }}
            role="tab"
            href={`?tab=${t.id}`}
            aria-selected={isActive}
            aria-controls={`view-${t.id}`}
            id={`tab-${t.id}`}
            tabIndex={isActive ? 0 : -1}
            className={`tab${isActive ? " active" : ""}`}
            onClick={(e) => {
              // Plain left-click → SPA path; let cmd/ctrl/middle/etc fall through
              if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
              e.preventDefault();
              setActive(t.id);
            }}
            onKeyDown={(e) => handleKeyDown(e, i)}
          >
            <span className="tab-num" aria-hidden>{t.num}</span>
            <span className="tab-glyph" aria-hidden>{t.glyph}</span>
            <span className="tab-label">{t.label}</span>
            <span className="tab-underline" aria-hidden />
          </a>
        );
      })}
    </div>
  );
}
