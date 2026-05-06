"use client";

import { useState } from "react";

/**
 * Mobile Nav Lab — 3 navigation patterns for iPhone-sized PG OS.
 *
 * MN1 TOP SCROLL          Status quo + touch-fixes shipped tonight
 * MN2 BOTTOM THUMB BAR    iOS-native fixed bottom tab bar (5 tabs)
 * MN3 RADIAL DOCK         Falsifier — single floating button → fan out on tap
 *
 * Each variant renders inside a 390×800 phone-frame chrome so PG can see
 * thumb-reach + fixed-vs-scrolling at the right scale.
 */

type VariantId = "mn1" | "mn2" | "mn3";
const ID_ORDER: VariantId[] = ["mn1", "mn2", "mn3"];

const TABS = [
  { id: "home", num: "00", label: "HOME", glyph: "⌂" },
  { id: "habits", num: "01", label: "HABITS", glyph: "✦" },
  { id: "projects", num: "02", label: "PROJECTS", glyph: "▣" },
  { id: "flow", num: "03", label: "FLOW", glyph: "≋" },
  { id: "claude", num: "04", label: "CLAUDE", glyph: "◆" },
];

const VARIANTS: Record<VariantId, { name: string; tagline: string; tradeoffs: string }> = {
  mn1: {
    name: "Top Scroll (Current)",
    tagline: "Status quo + touch-action fixes",
    tradeoffs:
      "Familiar, matches desktop. CLAUDE tab requires horizontal scroll on narrow widths. Thumb has to reach the top of the screen — reachable on iPhone Mini, awkward on Pro Max. Wins on parity with desktop layout.",
  },
  mn2: {
    name: "Bottom Thumb Bar",
    tagline: "iOS-native · fixed bottom · always thumb-reach",
    tradeoffs:
      "iOS-native pattern (Tab Bar). All 5 tabs visible without scroll. Always thumb-reachable. Wastes ~60px vertical real estate the top tabbar doesn't. Best for one-handed phone use; weakest for 'looks like the same app as desktop'.",
  },
  mn3: {
    name: "Radial Dock",
    tagline: "Falsifier · single floating button · fans out on tap",
    tradeoffs:
      "Anti-tab-bar. One floating dot bottom-right. Tap → 4 tabs fan out radially around it like iOS Notes' compose menu. Bets that persistent tab bar is wasted real estate when most sessions stay on one tab anyway. Polarizing — wins or loses hard.",
  },
};

export default function MobileNavLabPage() {
  const [active, setActive] = useState<VariantId>("mn2");
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#070811",
        color: "#dfe9f3",
        fontFamily: "'Inter', system-ui, sans-serif",
        padding: "24px 18px 60px",
      }}
    >
      <style>{`
        @keyframes mn-radial-burst {
          from { transform: scale(0.4) translate(0, 0); opacity: 0; }
          to   { transform: scale(1) translate(var(--mn-tx, 0), var(--mn-ty, 0)); opacity: 1; }
        }
        @keyframes mn-pulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(229,179,116,0.5); } 50% { box-shadow: 0 0 0 12px rgba(229,179,116,0); } }
      `}</style>

      <header style={{ maxWidth: 880, margin: "0 auto 24px" }}>
        <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", color: "#a4b4cf", marginBottom: 8 }}>
          // MOBILE NAV LAB
        </p>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", fontSize: 30, lineHeight: 1.15, margin: 0, color: "#f3e8d3" }}>
          How should the iPhone navigate?
        </h1>
      </header>

      <div style={{ maxWidth: 880, margin: "0 auto 28px", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
        {ID_ORDER.map((id) => {
          const v = VARIANTS[id];
          const sel = active === id;
          return (
            <button
              key={id}
              onClick={() => setActive(id)}
              style={{
                background: sel ? "rgba(229,179,116,0.12)" : "rgba(255,255,255,0.03)",
                border: sel ? "1px solid rgba(229,179,116,0.7)" : "1px solid rgba(255,255,255,0.08)",
                color: sel ? "#f3e8d3" : "#a4b4cf",
                padding: "14px 12px",
                borderRadius: 12,
                fontFamily: "'Cormorant Garamond', serif",
                fontStyle: "italic",
                fontSize: 17,
                fontWeight: 500,
                textAlign: "left",
                cursor: "pointer",
                transition: "all 200ms ease-out",
              }}
            >
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontStyle: "normal", fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", color: sel ? "#e5b374" : "#7a8aa8", marginBottom: 4 }}>
                {id.toUpperCase()}
              </div>
              {v.name}
            </button>
          );
        })}
      </div>

      <section style={{ maxWidth: 480, margin: "0 auto" }}>
        <div
          style={{
            position: "relative",
            width: 390,
            height: 800,
            margin: "0 auto",
            background: "#0a1228",
            borderRadius: 38,
            border: "8px solid #1a1f2e",
            boxShadow: "0 30px 80px -20px rgba(0,0,0,0.7), inset 0 0 0 2px #2a3045",
            overflow: "hidden",
          }}
        >
          {/* Status bar */}
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 36, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 22px", fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: "#dfe9f3", zIndex: 10 }}>
            <span>23:45</span>
            <span>● ● ● ●●</span>
          </div>

          {active === "mn1" && <NavTopScroll />}
          {active === "mn2" && <NavBottomBar />}
          {active === "mn3" && <NavRadialDock />}
        </div>

        <p style={{ marginTop: 22, fontSize: 14, lineHeight: 1.6, color: "#c4d0e2", fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", textAlign: "center" }}>
          {VARIANTS[active].tradeoffs}
        </p>
      </section>
    </main>
  );
}

function MockBridgeContent() {
  return (
    <>
      <div style={{ marginTop: 8, marginBottom: 16, fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", fontSize: 24, color: "#f3e8d3", lineHeight: 1.2 }}>
        Good <span style={{ color: "#fcb888" }}>night</span>, Patrick.
      </div>
      <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "14px 14px", marginBottom: 12 }}>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: "0.14em", color: "#e5b374", marginBottom: 6 }}>APPROVAL · RULE-PROMOTION</div>
        <div style={{ fontSize: 13, lineHeight: 1.4, color: "#dfe9f3" }}>Add self-config authorization clarity to never-defer-execution.md</div>
      </div>
      <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "14px 14px", marginBottom: 12 }}>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: "0.14em", color: "#e5b374", marginBottom: 6 }}>APPROVAL · CONFIG-CHANGE</div>
        <div style={{ fontSize: 13, lineHeight: 1.4, color: "#dfe9f3" }}>Fix `actually` false positive signal detector</div>
      </div>
      <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "14px 14px", marginBottom: 12 }}>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: "0.14em", color: "#e5b374", marginBottom: 6 }}>SHIP</div>
        <div style={{ fontSize: 13, lineHeight: 1.4, color: "#dfe9f3" }}>Donkey Kong BrickBuilder shipped to Bridge</div>
      </div>
    </>
  );
}

/* ─────────────────────── MN1 — TOP SCROLL ────────────────────────────── */
function NavTopScroll() {
  return (
    <>
      <div style={{ position: "absolute", top: 36, left: 0, right: 0, padding: "12px 16px 0", display: "flex", gap: 16, overflowX: "auto", borderBottom: "1px solid rgba(255,255,255,0.08)", scrollbarWidth: "none" }}>
        {TABS.map((t) => (
          <div key={t.id} style={{ flexShrink: 0, padding: "8px 4px", borderBottom: t.id === "home" ? "2px solid #e5b374" : "2px solid transparent", color: t.id === "home" ? "#f3e8d3" : "#7a8aa8", fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.12em" }}>
            <span style={{ opacity: 0.5, marginRight: 4 }}>{t.num}</span>{t.label}
          </div>
        ))}
      </div>
      <div style={{ position: "absolute", top: 100, bottom: 0, left: 0, right: 0, padding: "0 16px", overflowY: "auto" }}>
        <MockBridgeContent />
      </div>
    </>
  );
}

/* ─────────────────────── MN2 — BOTTOM THUMB BAR ──────────────────────── */
function NavBottomBar() {
  return (
    <>
      <div style={{ position: "absolute", top: 36, left: 0, right: 0, padding: "20px 16px 6px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: "0.18em", color: "#7a8aa8", marginBottom: 4 }}>// 00 · BRIDGE</div>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", fontSize: 22, color: "#f3e8d3" }}>Home</div>
      </div>
      <div style={{ position: "absolute", top: 116, bottom: 96, left: 0, right: 0, padding: "12px 16px", overflowY: "auto" }}>
        <MockBridgeContent />
      </div>
      {/* Bottom thumb bar */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 86,
          background: "rgba(8, 14, 30, 0.92)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderTop: "1px solid rgba(255,255,255,0.08)",
          display: "flex",
          alignItems: "flex-start",
          paddingTop: 10,
          paddingBottom: 22,
        }}
      >
        {TABS.map((t) => {
          const sel = t.id === "home";
          return (
            <button
              key={t.id}
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                color: sel ? "#e5b374" : "#7a8aa8",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 9,
                letterSpacing: "0.12em",
                cursor: "pointer",
                minHeight: 54,
              }}
            >
              <span style={{ fontSize: 22, lineHeight: 1, color: sel ? "#e5b374" : "#a4b4cf" }}>{t.glyph}</span>
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>
    </>
  );
}

/* ─────────────────────── MN3 — RADIAL DOCK (FALSIFIER) ───────────────── */
function NavRadialDock() {
  const [open, setOpen] = useState(false);
  // Radial positions for 4 tabs (skip current "home")
  const others = TABS.filter((t) => t.id !== "home");
  const positions = [
    { tx: -90, ty: -10 },
    { tx: -65, ty: -65 },
    { tx: -10, ty: -90 },
    { tx: 50, ty: -75 },
  ];
  return (
    <>
      <div style={{ position: "absolute", top: 36, left: 0, right: 0, padding: "20px 16px 6px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: "0.18em", color: "#7a8aa8", marginBottom: 4 }}>// 00 · HOME</div>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", fontSize: 22, color: "#f3e8d3" }}>Bridge</div>
        </div>
        <button style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.16)", borderRadius: 999, color: "#a4b4cf", padding: "6px 12px", fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: "0.12em" }}>⚙ MENU</button>
      </div>
      <div style={{ position: "absolute", top: 116, bottom: 16, left: 0, right: 0, padding: "12px 16px", overflowY: "auto" }}>
        <MockBridgeContent />
      </div>

      {/* Radial dock — fanned-out tabs when open */}
      {open && (
        <>
          {/* Backdrop */}
          <div onClick={() => setOpen(false)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(6px)", zIndex: 50 }} />
          {others.map((t, i) => {
            const p = positions[i];
            return (
              <button
                key={t.id}
                onClick={() => setOpen(false)}
                style={{
                  position: "absolute",
                  bottom: 30,
                  right: 22,
                  width: 58,
                  height: 58,
                  borderRadius: "50%",
                  background: "rgba(229,179,116,0.95)",
                  color: "#1a1208",
                  border: "none",
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 9,
                  letterSpacing: "0.1em",
                  textAlign: "center",
                  cursor: "pointer",
                  zIndex: 51,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 2,
                  // @ts-expect-error custom CSS prop
                  "--mn-tx": `${p.tx}px`,
                  "--mn-ty": `${p.ty}px`,
                  animation: `mn-radial-burst 280ms cubic-bezier(0.34, 1.56, 0.64, 1) ${i * 50}ms both`,
                }}
              >
                <span style={{ fontSize: 18, lineHeight: 1 }}>{t.glyph}</span>
                <span style={{ fontSize: 8 }}>{t.label}</span>
              </button>
            );
          })}
        </>
      )}

      {/* Floating dock button */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          position: "absolute",
          bottom: 30,
          right: 22,
          width: 58,
          height: 58,
          borderRadius: "50%",
          background: open ? "#1a1f2e" : "linear-gradient(135deg, #fcd47a 0%, #e5a85a 100%)",
          color: open ? "#fcd47a" : "#1a1208",
          border: "1px solid rgba(0,0,0,0.3)",
          boxShadow: "0 8px 24px -4px rgba(0,0,0,0.5)",
          cursor: "pointer",
          zIndex: 52,
          fontSize: 26,
          fontFamily: "'Cormorant Garamond', serif",
          fontWeight: 500,
          animation: open ? "none" : "mn-pulse 2.4s ease-in-out infinite",
        }}
      >
        {open ? "×" : "⌂"}
      </button>
    </>
  );
}
