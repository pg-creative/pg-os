"use client";

/**
 * A painted cutout as a billboard, and the rule for when there isn't one.
 *
 * EXTENDS Forge `components/painted-billboards/Cutout.tsx` (MIT, PG's own): an
 * `alphaTest` plane that faces the camera around Y, casts and receives soft
 * shadows, and optionally sways in the wind. Two things are added here, both
 * because this world is read off a vault that is still being painted.
 *
 * 1. THE PROBE. A cutout the painter has not delivered yet is a 404, not an
 *    error, and it must not stall the scene or blank a room. `useCutout` tries
 *    the URL once per session, caches the answer for every other prop of the
 *    same kind, and reports `loading | ok | missing`. Callers render the
 *    procedural factory while it is loading and forever if it is missing, so the
 *    world is complete at first paint and gets better when the paint lands.
 *
 * 2. THE GROUND CONTACT. A painted prop is cut with its feet on the bottom edge
 *    of the image, so the plane is anchored at its base rather than its centre
 *    and never floats. A tiny forward lean toward the camera keeps the base from
 *    z-fighting the plane it stands on.
 *
 * `unlit` is the default because a painted cutout already carries its own light,
 * and lambert shading a painting a second time is how these worlds go muddy.
 * Fog still reaches it: a basic material takes fog, which is what puts a distant
 * pine into the haze with everything else.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { attachWind } from "./wind";

type Status = "loading" | "ok" | "missing";

const CACHE = new Map<string, { status: Status; tex: THREE.Texture | null }>();
const WAITING = new Map<string, Promise<void>>();

/** The vault's cutout for one prop in one world, or the news that there isn't one. */
export function cutoutUrl(worldId: string, prop: string): string {
  return `/api/cosmos/asset/vault/worlds/${worldId}/cutouts/${prop}`;
}

/**
 * WHEN THE SCENE IS ALLOWED TO GO LOOKING, and why it usually is not.
 *
 * Chrome writes "Failed to load resource: 404" to the console for any request
 * that misses, `fetch` included, and there is no way to suppress it. The brief's
 * bar is zero console errors. A world with no cutouts yet would spend twenty of
 * them per load announcing paintings that do not exist, which is a worse trade
 * than drawing the procedural prop silently.
 *
 * So the scene asks the VAULT what it has: `world.cutouts`, a list of prop words
 * the reader saw on disk. A world that lists them gets its paintings with no
 * probing at all. A world that lists nothing gets the factories, in silence.
 *
 * `?cutouts=probe` turns the old behaviour back on for one load, which is how
 * the harness proves the billboard path works before the manifest carries the
 * field. It is a review flag, never the route's default.
 */
export function cutoutsAllowed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return new URLSearchParams(window.location.search).get("cutouts") === "probe";
  } catch {
    return false;
  }
}

export function useCutout(url: string | null): {
  status: Status;
  tex: THREE.Texture | null;
} {
  const [, bump] = useState(0);
  const entry = url ? CACHE.get(url) : undefined;

  useEffect(() => {
    if (!url || CACHE.has(url)) return;
    let alive = true;
    let p = WAITING.get(url);
    if (!p) {
      // `fetch`, not `TextureLoader`, for one reason: an <img> that 404s prints
      // "Failed to load resource" to the console, and a painting the painter has
      // not delivered yet is a FACT, not an error. The brief's bar is zero
      // console errors, and a world that is honest about what it does not have
      // yet must not spend that budget saying so forty times.
      p = fetch(url)
        .then((res) => (res.ok ? res.blob() : Promise.reject(new Error("absent"))))
        // `imageOrientation: flipY` at decode, and `flipY = false` on the
        // texture. three's own flip is `UNPACK_FLIP_Y_WEBGL`, which WebGL
        // ignores for an ImageBitmap source: the first backdrop off this path
        // hung upside down across the top of the sky.
        .then((blob) => createImageBitmap(blob, { imageOrientation: "flipY" }))
        .then((bitmap) => {
          const tex = new THREE.Texture(bitmap);
          tex.flipY = false;
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.anisotropy = 4;
          tex.generateMipmaps = true;
          tex.minFilter = THREE.LinearMipmapLinearFilter;
          tex.needsUpdate = true;
          CACHE.set(url, { status: "ok", tex });
        })
        .catch(() => {
          CACHE.set(url, { status: "missing", tex: null });
        });
      WAITING.set(url, p);
    }
    void p.then(() => {
      if (alive) bump((n) => n + 1);
    });
    return () => {
      alive = false;
    };
  }, [url]);

  if (!url) return { status: "missing", tex: null };
  return entry ?? { status: "loading", tex: null };
}

export function Cutout({
  tex,
  height,
  at = [0, 0, 0],
  face = false,
  yaw = 0,
  wind = 0,
  flip = false,
  tint = "#ffffff",
  shadow = true,
}: {
  tex: THREE.Texture;
  /** World height in units; width follows the image aspect. */
  height: number;
  at?: [number, number, number];
  /** Face the camera around Y. Foliage usually keeps a fixed yaw instead. */
  face?: boolean;
  yaw?: number;
  wind?: number;
  flip?: boolean;
  tint?: string;
  shadow?: boolean;
}) {
  const { camera } = useThree();
  const mesh = useRef<THREE.Mesh>(null);
  const img = tex.image as { width?: number; height?: number } | undefined;
  const aspect = img?.width && img?.height ? img.width / img.height : 0.7;
  const width = height * aspect;

  const material = useMemo(() => {
    const m = new THREE.MeshBasicMaterial({
      map: tex,
      alphaTest: 0.45,
      transparent: false,
      side: THREE.DoubleSide,
      color: new THREE.Color(tint),
      fog: true,
    });
    if (wind > 0) attachWind(m, wind);
    return m;
  }, [tex, tint, wind]);

  useFrame(() => {
    const m = mesh.current;
    if (!m) return;
    if (face) {
      // Around Y only, so the sprite never tilts with the camera and the feet
      // never leave the plane. That tilt is the tell that kills a diorama.
      m.rotation.y = Math.atan2(
        camera.position.x - m.position.x,
        camera.position.z - m.position.z,
      );
    }
  });

  return (
    <mesh
      ref={mesh}
      position={[at[0], at[1] + height / 2, at[2]]}
      rotation={[0, face ? 0 : yaw, 0]}
      scale={[flip ? -1 : 1, 1, 1]}
      material={material}
      castShadow={shadow}
      receiveShadow={false}
    >
      <planeGeometry args={[width, height, 1, wind > 0 ? 6 : 1]} />
    </mesh>
  );
}
