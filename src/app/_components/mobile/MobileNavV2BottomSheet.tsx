"use client";

import { useState, useEffect, useCallback } from "react";
import { TABS, useActiveTab } from "../useActiveTab";
import { useMode } from "../ModeProvider";
import { phaseForMode } from "../bento/emakiContext";
import { FoxfireLayer } from "../emaki/materials";
import { PHASES } from "../emaki/theme";

const PHASE_GLYPHS: Record<string, string> = {
  day: "☀",
  twilight: "◑",
  night: "☽",
};

export function MobileNavV2BottomSheet() {
  const [open, setOpen] = useState(false);
  const { mode } = useMode();
  const { active, setActive } = useActiveTab();
  const phase = phaseForMode(mode);
  const tk = PHASES[phase];

  /* Lock body scroll while sheet open */
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [open]);

  /* Escape key closes */
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  const close = useCallback(() => setOpen(false), []);

  const handleTabClick = useCallback(
    (
      e: React.MouseEvent<HTMLAnchorElement>,
      tabId: Parameters<typeof setActive>[0],
    ) => {
      e.preventDefault();
      setActive(tabId);
      close();
    },
    [setActive, close],
  );

  /* Phase-aware art path */
  const artSrc = `/art/tabs/cockpit-${phase}.webp`;

  return (
    <>
      {/* Mobile-only scoping */}
      <style>{`
        @media (min-width: 768px) {
          .mnv2-trigger,
          .mnv2-backdrop,
          .mnv2-sheet { display: none !important; }
        }
        @media (prefers-reduced-motion: reduce) {
          .mnv2-sheet { transition: opacity 320ms ease !important; }
          .mnv2-sheet[data-open="true"]  { opacity: 1 !important; transform: none !important; }
          .mnv2-sheet[data-open="false"] { opacity: 0 !important; transform: none !important; }
        }
      `}</style>

      {/* ── Trigger pill ── fixed bottom-center */}
      <button
        className="mnv2-trigger"
        aria-label="Open navigation"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        style={{
          position: "fixed",
          bottom: `calc(14px + env(safe-area-inset-bottom))`,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 9990,
          width: 88,
          height: 36,
          borderRadius: 9999,
          border: `1px solid ${tk.panelBorder}`,
          background: tk.toggleBg,
          color: tk.accent,
          fontFamily: "'DM Sans', 'Courier New', monospace",
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: "0.10em",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 5,
          boxShadow: `0 0 14px ${tk.foxfireGlow ?? tk.orbGlow}, 0 2px 8px rgba(0,0,0,0.40)`,
          touchAction: "manipulation",
          WebkitTapHighlightColor: "transparent",
          minHeight: 44,
          minWidth: 88,
        }}
      >
        <span aria-hidden>TABS</span>
        <span aria-hidden style={{ fontSize: 10 }}>
          &#9650;
        </span>
      </button>

      {/* ── Backdrop scrim ── */}
      {open && (
        <div
          className="mnv2-backdrop"
          aria-hidden="true"
          onClick={close}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9991,
            background: "rgba(0,0,0,0.50)",
          }}
        />
      )}

      {/* ── Bottom sheet ── */}
      <div
        className="mnv2-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
        data-open={open ? "true" : "false"}
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 9992,
          maxHeight: "75vh",
          width: "100vw",
          borderRadius: "24px 24px 0 0",
          overflow: "hidden",
          transform: open ? "translateY(0)" : "translateY(100%)",
          transition: "transform 320ms cubic-bezier(0.32, 0.72, 0, 1)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Painted lantern interior — art layer */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `url('${artSrc}')`,
            backgroundSize: "cover",
            backgroundPosition: "center top",
            zIndex: 0,
          }}
        />

        {/* Vignette scrim over the art */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            background:
              phase === "day"
                ? "rgba(232,221,200,0.55)"
                : phase === "twilight"
                  ? "rgba(14,8,22,0.52)"
                  : "rgba(10,8,6,0.55)",
            zIndex: 1,
          }}
        />

        {/* Foxfire particles over the sheet */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 2,
            pointerEvents: "none",
          }}
        >
          <FoxfireLayer phase={phase} />
        </div>

        {/* Sheet content — sits above backdrop art */}
        <div
          style={{
            position: "relative",
            zIndex: 3,
            display: "flex",
            flexDirection: "column",
            height: "100%",
            paddingBottom: `env(safe-area-inset-bottom)`,
          }}
        >
          {/* Drag handle — decorative affordance */}
          <div
            aria-hidden="true"
            style={{
              display: "flex",
              justifyContent: "center",
              paddingTop: 10,
              paddingBottom: 6,
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: 40,
                height: 4,
                borderRadius: 2,
                background: tk.textMuted + "88",
              }}
            />
          </div>

          {/* Header: TABS label + phase glyph */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "8px 20px 10px",
              flexShrink: 0,
            }}
          >
            <span
              style={{
                fontFamily: "'DM Sans', 'Courier New', monospace",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: tk.textSub,
              }}
            >
              TABS
            </span>
            <span
              aria-hidden="true"
              style={{
                fontSize: 14,
                color: tk.textMuted,
                opacity: 0.7,
              }}
            >
              {PHASE_GLYPHS[phase] ?? "◆"}
            </span>
          </div>

          {/* Kintsugi divider under header */}
          <div
            aria-hidden="true"
            style={{
              height: 1,
              margin: "0 20px 4px",
              background: `linear-gradient(90deg, transparent, ${tk.gold}66, transparent)`,
              flexShrink: 0,
            }}
          />

          {/* Tab list — scrollable */}
          <nav
            aria-label="Site tabs"
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "4px 12px 16px",
              display: "flex",
              flexDirection: "column",
              gap: 6,
              WebkitOverflowScrolling: "touch",
            }}
          >
            {TABS.map((t) => {
              const isActive = active === t.id;
              return (
                <a
                  key={t.id}
                  href={`?tab=${t.id}`}
                  onClick={(e) => handleTabClick(e, t.id)}
                  aria-current={isActive ? "page" : undefined}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    minHeight: 56,
                    padding: "0 16px",
                    borderRadius: 12,
                    textDecoration: "none",
                    border: `1px solid ${isActive ? tk.gold + "66" : tk.panelBorder + "44"}`,
                    background: isActive
                      ? phase === "day"
                        ? `rgba(26,92,58,0.12)`
                        : `rgba(232,168,64,0.12)`
                      : phase === "day"
                        ? "rgba(252,248,240,0.35)"
                        : "rgba(22,16,8,0.38)",
                    backdropFilter: phase === "day" ? "none" : "blur(6px)",
                    WebkitBackdropFilter:
                      phase === "day" ? "none" : "blur(6px)",
                    touchAction: "manipulation",
                    WebkitTapHighlightColor: "transparent",
                    transition: "background 0.18s, border-color 0.18s",
                  }}
                >
                  {/* Glyph */}
                  <span
                    aria-hidden="true"
                    style={{
                      fontSize: 20,
                      width: 28,
                      textAlign: "center",
                      color: isActive ? tk.accent : tk.textSub,
                      flexShrink: 0,
                      filter: isActive
                        ? `drop-shadow(0 0 4px ${tk.foxfireGlow ?? tk.orbGlow})`
                        : "none",
                      transition: "color 0.18s, filter 0.18s",
                    }}
                  >
                    {t.glyph}
                  </span>

                  {/* Label */}
                  <span
                    style={{
                      flex: 1,
                      fontFamily: "'Noto Serif JP', serif",
                      fontSize: 17,
                      fontWeight: isActive ? 700 : 500,
                      letterSpacing: "0.02em",
                      color: isActive ? tk.accent : tk.textPrimary,
                      transition: "color 0.18s, font-weight 0.18s",
                    }}
                  >
                    {t.label}
                  </span>

                  {/* Active indicator dot */}
                  {isActive && (
                    <div
                      aria-hidden="true"
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: tk.accent,
                        boxShadow: `0 0 6px ${tk.foxfireGlow ?? tk.orbGlow}`,
                        flexShrink: 0,
                      }}
                    />
                  )}
                </a>
              );
            })}
          </nav>
        </div>
      </div>
    </>
  );
}
