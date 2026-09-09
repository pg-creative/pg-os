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
const PITCH = 0.86; // about 49 degrees down, the reference's read
export const MIN_DIST = 28;
export const MAX_DIST = 76;

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
  const size = useThree((s) => s.size);
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

  /**
   * A phone is a keyhole if the camera keeps a fixed vertical field: at 390 by
   * 844 a 26 degree vertical fov shows about six metres of ground across, and
   * the shrine roof becomes the entire screen. So the camera holds a constant
   * WIDTH instead. Where that would need a fov wide enough to break the
   * isometric read, the fov stops at 34 degrees and the camera backs off by
   * exactly the amount the fov did not give.
   */
  const frame = useMemo(() => {
    const aspect = Math.max(0.35, size.width / Math.max(size.height, 1));
    // A phone shows LESS of the world than a desktop, not the same amount at a
    // sixth of the scale. 0.72 of the desktop width is about what a thumb can
    // reach across and still see a room.
    const narrow = aspect < 1 ? 0.72 : 1;
    const halfW = Math.tan((26 * Math.PI) / 180 / 2) * (1440 / 900) * narrow;
    let fov = (2 * Math.atan(halfW / aspect) * 180) / Math.PI;
    let pull = 1;
    if (fov > 34) {
      pull = Math.tan((fov * Math.PI) / 180 / 2) / Math.tan((34 * Math.PI) / 180 / 2);
      fov = 34;
    }
    return { fov, pull };
  }, [size.width, size.height]);

  useFrame((_, dt) => {
    const r = rt.current;
    if (!r) return;

    if (Math.abs(camera.fov - frame.fov) > 0.01) {
      camera.fov = frame.fov;
      camera.updateProjectionMatrix();
    }

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

    const d = r.dist * frame.pull;
    camera.position.set(
      look.current.x + dir.x * d,
      look.current.y + dir.y * d,
      look.current.z + dir.z * d,
    );
    camera.lookAt(look.current);
  });

  return null;
}
