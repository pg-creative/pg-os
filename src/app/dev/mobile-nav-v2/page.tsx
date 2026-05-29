"use client";
/**
 * Mobile Nav v2 Lab — live-switchable bake-off of 4 paradigms.
 *
 * Open at /dev/mobile-nav-v2?v=1..4 (defaults to 1). Each variant is a
 * self-contained component that mounts FIXED-position chrome (drawer / sheet /
 * rail / bottom bar) and uses the same useActiveTab TABS + anchor-tab pattern.
 * The dummy scrollable content below is just so we can test scroll behavior
 * underneath the chrome.
 *
 * Pick one, then page.tsx mounts that component as the production mobile nav.
 */
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { MobileNavV1Foxfire } from "../../_components/mobile/MobileNavV1Foxfire";
import { MobileNavV2BottomSheet } from "../../_components/mobile/MobileNavV2BottomSheet";
import { MobileNavV3ScrollRail } from "../../_components/mobile/MobileNavV3ScrollRail";
import { MobileNavV4PrimaryMore } from "../../_components/mobile/MobileNavV4PrimaryMore";

const VARIANTS = [
  { id: "1", label: "V1 · Foxfire Drawer", Component: MobileNavV1Foxfire },
  {
    id: "2",
    label: "V2 · Lantern Bottom Sheet",
    Component: MobileNavV2BottomSheet,
  },
  {
    id: "3",
    label: "V3 · Painted Scroll Rail",
    Component: MobileNavV3ScrollRail,
  },
  {
    id: "4",
    label: "V4 · 5 Primary + MORE",
    Component: MobileNavV4PrimaryMore,
  },
] as const;

function LabBody() {
  const sp = useSearchParams();
  const v = sp.get("v") ?? "1";
  const active = VARIANTS.find((x) => x.id === v) ?? VARIANTS[0];
  const Variant = active.Component;
  return (
    <main
      style={{
        minHeight: "200vh",
        padding: "24px 18px 120px",
        background: "linear-gradient(180deg, #13110D 0%, #1a1610 100%)",
        color: "#EFE6D4",
        fontFamily: "var(--body), system-ui, sans-serif",
      }}
    >
      <h1
        style={{
          fontFamily: "var(--serif), Georgia, serif",
          fontSize: 28,
          margin: "0 0 6px",
        }}
      >
        Mobile Nav v2 — Bake-off
      </h1>
      <p style={{ color: "#9C8B70", marginBottom: 18, fontSize: 14 }}>
        Active: <strong style={{ color: "#D6A367" }}>{active.label}</strong>.
        Pick a variant below. Designed to be tested at 390x844 (iPhone).
      </p>
      <div
        style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 24 }}
      >
        {VARIANTS.map((variant) => (
          <a
            key={variant.id}
            href={`?v=${variant.id}`}
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              border:
                variant.id === active.id
                  ? "1px solid #D6A367"
                  : "1px solid rgba(214,163,103,.28)",
              background:
                variant.id === active.id
                  ? "rgba(214,163,103,.16)"
                  : "transparent",
              color: variant.id === active.id ? "#D6A367" : "#9C8B70",
              fontSize: 13,
              textDecoration: "none",
              fontFamily: "ui-monospace, monospace",
            }}
          >
            {variant.label}
          </a>
        ))}
      </div>
      <DummyContent />
      <Variant />
    </main>
  );
}

function DummyContent() {
  const rows = Array.from({ length: 18 }, (_, i) => i + 1);
  return (
    <div>
      {rows.map((i) => (
        <section
          key={i}
          style={{
            marginBottom: 14,
            padding: 16,
            background: "rgba(214,163,103,.04)",
            border: "1px solid rgba(214,163,103,.10)",
            borderRadius: 10,
          }}
        >
          <h2
            style={{
              margin: "0 0 6px",
              fontSize: 14,
              fontFamily: "ui-monospace, monospace",
              color: "#D6A367",
              letterSpacing: ".14em",
            }}
          >
            BLOCK {String(i).padStart(2, "0")}
          </h2>
          <p
            style={{
              margin: 0,
              color: "#9C8B70",
              fontSize: 13,
              lineHeight: 1.5,
            }}
          >
            Lorem dummy content so we can test scroll, tap targets, and the
            chrome overlaying real-feeling page material. Scroll down to confirm
            the chrome stays fixed and the page scrolls underneath it. Tap a tab
            in the active variant to confirm it navigates via the anchor.
          </p>
        </section>
      ))}
    </div>
  );
}

export default function MobileNavV2LabPage() {
  return (
    <Suspense fallback={null}>
      <LabBody />
    </Suspense>
  );
}
