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
const OUT = 78;
/** How much of the walker's movement it takes. 1 is painted on the lens. */
const FOLLOW = 0.86;

export function Backdrop({
  world,
  p,
  rt,
}: {
  world: WorldManifest;
  p: Palette;
  rt: React.RefObject<Runtime>;
}) {
  const url = world.backdrop?.url ?? null;
  const { status, tex } = useCutout(url);
  const group = useRef<THREE.Group>(null);

  const material = useMemo(() => {
    if (!tex) return null;
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
           float side = smoothstep(0.0, 0.14, vMapUv.x) * smoothstep(1.0, 0.86, vMapUv.x);
           float foot = smoothstep(0.0, 0.42, vMapUv.y);
           float top  = smoothstep(1.0, 0.94, vMapUv.y);
           gl_FragColor.rgb = mix(uFog, gl_FragColor.rgb, 0.62 + 0.38 * foot);
           gl_FragColor.a *= side * foot * top * 0.92;`,
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

  const img = tex?.image as { width?: number; height?: number } | undefined;
  const aspect = img?.width && img?.height ? img.width / img.height : 1.78;
  const width = 128;
  const height = width / aspect;

  return (
    <group ref={group}>
      <mesh
        material={material}
        rotation={[0, CAM_YAW, 0]}
        // Sunk so its foot is under the horizon line and its body stands above
        // it: the join happens inside the haze and never as an edge.
        position={[0, height * 0.42, 0]}
        renderOrder={-90}
        frustumCulled={false}
      >
        <planeGeometry args={[width, height]} />
      </mesh>
    </group>
  );
}
