"use client";

import { useState, useEffect, useCallback } from "react";
import { TABS, useActiveTab, type Tab } from "../useActiveTab";
import { useMode } from "../ModeProvider";
import { phaseForMode } from "../bento/emakiContext";

// Primary tabs (bottom bar) + secondary tabs (MORE sheet)
const PRIMARY_IDS: Tab[] = ["home", "cockpit", "flow", "habits", "brain"];
const SECONDARY_IDS: Tab[] = ["projects", "claude", "stack", "timeline"];

const PRIMARY_TABS = TABS.filter((t) => PRIMARY_IDS.includes(t.id));
const SECONDARY_TABS = TABS.filter((t) => SECONDARY_IDS.includes(t.id));

// Sort to match the prescribed order
PRIMARY_TABS.sort(
  (a, b) => PRIMARY_IDS.indexOf(a.id) - PRIMARY_IDS.indexOf(b.id),
);
SECONDARY_TABS.sort(
  (a, b) => SECONDARY_IDS.indexOf(a.id) - SECONDARY_IDS.indexOf(b.id),
);

export function MobileNavV4PrimaryMore() {
  const { active, setActive } = useActiveTab();
  const { mode } = useMode();
  const phase = phaseForMode(mode);
  const [moreOpen, setMoreOpen] = useState(false);

  // Lock body scroll while MORE sheet is open
  useEffect(() => {
    if (moreOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [moreOpen]);

  // Escape closes MORE sheet
  useEffect(() => {
    if (!moreOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMoreOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [moreOpen]);

  const handlePrimary = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, id: Tab) => {
      e.preventDefault();
      setActive(id);
      setMoreOpen(false);
    },
    [setActive],
  );

  const handleSecondary = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, id: Tab) => {
      e.preventDefault();
      setActive(id);
      setMoreOpen(false);
    },
    [setActive],
  );

  const isMoreActive = SECONDARY_IDS.includes(active);
  const denArt = `/kitsu/den-${phase}.webp`;

  return (
    <>
      <style>{`
        /* Mobile-only — hide above 767px */
        @media (min-width: 768px) {
          .mnv4-bar,
          .mnv4-backdrop,
          .mnv4-sheet {
            display: none !important;
          }
        }

        .mnv4-bar {
          position: fixed;
          bottom: 0;
          left: 0;
          width: 100vw;
          height: calc(56px + env(safe-area-inset-bottom));
          padding-bottom: env(safe-area-inset-bottom);
          background: rgba(20, 17, 13, 0.92);
          border-top: 1px solid rgba(214, 163, 103, 0.28);
          display: flex;
          align-items: stretch;
          z-index: 9000;
          touch-action: manipulation;
        }

        .mnv4-slot {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 44px;
          gap: 3px;
          text-decoration: none;
          color: rgba(214, 163, 103, 0.45);
          cursor: pointer;
          position: relative;
          padding: 6px 2px 4px;
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
          transition: color 120ms ease;
        }

        .mnv4-slot:active {
          color: rgba(214, 163, 103, 0.8);
        }

        .mnv4-slot[data-active="true"] {
          color: rgba(214, 163, 103, 1);
        }

        .mnv4-slot[data-active="true"]::before {
          content: "";
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 24px;
          height: 2px;
          background: rgba(214, 163, 103, 0.9);
          border-radius: 0 0 2px 2px;
        }

        .mnv4-glyph {
          font-size: 18px;
          line-height: 1;
          display: block;
        }

        .mnv4-label {
          font-family: "JetBrains Mono", "Fira Code", "Courier New", monospace;
          font-size: 9px;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          line-height: 1;
          display: block;
        }

        /* MORE button — acts like a slot but not an anchor */
        .mnv4-more-btn {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 44px;
          gap: 3px;
          background: none;
          border: none;
          color: rgba(214, 163, 103, 0.45);
          cursor: pointer;
          position: relative;
          padding: 6px 2px 4px;
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
          transition: color 120ms ease;
        }

        .mnv4-more-btn[data-active="true"] {
          color: rgba(214, 163, 103, 1);
        }

        .mnv4-more-btn[data-active="true"]::before {
          content: "";
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 24px;
          height: 2px;
          background: rgba(214, 163, 103, 0.9);
          border-radius: 0 0 2px 2px;
        }

        .mnv4-more-btn:active {
          color: rgba(214, 163, 103, 0.8);
        }

        /* Backdrop */
        .mnv4-backdrop {
          position: fixed;
          inset: 0;
          bottom: calc(56px + env(safe-area-inset-bottom));
          background: rgba(0, 0, 0, 0.5);
          z-index: 8998;
          touch-action: manipulation;
        }

        /* MORE sheet */
        .mnv4-sheet {
          position: fixed;
          bottom: calc(56px + env(safe-area-inset-bottom));
          left: 0;
          width: 100vw;
          height: 32vh;
          z-index: 8999;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .mnv4-sheet-bg {
          position: absolute;
          inset: 0;
          background-image: url(var(--den-art));
          background-size: cover;
          background-position: center top;
        }

        .mnv4-sheet-scrim {
          position: absolute;
          inset: 0;
          background: rgba(20, 17, 13, 0.58);
          border-top: 1px solid rgba(214, 163, 103, 0.2);
        }

        .mnv4-sheet-list {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          height: 100%;
          padding: 0 8px;
        }

        .mnv4-sheet-row {
          display: flex;
          align-items: center;
          gap: 14px;
          min-height: 56px;
          padding: 0 16px;
          text-decoration: none;
          color: rgba(214, 163, 103, 0.75);
          border-bottom: 1px solid rgba(214, 163, 103, 0.08);
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
          transition: color 100ms ease, background 100ms ease;
          border-radius: 6px;
        }

        .mnv4-sheet-row:last-child {
          border-bottom: none;
        }

        .mnv4-sheet-row:active {
          background: rgba(214, 163, 103, 0.08);
          color: rgba(214, 163, 103, 1);
        }

        .mnv4-sheet-row[data-active="true"] {
          color: rgba(214, 163, 103, 1);
        }

        .mnv4-sheet-glyph {
          font-size: 20px;
          line-height: 1;
          width: 28px;
          text-align: center;
          flex-shrink: 0;
        }

        .mnv4-sheet-label {
          font-family: Georgia, "Times New Roman", serif;
          font-size: 15px;
          letter-spacing: 0.03em;
          line-height: 1;
        }

        /* Slide-up animation for sheet */
        @media (prefers-reduced-motion: no-preference) {
          .mnv4-sheet {
            animation: mnv4-slide-up 180ms cubic-bezier(0.22, 1, 0.36, 1) both;
          }
          .mnv4-backdrop {
            animation: mnv4-fade-in 140ms ease both;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .mnv4-sheet {
            animation: mnv4-fade-in 140ms ease both;
          }
          .mnv4-backdrop {
            animation: mnv4-fade-in 100ms ease both;
          }
        }

        @keyframes mnv4-slide-up {
          from { transform: translateY(100%); opacity: 0.6; }
          to   { transform: translateY(0);    opacity: 1; }
        }

        @keyframes mnv4-fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>

      {/* MORE sheet backdrop */}
      {moreOpen && (
        <div
          className="mnv4-backdrop"
          onClick={() => setMoreOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* MORE sheet */}
      {moreOpen && (
        <div
          className="mnv4-sheet"
          role="dialog"
          aria-modal="true"
          aria-label="More tabs"
          style={{ "--den-art": `url(${denArt})` } as React.CSSProperties}
        >
          <div className="mnv4-sheet-bg" aria-hidden="true" />
          <div className="mnv4-sheet-scrim" aria-hidden="true" />
          <nav className="mnv4-sheet-list" aria-label="Additional navigation">
            {SECONDARY_TABS.map((t) => (
              <a
                key={t.id}
                href={`?tab=${t.id}`}
                className="mnv4-sheet-row"
                data-active={active === t.id ? "true" : "false"}
                onClick={(e) => handleSecondary(e, t.id)}
                aria-current={active === t.id ? "page" : undefined}
              >
                <span className="mnv4-sheet-glyph" aria-hidden="true">
                  {t.glyph}
                </span>
                <span className="mnv4-sheet-label">{t.label}</span>
              </a>
            ))}
          </nav>
        </div>
      )}

      {/* Bottom bar */}
      <nav
        className="mnv4-bar"
        aria-label="Primary navigation"
        role="navigation"
      >
        {PRIMARY_TABS.map((t) => (
          <a
            key={t.id}
            href={`?tab=${t.id}`}
            className="mnv4-slot"
            data-active={active === t.id ? "true" : "false"}
            onClick={(e) => handlePrimary(e, t.id)}
            aria-current={active === t.id ? "page" : undefined}
            aria-label={t.label}
          >
            <span className="mnv4-glyph" aria-hidden="true">
              {t.glyph}
            </span>
            <span className="mnv4-label">{t.label}</span>
          </a>
        ))}

        <button
          type="button"
          className="mnv4-more-btn"
          data-active={isMoreActive || moreOpen ? "true" : "false"}
          onClick={() => setMoreOpen((o) => !o)}
          aria-expanded={moreOpen}
          aria-haspopup="dialog"
          aria-label="More tabs"
        >
          <span className="mnv4-glyph" aria-hidden="true">
            ⋯
          </span>
          <span className="mnv4-label">MORE</span>
        </button>
      </nav>
    </>
  );
}
