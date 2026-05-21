"use client";
import { useMode } from "./ModeProvider";
import { useActiveTab, TABS, type Tab } from "./useActiveTab";
import { phaseForMode } from "./bento/emakiContext";
import { PHASES } from "./emaki/theme";
import { CityTemp } from "./LocationLive";
import { LiveStamp } from "./LiveClock";

export function EmakiShellBar() {
  const { mode } = useMode();
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
          background: tk.railBg,
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
