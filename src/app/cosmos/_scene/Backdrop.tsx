"use client";

/**
 * The biome's own painting, standing on its horizon.
 *
 * The Critic's deduction 3: six plates were painted this round and the only way
 * any of them reached the screen was as an 0.82 metre card on a stake, or inside
 * the panel after he opened a page. The manifest has carried `backdrop` since
 * round two and nothing rendered it. This is that card, at the size a backdrop
 * is: about a hundred and ten metres of painted country across the far side of
 * the biome, its base sunk under the horizon line and its edges dissolved into
 * the register's own fog, so it reads as distance rather than as a poster.
 *
 * PARALLAX. It sits at a fixed bearing from the biome's heart and follows the
 * eye at 0.86, so walking twenty metres east moves it about three: near enough
 * to still, far enough that it is not painted onto the lens. That is the whole
 * trick a painted world uses to have a country in it without modelling one.
 *
 * It draws AFTER the sky (which has no depth) and BEFORE everything else, with
 * no depth write, so a pine forty metres away still stands in front of it.
 */

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { WorldManifest } from "./contract";
import type { Palette } from "./registers";
import type { Runtime } from "./runtime";
import { useCutout } from "./Cutout";
import { CAM_YAW } from "./IsoCamera";

/** How far past the biome's edge the painted country stands. */
const OUT = 130;
/**
 * A distant country is a RANGE OVER THERE, not a poster on the sky.
 *
 * Round 2.1 stood a 150 by 16 m band at 170 m with its feet on the horizon. The
 * arithmetic of that: it reached 5.4 degrees into a sky band 6.5 degrees tall
 * and it was only 47 degrees wide in a 66 degree frame, so it read as exactly
 * what the Critic called it, "a letterboxed painting strip floating over a
 * lavender void" with a cut edge down each side and a hard line across the top.
 *
 * These numbers fix the three things that made it a poster.
 *
 *   WIDE  200 m at 130 m out is 75 degrees across, wider than the frame at any
 *         aspect this camera runs, so there is no side edge to see.
 *   TALL  and FOOT are chosen from the ELEVATIONS the fades have to land on,
 *         with the eye at about 6.6 m and the plate 130 m out: gone by two
 *         degrees BELOW the horizon (buried in the ground haze), solid from a
 *         third of a degree above it to three and a fifth, gone again by six,
 *         which is just under the top of the frame. So it never has an edge in
 *         it anywhere the eye can be.
 *
 * The crop band is sized to the plane's aspect (200 by 18.2 is 11:1, so about a
 * sixth of a 1456 by 816 plate) and centred on the plate's own horizon. A plate
 * whose subject is not in the middle says so in the vault: `crop: { from, to }`.
 */
const WIDE = 200;
/**
 * The default height, and where it comes from. A 1456 by 816 plate cut to the
 * default band below is 1456 by 132, which is 11.03 to one; 200 divided by that
 * is 18.1. So TALL was never an independent number, it was the DEFAULT CROP'S
 * OWN ASPECT, and a crop that changes the window has to change it too or the
 * country gets stretched. `tallFor` below does that and returns this when the
 * plate has not measured itself yet.
 */
const TALL = 18.2;
/** Where its feet stand, in world y. The eye rides at about 6.6 m at zoom 1. */
const FOOT = 2.04;
const CROP_FROM = 0.414;
const CROP_TO = 0.576;
const CROP_LEFT = 0;
const CROP_RIGHT = 1;

/** The plane's height, so the crop's own aspect survives the trip to 200 m. */
function tallFor(
  tex: THREE.Texture | null,
  from: number,
  to: number,
  left: number,
  right: number,
): number {
  const img = tex?.image as { width?: number; height?: number } | undefined;
  const w = (img?.width ?? 0) * Math.max(0.01, right - left);
  const h = (img?.height ?? 0) * Math.max(0.01, to - from);
  if (!(w > 0) || !(h > 0)) return TALL;
  return Math.min(64, Math.max(6, (WIDE * h) / w));
}
/** How much of the walker's movement it takes. 1 is painted on the lens. */
const FOLLOW = 0.86;

export function Backdrop({
  world,
  p,
  rt,
  current,
  live,
}: {
  world: WorldManifest;
  p: Palette;
  rt: React.RefObject<Runtime>;
  /** Only the biome he is standing in paints its own horizon. */
  current: boolean;
  /**
   * The same horizon in motion, when the room he is in names a loop cut from
   * this plate (the lake's water, the party's sky, the depths' red moon). The
   * still is loaded either way and holds the wall until the frames arrive.
   */
  live: THREE.Texture | null;
}) {
  const url = current ? (world.backdrop?.url ?? null) : null;
  const still = useCutout(url);
  const tex = live ?? still.tex;
  const status = live ? "ok" : still.status;
  const group = useRef<THREE.Group>(null);

  // The vault's own crop, when a plate's subject is not in the middle of it.
  // The depths' plate carries its painted red moon above 0.40 of its height and
  // the default band cut it off, which is half of the Critic's deduction 3.
  const crop = world.backdrop?.crop ?? null;
  const from = crop ? Math.min(crop.from, crop.to) : CROP_FROM;
  const to = crop ? Math.max(crop.from, crop.to) : CROP_TO;
  /**
   * AND THE SIDES, which round three had no way to say and needed in two places.
   *
   * The practice's plate is the valley seen THROUGH the hall's doorway, so its
   * two weathered door jambs stand at the extreme left and right of the image.
   * At two hundred metres they were the Critic's deduction 1, "two headless tree
   * trunks hang in the sky", in the first frame, on every device. No vertical
   * band can cut a vertical post; only a horizontal window can.
   */
  const left = crop && typeof crop.left === "number" ? crop.left : CROP_LEFT;
  const right = crop && typeof crop.right === "number" ? crop.right : CROP_RIGHT;
  const tall = tallFor(tex, from, to, left, right);

  const material = useMemo(() => {
    if (!tex) return null;
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    // `from`/`to`/`left`/`right` are read off the plate from its TOP and LEFT.
    // Texture uv counts up from the BOTTOM, so only y is flipped.
    tex.repeat.set(right - left, to - from);
    tex.offset.set(left, 1 - to);
    const m = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      depthWrite: false,
      toneMapped: false,
      fog: false,
      side: THREE.DoubleSide,
    });
    m.onBeforeCompile = (shader) => {
      shader.uniforms.uFog = { value: new THREE.Color(p.fog) };
      /**
       * THE FADES RUN ON THE PLANE'S OWN UV, and this is the whole of the
       * Critic's "letterboxed painting strip floating over a lavender void".
       *
       * They were written against `vMapUv`, which is the uv AFTER the crop's
       * repeat and offset: with a band 0.112 of the plate tall, `vMapUv.y` runs
       * from 0.449 to 0.561 and every `smoothstep(0.0, 0.34, ..)` and
       * `smoothstep(1.0, 0.62, ..)` in it evaluates to exactly 1 across the
       * whole surface. The alpha was a flat 0.92 from edge to edge: a rectangle
       * of painting, cut on all four sides, hanging in the sky. Two rounds of
       * fade constants were tuned and none of them ever ran.
       *
       * `vRawUv` is the plane's own 0 to 1, so the ramps mean what they say: the
       * range dissolves into the air over its top third and into the ground haze
       * over its bottom third, and its sides go before the frame's do.
       */
      shader.vertexShader =
        "varying vec2 vRawUv;\n" +
        shader.vertexShader.replace(
          "#include <uv_vertex>",
          "#include <uv_vertex>\n  vRawUv = uv;",
        );
      shader.fragmentShader =
        "uniform vec3 uFog;\nvarying vec2 vRawUv;\n" +
        shader.fragmentShader.replace(
          "#include <dithering_fragment>",
          `#include <dithering_fragment>
           float side = smoothstep(0.0, 0.10, vRawUv.x) * smoothstep(1.0, 0.90, vRawUv.x);
           float band = smoothstep(0.0, 0.29, vRawUv.y) * smoothstep(1.0, 0.65, vRawUv.y);
           gl_FragColor.rgb = mix(uFog, gl_FragColor.rgb, 0.34 + 0.40 * band);
           gl_FragColor.a *= side * band * 0.96;`,
        );
    };
    m.customProgramCacheKey = () => "cosmos-backdrop";
    return m;
  }, [tex, p.fog, from, to, left, right]);

  // The bearing: away from the camera, so the painting is always the far side of
  // the biome rather than the side he came in from.
  const at = useMemo(() => {
    const ox = world.layout.origin.x - Math.sin(CAM_YAW) * OUT;
    const oz = world.layout.origin.z - Math.cos(CAM_YAW) * OUT;
    return new THREE.Vector3(ox, 0, oz);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [world.layout.origin.x, world.layout.origin.z]);

  useFrame(() => {
    const g = group.current;
    const r = rt.current;
    if (!g || !r) return;
    g.position.set(
      at.x + (r.pos.x - world.layout.origin.x) * FOLLOW,
      0,
      at.z + (r.pos.z - world.layout.origin.z) * FOLLOW,
    );
  });

  if (status !== "ok" || !material) return null;

  return (
    <group ref={group}>
      <mesh
        material={material}
        rotation={[0, CAM_YAW, 0]}
        // Sunk so its foot is under the horizon line and its body stands above
        // it: the join happens inside the haze and never as an edge.
        position={[0, FOOT + tall / 2, 0]}
        renderOrder={-90}
        frustumCulled={false}
      >
        <planeGeometry args={[WIDE, tall]} />
      </mesh>
    </group>
  );
}
