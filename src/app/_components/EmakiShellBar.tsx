"use client";
import { useMode } from "./ModeProvider";
import { useActiveTab, TABS, type Tab } from "./useActiveTab";
import { phaseForMode } from "./bento/emakiContext";
import { PHASES } from "./emaki/theme";
import { CityTemp } from "./LocationLive";
import { LiveStamp } from "./LiveClock";

const PHASE_MODES = [
  { mode: "laputa-day", glyph: "☀", title: "Day · 陽光の庭" },
  { mode: "laputa-twilight", glyph: "◐", title: "Twilight · 黄昏の刻" },
  { mode: "laputa-midnight", glyph: "☾", title: "Night · 狐火の道" },
] as const;

export function EmakiShellBar() {
  const { mode, setMode, autoMode, setAutoMode } = useMode();
  const phase = phaseForMode(mode);
  const tk = PHASES[phase];
  const { active, setActive } = useActiveTab();

  function handleTabClick(e: React.MouseEvent<HTMLAnchorElement>, id: Tab) {
    if (
      e.button === 0 &&
      !e.metaKey &&
      !e.ctrlKey &&
      !e.shiftKey &&
      !e.altKey
    ) {
      e.preventDefault();
      setActive(id);
    }
  }

  return (
    <>
      <style>{`
        .emaki-shellbar {
          position: sticky;
          top: 0;
          z-index: 60;
          width: 100%;
          display: flex;
          align-items: stretch;
          height: 52px;
          flex-shrink: 0;
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
        }
        .emaki-shellbar-wordmark {
          display: flex;
          align-items: center;
          padding: 0 22px 0 20px;
          font-family: 'Noto Serif JP', serif;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          user-select: none;
          flex-shrink: 0;
          border-right: 1px solid;
        }
        .emaki-shellbar-tabs {
          display: flex;
          align-items: stretch;
          flex: 1;
          gap: 0;
          overflow-x: auto;
          scrollbar-width: none;
        }
        .emaki-shellbar-tabs::-webkit-scrollbar {
          display: none;
        }
        .emaki-shellbar-tab {
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 0 16px;
          font-size: 13px;
          font-weight: 600;
          letter-spacing: 0.06em;
          cursor: pointer;
          position: relative;
          white-space: nowrap;
          border: none;
          background: transparent;
          text-decoration: none;
          transition: background 0.18s, color 0.18s;
        }
        .emaki-shellbar-tab[aria-selected="true"]::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 10px;
          right: 10px;
          height: 2px;
          background: linear-gradient(
            90deg,
            transparent,
            var(--sb-gold, #8c5c08) 20%,
            var(--sb-gold-bright, #b87818) 50%,
            var(--sb-gold, #8c5c08) 80%,
            transparent
          );
          clip-path: polygon(
            0% 50%, 5% 0%, 18% 100%, 34% 0%, 50% 80%,
            66% 0%, 82% 100%, 95% 0%, 100% 50%
          );
        }
        .emaki-shellbar-glyph {
          font-size: 15px;
          line-height: 1;
        }
        .emaki-shellbar-actions {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 0 16px 0 10px;
          flex-shrink: 0;
          border-left: 1px solid;
          font-family: ui-monospace, monospace;
          font-size: 11px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }
        .emaki-shellbar-online {
          display: flex;
          align-items: center;
          gap: 5px;
        }
        .emaki-shellbar-online-pip {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #3ecf68;
          flex-shrink: 0;
        }
        @media (max-width: 760px) {
          .emaki-shellbar-label {
            display: none;
          }
        }
      `}</style>

      <nav
        className="emaki-shellbar"
        style={{
          // Translucent frosted scrim so the painted art shows behind the bar
          // (overlay look) while the nav stays legible (paired with backdrop blur).
          background: `linear-gradient(to bottom, rgba(var(--scrim-rgb), 0.62) 0%, rgba(var(--scrim-rgb), 0.24) 100%)`,
          borderBottom: `1px solid ${tk.railBorder}`,
          ["--sb-gold" as never]: tk.gold,
          ["--sb-gold-bright" as never]: tk.goldBright,
        }}
      >
        {/* Wordmark */}
        <div
          className="emaki-shellbar-wordmark"
          style={{ color: tk.goldBright, borderColor: tk.railBorder }}
        >
          PG OS
        </div>

        {/* Tab list */}
        <div className="emaki-shellbar-tabs" role="tablist">
          {TABS.map((t) => {
            const isActive = active === t.id;
            return (
              <a
                key={t.id}
                href={"?tab=" + t.id}
                role="tab"
                aria-selected={isActive}
                className="emaki-shellbar-tab"
                onClick={(e) => handleTabClick(e, t.id)}
                style={
                  isActive
                    ? { background: tk.pillActive, color: tk.foxfire }
                    : { background: "transparent", color: tk.textMuted }
                }
              >
                <span className="emaki-shellbar-glyph">{t.glyph}</span>
                <span className="emaki-shellbar-label">{t.label}</span>
              </a>
            );
          })}
        </div>

        {/* Right actions */}
        <div
          className="emaki-shellbar-actions"
          style={{ borderColor: tk.railBorder, color: tk.textMuted }}
        >
          {/* Time-of-day phase toggle: click to lock day/twilight/night, AUTO to track the clock. */}
          <span style={{ display: "flex", alignItems: "center", gap: 2 }}>
            {PHASE_MODES.map((p) => {
              const on = mode === p.mode && !autoMode;
              return (
                <button
                  key={p.mode}
                  type="button"
                  title={p.title}
                  onClick={() => setMode(p.mode)}
                  style={{
                    border: "none",
                    background: on ? tk.pillActive : "transparent",
                    color: on ? tk.foxfire : tk.textMuted,
                    cursor: "pointer",
                    fontSize: 13,
                    lineHeight: 1,
                    padding: "4px 6px",
                    borderRadius: 5,
                  }}
                >
                  {p.glyph}
                </button>
              );
            })}
            <button
              type="button"
              title="Auto (follow the clock)"
              onClick={() => setAutoMode(true)}
              style={{
                border: "none",
                background: autoMode ? tk.pillActive : "transparent",
                color: autoMode ? tk.foxfire : tk.textMuted,
                cursor: "pointer",
                fontFamily: "ui-monospace, monospace",
                fontSize: 10,
                letterSpacing: "0.1em",
                padding: "4px 6px",
                borderRadius: 5,
              }}
            >
              AUTO
            </button>
          </span>
          <span className="emaki-shellbar-online">
            <span className="emaki-shellbar-online-pip" />
            ONLINE
          </span>
          <span>
            <CityTemp />
          </span>
          <span>
            <LiveStamp />
          </span>
        </div>
      </nav>
    </>
  );
}
