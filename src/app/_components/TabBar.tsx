"use client";
import { useCallback, useRef } from "react";
import { TABS, useActiveTab, Tab } from "./useActiveTab";

export function TabBar() {
  const { active, setActive } = useActiveTab();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>, idx: number) => {
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
          <button
            key={t.id}
            ref={(el) => { tabRefs.current[i] = el; }}
            role="tab"
            aria-selected={isActive}
            aria-controls={`view-${t.id}`}
            id={`tab-${t.id}`}
            tabIndex={isActive ? 0 : -1}
            className={`tab${isActive ? " active" : ""}`}
            onClick={() => setActive(t.id)}
            onKeyDown={(e) => handleKeyDown(e, i)}
          >
            <span className="tab-num" aria-hidden>{t.num}</span>
            <span className="tab-label">{t.label}</span>
            <span className="tab-underline" aria-hidden />
          </button>
        );
      })}
    </div>
  );
}
