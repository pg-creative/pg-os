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
const OUT = 170;
/**
 * A distant country is a RANGE OVER THERE, not a wall in front.
 *
 * The first frame off this component stood the whole plate up at 152 by 85
 * metres, and a 1.78 image that tall reaches eighteen degrees above the eye: it
 * filled the whole sky band, went pale in the haze, and washed the entire frame
 * lavender. The sky band this camera can see is about nine degrees tall, so a
 * backdrop has to fit inside it. These numbers crop the plate to the band around
 * its own horizon and stand that band 16 m tall at 170 m out with its FEET on
 * the horizon line, so it rises about six degrees into the sky band and never
 * crosses down over ground the eye can see is nearer. About a third of the frame
 * wide: painted country over there, with sky above it.
 */
const WIDE = 150;
const TALL = 16;
const CROP_FROM = 0.4;
const CROP_TO = 0.59;
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

  const material = useMemo(() => {
    if (!tex) return null;
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.repeat.set(1, CROP_TO - CROP_FROM);
    tex.offset.set(0, 1 - CROP_TO);
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
           // Into the haze at the edges and, hardest, along the bottom, where
           // the painted ground has to become the real ground.
           // Both ends, symmetrically: the crop is a band out of the middle of
           // a painting and either edge of it is a cut, not a horizon.
           float side = smoothstep(0.0, 0.28, vMapUv.x) * smoothstep(1.0, 0.72, vMapUv.x);
           float band = smoothstep(0.0, 0.3, vMapUv.y) * smoothstep(1.0, 0.7, vMapUv.y);
           gl_FragColor.rgb = mix(uFog, gl_FragColor.rgb, 0.4 + 0.35 * band);
           gl_FragColor.a *= side * band * 0.92;`,
        );
    };
    m.customProgramCacheKey = () => "cosmos-backdrop";
    return m;
  }, [tex, p.fog]);

  // The bearing: away from the camera, so the painting is always the far side of
  // the biome rather than the side he came in from.
  const at = useMemo(() => {
    const ox = world.layout.origin.x - Math.sin(CAM_YAW) * OUT;
    const oz = world.layout.origin.z - Math.cos(CAM_YAW) * OUT;
    return new THREE.Vector3(ox, 0, oz);
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
        position={[0, 14.6, 0]}
        renderOrder={-90}
        frustumCulled={false}
      >
        <planeGeometry args={[WIDE, TALL]} />
      </mesh>
    </group>
  );
}
