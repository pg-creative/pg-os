"use client";

/**
 * One ground plane for the whole cosmos, with a rolling far country on it.
 *
 * "One traveler, many worlds, each its own register" has to be true of the floor
 * too, and the round-one answer (a slab per world) would have made five islands
 * with sky between them. So: ONE plane, one material, and a fragment shader that
 * asks "which biome is this pixel in?" and blends. Between two biomes the answer
 * is neither, and that gap paints itself as the register's mist. Borders are mist
 * because the ground says so, not because a wall was put there.
 *
 * NEW THIS ROUND, and it is the reason the frame has a country in it: the plane
 * is displaced into low hills, but ONLY past 46 units from the eye, ramping in
 * over the next forty. Inside that radius it is dead flat, because the plan's
 * one-plane rule is a gameplay rule and the walker, the props and the collision
 * circles all live at y = 0. Outside it nobody stands, and a horizon that rolls
 * is the difference between a valley and a table.
 *
 * The COVER BLEND is the second half: the ground reads as bare earth in the
 * hollows and as grass over the rises, from the same noise the hills use, so the
 * instanced grass has something to sit in rather than sitting on a flat colour.
 *
 * The material is a `MeshToonMaterial` with all of this injected through
 * `onBeforeCompile` rather than a raw `ShaderMaterial`, for one reason: a raw
 * shader receives no shadows and no fog, and the hall casting its roof across
 * the boards is most of what makes the scene read as a room.
 */

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { WorldManifest } from "./contract";
import { paletteFor } from "./registers";
import { gradientMap, MIST } from "./toon";
import { NOISE } from "./glsl";

const MAX_BIOMES = 6;
/**
 * 768 across at 8 unit quads. The size is set by the horizon: at 18 degrees of
 * pitch the eye runs a long way out before it meets the ground, and a plane that
 * stops inside that distance ends in a hard line under the sky. The quad size is
 * set by the hills, which need vertices to displace, and by the snap below.
 */
const SIZE = 768;
const SEGMENTS = 96;
const QUAD = SIZE / SEGMENTS;

/** The same hill field the shader uses, so anything else can ask its height. */
export const HILL_START = 46;
export const HILL_FULL = 92;

export function Ground({
  worlds,
  target,
  horizon,
}: {
  worlds: WorldManifest[];
  /** The camera's look-at, so the plane never ends inside the frame. */
  target: React.RefObject<THREE.Vector3>;
  /** The sky's horizon hex. The ground dissolves into it, which IS the horizon. */
  horizon: string;
}) {
  const mesh = useRef<THREE.Mesh>(null);

  const { material, uCenter, uHorizon } = useMemo(() => {
    const centers: THREE.Vector2[] = [];
    const halves: THREE.Vector2[] = [];
    const cols: THREE.Color[] = [];
    const alts: THREE.Color[] = [];
    const grass: THREE.Color[] = [];
    const bands: number[] = [];

    for (let i = 0; i < MAX_BIOMES; i++) {
      const w = worlds[i];
      if (w) {
        const p = paletteFor(w.register);
        centers.push(new THREE.Vector2(w.layout.origin.x, w.layout.origin.z));
        halves.push(new THREE.Vector2(w.layout.size.w / 2, w.layout.size.d / 2));
        cols.push(new THREE.Color(p.ground));
        alts.push(new THREE.Color(p.groundAlt));
        grass.push(new THREE.Color(p.grass));
        bands.push(p.banding);
      } else {
        centers.push(new THREE.Vector2(0, 0));
        halves.push(new THREE.Vector2(-1, -1));
        cols.push(new THREE.Color("#000000"));
        alts.push(new THREE.Color("#000000"));
        grass.push(new THREE.Color("#000000"));
        bands.push(0);
      }
    }

    const uCenterU = { value: new THREE.Vector3() };
    const uHorizonU = { value: new THREE.Color(horizon) };

    const mat = new THREE.MeshToonMaterial({
      color: new THREE.Color("#ffffff"),
      gradientMap: gradientMap(),
    });

    mat.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, MIST);
      shader.uniforms.uUntouched = { value: 0 };
      shader.uniforms.uBC = { value: centers };
      shader.uniforms.uBH = { value: halves };
      shader.uniforms.uBCol = { value: cols };
      shader.uniforms.uBAlt = { value: alts };
      shader.uniforms.uBGrass = { value: grass };
      shader.uniforms.uBBand = { value: bands };
      shader.uniforms.uPlaneAt = uCenterU;
      shader.uniforms.uSkyHorizon = uHorizonU;

      // ── Vertex: the far hills ──
      shader.vertexShader =
        "varying vec3 vWorldPosC;\nuniform vec3 uPlaneAt;\n" +
        NOISE +
        "\n" +
        shader.vertexShader
          .replace(
            "#include <begin_vertex>",
            /* glsl */ `
            #include <begin_vertex>
            {
              vec2 wp0 = (modelMatrix * vec4(transformed, 1.0)).xz;
              float far = smoothstep(${HILL_START.toFixed(1)}, ${HILL_FULL.toFixed(1)}, distance(wp0, uPlaneAt.xz));
              float h = (fbm4(wp0 * 0.0085) - 0.5) * 2.0;
              // Displaced along the plane's own normal, which is +y in world
              // because the mesh is laid flat. z in local space IS up here.
              transformed.z += h * 7.0 * far;
            }
            `,
          )
          .replace(
            "#include <project_vertex>",
            "#include <project_vertex>\n  vWorldPosC = (modelMatrix * vec4(transformed, 1.0)).xyz;",
          );

      // ── Fragment: the biome blend, the cover, the mist and the haze ──
      shader.fragmentShader =
        /* glsl */ `
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
        uniform vec2  uBC[${MAX_BIOMES}];
        uniform vec2  uBH[${MAX_BIOMES}];
        uniform vec3  uBCol[${MAX_BIOMES}];
        uniform vec3  uBAlt[${MAX_BIOMES}];
        uniform vec3  uBGrass[${MAX_BIOMES}];
        uniform float uBBand[${MAX_BIOMES}];
        uniform vec3  uSkyHorizon;
        varying vec3 vWorldPosC;

        ${NOISE}

        /**
         * Riso posterizes the VALUE and keeps the hue. Quantizing each channel
         * on its own snaps red, green and blue into different buckets and a
         * cream ground comes out orange, pink and yellow in blotches, which is
         * what the first border screenshot showed.
         */
        vec3 posterize(vec3 c, float steps) {
          float l = dot(c, vec3(0.299, 0.587, 0.114));
          float q = floor(l * steps + 0.5) / steps;
          return c * (q / max(l, 0.0001));
        }

        /** The plane's noise, computed once in the map stage and reused after. */
        float gMottle = 0.0;

        /** Distance from a point to the edge of an axis-aligned rectangle. */
        float rectDist(vec2 p, vec2 c, vec2 h) {
          vec2 d = abs(p - c) - h;
          return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
        }
        ` +
        shader.fragmentShader
          .replace(
            "#include <map_fragment>",
            /* glsl */ `
          #include <map_fragment>

          vec2 wp = vWorldPosC.xz;

          // ONE fbm for the whole plane, read three times. The first pass ran a
          // four-octave fbm here and a second one again in the mist stage, which
          // is eight octaves of value noise on every pixel of a fullscreen
          // plane; the mist and the cover read this one instead.
          gMottle = fbm4(wp * 0.055);
          float broad = gMottle;
          float tooth = vnoise(wp * 1.6);

          vec3 acc = vec3(0.0);
          vec3 accGrass = vec3(0.0);
          float wsum = 0.0;
          float band = 0.0;
          for (int i = 0; i < ${MAX_BIOMES}; i++) {
            if (uBH[i].x < 0.0) continue;
            // The border band: seven units of falloff outside each rectangle,
            // which is where two registers argue and the mist wins.
            float d = rectDist(wp, uBC[i], uBH[i]);
            float wgt = 1.0 - smoothstep(0.0, 7.0, max(d, 0.0));
            if (wgt <= 0.0) continue;
            vec3 g = mix(uBCol[i], uBAlt[i], smoothstep(0.30, 0.72, broad));
            acc += g * wgt;
            accGrass += uBGrass[i] * wgt;
            wsum += wgt;
            band += uBBand[i] * wgt;
          }

          vec3 ground = wsum > 0.001 ? acc / wsum : uMistColor;
          vec3 cover  = wsum > 0.001 ? accGrass / wsum : uMistColor;
          band = wsum > 0.001 ? band / wsum : 0.0;
          float outside = 1.0 - clamp(wsum, 0.0, 1.0);

          // THE COVER BLEND. Grass takes the rises and the bare ground keeps the
          // hollows, on a second, finer octave so the edge is a meadow edge and
          // not a contour line.
          float cov = smoothstep(0.40, 0.74, broad * 0.7 + vnoise(wp * 0.21) * 0.45);
          ground = mix(ground, cover, cov * 0.62 * (1.0 - outside));

          // Out past every biome the floor is the mist, DARKENED: pale everywhere
          // reads as a blown-out page, and the point of the border is depth.
          ground = mix(ground, uMistColor * 0.62, outside * 0.9);

          // Riso wants a flatter ground than a painted one: less tooth, then
          // stepped, so it reads as paper with ink on it rather than as grass.
          ground *= mix(0.86 + tooth * 0.26, 0.95 + tooth * 0.09, band);
          if (band > 0.5) ground = posterize(ground, 6.0);

          diffuseColor.rgb *= ground;
        `,
          )
          .replace(
            "#include <dithering_fragment>",
            /* glsl */ `
          #include <dithering_fragment>
          float n = gMottle;
          float lant = distance(vWorldPosC, uLantern);
          float lit = 1.0 - smoothstep(uLanternR * 0.30, uLanternR, lant);
          float far = smoothstep(14.0, 44.0, distance(vWorldPosC.xz, uFocus.xz));
          float veil = uMistDensity * (0.22 + 0.78 * smoothstep(0.28, 0.94, n));
          veil = veil * (0.24 + 0.76 * far);
          veil *= (1.0 - lit * 0.90);
          veil = clamp(veil * (1.0 - uFloor * 0.58), 0.0, 0.88);
          gl_FragColor.rgb = mix(gl_FragColor.rgb, uMistColor, veil);
          // And then into the sky. Far enough out the ground IS the horizon, so
          // the plane has no edge and the world has no end you can point at. The
          // stop is past the hills, so the country rolls before it dissolves.
          float haze = smoothstep(64.0, 168.0, distance(vWorldPosC.xz, uFocus.xz));
          gl_FragColor.rgb = mix(gl_FragColor.rgb, uSkyHorizon, haze);
        `,
          );
    };
    mat.customProgramCacheKey = () => "cosmos-ground";

    return { material: mat, uCenter: uCenterU, uHorizon: uHorizonU };
  }, [worlds, horizon]);

  useEffect(() => {
    uHorizon.value.set(horizon);
  }, [horizon, uHorizon]);

  useFrame(() => {
    if (!mesh.current || !target.current) return;
    // Snap to the QUAD grid, not to an arbitrary four units: the hills are a
    // function of world position, so a vertex that lands on a different world
    // point after every snap makes the whole far country crawl.
    const x = Math.round(target.current.x / QUAD) * QUAD;
    const z = Math.round(target.current.z / QUAD) * QUAD;
    mesh.current.position.set(x, 0, z);
    uCenter.value.set(x, 0, z);
  });

  return (
    <mesh
      ref={mesh}
      material={material}
      rotation={[-Math.PI / 2, 0, 0]}
      receiveShadow
      frustumCulled={false}
    >
      <planeGeometry args={[SIZE, SIZE, SEGMENTS, SEGMENTS]} />
    </mesh>
  );
}
