"use client";

/**
 * The isometric three-quarter camera.
 *
 * FOLLOWS: `build-game-camera-controls`. One authoritative target (the Wayfarer,
 * and nothing else ever takes the camera), position and look-at smoothed
 * independently, zoom clamped, reduced motion honoured by cutting the smoothing
 * and holding still.
 *
 * NARROW-FOV PERSPECTIVE, NOT ORTHOGRAPHIC, and the reason is the miniature. At
 * 26 degrees from thirty metres out the vanishing is almost gone, so the world
 * reads isometric; but a perspective camera has a real near and far plane, which
 * is what a depth-of-field pass needs to compute a circle of confusion. An
 * orthographic camera looks the part and then the tilt-shift has nothing to bite
 * on, and tilt-shift is the whole diorama.
 *
 * The offset is a 45 degree yaw and about a 42 degree pitch: the same read as the
 * reference, which is the grammar being repurposed, at our own distance.
 */

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { Runtime } from "./runtime";

/** Yaw of the camera around the target, in radians. 45 degrees. */
export const CAM_YAW = Math.PI / 4;
const PITCH = 0.74; // about 42 degrees down
export const MIN_DIST = 17;
export const MAX_DIST = 46;

export function IsoCamera({
  rt,
  target,
}: {
  rt: React.RefObject<Runtime>;
  /** Shared with Ground, which rides it. Written here, read there. */
  target: React.RefObject<THREE.Vector3>;
}) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const gl = useThree((s) => s.gl);
  const dir = useMemo(
    () =>
      new THREE.Vector3(
        Math.sin(CAM_YAW) * Math.cos(PITCH),
        Math.sin(PITCH),
        Math.cos(CAM_YAW) * Math.cos(PITCH),
      ).normalize(),
    [],
  );
  const look = useRef(new THREE.Vector3(0, 0.9, 0));

  // Wheel zoom, clamped. The canvas swallows the gesture so the page cannot
  // scroll underneath a world that has no scroll.
  useEffect(() => {
    const el = gl.domElement;
    const onWheel = (e: WheelEvent) => {
      const r = rt.current;
      if (!r) return;
      e.preventDefault();
      r.distWanted = Math.min(
        MAX_DIST,
        Math.max(MIN_DIST, r.distWanted + Math.sign(e.deltaY) * 2.2),
      );
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [gl, rt]);

  useFrame((_, dt) => {
    const r = rt.current;
    if (!r) return;

    // Look-at leads the walker very slightly, so the frame opens in the
    // direction he is going rather than dragging behind him.
    const wantX = r.pos.x + r.vel.x * 0.22;
    const wantZ = r.pos.z + r.vel.z * 0.22;

    const k = r.reduced ? 1 : Math.min(1, dt * 3.4);
    look.current.x += (wantX - look.current.x) * k;
    look.current.z += (wantZ - look.current.z) * k;
    look.current.y = 0.9;

    r.dist += (r.distWanted - r.dist) * (r.reduced ? 1 : Math.min(1, dt * 4));
    r.target.copy(look.current);
    if (target.current) target.current.copy(look.current);

    camera.position.set(
      look.current.x + dir.x * r.dist,
      look.current.y + dir.y * r.dist,
      look.current.z + dir.z * r.dist,
    );
    camera.lookAt(look.current);
  });

  return null;
}
