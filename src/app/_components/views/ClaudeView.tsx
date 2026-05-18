"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { ClaudeActivity } from "./claude/ClaudeActivity";
import { ClaudeOverview } from "./claude/ClaudeOverview";
import { ClaudeProposals } from "./claude/ClaudeProposals";
import { ClaudeTrust } from "./claude/ClaudeTrust";
import { ClaudeAgents } from "./claude/ClaudeAgents";
import { ClaudeSignals } from "./claude/ClaudeSignals";
import { ClaudeSkills } from "./claude/ClaudeSkills";
import { ClaudeArchive } from "./claude/ClaudeArchive";
import { PixelOfficeView } from "./claude/PixelOfficeView";

const SECTIONS = [
  { id: "cl-activity", label: "ACTIVITY" },
  { id: "cl-office", label: "OFFICE" },
  { id: "cl-overview", label: "OVERVIEW" },
  { id: "cl-proposals", label: "PROPOSALS" },
  { id: "cl-trust", label: "TRUST" },
  { id: "cl-agents", label: "AGENTS" },
  { id: "cl-signals", label: "SIGNALS" },
  { id: "cl-skills", label: "SKILLS" },
  { id: "cl-archive", label: "ARCHIVE" },
];

export function ClaudeView() {
  const [active, setActive] = useState<string>("cl-overview");
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const visible = new Map<string, number>();
    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          visible.set(entry.target.id, entry.intersectionRatio);
        }
        let bestId = active;
        let bestRatio = -1;
        for (const [id, ratio] of visible) {
          if (ratio > bestRatio) {
            bestRatio = ratio;
            bestId = id;
          }
        }
        if (bestId !== active && bestRatio > 0) setActive(bestId);
      },
      { rootMargin: "-30% 0px -50% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] },
    );
    for (const s of SECTIONS) {
      const el = document.getElementById(s.id);
      if (el) obs.observe(el);
    }
    observerRef.current = obs;
    return () => obs.disconnect();
  }, [active]);

  const scrollTo = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    setActive(id);
  }, []);

  return (
    <div className="view view-claude">
      <div className="view-header">
        <h1 className="view-title">Claude</h1>
        <div className="view-sub">SELF-IMPROVEMENT · OBSERVATORY</div>
      </div>

      <nav className="cl-subnav" aria-label="Claude tab sections">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            className={`cl-subnav-pill${active === s.id ? " active" : ""}`}
            onClick={() => scrollTo(s.id)}
          >
            {s.label}
          </button>
        ))}
      </nav>

      <div className="cl-stack">
        <ClaudeActivity />
        <PixelOfficeView />
        <ClaudeOverview />
        <ClaudeProposals />
        <ClaudeTrust />
        <ClaudeAgents />
        <ClaudeSignals />
        <ClaudeSkills />
        <ClaudeArchive />
      </div>
    </div>
  );
}
