"use client";

import { useEffect, useState, useCallback } from "react";
import { TABS, useActiveTab } from "../useActiveTab";
import { useMode } from "../ModeProvider";
import { phaseForMode } from "../bento/emakiContext";
import { FoxfireLayer } from "../emaki/materials";

/* ── palette ── */
const CREAM = "#EFE6D4";
const AMBER = "#D6A367";
const INK = "#13110D";
const FOXGLOW_MID = "rgba(214,163,103,0.18)";
const FOXGLOW_STRONG = "rgba(214,163,103,0.55)";
const FOXGLOW_RING = "rgba(214,163,103,0.75)";

/* ── decorative kanji per tab ── */
const KANJI: Record<string, string> = {
  home: "家",
  habits: "習",
  projects: "業",
  flow: "流",
  timeline: "時",
  claude: "知",
  cockpit: "舵",
  stack: "積",
  brain: "脳",
};

export function MobileNavV1Foxfire() {
  const [open, setOpen] = useState(false);
  const { active, setActive } = useActiveTab();
  const { mode } = useMode();
  const phase = phaseForMode(mode);

  /* lock body scroll while open */
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  /* Escape key closes */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  /* swipe-right gesture to close */
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  }, []);

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (touchStartX === null) return;
      const delta = e.changedTouches[0].clientX - touchStartX;
      if (delta > 72) setOpen(false);
      setTouchStartX(null);
    },
    [touchStartX],
  );

  /* tab selection */
  const handleTabClick = useCallback(
    (
      e: React.MouseEvent<HTMLAnchorElement>,
      tabId: Parameters<typeof setActive>[0],
    ) => {
      e.preventDefault();
      setActive(tabId);
      setOpen(false);
    },
    [setActive],
  );

  return (
    <>
      {/* ── inline CSS: mobile-only guard ── */}
      <style>{`
        @media (min-width: 768px) {
          .foxfire-fab,
          .foxfire-drawer-root {
            display: none !important;
          }
        }

        @keyframes foxfire-pulse {
          0%,100% {
            box-shadow: 0 0 0 0 ${FOXGLOW_RING}, 0 0 12px 4px ${FOXGLOW_MID};
          }
          50% {
            box-shadow: 0 0 0 6px transparent, 0 0 20px 8px ${FOXGLOW_MID};
          }
        }

        @keyframes foxfire-slide-in {
          from { transform: translateX(-100%); opacity: 0.7; }
          to   { transform: translateX(0);     opacity: 1;   }
        }

        @media (prefers-reduced-motion: reduce) {
          @keyframes foxfire-pulse {
            0%,100% { opacity: 1; }
          }
          @keyframes foxfire-slide-in {
            from { opacity: 0; }
            to   { opacity: 1; }
          }
        }

        .foxfire-fab {
          position: fixed;
          bottom: calc(16px + env(safe-area-inset-bottom, 0px));
          left: 16px;
          width: 48px;
          height: 48px;
          border-radius: 50%;
          border: 1.5px solid ${FOXGLOW_RING};
          background: ${INK};
          color: ${AMBER};
          font-size: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          z-index: 9997;
          touch-action: manipulation;
          animation: foxfire-pulse 3s ease-in-out infinite;
          -webkit-tap-highlight-color: transparent;
          line-height: 1;
        }

        .foxfire-drawer-root {
          position: fixed;
          inset: 0;
          z-index: 9998;
          pointer-events: none;
        }

        .foxfire-drawer-root.is-open {
          pointer-events: auto;
        }

        .foxfire-drawer {
          position: absolute;
          inset: 0;
          width: 100vw;
          height: 100vh;
          overflow: hidden;
          animation: foxfire-slide-in 280ms cubic-bezier(0.32, 0, 0.15, 1) both;
        }

        .foxfire-bg-img {
          position: absolute;
          inset: 0;
          background-color: ${INK};
          background-size: cover;
          background-position: center;
          z-index: 0;
        }

        .foxfire-vignette {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(ellipse at center, transparent 30%, rgba(19,17,13,0.72) 100%),
            linear-gradient(
              to bottom,
              rgba(19,17,13,0.5) 0%,
              rgba(19,17,13,0.18) 40%,
              rgba(19,17,13,0.72) 100%
            );
          z-index: 1;
        }

        .foxfire-particles {
          position: absolute;
          inset: 0;
          z-index: 2;
          pointer-events: none;
        }

        .foxfire-content {
          position: relative;
          z-index: 3;
          display: flex;
          flex-direction: column;
          height: 100%;
          padding-top: env(safe-area-inset-top, 0px);
          padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 24px);
        }

        .foxfire-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 20px 16px;
          border-bottom: 1px solid rgba(214,163,103,0.22);
          flex-shrink: 0;
        }

        .foxfire-title {
          font-family: Georgia, "Times New Roman", serif;
          font-size: 26px;
          font-weight: 400;
          color: ${CREAM};
          letter-spacing: 0.04em;
          text-shadow: 0 1px 12px ${FOXGLOW_MID};
          margin: 0;
          line-height: 1.2;
        }

        .foxfire-close-btn {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          border: 1px solid rgba(214,163,103,0.35);
          background: rgba(19,17,13,0.55);
          color: ${CREAM};
          font-size: 24px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          touch-action: manipulation;
          -webkit-tap-highlight-color: transparent;
          flex-shrink: 0;
          line-height: 1;
        }

        .foxfire-tab-list {
          flex: 1;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
          padding: 8px 0;
        }

        .foxfire-tab-row {
          display: flex;
          align-items: center;
          width: 100%;
          min-height: 64px;
          padding: 0 20px;
          gap: 16px;
          text-decoration: none;
          border-left: 3px solid transparent;
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
          cursor: pointer;
        }

        .foxfire-tab-row.is-active {
          background: ${FOXGLOW_MID};
          border-left-color: ${AMBER};
        }

        .foxfire-tab-glyph {
          font-size: 26px;
          line-height: 1;
          width: 36px;
          text-align: center;
          flex-shrink: 0;
          filter: drop-shadow(0 0 6px ${FOXGLOW_MID});
        }

        .foxfire-tab-row.is-active .foxfire-tab-glyph {
          filter: drop-shadow(0 0 10px ${FOXGLOW_STRONG});
        }

        .foxfire-tab-label {
          flex: 1;
          font-family: Georgia, "Times New Roman", serif;
          font-size: 19px;
          font-weight: 400;
          letter-spacing: 0.08em;
          color: rgba(239,230,212,0.78);
          line-height: 1;
        }

        .foxfire-tab-row.is-active .foxfire-tab-label {
          color: ${CREAM};
          text-shadow: 0 0 12px ${FOXGLOW_STRONG};
        }

        .foxfire-tab-kanji {
          font-family: Georgia, "Times New Roman", serif;
          font-size: 20px;
          color: rgba(214,163,103,0.42);
          line-height: 1;
          flex-shrink: 0;
        }

        .foxfire-tab-row.is-active .foxfire-tab-kanji {
          color: rgba(214,163,103,0.75);
        }
      `}</style>

      {/* ── FAB: always-visible open trigger (line 196) ── */}
      <button
        className="foxfire-fab"
        aria-label="Open navigation"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        ☰
      </button>

      {/* ── drawer root (line 209) ── */}
      <div
        className={`foxfire-drawer-root${open ? " is-open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation drawer"
      >
        {open && (
          <div
            className="foxfire-drawer"
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            {/* painted background */}
            <div
              className="foxfire-bg-img"
              style={{
                backgroundImage: `url('/kitsu/den-${phase}.webp')`,
              }}
            />

            {/* vignette for legibility */}
            <div className="foxfire-vignette" />

            {/* foxfire particle layer */}
            <div className="foxfire-particles">
              <FoxfireLayer phase={phase} />
            </div>

            {/* content layer */}
            <div className="foxfire-content">
              {/* header (line 241) */}
              <header className="foxfire-header">
                <h1 className="foxfire-title">Kitsu&apos;s Map</h1>
                {/* close button (line 244) */}
                <button
                  className="foxfire-close-btn"
                  aria-label="Close navigation"
                  onClick={() => setOpen(false)}
                >
                  {"×"}
                </button>
              </header>

              {/* tab list (line 252) */}
              <nav className="foxfire-tab-list" aria-label="Site navigation">
                {TABS.map((t) => (
                  <a
                    key={t.id}
                    href={`?tab=${t.id}`}
                    className={`foxfire-tab-row${active === t.id ? " is-active" : ""}`}
                    aria-current={active === t.id ? "page" : undefined}
                    onClick={(e) => handleTabClick(e, t.id)}
                  >
                    <span className="foxfire-tab-glyph" aria-hidden="true">
                      {t.glyph}
                    </span>
                    <span className="foxfire-tab-label">{t.label}</span>
                    {KANJI[t.id] ? (
                      <span className="foxfire-tab-kanji" aria-hidden="true">
                        {KANJI[t.id]}
                      </span>
                    ) : null}
                  </a>
                ))}
              </nav>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
