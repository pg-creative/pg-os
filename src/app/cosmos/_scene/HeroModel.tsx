"use client";

/**
 * The Wayfarer as a rigged model, behind `?hero=model`.
 *
 * PG's ruling of 2026-09-09 opened Higgsfield's whole surface, and Meshy 7 came
 * back with a textured 31k-triangle traveller and a 4.23 s `Casual_Walk` clip on
 * a 66-channel rig, 1.6 m tall with his feet on the origin. The GLB lives in the
 * vault (`worlds/<id>/models/`) and reaches the browser through the asset route
 * behind the gate, never `public/`, because the quiet practice is private.
 *
 * THE SPRITE IS STILL THE DEFAULT. This is a switch, not a replacement, and it
 * stays a switch until PG looks at both and says "that one". `?hero=model` draws
 * this; anything else draws the painted cutout.
 *
 * THREE THINGS MAKE A MODEL BELONG IN A PAINTED WORLD.
 *
 * TOON, NOT PBR. Meshy ships a physically shaded material with a baked albedo.
 * Dropped into this scene it reads as a rendered object standing in a painting:
 * specular where nothing else has any, a smooth falloff where everything else
 * has three steps. Every material is swapped for `MeshToonMaterial` with the
 * baked texture as its map and the scene's OWN three-step gradient, the same
 * ramp every prop and the hall itself use, so he is lit by the same rules.
 *
 * THE CLIP IS DRIVEN BY SPEED. An animation on a timer is a treadmill: he slides
 * when he stops and moonwalks when he is pushed. The mixer is advanced by
 * `dt * (speed / walk speed)`, so the stride is the ground going past. Standing,
 * the clip eases to its neutral frame and a slow sway takes over, because a
 * person waiting is not a person paused.
 *
 * THE LANTERN IS ON HIS HAND. The light that de-mists the world hangs off the
 * nearest hand bone with an offset, read in world space every frame, so the
 * attention light moves with his arm as he walks. `runtime.lantern` is written
 * from that bone, which means the mist shader follows the actual hand and not a
 * number offset from his feet.
 */

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import * as THREE from "three";
import { gradientMap } from "./toon";
import type { Runtime } from "./runtime";
import { WALK_SPEED } from "./runtime";

export interface HeroModelSpec {
  url: string;
  static_url: string | null;
  /** What he should stand, in world units. The vault's `model_height:`. */
  height: number;
  /** The walk clip's name, when the vault names one. */
  clip: string | null;
}

/** A bone a lantern could hang on, in the order worth trying. */
const HAND = [/lantern/i, /hand/i, /wrist/i, /forearm/i, /arm/i];

export function HeroModel({
  rt,
  spec,
  lanternColor,
  lanternRange,
}: {
  rt: React.RefObject<Runtime>;
  spec: HeroModelSpec;
  lanternColor: string;
  lanternRange: number;
}) {
  const group = useRef<THREE.Group>(null);
  const light = useRef<THREE.PointLight>(null);
  const gltf = useGLTF(spec.url);
  const invalidate = useThree((s) => s.invalidate);

  /**
   * One instance, toon-shaded, scaled to his declared height with his feet on
   * the plane. Measured from the model's own bounds rather than trusted: a
   * second model from a different tool will not share Meshy's.
   *
   * CLONED, and this is not tidiness. `useGLTF` hands back a CACHED scene, and
   * the first pass scaled that object in place: every time this memo re-ran (a
   * border changes the palette, which was in its deps) it measured a model it
   * had already shrunk and shrank it again by the same factor. He walked into
   * the practice at 1.6 m and out of it at 60 cm. `SkeletonUtils.clone` keeps
   * the rig and the skinning and leaves the cache alone, and the deps are now
   * the three things that actually describe the model.
   */
  const { mixer, action, hand, sway } = useMemo(() => {
    const root = clone(gltf.scene) as THREE.Group;
    root.scale.setScalar(1);
    root.position.set(0, 0, 0);
    root.updateMatrixWorld(true);
    const ramp = gradientMap();

    root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      m.castShadow = true;
      m.receiveShadow = false;
      m.frustumCulled = false;
      const src = m.material as THREE.MeshStandardMaterial | THREE.MeshStandardMaterial[];
      const swap = (mat: THREE.MeshStandardMaterial) => {
        const map = mat.map ?? null;
        if (map) map.colorSpace = THREE.SRGBColorSpace;
        const toon = new THREE.MeshToonMaterial({
          map,
          color: 0xffffff,
          gradientMap: ramp,
          transparent: mat.transparent,
          alphaTest: mat.alphaTest,
          side: mat.side,
        });
        // Every hero material shares one program with every other toon material
        // that has a map, so the switch costs the scene nothing at a border.
        toon.customProgramCacheKey = () => "cosmos-hero-toon";
        return toon;
      };
      m.material = Array.isArray(src) ? src.map(swap) : swap(src);
    });

    // Bounds, and the scale that makes him the height the vault declares.
    const box = new THREE.Box3().setFromObject(root);
    const h = Math.max(0.001, box.max.y - box.min.y);
    const scale = (spec.height || 1.6) / h;
    root.scale.setScalar(scale);
    // Feet on the plane, whatever the exporter thought the origin was.
    root.position.y = -box.min.y * scale;
    root.position.x = -((box.max.x + box.min.x) / 2) * scale;
    root.position.z = -((box.max.z + box.min.z) / 2) * scale;

    const mixer = new THREE.AnimationMixer(root);
    const clips = gltf.animations ?? [];
    const named = spec.clip ? clips.find((c) => c.name === spec.clip) : null;
    const clip = named ?? clips[0] ?? null;
    const action = clip ? mixer.clipAction(clip) : null;
    if (action) {
      action.setLoop(THREE.LoopRepeat, Infinity);
      action.play();
      // Advanced by hand, from his speed. Never by the clock.
      action.paused = false;
    }

    let hand: THREE.Object3D | null = null;
    for (const re of HAND) {
      root.traverse((o) => {
        if (hand) return;
        if ((o as THREE.Bone).isBone && re.test(o.name)) hand = o;
      });
      if (hand) break;
    }

    // A wrapper the idle sway can move without fighting the scale above.
    const sway = new THREE.Group();
    sway.add(root);

    return { mixer, action, hand, sway };
  }, [gltf, spec.height, spec.clip]);

  useEffect(
    () => () => {
      mixer.stopAllAction();
      sway.traverse((o) => {
        const m = o as THREE.Mesh;
        if (!m.isMesh) return;
        const mat = m.material;
        if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
        else mat?.dispose();
      });
    },
    [mixer, sway],
  );

  const heading = useRef(0);
  const lanternWorld = useMemo(() => new THREE.Vector3(), []);

  useFrame((state, dtRaw) => {
    const r = rt.current;
    const g = group.current;
    if (!r || !g) return;
    const dt = Math.min(dtRaw, 0.05);

    g.position.set(r.pos.x, 0, r.pos.z);

    // Facing follows the direction of travel and holds it when he stops.
    const speed = Math.hypot(r.vel.x, r.vel.z);
    if (speed > 0.2) {
      const want = Math.atan2(r.vel.x, r.vel.z);
      let d = want - heading.current;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      heading.current += d * Math.min(1, dt * 9);
    }
    g.rotation.y = heading.current;

    // The stride IS the ground going past. Standing, the clip eases home and a
    // slow sway carries him instead.
    const k = Math.min(1.2, speed / WALK_SPEED);
    if (action) {
      if (k > 0.06 && !r.reduced) {
        mixer.update(dt * k);
      } else if (action.time > 0.001) {
        action.time = Math.max(0, action.time - dt * 2.2);
        mixer.update(0);
      }
    }
    const t = state.clock.elapsedTime;
    const idle = r.reduced ? 0 : 1 - Math.min(1, k * 4);
    sway.rotation.z = Math.sin(t * 1.15) * 0.014 * idle;
    sway.position.y = Math.sin(t * 1.5) * 0.014 * idle;

    // The lantern, on his hand, in world space, with an offset so it hangs off
    // the fist rather than inside it.
    if (hand) {
      (hand as THREE.Object3D).getWorldPosition(lanternWorld);
      lanternWorld.y -= 0.12;
    } else {
      lanternWorld.set(r.pos.x + Math.sin(heading.current) * 0.42, 1.16, r.pos.z + Math.cos(heading.current) * 0.42);
    }
    if (light.current) {
      light.current.position.copy(g.worldToLocal(lanternWorld.clone()));
      const f = r.reduced ? 1 : 1 + Math.sin(t * 4.3) * 0.07 + Math.sin(t * 9.7) * 0.04;
      light.current.intensity = 3.1 * f;
    }
    // Attention is the light source, and it is now literally his hand.
    r.lantern.copy(lanternWorld);
    if (speed > 0.02) invalidate();
  });

  return (
    <group ref={group}>
      <primitive object={sway} />
      <group>
        <pointLight
          ref={light}
          color={lanternColor}
          distance={lanternRange}
          decay={1.6}
          intensity={3.1}
          castShadow={false}
        />
      </group>
      {/* The same contact shadow the sprite has, so he stands on the plane even
          where the directional map is thin. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]}>
        <circleGeometry args={[0.44, 16]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.2} depthWrite={false} />
      </mesh>
    </group>
  );
}

export default HeroModel;
