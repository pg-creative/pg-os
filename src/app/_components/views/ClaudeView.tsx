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
import { TabShell } from "../bento/TabShell";
import { BentoBox } from "../bento/BentoBox";
import { useEmaki } from "../bento/emakiContext";

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

/** Pill nav lives inside the TabShell actions slot; needs tk from EmakiProvider. */
function SectionPills({
  active,
  scrollTo,
}: {
  active: string;
  scrollTo: (id: string) => void;
}) {
  const { tk } = useEmaki();
  return (
    <>
      {SECTIONS.map((s) => (
        <button
          key={s.id}
          aria-pressed={active === s.id}
          onClick={() => scrollTo(s.id)}
          style={{
            background: active === s.id ? tk.accent : "rgba(0,0,0,0.14)",
            border: `1px solid ${active === s.id ? tk.accent : tk.divider}`,
            borderRadius: 999,
            color: active === s.id ? "#fff" : tk.textMuted,
            fontFamily: "var(--mono), ui-monospace, monospace",
            fontSize: "var(--text-2xs)",
            letterSpacing: "0.1em",
            textTransform: "uppercase" as const,
            padding: "4px 11px",
            cursor: "pointer",
            transition: "background 140ms ease, color 140ms ease",
            whiteSpace: "nowrap" as const,
          }}
        >
          {s.label}
        </button>
      ))}
    </>
  );
}

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
    <TabShell
      title="Claude"
      eyebrow="SELF-IMPROVEMENT // OBSERVATORY"
      actions={<SectionPills active={active} scrollTo={scrollTo} />}
    >
      <BentoBox cols={12} eyebrow="01 // ACTIVITY" scroll>
        <div id="cl-activity">
          <ClaudeActivity />
        </div>
      </BentoBox>

      <BentoBox cols={12} eyebrow="02 // OFFICE" scroll>
        <div id="cl-office">
          <PixelOfficeView />
        </div>
      </BentoBox>

      <BentoBox cols={12} eyebrow="03 // OVERVIEW" scroll>
        <div id="cl-overview">
          <ClaudeOverview />
        </div>
      </BentoBox>

      <BentoBox cols={12} eyebrow="04 // PROPOSALS" scroll>
        <div id="cl-proposals">
          <ClaudeProposals />
        </div>
      </BentoBox>

      <BentoBox cols={12} eyebrow="05 // TRUST" scroll>
        <div id="cl-trust">
          <ClaudeTrust />
        </div>
      </BentoBox>

      <BentoBox cols={12} eyebrow="06 // AGENTS" scroll>
        <div id="cl-agents">
          <ClaudeAgents />
        </div>
      </BentoBox>

      <BentoBox cols={12} eyebrow="07 // SIGNALS" scroll>
        <div id="cl-signals">
          <ClaudeSignals />
        </div>
      </BentoBox>

      <BentoBox cols={12} eyebrow="08 // SKILLS" scroll>
        <div id="cl-skills">
          <ClaudeSkills />
        </div>
      </BentoBox>

      <BentoBox cols={12} eyebrow="09 // ARCHIVE" scroll>
        <div id="cl-archive">
          <ClaudeArchive />
        </div>
      </BentoBox>
    </TabShell>
  );
}
