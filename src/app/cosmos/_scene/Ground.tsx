"use client";

/**
 * One ground plane for the whole cosmos.
 *
 * "One traveler, many worlds, each its own register" has to be true of the floor
 * too, and the round-one answer (a slab per world) would have made five islands
 * with sky between them. So: ONE plane, one material, and a fragment shader that
 * asks "which biome is this pixel in?" and blends. Between two biomes the answer
 * is neither, and that gap paints itself as the register's mist. Borders are mist
 * because the ground says so, not because a wall was put there.
 *
 * The plane is 180 units square and rides the camera target, so it is always
 * under the Wayfarer and never runs out. Colour comes from world position, not
 * from uv, so nothing swims when it moves.
 *
 * The material is a `MeshToonMaterial` with the blend injected through
 * `onBeforeCompile` rather than a raw `ShaderMaterial`, for one reason: a raw
 * shader receives no shadows, and the shrine hall casting its roof across the
 * boards is most of what makes the scene read as a room.
 */

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { WorldManifest } from "./contract";
import { paletteFor } from "./palette";
import { gradientMap, MIST } from "./toon";
import { NOISE } from "./glsl";

const MAX_BIOMES = 6;
/**
 * 420, not 180. At 180 the plane's own edge was inside the frame on a phone and
 * the world ended in a hard line against the sky. It is two triangles either
 * way; what costs is the fill, and the fill is the same because the extra
 * ground is beyond the haze.
 */
const SIZE = 420;

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
    const bands: number[] = [];

    for (let i = 0; i < MAX_BIOMES; i++) {
      const w = worlds[i];
      if (w) {
        const p = paletteFor(w.register);
        centers.push(new THREE.Vector2(w.layout.origin.x, w.layout.origin.z));
        halves.push(new THREE.Vector2(w.layout.size.w / 2, w.layout.size.d / 2));
        cols.push(new THREE.Color(p.ground));
        alts.push(new THREE.Color(p.groundAlt));
        bands.push(p.banding);
      } else {
        centers.push(new THREE.Vector2(0, 0));
        halves.push(new THREE.Vector2(-1, -1));
        cols.push(new THREE.Color("#000000"));
        alts.push(new THREE.Color("#000000"));
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
      shader.uniforms.uBBand = { value: bands };
      shader.uniforms.uPlaneAt = uCenterU;
      shader.uniforms.uSkyHorizon = uHorizonU;

      shader.vertexShader =
        "varying vec3 vWorldPosC;\n" +
        shader.vertexShader.replace(
          "#include <project_vertex>",
          "#include <project_vertex>\n  vWorldPosC = (modelMatrix * vec4(transformed, 1.0)).xyz;",
        );

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
        shader.fragmentShader.replace(
          "#include <map_fragment>",
          /* glsl */ `
          #include <map_fragment>

          vec2 wp = vWorldPosC.xz;

          // ONE fbm for the whole plane, read twice. The first pass ran a
          // four-octave fbm here and a second one again in the mist stage, which
          // is eight octaves of value noise on every pixel of a fullscreen
          // plane; the mist reads this one instead.
          gMottle = fbm4(wp * 0.055);
          float broad = gMottle;
          float tooth = vnoise(wp * 1.6);

          vec3 acc = vec3(0.0);
          float wsum = 0.0;
          float band = 0.0;
          for (int i = 0; i < ${MAX_BIOMES}; i++) {
            if (uBH[i].x < 0.0) continue;
            // The border band: six units of falloff outside each rectangle, which
            // is where two registers argue and the mist wins.
            float d = rectDist(wp, uBC[i], uBH[i]);
            float wgt = 1.0 - smoothstep(0.0, 7.0, max(d, 0.0));
            if (wgt <= 0.0) continue;
            vec3 g = mix(uBCol[i], uBAlt[i], smoothstep(0.30, 0.72, broad));
            acc += g * wgt;
            wsum += wgt;
            band += uBBand[i] * wgt;
          }

          vec3 ground = wsum > 0.001 ? acc / wsum : uMistColor;
          band = wsum > 0.001 ? band / wsum : 0.0;
          float outside = 1.0 - clamp(wsum, 0.0, 1.0);
          // Out past every biome the floor is the mist, DARKENED: pale everywhere reads
          // as a blown-out page, and the point of the border is depth, not paper.
          ground = mix(ground, uMistColor * 0.62, outside * 0.9);

          // Riso wants a flatter ground than a painted one: less tooth, then
          // stepped, so it reads as paper with ink on it rather than as grass.
          ground *= mix(0.86 + tooth * 0.26, 0.95 + tooth * 0.09, band);
          if (band > 0.5) ground = posterize(ground, 6.0);

          diffuseColor.rgb *= ground;
        `,
        ).replace(
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
          // the plane has no edge and the world has no end you can point at.
          float haze = smoothstep(46.0, 108.0, distance(vWorldPosC.xz, uFocus.xz));
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
    // Snap to a 4 unit grid: the plane follows without the noise field sliding
    // under it, because colour is read from world position either way.
    const x = Math.round(target.current.x / 4) * 4;
    const z = Math.round(target.current.z / 4) * 4;
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
      <planeGeometry args={[SIZE, SIZE, 1, 1]} />
    </mesh>
  );
}
