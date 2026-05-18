"use client";

/**
 * Environment section primitive — 4 variants.
 *
 * V1 atelier   Howl's library interior at golden hour (MJ asset backdrop)
 * V2 camp      Wayfarer campfire scene at dusk (MJ asset backdrop)
 * V3 guild     Adventurer's guild hall warm interior (MJ asset backdrop)
 * V4 void      FALSIFIER — no environment, just warm cream (tests whether the world matters)
 *
 * Renders a full-bleed background for the agent-office scene. Characters are
 * placed on top by the parent. Asset: assetUrl("environments", slug).
 */

import { useState, type ReactNode } from "react";
import type { EnvironmentVariant } from "./types";
import { assetUrl } from "./types";
import { tokens, fonts } from "../primitives";

export interface EnvironmentProps {
  variant: EnvironmentVariant;
  children?: ReactNode; // characters layered on top
}

export function Environment({ variant, children }: EnvironmentProps) {
  switch (variant) {
    case "atelier":
      return (
        <PaintedBackdrop
          slug="atelier"
          copy="The atelier hums."
          sub="Howl's library at golden hour."
        >
          {children}
        </PaintedBackdrop>
      );
    case "camp":
      return (
        <PaintedBackdrop
          slug="camp"
          copy="The camp is gathered."
          sub="Wayfarers around a warm fire."
        >
          {children}
        </PaintedBackdrop>
      );
    case "guild":
      return (
        <PaintedBackdrop
          slug="guild"
          copy="The guild hall is open."
          sub="The hearth burns; the board is posted."
        >
          {children}
        </PaintedBackdrop>
      );
    case "void":
      return <Void>{children}</Void>;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// V1/V2/V3 — Painted Backdrop
// Same component, different MJ slug + copy. CSS placeholder gradient if asset
// is missing (Phase 2.5 not yet run).

function PaintedBackdrop({
  slug,
  copy,
  sub,
  children,
}: {
  slug: string;
  copy: string;
  sub: string;
  children?: ReactNode;
}) {
  const src = assetUrl("environments", slug);
  const [imgLoaded, setImgLoaded] = useState(false);

  // Per-slug placeholder gradient — distinct so PG can tell variants apart
  // even before MJ assets land
  const placeholderGrad = (() => {
    switch (slug) {
      case "atelier":
        return `
          radial-gradient(ellipse 60% 50% at 20% 30%, rgba(232, 180, 168, 0.30), transparent 65%),
          radial-gradient(ellipse 60% 50% at 80% 30%, rgba(232, 180, 168, 0.20), transparent 65%),
          radial-gradient(ellipse 90% 60% at 50% 100%, rgba(214, 163, 103, 0.30), transparent 70%),
          linear-gradient(180deg, ${tokens.bgDeepBlue} 0%, #3D4F66 35%, #6B5640 70%, #8C6F4E 100%)
        `;
      case "camp":
        return `
          radial-gradient(circle at 50% 70%, rgba(255, 180, 100, 0.55) 0%, rgba(214, 163, 103, 0.15) 30%, transparent 60%),
          radial-gradient(ellipse 70% 30% at 50% 95%, rgba(184, 83, 111, 0.20), transparent 70%),
          linear-gradient(180deg, #1A2B4A 0%, #3D2F4A 40%, #6B4530 75%, #8C5028 100%)
        `;
      case "guild":
        return `
          radial-gradient(ellipse 30% 25% at 85% 55%, rgba(255, 130, 90, 0.40), transparent 60%),
          radial-gradient(ellipse 50% 40% at 30% 30%, rgba(255, 215, 150, 0.20), transparent 65%),
          linear-gradient(180deg, ${tokens.bgDeepBlue} 0%, #5C4530 50%, #8C6240 100%)
        `;
      default:
        return tokens.bgDeepBlue;
    }
  })();

  return (
    <section
      style={{
        position: "relative",
        width: "100%",
        minHeight: "min(640px, 70vh)",
        overflow: "hidden",
        background: imgLoaded ? "#000" : undefined,
      }}
    >
      {/* Background — MJ image OR CSS placeholder */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background: placeholderGrad,
          opacity: imgLoaded ? 0 : 1,
          transition: "opacity 600ms ease-out",
        }}
      />
      <img
        src={src}
        alt=""
        onLoad={() => setImgLoaded(true)}
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.display = "none";
        }}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          opacity: imgLoaded ? 1 : 0,
          transition: "opacity 600ms ease-out",
        }}
      />
      {/* Warm vignette overlay for depth */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at 50% 50%, transparent 40%, rgba(26, 21, 16, 0.45) 100%)",
          pointerEvents: "none",
        }}
      />

      {/* Header — literary copy register, top-left */}
      <header
        style={{
          position: "relative",
          padding: "32px 40px 16px",
          maxWidth: 640,
          zIndex: 2,
        }}
      >
        <div
          style={{
            fontFamily: fonts.mono,
            fontSize: 11,
            textTransform: "uppercase",
            letterSpacing: "0.18em",
            color: "rgba(255, 248, 231, 0.65)",
            marginBottom: 4,
          }}
        >
          {slug.toUpperCase()} · {imgLoaded ? "painted" : "placeholder"}
        </div>
        <h2
          style={{
            margin: 0,
            fontFamily: fonts.display,
            fontSize: 32,
            fontWeight: 500,
            color: "#FFF8E7",
            letterSpacing: "-0.015em",
            textShadow: "0 2px 8px rgba(0,0,0,0.4)",
          }}
        >
          {copy}
        </h2>
        <p
          style={{
            margin: "6px 0 0",
            fontSize: 14,
            color: "rgba(255, 248, 231, 0.72)",
            fontStyle: "italic",
            maxWidth: 460,
          }}
        >
          {sub}
        </p>
      </header>

      {/* Character placement layer */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          minHeight: 360,
        }}
      >
        {children}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// V4 — Void (FALSIFIER)
// No environment, no scene. Just warm cream with characters in space. Tests
// whether the world contributes anything or if PG actually values the
// characters-in-isolation Disco-Elysium-cabinet feeling more.

function Void({ children }: { children?: ReactNode }) {
  return (
    <section
      style={{
        position: "relative",
        width: "100%",
        minHeight: "min(640px, 70vh)",
        background: `
          radial-gradient(ellipse 70% 40% at 50% 50%, rgba(214, 163, 103, 0.06), transparent 65%),
          ${tokens.bgCream}
        `,
        overflow: "hidden",
      }}
    >
      <header
        style={{
          padding: "32px 40px 16px",
          maxWidth: 640,
        }}
      >
        <div
          style={{
            fontFamily: fonts.mono,
            fontSize: 11,
            textTransform: "uppercase",
            letterSpacing: "0.18em",
            color: tokens.muted,
            marginBottom: 4,
          }}
        >
          VOID · falsifier
        </div>
        <h2
          style={{
            margin: 0,
            fontFamily: fonts.display,
            fontSize: 32,
            fontWeight: 500,
            color: tokens.ink,
            letterSpacing: "-0.015em",
          }}
        >
          The agents, considered.
        </h2>
        <p
          style={{
            margin: "6px 0 0",
            fontSize: 14,
            color: tokens.muted,
            fontStyle: "italic",
            maxWidth: 460,
          }}
        >
          No room, no fire. Just the characters and what they're doing.
        </p>
      </header>
      <div style={{ position: "relative", minHeight: 360 }}>{children}</div>
    </section>
  );
}
