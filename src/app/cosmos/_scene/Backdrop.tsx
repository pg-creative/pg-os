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
 *   TALL  12.5 m reaching 4.6 degrees, which leaves nearly two degrees of open
 *         sky above the range: the moon of the depths hangs in it.
 *   FEET  sunk two metres under the horizon line, where the ground plane in
 *         front of it hides the join.
 *
 * The crop band is sized to the plane's aspect (200 by 12.5 is 16:1, so about a
 * ninth of a 1456 by 816 plate) and centred on the plate's own horizon. A plate
 * whose subject is not in the middle says so in the vault: `crop: { from, to }`.
 */
const WIDE = 200;
const TALL = 12.5;
/** Where its feet stand, in world y. The eye rides at about 6.6 m at zoom 1. */
const FOOT = 4.6;
const CROP_FROM = 0.439;
const CROP_TO = 0.551;
/** How much of the walker's movement it takes. 1 is painted on the lens. */
const FOLLOW = 0.86;

export function Backdrop({
  world,
  p,
  rt,
  current,
}: {
  world: WorldManifest;
  p: Palette;
  rt: React.RefObject<Runtime>;
  /** Only the biome he is standing in paints its own horizon. */
  current: boolean;
}) {
  const url = current ? (world.backdrop?.url ?? null) : null;
  const { status, tex } = useCutout(url);
  const group = useRef<THREE.Group>(null);

  // The vault's own crop, when a plate's subject is not in the middle of it.
  // The depths' plate carries its painted red moon above 0.40 of its height and
  // the default band cut it off, which is half of the Critic's deduction 3.
  const crop = world.backdrop?.crop ?? null;
  const from = crop ? Math.min(crop.from, crop.to) : CROP_FROM;
  const to = crop ? Math.max(crop.from, crop.to) : CROP_TO;

  const material = useMemo(() => {
    if (!tex) return null;
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.repeat.set(1, to - from);
    tex.offset.set(0, 1 - to);
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
      shader.fragmentShader =
        "uniform vec3 uFog;\n" +
        shader.fragmentShader.replace(
          "#include <dithering_fragment>",
          `#include <dithering_fragment>
           // The join at the bottom is under the horizon and behind the ground,
           // so it only needs a short fade. The TOP is the one that matters: the
           // range has to dissolve into the sky over most of a degree, or it is
           // a cut edge across the frame. Two thirds of the plate holds its
           // colour, the last third goes to air.
           float side = smoothstep(0.0, 0.10, vMapUv.x) * smoothstep(1.0, 0.90, vMapUv.x);
           float band = smoothstep(0.0, 0.20, vMapUv.y) * smoothstep(1.0, 0.62, vMapUv.y);
           gl_FragColor.rgb = mix(uFog, gl_FragColor.rgb, 0.42 + 0.38 * band);
           gl_FragColor.a *= side * band * 0.94;`,
        );
    };
    m.customProgramCacheKey = () => "cosmos-backdrop";
    return m;
  }, [tex, p.fog, from, to]);

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
        position={[0, FOOT + TALL / 2, 0]}
        renderOrder={-90}
        frustumCulled={false}
      >
        <planeGeometry args={[WIDE, TALL]} />
      </mesh>
    </group>
  );
}
