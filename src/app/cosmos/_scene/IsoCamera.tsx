"use client";

/**
 * The three-quarter camera, LOWERED so the world has a horizon.
 *
 * FOLLOWS: `build-game-camera-controls`. One authoritative target (the Wayfarer,
 * and nothing else ever takes the camera), position and look-at smoothed
 * independently, zoom clamped, reduced motion honoured.
 *
 * THE ONE NUMBER THAT MATTERS. Round two pitched the camera 49 degrees down
 * behind a 26 degree lens, and the Critic found the consequence: the top edge of
 * the frame was 36 degrees BELOW the horizon, so the sky shader drew to no
 * visible pixel, the red moon never showed and the hour could not have mattered
 * if it had been read. The horizon sits at screen height `tan(pitch) /
 * tan(fov/2)` in clip space, so the sky is in frame only while the pitch is
 * smaller than half the field. There is no third option: 35 degrees down behind
 * any sane lens is still a picture of the floor.
 *
 * So: 18 degrees of pitch behind a 44 degree lens. The horizon lands at 0.80 in
 * clip space, about a tenth of the frame from the top, which is where the
 * reference (a painted meadow, three.js, a cottage on a path) puts it, and the
 * lens is the reference's own 43 degrees. The brief asked for 35; 35 does not
 * have a sky in it, and the sky was the point. Said plainly in NOTES.md.
 *
 * A perspective camera, still, and still for the depth of field: an orthographic
 * frame has no near and far for a circle of confusion to bite on, and tilt-shift
 * is the whole diorama.
 */

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { Runtime } from "./runtime";

/** Yaw of the camera around the target, in radians. 45 degrees. */
export const CAM_YAW = Math.PI / 4;
/** 18 degrees down. Above this the sky leaves the frame. */
export const PITCH = 0.3142;
/** The lens. Fixed across every device so the perspective read never changes. */
export const FOV = 44;
/** Where the horizon lands in clip space, given the two numbers above. */
export const HORIZON_NDC =
  Math.tan(PITCH) / Math.tan(((FOV / 2) * Math.PI) / 180);

export const MIN_ZOOM = 0.62;
export const MAX_ZOOM = 2.0;

/**
 * How far back the camera sits at zoom 1, for a viewport of this shape.
 *
 * Desktop lands at 19 units, which puts the Wayfarer at about an eighth of the
 * frame's height: he is a person in a valley, not a portrait. A phone is a
 * keyhole at that distance, so the camera backs off with the aspect and shows
 * less width at more distance rather than the same width through a fisheye.
 */
export function baseDistance(width: number, height: number): number {
  const aspect = Math.max(0.3, width / Math.max(height, 1));
  const d = 19 * Math.pow(1.6 / aspect, 0.45);
  return Math.min(30, Math.max(17, d));
}

export function IsoCamera({
  rt,
  target,
}: {
  rt: React.RefObject<Runtime>;
  /** Shared with Ground and Sky, which ride it. Written here, read there. */
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

  const base = useMemo(
    () => baseDistance(size.width, size.height),
    [size.width, size.height],
  );

  // Wheel zoom, clamped. The canvas swallows the gesture so the page cannot
  // scroll underneath a world that has no scroll.
  useEffect(() => {
    const el = gl.domElement;
    const onWheel = (e: WheelEvent) => {
      const r = rt.current;
      if (!r) return;
      e.preventDefault();
      r.zoom = Math.min(
        MAX_ZOOM,
        Math.max(MIN_ZOOM, r.zoom + Math.sign(e.deltaY) * 0.08),
      );
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [gl, rt]);

  useEffect(() => {
    if (Math.abs(camera.fov - FOV) > 0.01) {
      camera.fov = FOV;
      camera.updateProjectionMatrix();
    }
  }, [camera]);

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
    // Look a little above his head, not at his feet: at this pitch, aiming at
    // the plane puts the horizon higher than it belongs and wastes the frame on
    // the ground three metres in front of him.
    look.current.y = 1.5;

    const want = base * r.zoom;
    r.dist += (want - r.dist) * (r.reduced ? 1 : Math.min(1, dt * 4));
    r.target.copy(look.current);
    if (target.current) target.current.copy(look.current);

    const d = r.dist;
    camera.position.set(
      look.current.x + dir.x * d,
      look.current.y + dir.y * d,
      look.current.z + dir.z * d,
    );
    camera.lookAt(look.current);
  });

  return null;
}
