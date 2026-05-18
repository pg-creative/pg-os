"use client";

/**
 * /dev/agent-office-lab — SECTION-BY-SECTION variant lab.
 *
 * Per ~/.claude/skills/design-lab/SKILL.md Phase 3: build 4 variants of ONE
 * section at a time. PG picks per section. Final compose view assembles the
 * locked picks into the production view.
 *
 * Sections (ranked by visual leverage):
 *   1. character  — the agent visual primitive (4 variants)
 *   2. environment — where they live (4 variants)
 *   3. activity   — how activity is shown (4 variants)
 *   4. focus      — what happens on click (4 variants)
 *
 * URL params: ?section=<name>&variant=<id>
 *   e.g. ?section=character&variant=hd2d-sprite
 *
 * Picks persist to localStorage. /compose URL assembles them.
 *
 * Note: Phase 2.5 MJ assets land at /agent-office/{characters,environments}/<slug>.png.
 * Until they exist, variants render with CSS-placeholder fallbacks.
 */

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useState, useEffect, useMemo } from "react";
import { useAgentStream } from "../../_components/views/claude/AgentLab/useAgentStream";
import {
  tokens,
  fonts,
} from "../../_components/views/claude/AgentLab/primitives";
import {
  SECTIONS,
  SECTION_ORDER,
  loadPick,
  savePick,
  type SectionId,
  type CharacterVariant,
  type EnvironmentVariant,
  type ActivityVariant,
  type FocusVariant,
} from "../../_components/views/claude/AgentLab/sections/types";
import { Character } from "../../_components/views/claude/AgentLab/sections/Character";
import { Environment } from "../../_components/views/claude/AgentLab/sections/Environment";
import { ActivityAffordance } from "../../_components/views/claude/AgentLab/sections/ActivityAffordance";
import { FocusAction } from "../../_components/views/claude/AgentLab/sections/FocusAction";
import type { AgentSnapshot } from "../../_components/views/claude/AgentLab/useAgentStream";

function LabInner() {
  const sp = useSearchParams();
  const router = useRouter();
  const section = (sp.get("section") ?? "character") as SectionId | "compose";
  const variantId = sp.get("variant") ?? undefined;
  const { agents, connected } = useAgentStream();
  const [focusedAgent, setFocusedAgent] = useState<AgentSnapshot | null>(null);

  // Load PG's persisted picks across all sections
  const [picks, setPicks] = useState<{
    character: CharacterVariant;
    environment: EnvironmentVariant;
    activity: ActivityVariant;
    focus: FocusVariant;
  }>({
    character: "mj-portrait",
    environment: "atelier",
    activity: "prop-hand",
    focus: "drawer",
  });

  useEffect(() => {
    setPicks({
      character: loadPick<CharacterVariant>("character", "mj-portrait"),
      environment: loadPick<EnvironmentVariant>("environment", "atelier"),
      activity: loadPick<ActivityVariant>("activity", "prop-hand"),
      focus: loadPick<FocusVariant>("focus", "drawer"),
    });
  }, []);

  function navigateTo(s: SectionId | "compose", v?: string) {
    const params = new URLSearchParams();
    params.set("section", s);
    if (v) params.set("variant", v);
    router.push(`/dev/agent-office-lab?${params.toString()}`);
  }

  function lockPick(sectionId: SectionId, vid: string) {
    savePick(sectionId, vid);
    setPicks((p) => ({ ...p, [sectionId]: vid as never }));
  }

  return (
    <div style={{ minHeight: "100vh", background: tokens.bgInk }}>
      <TopNav
        section={section}
        picks={picks}
        connected={connected}
        agentCount={agents.length}
        onNavigate={navigateTo}
      />

      <main>
        {section === "compose" ? (
          <ComposeView
            agents={agents}
            picks={picks}
            focusedAgent={focusedAgent}
            onFocus={setFocusedAgent}
          />
        ) : (
          <SectionView
            section={section as SectionId}
            currentVariantId={variantId}
            picks={picks}
            agents={agents}
            focusedAgent={focusedAgent}
            onFocus={setFocusedAgent}
            onLockPick={lockPick}
            onSelectVariant={(v) => navigateTo(section as SectionId, v)}
          />
        )}
      </main>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Top navigation — section tabs + compose link

function TopNav({
  section,
  picks,
  connected,
  agentCount,
  onNavigate,
}: {
  section: SectionId | "compose";
  picks: Record<SectionId, string>;
  connected: boolean;
  agentCount: number;
  onNavigate: (s: SectionId | "compose", v?: string) => void;
}) {
  return (
    <nav
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: "rgba(15, 14, 19, 0.94)",
        backdropFilter: "blur(8px)",
        borderBottom: "1px solid rgba(216, 201, 174, 0.12)",
        padding: "12px 22px",
        display: "flex",
        alignItems: "center",
        gap: 10,
        flexWrap: "wrap",
        fontFamily: fonts.mono,
        fontSize: 11,
      }}
    >
      <a
        href="/?tab=claude&skip-evening=1&skip-briefing=1"
        style={{
          color: tokens.dim,
          textDecoration: "none",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
        }}
      >
        ← claude
      </a>
      <span style={{ color: "#3A3640" }}>·</span>
      <span
        style={{
          color: tokens.dim,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
        }}
      >
        design-lab
      </span>
      <span style={{ color: "#3A3640" }}>·</span>
      <span style={{ color: tokens.muted, fontSize: 10 }}>
        {agentCount} agent{agentCount === 1 ? "" : "s"}{" "}
        {connected ? "live" : "reconnecting…"}
      </span>
      <div style={{ flex: 1, minWidth: 12 }} />
      {SECTION_ORDER.map((s) => (
        <button
          key={s}
          onClick={() => onNavigate(s, picks[s])}
          style={pillStyle(section === s)}
          title={SECTIONS[s].question}
        >
          {SECTIONS[s].label}
        </button>
      ))}
      <button
        onClick={() => onNavigate("compose")}
        style={pillStyle(section === "compose", true)}
        title="see your locked picks composed"
      >
        Compose →
      </button>
    </nav>
  );
}

function pillStyle(active: boolean, primary = false): React.CSSProperties {
  return {
    padding: "6px 13px",
    border: active
      ? `1px solid ${tokens.amber}`
      : primary
        ? `1px solid ${tokens.amber}`
        : "1px solid #3A3640",
    borderRadius: 4,
    background: active ? "rgba(214, 163, 103, 0.15)" : "transparent",
    color: active || primary ? tokens.amber : tokens.dim,
    cursor: "pointer",
    fontFamily: "inherit",
    fontSize: 11,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    transition: "all 200ms ease",
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Section view — shows 4 variants of one section side-by-side OR one focused

function SectionView({
  section,
  currentVariantId,
  picks,
  agents,
  focusedAgent,
  onFocus,
  onLockPick,
  onSelectVariant,
}: {
  section: SectionId;
  currentVariantId?: string;
  picks: {
    character: CharacterVariant;
    environment: EnvironmentVariant;
    activity: ActivityVariant;
    focus: FocusVariant;
  };
  agents: AgentSnapshot[];
  focusedAgent: AgentSnapshot | null;
  onFocus: (a: AgentSnapshot | null) => void;
  onLockPick: (s: SectionId, v: string) => void;
  onSelectVariant: (v: string) => void;
}) {
  const meta = SECTIONS[section];
  const currentlyLocked = picks[section];
  const previewVariant = currentVariantId ?? currentlyLocked;
  const sampleAgents = agents.slice(0, 6);

  return (
    <div
      style={{ padding: "32px 28px 64px", maxWidth: 1280, margin: "0 auto" }}
    >
      <header style={{ marginBottom: 28 }}>
        <div
          style={{
            fontFamily: fonts.mono,
            fontSize: 10,
            textTransform: "uppercase",
            letterSpacing: "0.18em",
            color: tokens.dim,
            marginBottom: 6,
          }}
        >
          section · {meta.label}
        </div>
        <h1
          style={{
            margin: 0,
            fontFamily: fonts.display,
            fontSize: 30,
            fontWeight: 500,
            color: "#FFF8E7",
            letterSpacing: "-0.01em",
          }}
        >
          {meta.question}
        </h1>
        <p
          style={{
            margin: "8px 0 0",
            fontSize: 13,
            color: tokens.dim,
            maxWidth: 540,
          }}
        >
          Four variants. Pick one — your pick locks for this section and carries
          into Compose. You can revisit anytime.
        </p>
      </header>

      <VariantPicker
        meta={meta}
        currentVariantId={previewVariant}
        lockedId={currentlyLocked}
        onSelect={onSelectVariant}
        onLock={(v) => onLockPick(section, v)}
      />

      <div
        style={{
          background: "rgba(255, 248, 231, 0.04)",
          border: "1px solid rgba(216, 201, 174, 0.08)",
          borderRadius: 8,
          padding: 24,
        }}
      >
        <SectionPreview
          section={section}
          variantId={previewVariant}
          agents={sampleAgents}
          picks={picks}
          focusedAgent={focusedAgent}
          onFocus={onFocus}
        />
      </div>
    </div>
  );
}

function VariantPicker({
  meta,
  currentVariantId,
  lockedId,
  onSelect,
  onLock,
}: {
  meta: (typeof SECTIONS)[SectionId];
  currentVariantId?: string;
  lockedId: string;
  onSelect: (v: string) => void;
  onLock: (v: string) => void;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: 10,
        marginBottom: 22,
      }}
    >
      {meta.variants.map((v) => {
        const isCurrent = currentVariantId === v.id;
        const isLocked = lockedId === v.id;
        return (
          <button
            key={v.id}
            onClick={() => onSelect(v.id)}
            style={{
              textAlign: "left",
              padding: "14px 16px",
              borderRadius: 6,
              border: isCurrent
                ? `1.5px solid ${tokens.amber}`
                : "1px solid rgba(216, 201, 174, 0.18)",
              background: isCurrent
                ? "rgba(214, 163, 103, 0.10)"
                : "rgba(255, 248, 231, 0.02)",
              color: "#FFF8E7",
              cursor: "pointer",
              fontFamily: fonts.body,
              fontSize: 13,
              transition: "all 200ms ease-out",
              position: "relative",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 4,
              }}
            >
              <span
                style={{
                  fontFamily: fonts.display,
                  fontSize: 16,
                  fontWeight: 500,
                  color: isCurrent ? tokens.amber : "#FFF8E7",
                }}
              >
                {v.label}
              </span>
              {v.isFalsifier && (
                <span
                  style={{
                    fontFamily: fonts.mono,
                    fontSize: 9,
                    color: tokens.coral,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                  }}
                  title="this variant is deliberately built in the opposite direction of the research recommendation — credible alternative, not strawman"
                >
                  ◇ falsifier
                </span>
              )}
            </div>
            <div style={{ fontSize: 11, color: tokens.dim, lineHeight: 1.4 }}>
              {v.description}
            </div>
            <div
              style={{
                marginTop: 10,
                display: "flex",
                alignItems: "center",
                gap: 8,
                justifyContent: "space-between",
              }}
            >
              {isLocked ? (
                <span
                  style={{
                    fontFamily: fonts.mono,
                    fontSize: 10,
                    color: tokens.amber,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                  }}
                >
                  ◆ locked pick
                </span>
              ) : (
                <span style={{ fontSize: 10, color: tokens.dim }}>preview</span>
              )}
              {isCurrent && !isLocked && (
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    onLock(v.id);
                  }}
                  style={{
                    fontFamily: fonts.mono,
                    fontSize: 10,
                    color: tokens.amber,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    border: `1px solid ${tokens.amber}`,
                    padding: "3px 8px",
                    borderRadius: 3,
                    cursor: "pointer",
                  }}
                >
                  lock this →
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-section preview — renders the section under test with neutral defaults
// for all OTHER sections, so PG can isolate the variable.

function SectionPreview({
  section,
  variantId,
  agents,
  picks,
  focusedAgent,
  onFocus,
}: {
  section: SectionId;
  variantId: string;
  agents: AgentSnapshot[];
  picks: {
    character: CharacterVariant;
    environment: EnvironmentVariant;
    activity: ActivityVariant;
    focus: FocusVariant;
  };
  focusedAgent: AgentSnapshot | null;
  onFocus: (a: AgentSnapshot | null) => void;
}) {
  if (agents.length === 0) {
    return (
      <div
        style={{
          padding: "64px 24px",
          textAlign: "center",
          color: tokens.dim,
          fontStyle: "italic",
          fontSize: 14,
        }}
      >
        no claude code sessions running — start one and characters will appear
      </div>
    );
  }

  // Use the previewed variant for THIS section; locked picks for the others.
  const charV = (
    section === "character" ? variantId : picks.character
  ) as CharacterVariant;
  const envV = (
    section === "environment" ? variantId : picks.environment
  ) as EnvironmentVariant;
  const actV = (
    section === "activity" ? variantId : picks.activity
  ) as ActivityVariant;
  const focusV = (
    section === "focus" ? variantId : picks.focus
  ) as FocusVariant;

  const characters = (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 32,
        padding: "40px 24px",
        justifyContent: "center",
        alignItems: "flex-end",
      }}
    >
      {agents.map((a) => (
        <button
          key={a.id}
          onClick={() => onFocus(a)}
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            padding: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
          }}
        >
          <ActivityAffordance agent={a} variant={actV}>
            <Character
              agent={a}
              variant={charV}
              size={charV === "thought-card" ? 110 : 100}
            />
          </ActivityAffordance>
          <div
            style={{
              fontFamily: fonts.display,
              fontSize: 13,
              color: envV === "void" ? tokens.ink : "#FFF8E7",
              fontWeight: 500,
              letterSpacing: "-0.005em",
              textShadow:
                envV === "void" ? "none" : "0 1px 4px rgba(0,0,0,0.45)",
              maxWidth: 140,
              textAlign: "center",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {a.projectName}
          </div>
        </button>
      ))}
    </div>
  );

  return (
    <>
      <Environment variant={envV}>{characters}</Environment>
      <FocusAction
        agent={focusedAgent}
        variant={focusV}
        onClose={() => onFocus(null)}
      />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Compose view — full assembly with PG's locked picks across all sections

function ComposeView({
  agents,
  picks,
  focusedAgent,
  onFocus,
}: {
  agents: AgentSnapshot[];
  picks: {
    character: CharacterVariant;
    environment: EnvironmentVariant;
    activity: ActivityVariant;
    focus: FocusVariant;
  };
  focusedAgent: AgentSnapshot | null;
  onFocus: (a: AgentSnapshot | null) => void;
}) {
  const characters = (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 36,
        padding: "60px 32px",
        justifyContent: "center",
        alignItems: "flex-end",
      }}
    >
      {agents.map((a) => (
        <button
          key={a.id}
          onClick={() => onFocus(a)}
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            padding: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 10,
          }}
        >
          <ActivityAffordance agent={a} variant={picks.activity}>
            <Character
              agent={a}
              variant={picks.character}
              size={picks.character === "thought-card" ? 140 : 120}
            />
          </ActivityAffordance>
          <div
            style={{
              fontFamily: fonts.display,
              fontSize: 15,
              color: picks.environment === "void" ? tokens.ink : "#FFF8E7",
              fontWeight: 500,
              letterSpacing: "-0.005em",
              textShadow:
                picks.environment === "void"
                  ? "none"
                  : "0 1px 4px rgba(0,0,0,0.45)",
              maxWidth: 180,
              textAlign: "center",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {a.projectName}
          </div>
        </button>
      ))}
      {agents.length === 0 && (
        <div
          style={{
            padding: 48,
            color:
              picks.environment === "void"
                ? tokens.muted
                : "rgba(255, 248, 231, 0.6)",
            fontStyle: "italic",
            fontSize: 14,
          }}
        >
          no agents — start a claude code session to populate the scene
        </div>
      )}
    </div>
  );

  return (
    <>
      <div style={{ padding: "24px 28px 0", maxWidth: 1280, margin: "0 auto" }}>
        <div
          style={{
            fontFamily: fonts.mono,
            fontSize: 10,
            textTransform: "uppercase",
            letterSpacing: "0.18em",
            color: tokens.dim,
            marginBottom: 6,
          }}
        >
          compose · your locked picks
        </div>
        <h1
          style={{
            margin: 0,
            fontFamily: fonts.display,
            fontSize: 30,
            fontWeight: 500,
            color: "#FFF8E7",
            letterSpacing: "-0.01em",
          }}
        >
          What you'd ship.
        </h1>
        <div
          style={{
            marginTop: 10,
            display: "flex",
            gap: 16,
            flexWrap: "wrap",
            fontSize: 12,
            color: tokens.muted,
            fontFamily: fonts.mono,
          }}
        >
          <span>
            character:{" "}
            {
              SECTIONS.character.variants.find((v) => v.id === picks.character)
                ?.label
            }
          </span>
          <span>
            · environment:{" "}
            {
              SECTIONS.environment.variants.find(
                (v) => v.id === picks.environment,
              )?.label
            }
          </span>
          <span>
            · activity:{" "}
            {
              SECTIONS.activity.variants.find((v) => v.id === picks.activity)
                ?.label
            }
          </span>
          <span>
            · focus:{" "}
            {SECTIONS.focus.variants.find((v) => v.id === picks.focus)?.label}
          </span>
        </div>
      </div>
      <div style={{ marginTop: 24 }}>
        <Environment variant={picks.environment}>{characters}</Environment>
      </div>
      <FocusAction
        agent={focusedAgent}
        variant={picks.focus}
        onClose={() => onFocus(null)}
      />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function AgentOfficeLabPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            padding: 48,
            color: tokens.dim,
            background: tokens.bgInk,
            minHeight: "100vh",
          }}
        >
          loading…
        </div>
      }
    >
      <LabInner />
    </Suspense>
  );
}
