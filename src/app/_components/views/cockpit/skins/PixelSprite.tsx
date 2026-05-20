"use client";

/**
 * PixelSprite — plays a PixelLab animation frame-set for a sprite, cycling
 * frames per Marvis state. talk frames when speaking/thinking, idle otherwise.
 * Falls back to the static base sprite if no frames generated yet.
 */

import { useEffect, useState } from "react";

export interface SpriteManifest {
  slug: string;
  base: string | null;
  actions: Record<string, string[]>;
}

export function PixelSprite({
  manifest,
  state,
  size = 96,
}: {
  manifest: SpriteManifest;
  state: string;
  size?: number;
}) {
  const action = state === "speaking" || state === "thinking" ? "talk" : "idle";
  const frames = manifest.actions[action]?.length
    ? manifest.actions[action]
    : manifest.base
      ? [manifest.base]
      : [];
  const [i, setI] = useState(0);

  useEffect(() => {
    setI(0);
    if (frames.length < 2) return;
    const iv = setInterval(() => setI((p) => (p + 1) % frames.length), 140);
    return () => clearInterval(iv);
  }, [action, manifest.slug, frames.length]);

  const src = frames[i] || manifest.base || "";
  if (!src) return null;
  return (
    <img
      src={src}
      width={size}
      height={size}
      alt={manifest.slug}
      style={{
        imageRendering: "pixelated",
        width: size,
        height: size,
        objectFit: "contain",
      }}
    />
  );
}
