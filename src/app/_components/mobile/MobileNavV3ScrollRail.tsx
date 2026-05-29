"use client";

import { useState, useEffect, useCallback } from "react";
import { TABS, useActiveTab } from "../useActiveTab";
import { useMode } from "../ModeProvider";
import { phaseForMode } from "../bento/emakiContext";
import { PHASES } from "../emaki/theme";

/* ─── constants ─── */
const PEEK_W = 18; // px visible when closed
const HIT_W = 44; // px hit-area on the peek edge
const RAIL_W = "min(70vw, 320px)";
const UNFURL_DUR = "340ms";
const UNFURL_EASE = "cubic-bezier(0.22, 0.84, 0.36, 1.00)";

/* ─── CSS injected once ─── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@400;700&display=swap');

.v3sr-root {
  /* mobile-only — hidden above 767 px via the <style> tag below */
  position: fixed;
  top: 0;
  left: 0;
  height: 100dvh;
  z-index: 9000;
  pointer-events: none;
}

/* ─── Backdrop ─── */
.v3sr-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.45);
  opacity: 0;
  transition: opacity ${UNFURL_DUR} ${UNFURL_EASE};
  pointer-events: none;
  touch-action: manipulation;
}
.v3sr-backdrop.open {
  opacity: 1;
  pointer-events: auto;
}

/* ─── Rail panel ─── */
.v3sr-rail {
  position: fixed;
  top: 0;
  left: 0;
  width: ${RAIL_W};
  height: 100dvh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  will-change: transform;
  transform: translateX(calc(-100% + ${PEEK_W}px));
  transition: transform ${UNFURL_DUR} ${UNFURL_EASE};
  pointer-events: auto;
  touch-action: manipulation;
  border-right: 2px solid transparent; /* set via JS / class */
}
.v3sr-rail.open {
  transform: translateX(0);
}
@media (prefers-reduced-motion: reduce) {
  .v3sr-rail    { transition: opacity ${UNFURL_DUR} linear !important; }
  .v3sr-backdrop{ transition: opacity ${UNFURL_DUR} linear !important; }
  .v3sr-rail:not(.open)    { opacity: 0; }
  .v3sr-rail.open          { opacity: 1; transform: translateX(0) !important; }
}

/* ─── Peek edge hit zone (extends the 18 px strip to 44 px) ─── */
.v3sr-peek-hit {
  position: absolute;
  top: 0;
  right: calc(-${HIT_W - PEEK_W}px);
  width: ${HIT_W}px;
  height: 100%;
  cursor: pointer;
  z-index: 10;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}

/* ─── Scroll axis (right edge faux seam) ─── */
.v3sr-axis {
  position: absolute;
  top: 0;
  right: 0;
  width: 3px;
  height: 100%;
  z-index: 20;
  pointer-events: none;
}

/* ─── Scroll axis close button ─── */
.v3sr-close {
  position: absolute;
  top: 50%;
  right: -12px;
  transform: translateY(-50%);
  width: 24px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 30;
  border: none;
  background: transparent;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}

/* ─── Header ─── */
.v3sr-header {
  flex-shrink: 0;
  padding: 40px 0 24px 20px;
  display: flex;
  align-items: flex-start;
}
.v3sr-wordmark {
  font-family: 'Noto Serif JP', serif;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.24em;
  writing-mode: vertical-rl;
  text-orientation: mixed;
  transform: rotate(180deg);
  user-select: none;
  text-transform: uppercase;
  opacity: 0.70;
  line-height: 1;
}

/* ─── Tab list ─── */
.v3sr-list {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 0 20px 0 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
}
.v3sr-item {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 56px;
  padding: 0 16px 0 20px;
  text-decoration: none;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
  border-bottom: 1px solid transparent;
  position: relative;
  transition: background 0.18s, opacity 0.18s;
}
.v3sr-item:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: -2px;
}
.v3sr-glyph {
  font-size: 18px;
  line-height: 1;
  flex-shrink: 0;
  width: 22px;
  text-align: center;
}
.v3sr-label {
  font-family: 'Noto Serif JP', serif;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  flex: 1;
}
/* Active underline bar */
.v3sr-item-active-bar {
  position: absolute;
  bottom: 0;
  left: 20px;
  right: 16px;
  height: 2px;
  border-radius: 1px;
}

/* ─── Footer pad ─── */
.v3sr-footer {
  flex-shrink: 0;
  height: calc(env(safe-area-inset-bottom, 0px) + 20px);
}

/* ─── Mobile-only guard ─── */
@media (min-width: 768px) {
  .v3sr-root, .v3sr-backdrop { display: none !important; }
}
`;

export function MobileNavV3ScrollRail() {
  const [open, setOpen] = useState(false);
  const { active, setActive } = useActiveTab();
  const { mode } = useMode();
  const phase = phaseForMode(mode);
  const tk = PHASES[phase];

  /* ─── Lock body scroll while open ─── */
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      document.body.style.touchAction = "none";
    } else {
      document.body.style.overflow = "";
      document.body.style.touchAction = "";
    }
    return () => {
      document.body.style.overflow = "";
      document.body.style.touchAction = "";
    };
  }, [open]);

  /* ─── Escape key closes ─── */
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) setOpen(false);
    },
    [open],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  /* ─── Derived colours ─── */
  const gold = tk.gold;
  const goldBright = tk.goldBright;
  const bgImage = `/art/tabs/timeline-${phase}.webp`;

  /* Gold gradient for the peek edge and axis seam */
  const goldGrad = `linear-gradient(180deg,
    transparent 0%,
    ${gold}66 12%,
    ${goldBright}ee 35%,
    ${goldBright} 50%,
    ${goldBright}ee 65%,
    ${gold}66 88%,
    transparent 100%
  )`;

  /* Rail background: timeline art + vignette scrim */
  const railBg = `
    linear-gradient(to right,
      rgba(0,0,0,0.34) 0%,
      rgba(0,0,0,0.18) 60%,
      rgba(0,0,0,0.62) 100%
    ),
    url('${bgImage}') center/cover no-repeat,
    ${tk.bg}
  `;

  return (
    <>
      {/* Inject CSS once */}
      <style>{CSS}</style>

      {/* Backdrop */}
      <div
        className={`v3sr-backdrop${open ? " open" : ""}`}
        aria-hidden="true"
        onClick={() => setOpen(false)}
      />

      {/* Root wrapper */}
      <div className="v3sr-root" aria-hidden={!open}>
        {/* Rail */}
        <nav
          className={`v3sr-rail${open ? " open" : ""}`}
          aria-label="Site navigation"
          role="navigation"
          style={{
            background: railBg,
            borderRight: `2px solid ${goldBright}88`,
          }}
        >
          {/* Peek-edge hit zone (visible when rail is closed) */}
          {!open && (
            <div
              className="v3sr-peek-hit"
              role="button"
              aria-label="Open navigation"
              tabIndex={0}
              onClick={() => setOpen(true)}
              onKeyDown={(e) => e.key === "Enter" && setOpen(true)}
              style={{
                background: `linear-gradient(to left, ${goldBright}22, transparent)`,
              }}
            />
          )}

          {/* Gilded peek strip (always visible, left edge decoration) */}
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              top: "50%",
              right: 0,
              transform: "translateY(-50%)",
              width: PEEK_W,
              height: 280,
              background: goldGrad,
              borderRadius: "2px 0 0 2px",
              pointerEvents: "none",
              opacity: open ? 0 : 1,
              transition: `opacity ${UNFURL_DUR} ${UNFURL_EASE}`,
            }}
          />

          {/* Scroll axis seam (right edge) */}
          <div className="v3sr-axis" style={{ background: goldGrad }}>
            {/* Close button on the axis */}
            <button
              className="v3sr-close"
              aria-label="Close navigation"
              onClick={() => setOpen(false)}
              style={{
                opacity: open ? 1 : 0,
                transition: `opacity ${UNFURL_DUR} ${UNFURL_EASE}`,
                pointerEvents: open ? "auto" : "none",
                color: goldBright,
                fontSize: 14,
                fontFamily: "'Noto Serif JP', serif",
              }}
            >
              &#9664;
            </button>
          </div>

          {/* Header wordmark */}
          <div className="v3sr-header">
            <span className="v3sr-wordmark" style={{ color: tk.textSub }}>
              NAVIGATE 道
            </span>
          </div>

          {/* Tab list */}
          <div className="v3sr-list" role="list">
            {TABS.map((t) => {
              const isActive = t.id === active;
              return (
                <a
                  key={t.id}
                  href={`?tab=${t.id}`}
                  role="listitem"
                  className="v3sr-item"
                  aria-current={isActive ? "page" : undefined}
                  style={{
                    color: isActive ? goldBright : tk.textSub,
                    background: isActive ? `${goldBright}12` : "transparent",
                    borderBottomColor: tk.divider,
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    setActive(t.id);
                    setOpen(false);
                  }}
                >
                  <span className="v3sr-glyph">{t.glyph}</span>
                  <span
                    className="v3sr-label"
                    style={{
                      color: isActive ? goldBright : tk.textSub,
                    }}
                  >
                    {t.label}
                  </span>
                  {isActive && (
                    <span
                      className="v3sr-item-active-bar"
                      aria-hidden="true"
                      style={{
                        background: `linear-gradient(90deg, ${gold}66, ${goldBright}, ${gold}66)`,
                      }}
                    />
                  )}
                </a>
              );
            })}
          </div>

          {/* Safe area footer pad */}
          <div className="v3sr-footer" />
        </nav>
      </div>
    </>
  );
}
