"use client";

/**
 * Character section primitive — 4 variants, same agent data.
 *
 * V1 mj-portrait    Howl's painted portrait (MJ asset, CSS placeholder until Phase 2.5 lands)
 * V2 hd2d-sprite    Octopath HD-2D pixel sprite, CSS-art only
 * V3 thought-card   Disco Elysium bookplate-framed painted card
 * V4 glow-orb       FALSIFIER — abstract glowing orb, no figure
 *
 * Each variant takes the same AgentSnapshot. PG picks the winner per the
 * design-lab Phase 3 methodology. Asset resolution: assetUrl("characters", slug).
 */

import { useState } from "react";
import type { AgentSnapshot, CharacterVariant } from "./types";
import { assetUrl, CLASS_TO_PORTRAIT_SLUG } from "./types";
import {
  tokens,
  fonts,
  deriveClass,
  CLASS_PORTRAIT_GRADIENT,
  STATUS_GLOW,
  STATUS_TINT,
} from "../primitives";

export interface CharacterProps {
  agent: AgentSnapshot;
  variant: CharacterVariant;
  size?: number; // base diameter / longest dimension in px
}

export function Character({ agent, variant, size = 120 }: CharacterProps) {
  switch (variant) {
    case "mj-portrait":
      return <MjPortrait agent={agent} size={size} />;
    case "hd2d-sprite":
      return <Hd2dSprite agent={agent} size={size} />;
    case "thought-card":
      return <ThoughtCard agent={agent} size={size} />;
    case "glow-orb":
      return <GlowOrb agent={agent} size={size} />;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// V1 — MJ Portrait
// Painted character art from Phase 2.5. Falls back to a soft CSS placeholder
// (gradient circle in cream-and-amber frame) when the asset is missing.

function MjPortrait({ agent, size }: { agent: AgentSnapshot; size: number }) {
  const cls = deriveClass(agent);
  const slug = CLASS_TO_PORTRAIT_SLUG[cls];
  const src = assetUrl("characters", slug);
  const [imgLoaded, setImgLoaded] = useState(false);
  const glow = STATUS_GLOW[agent.status];

  return (
    <figure
      style={{
        margin: 0,
        position: "relative",
        width: size,
        height: size,
        borderRadius: size * 0.18,
        overflow: "hidden",
        border: `2px solid ${tokens.amber}`,
        background: imgLoaded ? "transparent" : CLASS_PORTRAIT_GRADIENT[cls],
        boxShadow: `0 0 ${size * 0.35}px ${glow}, 0 2px 8px rgba(42, 36, 28, 0.18)`,
        transition: "box-shadow 300ms ease-out",
      }}
      title={`${cls} · ${agent.projectName}`}
    >
      <img
        src={src}
        alt=""
        onLoad={() => setImgLoaded(true)}
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.display = "none";
        }}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: "block",
        }}
      />
      {!imgLoaded && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#FFF8E7",
            fontFamily: fonts.display,
            fontSize: size * 0.35,
            fontWeight: 500,
            textShadow: "0 2px 4px rgba(0,0,0,0.25)",
          }}
        >
          {(agent.projectName || "?").slice(0, 1).toUpperCase()}
        </div>
      )}
      {/* Warm amber bottom-glow strip — golden hour cue */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: "30%",
          background:
            "linear-gradient(180deg, transparent 0%, rgba(214, 163, 103, 0.35) 100%)",
          pointerEvents: "none",
        }}
      />
    </figure>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// V2 — HD-2D Pixel Sprite
// Octopath-style: crisp dithered silhouette + warm cel-shaded fill.
// Pure CSS — no asset dependency. Pixelated rendering, JRPG vibe.

function Hd2dSprite({ agent, size }: { agent: AgentSnapshot; size: number }) {
  const cls = deriveClass(agent);
  const tint = STATUS_TINT[agent.status];
  const slug = CLASS_TO_PORTRAIT_SLUG[cls];
  const pixelSrc = assetUrl("characters", `pixel-${slug}`);
  const [pixelLoaded, setPixelLoaded] = useState(false);
  // Block-character silhouette via radial-gradients on a square canvas
  return (
    <div
      style={{
        width: size,
        height: size,
        position: "relative",
        imageRendering: "pixelated",
        background: "transparent",
      }}
      title={`${cls} · ${agent.projectName}`}
    >
      {/* Real pixel sprite asset (Phase 2.5 pixel-lane output). Loads when
          pixel-<slug>.png exists; otherwise the CSS art below shows. */}
      <img
        src={pixelSrc}
        alt=""
        onLoad={() => setPixelLoaded(true)}
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.display = "none";
        }}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "contain",
          imageRendering: "pixelated",
          filter: agent.status === "idle" ? "saturate(0.7)" : "saturate(1.1)",
          transition: "filter 200ms ease-out",
          zIndex: 2,
        }}
      />
      {/* Sprite body — stepped pixel-art look via stacked CSS layers (fallback) */}
      <div
        style={{
          position: "absolute",
          inset: "20% 25% 10% 25%",
          background: `repeating-linear-gradient(
            45deg,
            ${tint} 0px,
            ${tint} 2px,
            ${tokens.ink} 2px,
            ${tokens.ink} 3px
          )`,
          // Approximate a 16-bit JRPG silhouette via clip-path stepped polygon
          clipPath:
            "polygon(35% 0%, 65% 0%, 65% 18%, 80% 22%, 80% 50%, 70% 60%, 70% 95%, 30% 95%, 30% 60%, 20% 50%, 20% 22%, 35% 18%)",
          boxShadow: `inset 0 -${size * 0.04}px 0 rgba(0,0,0,0.25)`,
          transition: "background 200ms ease-out",
        }}
      />
      {/* Head highlight — golden hour catch-light */}
      <div
        style={{
          position: "absolute",
          left: "42%",
          top: "8%",
          width: "16%",
          height: "10%",
          background: tokens.amber,
          opacity: agent.status === "active" ? 1 : 0.5,
          boxShadow: `0 0 ${size * 0.3}px ${tokens.glowAmber}`,
          transition: "opacity 200ms ease-out",
        }}
      />
      {/* Floor shadow — ellipse beneath sprite */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          left: "20%",
          right: "20%",
          bottom: "5%",
          height: "6%",
          background:
            "radial-gradient(ellipse at center, rgba(42, 36, 28, 0.45) 0%, transparent 70%)",
        }}
      />
      {/* Status corner pixel — top-right glyph */}
      <div
        style={{
          position: "absolute",
          right: 4,
          top: 4,
          width: 8,
          height: 8,
          background: tint,
          boxShadow: `0 0 6px ${tint}`,
        }}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// V3 — Thought Card
// Disco Elysium thought-cabinet bookplate. Tall portrait frame, painted feel,
// corner brackets, character occupies upper 60%.

function ThoughtCard({ agent, size }: { agent: AgentSnapshot; size: number }) {
  const cls = deriveClass(agent);
  const slug = CLASS_TO_PORTRAIT_SLUG[cls];
  const src = assetUrl("characters", slug);
  const [imgLoaded, setImgLoaded] = useState(false);
  const w = size;
  const h = Math.round(size * 1.35); // taller than wide — portrait orientation
  return (
    <article
      style={{
        position: "relative",
        width: w,
        height: h,
        background: "#F4ECDA",
        border: `1.5px solid ${tokens.rule}`,
        padding: 8,
        boxShadow:
          "0 1px 0 rgba(42, 36, 28, 0.06), 0 6px 18px rgba(42, 36, 28, 0.12), inset 0 0 30px rgba(180, 130, 80, 0.06)",
        fontFamily: fonts.display,
      }}
      title={`${cls} · ${agent.projectName}`}
    >
      {/* Inner painted plate */}
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "62%",
          background: imgLoaded ? "transparent" : CLASS_PORTRAIT_GRADIENT[cls],
          overflow: "hidden",
          border: `1px solid ${tokens.muted}`,
        }}
      >
        <img
          src={src}
          alt=""
          onLoad={() => setImgLoaded(true)}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            filter: "sepia(0.15) contrast(1.05)",
          }}
        />
        {!imgLoaded && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#FFF8E7",
              fontFamily: fonts.display,
              fontSize: w * 0.4,
              fontWeight: 500,
              textShadow: "0 2px 4px rgba(0,0,0,0.25)",
            }}
          >
            {(agent.projectName || "?").slice(0, 1).toUpperCase()}
          </div>
        )}
      </div>
      {/* Caption */}
      <div
        style={{
          position: "absolute",
          left: 8,
          right: 8,
          bottom: 28,
          fontFamily: fonts.display,
          fontSize: w * 0.13,
          color: tokens.ink,
          textAlign: "center",
          letterSpacing: "-0.005em",
          fontWeight: 500,
          lineHeight: 1.1,
        }}
      >
        {agent.projectName}
      </div>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 8,
          textAlign: "center",
          fontFamily: fonts.mono,
          fontSize: 9,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: tokens.muted,
        }}
      >
        — the {cls} —
      </div>
      {/* Corner brackets — bookplate cue */}
      {(["tl", "tr", "bl", "br"] as const).map((corner) => (
        <span
          key={corner}
          aria-hidden
          style={{
            position: "absolute",
            width: 10,
            height: 10,
            borderColor: tokens.muted,
            borderStyle: "solid",
            ...(corner === "tl" && {
              top: 3,
              left: 3,
              borderWidth: "1.5px 0 0 1.5px",
            }),
            ...(corner === "tr" && {
              top: 3,
              right: 3,
              borderWidth: "1.5px 1.5px 0 0",
            }),
            ...(corner === "bl" && {
              bottom: 3,
              left: 3,
              borderWidth: "0 0 1.5px 1.5px",
            }),
            ...(corner === "br" && {
              bottom: 3,
              right: 3,
              borderWidth: "0 1.5px 1.5px 0",
            }),
          }}
        />
      ))}
    </article>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// V4 — Glow Orb (FALSIFIER)
// No figure at all. Soft glowing orb that pulses with status. Tests whether
// abstract beats figurative for monitoring use cases. Built honestly, not as
// a strawman — a clean, calm, ambient star.

function GlowOrb({ agent, size }: { agent: AgentSnapshot; size: number }) {
  const tint = STATUS_TINT[agent.status];
  const glow = STATUS_GLOW[agent.status];
  const breathing = agent.status === "active" || agent.status === "permission";

  return (
    <div
      style={{
        width: size,
        height: size,
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      title={agent.projectName}
    >
      <div
        style={{
          width: size * 0.6,
          height: size * 0.6,
          borderRadius: "50%",
          background: `radial-gradient(circle at 35% 35%, ${tokens.bgCream} 0%, ${tint} 50%, ${tokens.ink} 100%)`,
          boxShadow: `0 0 ${size * 0.5}px ${glow}, 0 0 ${size * 0.9}px ${glow}`,
          animation: breathing
            ? "agent-orb-breathe 3.2s ease-in-out infinite"
            : undefined,
          transition: "box-shadow 300ms ease-out",
        }}
      />
      <style>{`
        @keyframes agent-orb-breathe {
          0%, 100% { transform: scale(1); opacity: 0.85; }
          50% { transform: scale(1.08); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
