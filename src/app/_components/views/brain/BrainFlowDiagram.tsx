"use client";
import { useEffect, useState } from "react";

// react-mermaid2 is a small wrapper; loads on demand to keep initial bundle lean
import dynamic from "next/dynamic";

const Mermaid: any = dynamic(
  () => import("react-mermaid2").then((m) => m.default),
  {
    ssr: false,
    loading: () => (
      <div className="brain-mermaid-loading">Loading diagram...</div>
    ),
  },
);

const DIAGRAM = `flowchart TD
    START([PG drops resource]) --> S1
    S1[Stage 1 — Filter: real or theater?]
    S1 -->|hard fail| KF([KILL: productivity theater])
    S1 -->|pass| S2

    S2[Stage 2 — Reference or Candidate?]
    S2 -->|reference| FR[route: second brain]
    S2 -->|candidate| S3
    S2 -->|ambiguous| ASK[Ask PG]
    ASK -->|reference| FR
    ASK -->|candidate| S3

    S3[Stage 3 — 3-check Reframe]
    S3 --> S3A{3a Accurate framing}
    S3A -->|fantasy| KFR([KILL: unsupported future])
    S3A -->|pass| S3B
    S3B{3b Project-state check}
    S3B -->|all closed| KST([KILL: decision closed])
    S3B -->|open| S3C
    S3C{3c Novelty check}
    S3C -->|fail| KNV([KILL: no novelty])
    S3C -->|pass| AT[Auto-tag: seedling]
    AT --> S4

    S4[Stage 4 — Score on 6 axes, composite /20]
    S4 --> S5{Stage 5 — Route}
    S5 -->|>=13 + near-term + delegatable| QUE([QUEUE + PG OS Flow])
    S5 -->|otherwise| RT{File type}
    RT --> SRC[sources]
    RT --> CON[concepts]
    RT --> PLB[playbooks]
    RT --> SYN[synthesis]

    SRC --> MT
    CON --> MT
    PLB --> MT
    SYN --> MT
    QUE --> MT
    FR --> MT
    MT[Update by-tag.md + index.md + log.md + Notion row]
    MT --> DONE([Filed])

    classDef kill fill:#3a1c1f,stroke:#8b2c3a,color:#fff
    classDef stage fill:#1f2440,stroke:#5b6aa8,color:#fff
    classDef queue fill:#1c3a26,stroke:#3a7d4f,color:#fff

    class KF,KFR,KST,KNV kill
    class S1,S2,S3,S4,S5 stage
    class QUE queue`;

export function BrainFlowDiagram() {
  const [show, setShow] = useState(false);
  return (
    <div className="brain-flow-diagram">
      <button
        type="button"
        className="brain-flow-toggle"
        onClick={() => setShow((s) => !s)}
      >
        {show ? "Hide" : "Show"} how dartboard works ↓
      </button>
      {show && (
        <div className="brain-flow-render">
          <Mermaid chart={DIAGRAM} />
          <div className="brain-flow-caption">
            Skill source: <code>~/.claude/skills/dartboard/SKILL.md</code> ·
            Full source: <code>brain/docs/dartboard-flow.mmd</code>
          </div>
        </div>
      )}
    </div>
  );
}
