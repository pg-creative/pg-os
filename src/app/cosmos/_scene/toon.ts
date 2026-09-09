"use client";

/**
 * Toon materials, and the mist that lives inside every one of them.
 *
 * EXTENDS: round one's `_scene/glsl.ts` (the fbm chunk taken verbatim from
 * `forge/library/shaders/flashpoint-shaders/glsl.ts`) and `emaki/theme.ts`
 * PHASES for every colour on screen. Nothing here invents a hex.
 *
 * Two decisions worth naming.
 *
 * ONE MATERIAL PER COLOUR, cached. A world of procedural props is a world of
 * hundreds of small meshes; giving each its own material would compile a shader
 * program per prop and blow the draw-call budget. Every prop asks the cache for
 * a colour and gets the same `MeshToonMaterial` back, so the scene runs on about
 * fifteen programs no matter how many pines stand in the grove.
 *
 * MIST IS INSIDE THE MATERIAL, not a fullscreen pass. Round one's per-object
 * dissolve is kept and generalised: `onBeforeCompile` injects one function that
 * reads world position and mixes the lit colour toward the register's mist. That
 * makes the lantern real. Everything inside its radius de-mists, everything at a
 * biome's edge thickens, and a fullscreen fog could do neither because it does
 * not know where anything is.
 *
 * All materials share ONE uniform record, by reference, so the scene updates the
 * lantern once per frame and every prop in the world sees it.
 */

import * as THREE from "three";
import { NOISE } from "./glsl";

// ── The shared uniform record ────────────────────────────────────────────────

export interface MistUniforms {
  uTime: { value: number };
  /** The lantern, in world space. Attention is the light source. */
  uLantern: { value: THREE.Vector3 };
  uLanternR: { value: number };
  uMistColor: { value: THREE.Color };
  uMistDensity: { value: number };
  uMistScale: { value: number };
  uMistSpeed: { value: number };
  /** Where the eye is. Distance from it thickens the air, which is the diorama. */
  uFocus: { value: THREE.Vector3 };
  /** Raised in light mode so nothing is ever a silhouette on cream paper. */
  uFloor: { value: number };
}

export const MIST: MistUniforms = {
  uTime: { value: 0 },
  uLantern: { value: new THREE.Vector3(0, 1.2, 0) },
  uLanternR: { value: 6 },
  uMistColor: { value: new THREE.Color("#C8A8D8") },
  uMistDensity: { value: 0.5 },
  uMistScale: { value: 2.4 },
  uMistSpeed: { value: 0.035 },
  uFocus: { value: new THREE.Vector3(0, 0, 0) },
  uFloor: { value: 0.0 },
};

/** Every border band the walker can be lost in, as flat rectangles to soften. */
export const BORDERS = {
  /** xz half-extents of each world, packed as [cx, cz, hw, hd] rows. */
  rects: [] as number[][],
};

// ── The three-step ramp ──────────────────────────────────────────────────────

let gradient: THREE.DataTexture | null = null;

/**
 * Three steps, not five. A cel-shaded world reads as painted at three and as a
 * cheap gradient at more; the OS's own character art is three-tone and this
 * keeps the cosmos on the same hand.
 */
export function gradientMap(): THREE.DataTexture {
  if (gradient) return gradient;
  const data = new Uint8Array([88, 152, 232]);
  const tex = new THREE.DataTexture(data, 3, 1, THREE.RedFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  gradient = tex;
  return tex;
}

// ── The injection ────────────────────────────────────────────────────────────

const MIST_FN = /* glsl */ `
  uniform float uTime;
  uniform vec3  uLantern;
  uniform float uLanternR;
  uniform vec3  uMistColor;
  uniform float uMistDensity;
  uniform float uMistScale;
  uniform float uMistSpeed;
  uniform vec3  uFocus;
  uniform float uFloor;
  uniform float uUntouched;
  varying vec3 vWorldPosC;

  ${NOISE}

  float cosmosMist(vec3 wp) {
    vec2 q = wp.xz * (uMistScale * 0.055);
    q.x += uTime * uMistSpeed;
    q.y += (vnoise(q * 1.6) - 0.5) * 0.6;
    float n = fbm4(q);

    // The lantern. Inside its radius the air clears; that is the whole rule of
    // attention, and it is one smoothstep.
    float lant = distance(wp, uLantern);
    float lit = 1.0 - smoothstep(uLanternR * 0.30, uLanternR, lant);

    // Distance from the eye. This is the diorama: the near table sharp, the far
    // country soft, without a depth-of-field pass having to carry the colour.
    float far = smoothstep(16.0, 46.0, distance(wp.xz, uFocus.xz));

    float veil = uMistDensity * (0.22 + 0.78 * smoothstep(0.28, 0.94, n));
    veil = veil * (0.30 + 0.70 * far) + uUntouched * 0.34 * (1.0 - far * 0.4);
    veil *= (1.0 - lit * 0.88);
    return clamp(veil * (1.0 - uFloor * 0.58), 0.0, 0.86);
  }
`;

export interface ToonOptions {
  /** 0 touched today, 1 never touched. Pages carry it; scenery leaves it at 0. */
  untouched?: number;
  transparent?: boolean;
  opacity?: number;
  /** Skip the mist injection: the hero's own sprite is never weather. */
  noMist?: boolean;
  emissive?: string;
  emissiveIntensity?: number;
  side?: THREE.Side;
}

const cache = new Map<string, THREE.MeshToonMaterial>();

/**
 * A cached toon material with mist compiled in. Pass `untouched` only for a
 * material that must differ per object; every value spawns one more program.
 */
export function toon(color: string, opts: ToonOptions = {}): THREE.MeshToonMaterial {
  const key = [
    color,
    opts.untouched ?? 0,
    opts.transparent ? 1 : 0,
    opts.opacity ?? 1,
    opts.noMist ? 1 : 0,
    opts.emissive ?? "",
    opts.emissiveIntensity ?? 0,
    opts.side ?? 0,
  ].join("|");
  const hit = cache.get(key);
  if (hit) return hit;

  const mat = new THREE.MeshToonMaterial({
    color: new THREE.Color(color),
    gradientMap: gradientMap(),
    transparent: opts.transparent ?? false,
    opacity: opts.opacity ?? 1,
    side: opts.side ?? THREE.FrontSide,
  });
  // No flatShading option: MeshToonMaterial has none in three 0.185, and it
  // does not need one. The shared geometries are already low-segment, so a rock
  // is faceted because it is an eight-sided sphere and not because a flag says so.
  if (opts.emissive) {
    mat.emissive = new THREE.Color(opts.emissive);
    mat.emissiveIntensity = opts.emissiveIntensity ?? 1;
  }

  if (!opts.noMist) {
    const untouched = { value: opts.untouched ?? 0 };
    mat.onBeforeCompile = (shader) => {
      // By reference, so one write per frame reaches every material.
      Object.assign(shader.uniforms, MIST);
      shader.uniforms.uUntouched = untouched;

      shader.vertexShader =
        "varying vec3 vWorldPosC;\n" +
        shader.vertexShader.replace(
          "#include <project_vertex>",
          "#include <project_vertex>\n  vWorldPosC = (modelMatrix * vec4(transformed, 1.0)).xyz;",
        );

      shader.fragmentShader =
        MIST_FN +
        "\n" +
        shader.fragmentShader.replace(
          "#include <dithering_fragment>",
          `#include <dithering_fragment>
           float cm = cosmosMist(vWorldPosC);
           gl_FragColor.rgb = mix(gl_FragColor.rgb, uMistColor, cm);`,
        );
    };
    // Materials that compile differently must not share a cached program.
    mat.customProgramCacheKey = () => `cosmos-mist-${opts.untouched ?? 0}`;
  }

  cache.set(key, mat);
  return mat;
}

/** Drop every cached material. Called when the register changes under a world. */
export function clearToonCache(): void {
  for (const m of cache.values()) m.dispose();
  cache.clear();
}

// ── Shared geometry ──────────────────────────────────────────────────────────
//
// One box, one cylinder, one cone, one sphere, scaled per prop. Reusing geometry
// is the cheapest win in the whole scene (optimize-threejs-games, "reuse
// geometry/materials"): a hundred props, four buffers.

export const GEO = {
  box: new THREE.BoxGeometry(1, 1, 1),
  cyl: new THREE.CylinderGeometry(0.5, 0.5, 1, 10),
  cone: new THREE.ConeGeometry(0.5, 1, 8),
  sphere: new THREE.SphereGeometry(0.5, 10, 8),
  plane: new THREE.PlaneGeometry(1, 1),
  /** A four-sided pyramid, for roofs and stone caps. */
  pyr: new THREE.ConeGeometry(0.5, 1, 4),
};
