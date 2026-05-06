"use client";

import { useState } from "react";

type VariantId = "v1" | "v2" | "v3";

const VARIANTS: Record<
  VariantId,
  { name: string; tagline: string; src: string; tradeoffs: string }
> = {
  v1: {
    name: "Laputa Sunrise",
    tagline: "Typographic · Light · Brand-default",
    src: "/icon-variants/v1.png",
    tradeoffs:
      "Safest. Readable, on-brand, matches the Day palette. May feel forgettable in a Home Screen full of saturated icons.",
  },
  v2: {
    name: "Midnight Ember",
    tagline: "Typographic · Dark · JRPG warmth",
    src: "/icon-variants/v2.png",
    tradeoffs:
      "Strongest silhouette contrast. The glow + golden type does atmospheric work the others don't. Pops next to iOS-native icons.",
  },
  v3: {
    name: "Floating Island",
    tagline: "Pictographic · Falsifier",
    src: "/icon-variants/v3.png",
    tradeoffs:
      "Bets a shape beats a wordmark at thumbnail scale. Towers currently read as arrows — silhouette needs a re-pass to land. Built to surface this exact failure.",
  },
};

const ID_ORDER: VariantId[] = ["v1", "v2", "v3"];

// Realistic iOS render sizes (CSS pixels at @2x rendering).
// Home Screen ~60pt, App Library ~80pt, Search 50pt, Settings 29pt.
const RENDER_SIZES = [
  { px: 60, label: "Home Screen" },
  { px: 80, label: "App Library" },
  { px: 50, label: "Spotlight" },
  { px: 29, label: "Settings" },
  { px: 180, label: "Full asset" },
];

export default function IconLabPage() {
  const [active, setActive] = useState<VariantId>("v2");
  const variant = VARIANTS[active];

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0a0f1f",
        color: "#dfe9f3",
        fontFamily:
          "'Cormorant Garamond', 'EB Garamond', Georgia, serif",
        padding: "24px 18px 80px",
      }}
    >
      <header style={{ maxWidth: 880, margin: "0 auto 28px" }}>
        <p
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "#a4b4cf",
            marginBottom: 8,
          }}
        >
          // ICON LAB · PWA install asset
        </p>
        <h1
          style={{
            fontStyle: "italic",
            fontWeight: 500,
            fontSize: 34,
            lineHeight: 1.1,
            margin: 0,
            color: "#f3e8d3",
          }}
        >
          Pick the icon for your iPhone Home Screen.
        </h1>
        <p
          style={{
            marginTop: 10,
            fontSize: 15,
            lineHeight: 1.55,
            color: "#c4d0e2",
            maxWidth: 600,
          }}
        >
          Tap a variant. Compare it at actual install sizes. The bottom row is
          how it&rsquo;ll look in your Home Screen, App Library, Spotlight,
          and Settings — same scale as iOS will render it.
        </p>
      </header>

      {/* Variant selector */}
      <div
        style={{
          maxWidth: 880,
          margin: "0 auto 32px",
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 10,
        }}
      >
        {ID_ORDER.map((id) => {
          const v = VARIANTS[id];
          const selected = active === id;
          return (
            <button
              key={id}
              onClick={() => setActive(id)}
              style={{
                background: selected ? "rgba(255, 220, 160, 0.12)" : "rgba(255,255,255,0.03)",
                border: selected
                  ? "1px solid rgba(229, 179, 116, 0.7)"
                  : "1px solid rgba(255,255,255,0.08)",
                color: selected ? "#f3e8d3" : "#a4b4cf",
                padding: "14px 12px",
                borderRadius: 12,
                fontFamily: "inherit",
                fontStyle: "italic",
                fontSize: 18,
                fontWeight: 500,
                textAlign: "left",
                cursor: "pointer",
                transition: "all 200ms ease-out",
              }}
            >
              <div
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontStyle: "normal",
                  fontSize: 10,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color: selected ? "#e5b374" : "#7a8aa8",
                  marginBottom: 4,
                }}
              >
                {id.toUpperCase()}
              </div>
              {v.name}
            </button>
          );
        })}
      </div>

      {/* Hero — selected variant at large scale */}
      <section
        style={{
          maxWidth: 880,
          margin: "0 auto 36px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 18,
        }}
      >
        <div
          style={{
            width: 280,
            height: 280,
            borderRadius: 64, // iOS-style continuous corner ~22% radius
            overflow: "hidden",
            boxShadow:
              "0 30px 80px -20px rgba(0,0,0,0.5), 0 8px 24px -8px rgba(0,0,0,0.4)",
          }}
        >
          <img
            src={variant.src}
            alt={variant.name}
            style={{ width: "100%", height: "100%", display: "block" }}
          />
        </div>
        <div style={{ textAlign: "center", maxWidth: 520 }}>
          <h2
            style={{
              fontStyle: "italic",
              fontWeight: 500,
              fontSize: 26,
              margin: 0,
              color: "#f3e8d3",
            }}
          >
            {variant.name}
          </h2>
          <p
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "#e5b374",
              marginTop: 6,
              marginBottom: 14,
            }}
          >
            {variant.tagline}
          </p>
          <p
            style={{
              fontSize: 14,
              lineHeight: 1.6,
              color: "#c4d0e2",
              margin: 0,
            }}
          >
            {variant.tradeoffs}
          </p>
        </div>
      </section>

      {/* Side-by-side at install sizes */}
      <section style={{ maxWidth: 880, margin: "0 auto 36px" }}>
        <h3
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "#a4b4cf",
            marginBottom: 16,
            fontWeight: 400,
          }}
        >
          // ALL THREE · INSTALL SIZES
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18 }}>
          {ID_ORDER.map((id) => {
            const v = VARIANTS[id];
            return (
              <div
                key={id}
                onClick={() => setActive(id)}
                style={{
                  cursor: "pointer",
                  background: active === id ? "rgba(229, 179, 116, 0.06)" : "transparent",
                  borderRadius: 14,
                  padding: 14,
                  border:
                    active === id
                      ? "1px solid rgba(229, 179, 116, 0.4)"
                      : "1px solid rgba(255,255,255,0.06)",
                  transition: "all 200ms ease-out",
                }}
              >
                <p
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 10,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: "#7a8aa8",
                    margin: "0 0 10px",
                  }}
                >
                  {id} · {v.name}
                </p>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "flex-end",
                    gap: 12,
                    paddingBottom: 6,
                  }}
                >
                  {RENDER_SIZES.map((s) => (
                    <div
                      key={s.px}
                      style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}
                    >
                      <div
                        style={{
                          width: s.px,
                          height: s.px,
                          borderRadius: Math.round(s.px * 0.22),
                          overflow: "hidden",
                          boxShadow: "0 2px 8px -2px rgba(0,0,0,0.5)",
                        }}
                      >
                        <img
                          src={v.src}
                          alt=""
                          style={{ width: "100%", height: "100%", display: "block" }}
                        />
                      </div>
                      <span
                        style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: 9,
                          color: "#7a8aa8",
                          letterSpacing: "0.06em",
                        }}
                      >
                        {s.px}px · {s.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* iOS Home Screen mock — context preview */}
      <section style={{ maxWidth: 880, margin: "0 auto" }}>
        <h3
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "#a4b4cf",
            marginBottom: 16,
            fontWeight: 400,
          }}
        >
          // HOME SCREEN PREVIEW · {variant.name}
        </h3>
        <div
          style={{
            background:
              "linear-gradient(160deg, #1d1f3d 0%, #2a2050 40%, #5b3a4e 100%)",
            borderRadius: 28,
            padding: "28px 26px",
            boxShadow: "0 24px 64px -20px rgba(0,0,0,0.5)",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 18,
              marginBottom: 8,
            }}
          >
            {[
              { label: "Messages", color: "#5cd06b" },
              { label: "Mail", color: "#3a8cff" },
              { label: "Calendar", color: "#ffffff", text: "26", textColor: "#ff3b30" },
              { label: "Notes", color: "#fff3a8" },
              { label: "Photos", color: "#ffffff" },
              { label: "Maps", color: "#dfe9f3" },
              { label: "PG OS", icon: variant.src },
              { label: "Settings", color: "#7a8aa8" },
            ].map((app, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <div
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: 14,
                    overflow: "hidden",
                    background: app.color || "#222",
                    color: app.textColor,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "'Inter', system-ui, sans-serif",
                    fontWeight: 600,
                    fontSize: 24,
                    boxShadow: "0 6px 14px -4px rgba(0,0,0,0.5)",
                  }}
                >
                  {app.icon ? (
                    <img
                      src={app.icon}
                      alt=""
                      style={{ width: "100%", height: "100%", display: "block" }}
                    />
                  ) : (
                    app.text || ""
                  )}
                </div>
                <span
                  style={{
                    fontFamily: "system-ui, sans-serif",
                    fontStyle: "normal",
                    fontSize: 11,
                    color: "white",
                    fontWeight: 500,
                  }}
                >
                  {app.label}
                </span>
              </div>
            ))}
          </div>
        </div>
        <p
          style={{
            fontSize: 12,
            color: "#7a8aa8",
            marginTop: 14,
            fontStyle: "italic",
          }}
        >
          Selected variant shown next to default iOS apps. iOS auto-rounds
          corners; the assets are full-bleed so the mask doesn&rsquo;t crop
          anything important.
        </p>
      </section>
    </main>
  );
}
