"use client";

/**
 * The Wayfarer.
 *
 * `build-hybrid-game-assets` puts a hero character in exactly one column:
 * "imported rigged mesh" or, for a 2D game, generated 2D used directly as media.
 * So he is a billboard, never a model, and the painter owns the art. This
 * component loads whichever sprite exists, in order:
 *
 *   pixel-wayfarer-cutout.png            one transparent cutout, feet at the base
 *   pixel-wayfarer-{s,n,e,w}.png         four headings, picked by which way he goes
 *
 * WHEN NONE EXISTS he is built from the same boxes and cones as every prop in
 * the world, at the same three-tone toon ramp. That fallback is not a blank
 * rectangle standing in for a person: it is a hooded figure with a staff and a
 * lit lantern, in the world's own grammar, and it is what ships until the
 * painter delivers. Stated plainly rather than hidden behind a missing texture.
 * The name "the Wayfarer" is a working name and a draft until PG says "that one".
 *
 * The lantern is a real `pointLight` attached where his hand is, with the same
 * warm hex the room's lanterns use. It is the attention light: the mist shader
 * takes its position every frame and everything inside its radius de-mists.
 */

import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { Palette } from "./registers";
import { GEO, toon } from "./toon";
import type { Runtime } from "./runtime";
import { STRIDE } from "./runtime";
import type { HeroModelSpec } from "./HeroModel";

/**
 * The rigged model, loaded only when it is asked for.
 *
 * `?hero=model` is a switch PG has not thrown yet, and drei plus a GLTF loader
 * is a chunk the default route should not carry to draw a painted cutout. Lazy,
 * so the sprite path downloads none of it.
 */
const RiggedHero = lazy(() => import("./HeroModel"));

/** Whether this load asked for the model. Read once: it is a URL, not a state. */
function wantsModel(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return new URLSearchParams(window.location.search).get("hero") === "model";
  } catch {
    return false;
  }
}

const BASE = "/agent-office/characters";
/**
 * About an eighth of the frame's height at the camera's own distance, which is
 * the size the reference makes its walker and the size the brief asks for.
 */
const HEIGHT = 1.72;

type Sprites = { cutout?: THREE.Texture };

/** Loads what is there and reports what it found. A 404 is a fact, not an error. */
function useSprites(): { sprites: Sprites; ready: boolean } {
  const [sprites, setSprites] = useState<Sprites>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    const loader = new THREE.TextureLoader();
    // ONE sprite. Round two loaded four painted headings and drew none of them
    // (the Critic's deduction 9); a billboard that mirrors by heading needs one
    // side view, and the other three were 1.4 MB of nothing.
    const want: [keyof Sprites, string][] = [
      ["cutout", `${BASE}/pixel-wayfarer-cutout.png`],
    ];

    Promise.all(
      want.map(
        ([key, url]) =>
          new Promise<[keyof Sprites, THREE.Texture | null]>((resolve) => {
            loader.load(
              url,
              (tex) => {
                tex.colorSpace = THREE.SRGBColorSpace;
                // Pixel art: never smooth it, that is the whole point of it.
                tex.magFilter = THREE.NearestFilter;
                tex.minFilter = THREE.LinearMipmapLinearFilter;
                tex.generateMipmaps = true;
                resolve([key, tex]);
              },
              undefined,
              () => resolve([key, null]),
            );
          }),
      ),
    ).then((found) => {
      if (!alive) return;
      const out: Sprites = {};
      for (const [key, tex] of found) if (tex) out[key] = tex;
      setSprites(out);
      setReady(true);
    });

    return () => {
      alive = false;
    };
  }, []);

  return { sprites, ready };
}

/** The fallback figure: the world's own boxes and cones, at his size. */
function ProceduralWayfarer({ p }: { p: Palette }) {
  const cloak = "#2E5540";
  const cloakDark = "#1E3A2C";
  const skin = "#F0D8BC";
  return (
    <group>
      {/* Boots. */}
      <mesh geometry={GEO.cyl} material={toon(p.woodDark)} position={[-0.13, 0.11, 0]} scale={[0.2, 0.22, 0.22]} castShadow />
      <mesh geometry={GEO.cyl} material={toon(p.woodDark)} position={[0.13, 0.11, 0]} scale={[0.2, 0.22, 0.22]} castShadow />
      {/* The apron under the cloak: the one pale note, and it reads at distance. */}
      <mesh geometry={GEO.cone} material={toon("#E8DCC0")} position={[0, 0.5, 0.06]} scale={[0.52, 0.72, 0.4]} castShadow />
      {/* Cloak. */}
      <mesh geometry={GEO.cone} material={toon(cloak)} position={[0, 0.56, 0]} scale={[0.64, 0.86, 0.62]} castShadow />
      <mesh geometry={GEO.box} material={toon(cloakDark)} position={[0, 1.02, 0]} scale={[0.52, 0.3, 0.4]} castShadow />
      {/* Head and hood. */}
      <mesh geometry={GEO.sphere} material={toon(skin)} position={[0, 1.28, 0.04]} scale={0.3} castShadow />
      <mesh geometry={GEO.cone} material={toon(cloak)} position={[0, 1.36, -0.03]} scale={[0.42, 0.46, 0.42]} castShadow />
      {/* Staff, in the forward hand. */}
      <mesh
        geometry={GEO.cyl}
        material={toon(p.wood)}
        position={[0.36, 0.82, 0.02]}
        scale={[0.055, 1.9, 0.055]}
        rotation={[0, 0, -0.13]}
        castShadow
      />
    </group>
  );
}

/**
 * Footstep dust. One pooled `Points` cloud, twelve motes, respawned at his feet
 * every stride and never allocated again (`create-game-vfx`: pool, cap, cleanup
 * idempotent). Under reduced motion it does not spawn at all.
 */
function Dust({ rt, color }: { rt: React.RefObject<Runtime>; color: string }) {
  const pts = useRef<THREE.Points>(null);
  const N = 12;

  const { geo, mat, life } = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) pos[i * 3 + 1] = -99;
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const m = new THREE.PointsMaterial({
      color: new THREE.Color(color),
      size: 0.16,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
      sizeAttenuation: true,
    });
    return { geo: g, mat: m, life: new Float32Array(N) };
  }, [color]);

  const cursor = useRef(0);
  const lastStep = useRef(0);

  useFrame((_, dt) => {
    const r = rt.current;
    if (!r || !pts.current) return;
    const attr = geo.getAttribute("position") as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;

    if (!r.reduced && r.moving && r.stepAccum - lastStep.current > STRIDE) {
      lastStep.current = r.stepAccum;
      const i = cursor.current;
      cursor.current = (i + 1) % N;
      arr[i * 3] = r.pos.x + (Math.random() - 0.5) * 0.18;
      arr[i * 3 + 1] = 0.06;
      arr[i * 3 + 2] = r.pos.z + (Math.random() - 0.5) * 0.18;
      life[i] = 1;
    }
    if (!r.moving) lastStep.current = r.stepAccum;

    let any = false;
    for (let i = 0; i < N; i++) {
      if (life[i] <= 0) continue;
      any = true;
      life[i] -= dt * 1.6;
      arr[i * 3 + 1] += dt * 0.22;
      if (life[i] <= 0) arr[i * 3 + 1] = -99;
    }
    mat.opacity = any ? 0.5 : 0;
    attr.needsUpdate = true;
  });

  return <points ref={pts} geometry={geo} material={mat} frustumCulled={false} />;
}

export function Hero({
  rt,
  p,
  lanternColor,
  lanternRange,
  model,
}: {
  rt: React.RefObject<Runtime>;
  p: Palette;
  lanternColor: string;
  lanternRange: number;
  /** The vault's rigged hero, when a world names one. Drawn on `?hero=model`. */
  model: HeroModelSpec | null;
}) {
  const asModel = useMemo(() => wantsModel(), []);
  const group = useRef<THREE.Group>(null);
  const billboard = useRef<THREE.Mesh>(null);
  const figure = useRef<THREE.Group>(null);
  const arm = useRef<THREE.Group>(null);
  const light = useRef<THREE.PointLight>(null);
  const { sprites, ready } = useSprites();
  const camera = useThree((s) => s.camera);

  const sprite = sprites.cutout ?? null;
  const spriteMat = useMemo(() => {
    if (!sprite) return null;
    return new THREE.MeshBasicMaterial({
      map: sprite,
      transparent: true,
      alphaTest: 0.35,
      toneMapped: false,
      side: THREE.DoubleSide,
    });
  }, [sprite]);

  const aspect = useMemo(() => {
    const img = sprite?.image as { width?: number; height?: number } | undefined;
    if (!img?.width || !img?.height) return 0.62;
    return img.width / img.height;
  }, [sprite]);

  useFrame((state, dt) => {
    const r = rt.current;
    if (!r || !group.current) return;

    group.current.position.set(r.pos.x, 0, r.pos.z);

    // Idle bob, and a walk bounce with the same clock so they never fight.
    const t = state.clock.elapsedTime;
    const bob = r.reduced
      ? 0
      : r.moving
        ? Math.abs(Math.sin(t * 9)) * 0.055
        : Math.sin(t * 1.6) * 0.022;
    group.current.position.y = bob;

    // Face by heading. A sprite MIRRORS; it does not rotate, or the pixels shear.
    // The flip lives on the sprite and on the figure, never on the parent group,
    // so the lantern and the shadow are not mirrored twice.
    if (billboard.current) {
      // Billboard on Y only. Tipping it to face a pitched camera would float the
      // feet off the ground, which is the tell that kills a diorama.
      billboard.current.rotation.y = Math.atan2(
        camera.position.x - r.pos.x,
        camera.position.z - r.pos.z,
      );
      billboard.current.scale.x = Math.abs(billboard.current.scale.x) * r.facing;
    }
    if (figure.current) figure.current.scale.x = r.facing;
    if (arm.current) arm.current.position.x = r.facing * 0.6;

    if (light.current) {
      // A gentle flicker: two sines, never noise, so it breathes and never buzzes.
      const f = r.reduced ? 1 : 1 + Math.sin(t * 4.3) * 0.07 + Math.sin(t * 9.7) * 0.04;
      light.current.intensity = 3.1 * f;
      light.current.position.set(r.facing * 0.6, 1.3, 0.1);
    }
    void dt;
  });

  if (asModel && model) {
    return (
      <>
        <Suspense fallback={null}>
          <RiggedHero
            rt={rt}
            spec={model}
            p={p}
            lanternColor={lanternColor}
            lanternRange={lanternRange}
          />
        </Suspense>
        <Dust rt={rt} color={p.paper} />
      </>
    );
  }

  return (
    <>
    <group ref={group}>
      {ready && spriteMat ? (
        <mesh ref={billboard} material={spriteMat} position={[0, HEIGHT / 2, 0]} castShadow>
          <planeGeometry args={[HEIGHT * aspect, HEIGHT]} />
        </mesh>
      ) : ready ? (
        <group ref={figure}>
          <ProceduralWayfarer p={p} />
        </group>
      ) : null}

      {/* The lantern the light comes out of. The painted sprite already has one
          in frame, hanging off the staff, so this only stands in for the
          procedural figure: a light with two lamps is worse than a light with
          one, and a light with none is the thing `author-game-levels` forbids. */}
      <group ref={arm} position={[0.6, 1.3, 0.1]}>
        {!spriteMat && (
          <>
            <mesh geometry={GEO.box} material={toon(p.woodDark)} scale={[0.16, 0.2, 0.16]} />
            <mesh
              geometry={GEO.sphere}
              material={toon(p.flameCore, { noMist: true, emissive: p.flameCore, emissiveIntensity: 1.6 })}
              scale={0.1}
            />
          </>
        )}
      </group>

      <pointLight
        ref={light}
        color={lanternColor}
        distance={lanternRange}
        decay={1.6}
        intensity={3.1}
        castShadow={false}
      />

      {/* A soft contact shadow under him, so he stands on the plane even where
          the directional shadow map is thin. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]}>
        <circleGeometry args={[0.44, 16]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.2} depthWrite={false} />
      </mesh>

    </group>
    {/* Dust is written in WORLD coordinates, so it lives beside him rather than
        inside his group: a child would have every puff dragged along by the
        walker it is supposed to be left behind by. */}
    <Dust rt={rt} color={p.paper} />
    </>
  );
}
