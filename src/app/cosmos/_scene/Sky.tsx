"use client";

/**
 * The sky, by the hour, over a biome that keeps its own register.
 *
 * Round one pinned every world to twilight (the Critic's D9 amendment, adopted
 * for that round only). Round two lifts it: a world whose manifest says
 * `phase: clock` follows `phaseForHour` from the OS's own theme, so the cosmos
 * and the dashboard are never in different weather at the same minute. A world
 * that pins its phase keeps it: the hall is a twilight room at lunchtime because
 * the lantern is lit inside it, and the depths are midnight forever.
 *
 * The register owns the hue family and the hour owns the value. That separation
 * is what makes five biomes under one sky read as one world rather than five
 * screenshots: riso stays cream at every hour, it just gets a lower sun.
 *
 * A drei ScreenQuad renders nothing here, which is the most common way this
 * exact shader ships broken: a plane of [2,2] with a vertex shader writing clip
 * coordinates directly is the fix, and it is round one's, kept.
 */

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { PHASES, phaseForHour } from "../../_components/emaki/theme";
import type { Phase as WorldPhase } from "./contract";
import type { Palette } from "./palette";
import { NOISE, SCREEN_VERT } from "./glsl";

const FRAG = /* glsl */ `
  precision highp float;
  varying vec2 vUv;

  uniform float uTime;
  uniform vec3  uTop;
  uniform vec3  uMid;
  uniform vec3  uHorizon;
  uniform vec3  uGlow;
  uniform float uGlowY;
  uniform float uGlowX;
  uniform float uBanding;
  uniform float uMistDensity;
  uniform float uMoon;

  ${NOISE}

  vec3 posterize(vec3 c, float steps) {
    float l = dot(c, vec3(0.299, 0.587, 0.114));
    float q = floor(l * steps + 0.5) / steps;
    return c * (q / max(l, 0.0001));
  }

  void main() {
    float y = vUv.y;

    vec3 col = mix(uHorizon, uMid, smoothstep(0.0, 0.58, y));
    col = mix(col, uTop, smoothstep(0.46, 1.0, y));

    // One low sun where the register puts it. Never a lens flare.
    float d = distance(vec2(vUv.x, y), vec2(uGlowX, uGlowY));
    col += uGlow * pow(max(0.0, 1.0 - d * 1.5), 3.2) * 0.6;

    // The depths get one red moon and nothing else in the sky.
    if (uMoon > 0.5) {
      float md = distance(vec2(vUv.x, y) * vec2(1.0, 1.0), vec2(0.70, 0.80));
      col = mix(col, uGlow, smoothstep(0.062, 0.052, md));
      col += uGlow * pow(max(0.0, 1.0 - md * 5.0), 3.0) * 0.35;
    }

    // Slow cloud banding, the only motion up there. Weather thickens it.
    vec2 q = vec2(vUv.x * 2.6 + uTime * 0.005, y * 5.0);
    col += (fbm4(q) - 0.5) * 0.07 * (0.55 + uMistDensity);

    // Riso: quantize to ink steps and kill the gradient entirely.
    if (uBanding > 0.5) col = posterize(col, 6.0);

    gl_FragColor = vec4(col, 1.0);
  }
`;

export interface SkyLook {
  top: string;
  mid: string;
  horizon: string;
  glow: string;
  glowY: number;
  glowX: number;
  moon: boolean;
}

/**
 * The register's hues, moved by the hour. `theme` is PG's light/dark toggle: in
 * light mode the sky never goes below a twilight value, so the world is legible
 * on cream paper at three in the morning; in dark mode the hour runs to its full
 * depth. It shifts the value, never the hue: the biome stays itself.
 */
export function skyFor(
  p: Palette,
  phase: WorldPhase,
  hour: number,
  theme: "light" | "dark",
): SkyLook {
  const resolved = phase === "clock" ? phaseForHour(hour) : phase;
  const base: SkyLook = {
    top: p.skyTop,
    mid: p.skyMid,
    horizon: p.skyHorizon,
    glow: p.skyGlow,
    glowY: 0.28,
    glowX: 0.62,
    moon: false,
  };

  if (resolved === "midnight" || resolved === "night") {
    return {
      ...base,
      top: shade(p.skyTop, theme === "light" ? -0.05 : -0.3),
      mid: shade(p.skyMid, theme === "light" ? -0.05 : -0.34),
      horizon: shade(p.skyHorizon, theme === "light" ? -0.16 : -0.42),
      glow: PHASES.night.foxfire,
      glowY: 0.66,
      moon: p.banding < 0.5 && p.mistDensity > 0.6,
    };
  }
  if (resolved === "day") {
    return {
      ...base,
      top: shade(p.skyTop, p.banding > 0.5 ? 0 : 0.5),
      mid: shade(p.skyMid, p.banding > 0.5 ? 0 : 0.44),
      horizon: shade(p.skyHorizon, p.banding > 0.5 ? 0.04 : 0.3),
      glow: p.skyGlow,
      glowY: 0.2,
    };
  }
  // Twilight is the authored value: every register was painted at dusk first.
  return base;
}

/** Lighten or darken a hex toward white or black. */
function shade(hex: string, t: number): string {
  const n = parseInt(hex.slice(1), 16);
  const to = t >= 0 ? 255 : 0;
  const k = Math.abs(t);
  const r = Math.round(((n >> 16) & 255) + (to - ((n >> 16) & 255)) * k);
  const g = Math.round(((n >> 8) & 255) + (to - ((n >> 8) & 255)) * k);
  const b = Math.round((n & 255) + (to - (n & 255)) * k);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

export function Sky({
  look,
  banding,
  mistDensity,
}: {
  look: SkyLook;
  banding: number;
  mistDensity: number;
}) {
  const mat = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uTop: { value: new THREE.Color(look.top) },
      uMid: { value: new THREE.Color(look.mid) },
      uHorizon: { value: new THREE.Color(look.horizon) },
      uGlow: { value: new THREE.Color(look.glow) },
      uGlowY: { value: look.glowY },
      uGlowX: { value: look.glowX },
      uBanding: { value: banding },
      uMistDensity: { value: mistDensity },
      uMoon: { value: look.moon ? 1 : 0 },
    }),
    // Rebuilt on every look change: five uniform objects is cheaper than a
    // per-frame branch, and the look only changes when the biome does.
    [look, banding, mistDensity],
  );

  useFrame((_, dt) => {
    if (mat.current) mat.current.uniforms.uTime.value += dt;
  });

  return (
    <mesh frustumCulled={false} renderOrder={-100}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={mat}
        vertexShader={SCREEN_VERT}
        fragmentShader={FRAG}
        uniforms={uniforms}
        depthWrite={false}
        depthTest={false}
      />
    </mesh>
  );
}
