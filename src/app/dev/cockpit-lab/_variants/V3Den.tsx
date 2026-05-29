"use client";
import { useState } from "react";
import type { Phase, PhaseTokens } from "../../../_components/emaki/theme";
import { PHASES } from "../../../_components/emaki/theme";
import {
  useEmakiVars,
  EMAKI_CSS,
  PaintedBackdrop,
  FoxfireLayer,
  WashiPanel,
  KintsugiSeam,
} from "../../../_components/emaki/materials";
import {
  useCockpitData,
  demoCards,
  type Card,
} from "../_shared/useCockpitData";

/* ---- helpers ---- */
function fmt$(n: number) {
  return n < 0.01 ? "<$0.01" : `$${n.toFixed(2)}`;
}

function fmtAge(ms: number) {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

function ContextBar({
  pct,
  running,
  tk,
}: {
  pct: number;
  running: boolean;
  tk: PhaseTokens;
}) {
  const fill = running ? tk.foxfire : tk.accentDim;
  return (
    <div
      style={{
        position: "relative",
        height: 6,
        borderRadius: 3,
        background: tk.divider,
        overflow: "hidden",
        flex: "1 1 80px",
        minWidth: 60,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: "0 auto 0 0",
          width: `${Math.min(pct, 100)}%`,
          background: pct > 80 ? "#e05a4a" : fill,
          borderRadius: 3,
          transition: "width 0.6s ease",
          boxShadow: running ? `0 0 6px ${tk.foxfireGlow}` : undefined,
        }}
      />
    </div>
  );
}

function ToolBadge({ tool, tk }: { tool: string; tk: PhaseTokens }) {
  return (
    <span
      style={{
        fontSize: 10,
        fontFamily: "monospace",
        color: tk.gold,
        background: `${tk.gold}22`,
        border: `1px solid ${tk.gold}44`,
        borderRadius: 4,
        padding: "1px 6px",
        whiteSpace: "nowrap",
      }}
    >
      {tool}
    </span>
  );
}

function EmberDot({ running, tk }: { running: boolean; tk: PhaseTokens }) {
  return (
    <span
      style={{
        display: "inline-block",
        width: 8,
        height: 8,
        borderRadius: "50%",
        background: running ? tk.foxfire : tk.textMuted,
        boxShadow: running
          ? `0 0 8px ${tk.foxfireGlow}, 0 0 16px ${tk.foxfireGlow}`
          : "none",
        flexShrink: 0,
        marginTop: 2,
        transition: "box-shadow 0.4s ease",
      }}
    />
  );
}

function UsagePill({
  label,
  pct,
  tk,
}: {
  label: string;
  pct: number;
  tk: PhaseTokens;
}) {
  const color = pct > 80 ? "#e05a4a" : pct > 50 ? tk.gold : tk.textSub;
  return (
    <span style={{ fontSize: 11, color, fontVariantNumeric: "tabular-nums" }}>
      {label} {pct.toFixed(0)}%
    </span>
  );
}

/* ---- Session Row ---- */
function SessionRow({ card, tk }: { card: Card; tk: PhaseTokens }) {
  const [expanded, setExpanded] = useState(false);

  const inkColor = card.running ? `${tk.foxfire}28` : undefined;

  return (
    <WashiPanel
      tk={tk}
      inkColor={inkColor}
      style={{
        borderRadius: 10,
        padding: "12px 16px",
        cursor: "pointer",
        transition: "opacity 0.2s",
        opacity: card.running ? 1 : 0.72,
      }}
    >
      {/* Row: ember + project + branch + model | context bar | cost | tool */}
      <div
        onClick={() => setExpanded((p) => !p)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        {/* Left cluster */}
        <EmberDot running={card.running} tk={tk} />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            minWidth: 120,
            flex: "0 0 auto",
          }}
        >
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: tk.textPrimary,
              lineHeight: 1.2,
            }}
          >
            {card.projectLabel}
          </span>
          <span
            style={{
              fontSize: 11,
              color: tk.textMuted,
              fontFamily: "monospace",
            }}
          >
            {card.branch ?? "main"}
            {card.worktree ? ` (${card.worktree})` : ""}
          </span>
        </div>

        {card.modelName && (
          <span
            style={{
              fontSize: 11,
              color: tk.accentDim,
              background: `${tk.accent}18`,
              border: `1px solid ${tk.accentDim}44`,
              borderRadius: 4,
              padding: "1px 7px",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            {card.modelName}
          </span>
        )}

        {/* Context bar - stretches */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            flex: "1 1 100px",
            minWidth: 80,
          }}
        >
          <ContextBar
            pct={card.contextUsedPct}
            running={card.running}
            tk={tk}
          />
          <span
            style={{
              fontSize: 11,
              color: tk.textMuted,
              flexShrink: 0,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {card.contextUsedPct.toFixed(0)}%
          </span>
        </div>

        {/* Cost */}
        <span
          style={{
            fontSize: 12,
            color: card.costUsd > 5 ? "#e05a4a" : tk.textSub,
            fontVariantNumeric: "tabular-nums",
            flexShrink: 0,
          }}
        >
          {fmt$(card.costUsd)}
        </span>

        {/* Current tool */}
        {card.currentTool && <ToolBadge tool={card.currentTool} tk={tk} />}

        {/* Expand chevron */}
        <span
          style={{
            fontSize: 11,
            color: tk.textMuted,
            marginLeft: "auto",
            transition: "transform 0.2s",
            transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
          }}
        >
          ▾
        </span>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div
          style={{
            marginTop: 10,
            paddingTop: 10,
            borderTop: `1px solid ${tk.divider}`,
            display: "flex",
            flexWrap: "wrap",
            gap: "6px 20px",
          }}
        >
          {card.lastUserMsg && (
            <span
              style={{
                fontSize: 12,
                color: tk.textSub,
                fontStyle: "italic",
                width: "100%",
                opacity: 0.85,
              }}
            >
              "{card.lastUserMsg}"
            </span>
          )}
          {card.fiveHour && (
            <UsagePill label="5h" pct={card.fiveHour.usedPercentage} tk={tk} />
          )}
          {card.sevenDay && (
            <UsagePill label="7d" pct={card.sevenDay.usedPercentage} tk={tk} />
          )}
          {card.linesAdded != null && (
            <span
              style={{
                fontSize: 11,
                color: "#6abf69",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              +{card.linesAdded}
            </span>
          )}
          {card.linesRemoved != null && card.linesRemoved > 0 && (
            <span
              style={{
                fontSize: 11,
                color: "#e05a4a",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              -{card.linesRemoved}
            </span>
          )}
          {card.thinking && (
            <span style={{ fontSize: 11, color: tk.accentDim }}>thinking</span>
          )}
          {card.fastMode && (
            <span style={{ fontSize: 11, color: tk.gold }}>fast</span>
          )}
          {card.controllable && (
            <span
              style={{
                fontSize: 11,
                color: tk.foxfire,
                background: `${tk.foxfire}18`,
                border: `1px solid ${tk.foxfire}44`,
                borderRadius: 4,
                padding: "1px 6px",
              }}
            >
              controllable
            </span>
          )}
          <span
            style={{ fontSize: 11, color: tk.textMuted, marginLeft: "auto" }}
          >
            {fmtAge(card.ageMs)} ago
          </span>
        </div>
      )}
    </WashiPanel>
  );
}

/* ---- Hearth / Fleet Summary ---- */
function Hearth({
  tk,
  daemon,
  runningCount,
  controllableCount,
  totalCost,
  cards,
}: {
  tk: PhaseTokens;
  daemon: { running: boolean; port: number } | null;
  runningCount: number;
  controllableCount: number;
  totalCost: number;
  cards: Card[];
}) {
  const [launchInput, setLaunchInput] = useState("");

  return (
    <WashiPanel tk={tk} style={{ borderRadius: 14, padding: "20px 22px" }}>
      {/* Fox avatar */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
        <div
          style={{
            flexShrink: 0,
            position: "relative",
            width: 130,
            height: 130,
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: -8,
              borderRadius: "50%",
              background: `radial-gradient(circle, ${tk.foxfireGlow} 0%, transparent 70%)`,
              opacity: 0.5,
            }}
          />
          <img
            src="/agent-office/pixel/marvis-kitsune.png"
            alt="Kitsu"
            width={130}
            height={130}
            style={{
              position: "relative",
              zIndex: 1,
              imageRendering: "pixelated",
              filter: `drop-shadow(0 2px 12px ${tk.foxfireGlow})`,
            }}
          />
        </div>

        {/* Summary stats */}
        <div
          style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}
        >
          <div>
            <div
              style={{
                fontSize: 11,
                letterSpacing: 2,
                textTransform: "uppercase",
                color: tk.gold,
                opacity: 0.8,
                marginBottom: 2,
              }}
            >
              {tk.eyebrowLabel ?? "Kitsune Fleet"}
            </div>
            <div
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: tk.textPrimary,
                lineHeight: 1.1,
              }}
            >
              {tk.kanji ?? "狐の巣"}
            </div>
            <div style={{ fontSize: 12, color: tk.textSub, marginTop: 2 }}>
              {tk.subtitle ?? "The Den"}
            </div>
          </div>

          {/* Stat grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "6px 16px",
            }}
          >
            <Stat
              label="running"
              value={String(runningCount)}
              hot={runningCount > 0}
              tk={tk}
            />
            <Stat
              label="controllable"
              value={String(controllableCount)}
              hot={controllableCount > 0}
              tk={tk}
            />
            <Stat label="sessions" value={String(cards.length)} tk={tk} />
            <Stat label="total cost" value={fmt$(totalCost)} tk={tk} />
          </div>

          {/* Daemon status pill */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: daemon?.running ? tk.foxfire : tk.textMuted,
                boxShadow: daemon?.running
                  ? `0 0 6px ${tk.foxfireGlow}`
                  : "none",
                flexShrink: 0,
              }}
            />
            <span style={{ fontSize: 11, color: tk.textSub }}>
              daemon {daemon?.running ? `online :${daemon.port}` : "offline"}
            </span>
          </div>
        </div>
      </div>

      <div style={{ height: 12 }} />

      {/* Launch input */}
      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={launchInput}
          onChange={(e) => setLaunchInput(e.target.value)}
          placeholder="new session — project or /path…"
          style={{
            flex: 1,
            background: `${tk.panelBg}99`,
            border: `1px solid ${tk.panelBorder}`,
            borderRadius: 8,
            padding: "8px 12px",
            fontSize: 13,
            color: tk.textPrimary,
            outline: "none",
            fontFamily: "monospace",
          }}
        />
        <button
          style={{
            background: tk.foxfire,
            border: "none",
            borderRadius: 8,
            padding: "8px 16px",
            fontSize: 13,
            color: "#fff",
            cursor: "pointer",
            fontWeight: 600,
            boxShadow: `0 0 12px ${tk.foxfireGlow}`,
            whiteSpace: "nowrap",
          }}
        >
          Launch
        </button>
      </div>
    </WashiPanel>
  );
}

function Stat({
  label,
  value,
  hot,
  tk,
}: {
  label: string;
  value: string;
  hot?: boolean;
  tk: PhaseTokens;
}) {
  return (
    <div>
      <div
        style={{
          fontSize: 10,
          color: tk.textMuted,
          textTransform: "uppercase",
          letterSpacing: 1,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 18,
          fontWeight: 700,
          color: hot ? tk.foxfire : tk.textPrimary,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </div>
    </div>
  );
}

/* ---- Main Export ---- */
export default function V3Den({ phase }: { phase: Phase }) {
  useEmakiVars(phase);
  const tk = PHASES[phase];
  const { cards, daemon, controllableCount, runningCount } = useCockpitData();
  const display = cards.length ? cards : demoCards();

  const totalCost = display.reduce((sum, c) => sum + c.costUsd, 0);

  return (
    <div
      style={{
        position: "relative",
        minHeight: "100vh",
        width: "100%",
        fontFamily: "system-ui, sans-serif",
        overflowX: "hidden",
      }}
    >
      <style>{EMAKI_CSS}</style>
      <PaintedBackdrop phase={phase} />
      <FoxfireLayer phase={phase} />

      {/* Layout: two-column on wide, stack on narrow */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          display: "grid",
          gridTemplateColumns: "minmax(280px, 360px) 1fr",
          gridTemplateRows: "auto 1fr",
          gap: 20,
          padding: "28px 24px",
          maxWidth: 1200,
          margin: "0 auto",
          minHeight: "100vh",
          boxSizing: "border-box",
        }}
      >
        {/* LEFT: Hearth (sticky) */}
        <div
          style={{
            gridRow: "1 / 3",
            alignSelf: "start",
            position: "sticky",
            top: 28,
          }}
        >
          <Hearth
            tk={tk}
            daemon={daemon}
            runningCount={runningCount}
            controllableCount={controllableCount}
            totalCost={totalCost}
            cards={display}
          />
        </div>

        {/* RIGHT TOP: section header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span
            style={{
              fontSize: 12,
              letterSpacing: 2,
              textTransform: "uppercase",
              color: tk.gold,
              opacity: 0.8,
            }}
          >
            Sessions
          </span>
          <KintsugiSeam gold={tk.gold} goldBright={tk.goldBright} />
          <span style={{ fontSize: 12, color: tk.textMuted }}>
            {display.filter((c) => c.running).length} active / {display.length}{" "}
            total
          </span>
        </div>

        {/* RIGHT BOTTOM: scroll rows */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
            alignSelf: "start",
          }}
        >
          {display.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                color: tk.textMuted,
                padding: 40,
                fontSize: 14,
              }}
            >
              No sessions yet. Launch one from the hearth.
            </div>
          ) : (
            display.map((card) => (
              <SessionRow key={card.sessionId} card={card} tk={tk} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
