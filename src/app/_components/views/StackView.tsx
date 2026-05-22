"use client";
import { useEffect, useMemo, useState } from "react";
import { TabShell } from "../bento/TabShell";
import { BentoBox } from "../bento/BentoBox";
import { useEmaki } from "../bento/emakiContext";

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

// Verdict tone -> color mapping using Emaki token references
function verdictColor(
  tone: string,
  tk: ReturnType<typeof useEmaki>["tk"],
): string {
  if (tone === "go") return "#7C9A6E";
  if (tone === "warn") return tk.gold;
  if (tone === "hold") return tk.textSub;
  if (tone === "stop") return "#B8536F";
  return tk.textMuted;
}

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

  const eyebrow = data
    ? `FIELD MAP // ${data.evals.length} evals`
    : "FIELD MAP";

  const actions = (
    <CategoryFilters filter={filter} setFilter={setFilter} counts={counts} />
  );

  if (loading) {
    return (
      <TabShell title="Stack" eyebrow={eyebrow}>
        <LoadingTile />
      </TabShell>
    );
  }

  if (!data) {
    return (
      <TabShell title="Stack" eyebrow={eyebrow}>
        <ErrorTile />
      </TabShell>
    );
  }

  return (
    <TabShell title="Stack" eyebrow={eyebrow} actions={actions}>
      <MetaTile data={data} />
      <EvalList
        evals={filteredEvals}
        status={data.status}
        openEval={openEval}
        setOpenEval={setOpenEval}
        setStatus={setStatus}
      />
      <BrainTile brain={data.brain} />
    </TabShell>
  );
}

// Inner components that consume useEmaki() inside EmakiProvider

function CategoryFilters({
  filter,
  setFilter,
  counts,
}: {
  filter: Category;
  setFilter: (c: Category) => void;
  counts: Record<string, number>;
}) {
  const { tk } = useEmaki();
  return (
    <>
      {CATEGORIES.map((c) => (
        <button
          key={c}
          role="tab"
          aria-selected={filter === c}
          onClick={() => setFilter(c)}
          style={{
            background: filter === c ? "rgba(0,0,0,0.22)" : "rgba(0,0,0,0.10)",
            border: `1px solid ${filter === c ? tk.accent : tk.divider}`,
            borderRadius: 6,
            color: filter === c ? tk.accent : tk.textMuted,
            fontFamily: "var(--mono), ui-monospace, monospace",
            fontSize: "var(--text-2xs)",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            padding: "5px 11px",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            transition: "border-color 160ms ease, color 160ms ease",
          }}
        >
          {c}
          {typeof counts[c] === "number" && (
            <span
              style={{
                background: filter === c ? tk.accent : tk.divider,
                color: filter === c ? tk.panelBg : tk.textMuted,
                borderRadius: 999,
                padding: "0 5px",
                fontSize: "var(--text-2xs)",
                lineHeight: 1.5,
                fontWeight: 700,
              }}
            >
              {counts[c]}
            </span>
          )}
        </button>
      ))}
    </>
  );
}

function LoadingTile() {
  const { tk } = useEmaki();
  return (
    <BentoBox cols={12} eyebrow="01 // FIELD MAP">
      <div
        style={{
          color: tk.textMuted,
          fontStyle: "italic",
          padding: "20px 0",
          textAlign: "center",
        }}
      >
        loading the field map...
      </div>
    </BentoBox>
  );
}

function ErrorTile() {
  const { tk } = useEmaki();
  return (
    <BentoBox cols={12} eyebrow="01 // FIELD MAP">
      <div
        style={{
          color: tk.textMuted,
          fontStyle: "italic",
          padding: "20px 0",
          textAlign: "center",
        }}
      >
        couldn&apos;t reach the stack API.
      </div>
    </BentoBox>
  );
}

function MetaTile({ data }: { data: StackData }) {
  const { tk } = useEmaki();
  return (
    <BentoBox cols={12} eyebrow="01 // LANDSCAPE" kanji="評">
      <div
        style={{
          display: "flex",
          gap: 32,
          flexWrap: "wrap",
          alignItems: "flex-start",
        }}
      >
        <p
          style={{
            flex: 1,
            minWidth: 260,
            margin: 0,
            fontSize: "var(--text-sm)",
            color: tk.textSub,
            lineHeight: 1.65,
          }}
        >
          Claude Code extension landscape — plugins, skills, MCPs. Three lenses:
          novel-since-last-rebuild, community-favored, best-fit-for-PG.
        </p>
        <div
          style={{
            display: "flex",
            gap: 24,
            fontFamily: "var(--mono), ui-monospace, monospace",
            fontSize: "var(--text-xs)",
          }}
        >
          <span>
            <span style={{ color: tk.textMuted, marginRight: 6 }}>
              last run
            </span>
            <span style={{ color: tk.textPrimary }}>{data.lastRun ?? "—"}</span>
          </span>
          <span>
            <span style={{ color: tk.textMuted, marginRight: 6 }}>next</span>
            <span style={{ color: tk.textPrimary }}>{data.nextScheduled}</span>
          </span>
        </div>
      </div>
    </BentoBox>
  );
}

function EvalList({
  evals,
  status,
  openEval,
  setOpenEval,
  setStatus,
}: {
  evals: EvalRecord[];
  status: Record<string, "pending" | "installed" | "passed">;
  openEval: string | null;
  setOpenEval: (id: string | null) => void;
  setStatus: (id: string, s: "pending" | "installed" | "passed") => void;
}) {
  const { tk } = useEmaki();

  if (evals.length === 0) {
    return (
      <BentoBox cols={12}>
        <div
          style={{
            color: tk.textMuted,
            fontStyle: "italic",
            textAlign: "center",
            padding: "12px 0",
          }}
        >
          no items in this category.
        </div>
      </BentoBox>
    );
  }

  return (
    <>
      {evals.map((e) => (
        <EvalTile
          key={e.id}
          record={e}
          itemStatus={status[e.id] ?? "pending"}
          isOpen={openEval === e.id}
          onToggle={() => setOpenEval(openEval === e.id ? null : e.id)}
          onSetStatus={(s) => setStatus(e.id, s)}
        />
      ))}
    </>
  );
}

function EvalTile({
  record,
  itemStatus,
  isOpen,
  onToggle,
  onSetStatus,
}: {
  record: EvalRecord;
  itemStatus: "pending" | "installed" | "passed";
  isOpen: boolean;
  onToggle: () => void;
  onSetStatus: (s: "pending" | "installed" | "passed") => void;
}) {
  const { tk } = useEmaki();
  const v = VERDICT_META[record.verdict];
  const s = STATUS_META[itemStatus];
  const vColor = verdictColor(v.tone, tk);
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    try {
      if (!navigator.clipboard) return;
      navigator.clipboard.writeText(record.install).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      });
    } catch {
      // clipboard unavailable or denied -- silent no-op
    }
  }

  // Semantic badge colors for status
  function statusBadgeColor(st: "pending" | "installed" | "passed"): string {
    if (st === "installed") return "#7C9A6E";
    if (st === "passed") return "#7C9A6E";
    return tk.gold;
  }

  return (
    <BentoBox
      cols={4}
      style={{
        outline: isOpen ? `1.5px solid ${tk.accent}` : undefined,
        transition: "outline-color 160ms ease",
        cursor: "pointer",
      }}
    >
      <button
        onClick={onToggle}
        aria-expanded={isOpen}
        style={{
          background: "none",
          border: "none",
          padding: 0,
          width: "100%",
          textAlign: "left",
          cursor: "pointer",
          color: "inherit",
          /* Enforce consistent collapsed height so bento grid stays aligned */
          minHeight: 96,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Verdict + score row */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 6,
          }}
        >
          <span
            style={{
              fontFamily: "var(--mono), ui-monospace, monospace",
              fontSize: "var(--text-2xs)",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              fontWeight: 700,
              color: vColor,
              background: `${vColor}18`,
              border: `1px solid ${vColor}80`,
              borderRadius: 4,
              padding: "2px 7px",
            }}
          >
            {v.glyph} {v.label}
          </span>
          <span
            style={{
              fontFamily: "var(--mono), ui-monospace, monospace",
              fontSize: "var(--text-2xs)",
              color: tk.gold,
              fontWeight: 700,
            }}
          >
            {record.score}
          </span>
        </div>

        {/* Title */}
        <div
          style={{
            fontFamily: "var(--serif), Georgia, serif",
            fontSize: "var(--text-base)",
            fontWeight: 500,
            color: tk.textPrimary,
            marginBottom: 6,
            lineHeight: 1.3,
          }}
        >
          {record.title}
        </div>

        {/* Pills row */}
        <div
          style={{
            display: "flex",
            gap: 6,
            flexWrap: "wrap",
            marginBottom: 8,
            alignItems: "center",
          }}
        >
          <PillTag tk={tk}>{record.category}</PillTag>
          <PillTag tk={tk} dim>
            {record.lens}
          </PillTag>
          {/* Status badge — semantic color, visible border */}
          <span
            style={{
              fontFamily: "var(--mono), ui-monospace, monospace",
              fontSize: "var(--text-2xs)",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              fontWeight: 700,
              color: statusBadgeColor(itemStatus),
              background: `${statusBadgeColor(itemStatus)}18`,
              border: `1px solid ${statusBadgeColor(itemStatus)}80`,
              borderRadius: 4,
              padding: "2px 7px",
              marginLeft: "auto",
            }}
          >
            {s.glyph} {s.label}
          </span>
        </div>

        {/* Verdict text preview — clamped to 2 lines with fade */}
        <p
          style={{
            margin: 0,
            fontSize: "var(--text-xs)",
            color: tk.textSub,
            lineHeight: 1.55,
            opacity: 0.85,
            /* Hard clamp to 2 lines so all cards align */
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {record.verdictText}
        </p>
      </button>

      {/* Expanded body */}
      {isOpen && (
        <div
          style={{
            marginTop: 14,
            borderTop: `1px solid ${tk.divider}`,
            paddingTop: 12,
          }}
        >
          {record.install && (
            <div style={{ position: "relative", marginBottom: 10 }}>
              <pre
                style={{
                  background: "rgba(0,0,0,0.20)",
                  border: `1px solid ${tk.divider}`,
                  borderRadius: 6,
                  padding: "8px 40px 8px 12px",
                  fontFamily: "var(--mono), ui-monospace, monospace",
                  fontSize: "var(--text-xs)",
                  color: tk.textSub,
                  overflowX: "auto",
                  margin: 0,
                }}
              >
                <code>{record.install}</code>
              </pre>
              <button
                onClick={handleCopy}
                aria-label={copied ? "Copied" : "Copy install command"}
                style={{
                  position: "absolute",
                  top: 5,
                  right: 6,
                  background: copied ? `${tk.gold}22` : "rgba(0,0,0,0.28)",
                  border: `1px solid ${copied ? tk.gold : tk.divider}`,
                  borderRadius: 4,
                  padding: "2px 7px",
                  cursor: "pointer",
                  fontFamily: "var(--mono), ui-monospace, monospace",
                  fontSize: "var(--text-2xs)",
                  color: copied ? tk.gold : tk.textMuted,
                  letterSpacing: "0.06em",
                  transition: "all 150ms ease",
                  lineHeight: 1.6,
                }}
              >
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          )}
          <pre
            style={{
              background: "rgba(0,0,0,0.14)",
              border: `1px solid ${tk.divider}`,
              borderRadius: 6,
              padding: "8px 12px",
              fontFamily: "var(--mono), ui-monospace, monospace",
              fontSize: "var(--text-2xs)",
              color: tk.textMuted,
              overflowX: "auto",
              marginBottom: 12,
              maxHeight: 180,
              overflowY: "auto",
              whiteSpace: "pre-wrap",
            }}
          >
            {record.raw}
          </pre>
          <div style={{ display: "flex", gap: 8 }}>
            <ActionButton
              active={itemStatus === "installed"}
              tk={tk}
              onClick={() => onSetStatus("installed")}
            >
              ● Installed
            </ActionButton>
            <ActionButton
              active={itemStatus === "passed"}
              tk={tk}
              onClick={() => onSetStatus("passed")}
            >
              — Passed
            </ActionButton>
            <ActionButton
              active={itemStatus === "pending"}
              tk={tk}
              onClick={() => onSetStatus("pending")}
            >
              ○ Reset
            </ActionButton>
          </div>
        </div>
      )}
    </BentoBox>
  );
}

function PillTag({
  tk,
  dim,
  children,
}: {
  tk: ReturnType<typeof useEmaki>["tk"];
  dim?: boolean;
  children: React.ReactNode;
}) {
  return (
    <span
      style={{
        fontFamily: "var(--mono), ui-monospace, monospace",
        fontSize: "var(--text-2xs)",
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: dim ? tk.textMuted : tk.textSub,
        border: `1px solid ${tk.divider}`,
        borderRadius: 4,
        padding: "1px 6px",
        opacity: dim ? 0.7 : 1,
      }}
    >
      {children}
    </span>
  );
}

function ActionButton({
  active,
  tk,
  onClick,
  children,
}: {
  active: boolean;
  tk: ReturnType<typeof useEmaki>["tk"];
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? "rgba(0,0,0,0.28)" : "transparent",
        border: `1px solid ${active ? tk.accent : tk.divider}`,
        borderRadius: 6,
        color: active ? tk.accent : tk.textMuted,
        fontFamily: "var(--mono), ui-monospace, monospace",
        fontSize: "var(--text-2xs)",
        letterSpacing: "0.08em",
        padding: "4px 10px",
        cursor: "pointer",
        transition: "border-color 160ms ease, color 160ms ease",
      }}
    >
      {children}
    </button>
  );
}

function BrainTile({ brain }: { brain: string }) {
  const { tk } = useEmaki();
  return (
    <BentoBox cols={12} eyebrow="02 // BRAIN ENTRY" kanji="脳">
      <details>
        <summary
          style={{
            cursor: "pointer",
            fontFamily: "var(--mono), ui-monospace, monospace",
            fontSize: "var(--text-xs)",
            color: tk.textSub,
            letterSpacing: "0.08em",
            listStyle: "none",
            userSelect: "none",
          }}
        >
          full landscape report
        </summary>
        <pre
          style={{
            marginTop: 12,
            background: "rgba(0,0,0,0.14)",
            border: `1px solid ${tk.divider}`,
            borderRadius: 6,
            padding: "12px 14px",
            fontFamily: "var(--mono), ui-monospace, monospace",
            fontSize: "var(--text-2xs)",
            color: tk.textMuted,
            overflowX: "auto",
            whiteSpace: "pre-wrap",
            maxHeight: 320,
            overflowY: "auto",
          }}
        >
          {brain}
        </pre>
      </details>
    </BentoBox>
  );
}
