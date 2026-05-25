"use client";

import { useEffect, useState, useCallback } from "react";
import { TABS, useActiveTab } from "../useActiveTab";
import { useMode } from "../ModeProvider";
import { phaseForMode } from "../bento/emakiContext";
import { FoxfireLayer } from "../emaki/materials";
import { usePlayer } from "../PlayerProvider";
import { STATIONS } from "@/lib/musicSources";
import { SourceBadge } from "../SourceBadge";

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
  const {
    currentStation,
    isPlaying,
    volume,
    selectStation,
    toggle,
    setVolume,
  } = usePlayer();

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

        /* ── Music section (below tabs) ──────────────────────────── */
        .foxfire-music {
          flex-shrink: 0;
          padding: 12px 20px 8px;
          border-top: 1px solid rgba(214,163,103,0.22);
          background: linear-gradient(
            180deg,
            transparent 0%,
            rgba(19,17,13,0.18) 100%
          );
        }
        .foxfire-music-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 10px;
        }
        .foxfire-music-title {
          font-family: Georgia, "Times New Roman", serif;
          font-size: 14px;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: ${CREAM};
          text-shadow: 0 1px 8px ${FOXGLOW_MID};
          flex: 1;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .foxfire-music-sub {
          font-family: "JetBrains Mono", ui-monospace, monospace;
          font-size: 9px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: rgba(214,163,103,0.7);
          margin-top: 2px;
        }
        .foxfire-music-playbtn {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: ${AMBER};
          color: ${INK};
          border: none;
          font-size: 13px;
          cursor: pointer;
          flex-shrink: 0;
          box-shadow: 0 0 16px ${FOXGLOW_MID};
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
        }
        .foxfire-music-playbtn:disabled {
          background: rgba(214,163,103,0.25);
          color: rgba(239,230,212,0.45);
          box-shadow: none;
          cursor: default;
        }
        .foxfire-station-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
          max-height: 38vh;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
          margin-bottom: 10px;
        }
        .foxfire-station-row {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          border-radius: 10px;
          border: 1px solid rgba(214,163,103,0.18);
          background: rgba(19,17,13,0.32);
          text-align: left;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
          transition: border-color 150ms, background 150ms;
        }
        .foxfire-station-row.is-active {
          border-color: ${AMBER};
          background: ${FOXGLOW_MID};
          box-shadow: 0 0 12px ${FOXGLOW_MID};
        }
        .foxfire-station-info {
          flex: 1;
          min-width: 0;
        }
        .foxfire-station-title {
          font-family: Georgia, "Times New Roman", serif;
          font-size: 14px;
          color: ${CREAM};
          font-weight: 500;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          line-height: 1.2;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .foxfire-station-sub {
          font-family: "JetBrains Mono", ui-monospace, monospace;
          font-size: 10px;
          color: rgba(239,230,212,0.55);
          letter-spacing: 0.04em;
          margin-top: 2px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .foxfire-vol-row {
          display: flex;
          align-items: center;
          gap: 10px;
          padding-top: 8px;
        }
        .foxfire-vol-label {
          font-family: "JetBrains Mono", ui-monospace, monospace;
          font-size: 10px;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: rgba(214,163,103,0.7);
          flex-shrink: 0;
        }
        .foxfire-vol-slider {
          flex: 1;
          accent-color: ${AMBER};
          cursor: pointer;
        }

        /* ── Mobile EQ bars (mirrors the desktop topbar animation) ── */
        .foxfire-eq {
          display: inline-flex;
          align-items: flex-end;
          gap: 2px;
          width: 12px;
          height: 12px;
          margin-left: 2px;
        }
        .foxfire-eq-bar {
          width: 2px;
          background: ${AMBER};
          border-radius: 1px;
          transform-origin: bottom center;
          animation: foxfire-eq-bounce 0.9s ease-in-out infinite;
        }
        .foxfire-eq-bar:nth-child(1) { height: 7px;  animation-delay: 0s; }
        .foxfire-eq-bar:nth-child(2) { height: 11px; animation-delay: 0.15s; }
        .foxfire-eq-bar:nth-child(3) { height: 5px;  animation-delay: 0.30s; }
        @keyframes foxfire-eq-bounce {
          0%, 100% { transform: scaleY(0.35); }
          50%      { transform: scaleY(1);    }
        }
        @media (prefers-reduced-motion: reduce) {
          .foxfire-eq-bar { animation: none; transform: scaleY(0.7); }
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

              {/* ── MUSIC section — Kitsu's radio cabinet inside the den ── */}
              <section className="foxfire-music" aria-label="Music">
                <div className="foxfire-music-head">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="foxfire-music-title">
                      {currentStation ? currentStation.title : "PG RADIO"}
                      {currentStation && isPlaying && (
                        <span className="foxfire-eq" aria-hidden="true">
                          <span className="foxfire-eq-bar" />
                          <span className="foxfire-eq-bar" />
                          <span className="foxfire-eq-bar" />
                        </span>
                      )}
                    </div>
                    <div className="foxfire-music-sub">
                      {currentStation
                        ? currentStation.subtitle
                        : "Select a station"}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="foxfire-music-playbtn"
                    onClick={toggle}
                    disabled={!currentStation}
                    aria-label={isPlaying ? "Pause" : "Play"}
                  >
                    {isPlaying ? "❚❚" : "▶"}
                  </button>
                </div>

                <div className="foxfire-station-list">
                  {STATIONS.map((s) => {
                    const isActive = currentStation?.id === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        className={`foxfire-station-row${isActive ? " is-active" : ""}`}
                        onClick={() => selectStation(s.id)}
                        aria-label={`Play ${s.title}`}
                      >
                        <div className="foxfire-station-info">
                          <div className="foxfire-station-title">
                            {s.title}
                            {isActive && (
                              <span
                                style={{ color: AMBER, fontSize: "10px" }}
                                aria-hidden
                              >
                                ♪
                              </span>
                            )}
                          </div>
                          <div className="foxfire-station-sub">
                            {s.subtitle}
                          </div>
                        </div>
                        <SourceBadge source={s.source} size="sm" />
                      </button>
                    );
                  })}
                </div>

                <div className="foxfire-vol-row">
                  <span className="foxfire-vol-label">Vol</span>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={volume}
                    onChange={(e) => setVolume(parseFloat(e.target.value))}
                    className="foxfire-vol-slider"
                    aria-label="Volume"
                  />
                </div>
              </section>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
