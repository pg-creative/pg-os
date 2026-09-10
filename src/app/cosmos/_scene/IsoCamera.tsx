"use client";

/**
 * The three-quarter camera, LOWERED so the world has a horizon.
 *
 * FOLLOWS: `build-game-camera-controls`. One authoritative target (the Wayfarer,
 * and nothing else ever takes the camera), position and look-at smoothed
 * independently, zoom clamped, reduced motion honoured, and on touch the camera
 * gesture is separated from the movement gesture with a reset framing that puts
 * it back ("separate camera gesture zones from movement/action controls and
 * provide reset framing").
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
 * So: 15.5 degrees of pitch behind a 44 degree lens on a desktop, 17.5 on a
 * phone held upright, and the lens never changes. The brief asked for 35; 35
 * does not have a sky in it, and the sky was the point. Said plainly in NOTES.md.
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
/**
 * 15.5 degrees down. Above this the sky leaves the frame.
 *
 * The arithmetic that sets it: the top edge of the frame sits at (fov/2 - pitch)
 * degrees of ELEVATION, so a 44 degree lens pitched 15.5 degrees down shows six
 * and a half degrees of sky, and the horizon lands at 0.686 in clip space, about
 * a sixth of the frame from the top. That is where the reference puts its own
 * treeline. Every number that stands on the horizon (the backdrop's height, the
 * ground's haze stop) is derived from this one.
 */
export const PITCH = 0.2705;
/** The lens. Fixed across every device so the perspective read never changes. */
export const FOV = 44;
/** Where the horizon lands in clip space, given the two numbers above. */
export const HORIZON_NDC =
  Math.tan(PITCH) / Math.tan(((FOV / 2) * Math.PI) / 180);

/**
 * Below this aspect the viewport is a phone held upright, and two things change.
 * 16:10 is 1.6, a landscape phone is 2.16, an iPad upright is 0.75, and an
 * iPhone upright is 0.46.
 */
export const NARROW_ASPECT = 0.75;

/**
 * The portrait pitch: TWO degrees steeper, and two is the whole budget.
 *
 * A phone held upright spends 44 degrees of lens on the short way across a tall
 * frame, so at 15.5 degrees the top sixth of it is empty sky and the world is a
 * letterbox in the middle. Every degree of pitch trades sky for ground: at 17.5
 * the horizon moves from 0.686 to 0.780 in clip space and the sky band goes from
 * 15.7 percent of the frame to 11.
 *
 * WHY IT STOPS AT TWO, and this is arithmetic rather than taste. The depths' red
 * moon hangs at a FIXED elevation (`Sky.tsx MOON_ELEV_DEG`, 2.4 degrees, chosen
 * against the desktop pitch) and a direction at elevation e lands at NDC
 * `tan(e + pitch) / (cos(h) * tan(fov/2))`. Pitching down pushes the moon UP the
 * frame: 0.80 at 15.5 degrees, 0.90 at 17.5, and 1.00 at 19.5, which is the top
 * edge. Its disc is 0.12 NDC across. So 17.5 leaves the whole moon between the
 * horizon and the frame's top with room either side, and 19.5 would have posted
 * a phone leg that says the moon is in the band while it sat outside the glass.
 */
export const PITCH_NARROW = 0.3054;

/** The pitch this viewport gets. One switch, and the camera eases across it. */
export function pitchFor(width: number, height: number): number {
  const aspect = width / Math.max(height, 1);
  return aspect < NARROW_ASPECT ? PITCH_NARROW : PITCH;
}

export const MIN_ZOOM = 0.62;
export const MAX_ZOOM = 2.0;
/** As far back as a narrow frame is ever allowed to stand. */
const MAX_NARROW_DISTANCE = 46;

const TAN_HALF_FOV = Math.tan(((FOV / 2) * Math.PI) / 180);

/** The wide rule: back off gently with the aspect, between 17 and 30 units. */
function wideDistance(aspect: number): number {
  return Math.min(30, Math.max(17, 19 * Math.pow(1.6 / aspect, 0.45)));
}

/**
 * How much ground stands either side of him at the threshold aspect.
 *
 * DERIVED, so the two rules below meet without a step in them. The wide rule at
 * exactly 0.75 puts the camera 26.6 units back, and a 44 degree lens on a 0.75
 * frame is 8.06 units of half-width at that distance. The narrow rule holds that
 * number and solves for the distance instead, which is the whole fix: a phone
 * gets the same eight metres of ground around him that a tablet does, by
 * standing further back, and never by opening the lens.
 */
const NARROW_HALF_WIDTH =
  wideDistance(NARROW_ASPECT) * TAN_HALF_FOV * NARROW_ASPECT;

/**
 * How far back the camera sits at zoom 1, for a viewport of this shape.
 *
 * Desktop lands at 19 units, which puts the Wayfarer at about an eighth of the
 * frame's height: he is a person in a valley, not a portrait.
 *
 * A PHONE HELD UPRIGHT IS A DIFFERENT PROBLEM, and round three's phone leg is
 * what found it. The lens is fixed, so a 0.46 frame has ten and a half degrees
 * of horizontal field either side of the axis; at the old 30 unit ceiling that
 * is five and a half metres of ground across the whole screen, which is a
 * keyhole with nothing in it to walk to. The ceiling was the bug. Below 0.75 the
 * distance is driven by the WIDTH he needs rather than by a curve fitted to
 * desktop aspects: about eight metres either side of him, which on a 390 by 844
 * phone is 43 units back. He is smaller (36 px of an 844 px frame, which is the
 * same tenth of the SHORT edge a desktop gives him) and the hall is on screen
 * from the spawn, which is the thing that makes it playable.
 */
export function baseDistance(width: number, height: number): number {
  const aspect = Math.max(0.3, width / Math.max(height, 1));
  if (aspect >= NARROW_ASPECT) return wideDistance(aspect);
  return Math.min(MAX_NARROW_DISTANCE, NARROW_HALF_WIDTH / (TAN_HALF_FOV * aspect));
}

/** As far as two fingers may carry the look-at off the Wayfarer, in metres. */
export const PAN_MAX = 12;

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

  const pitch = useMemo(() => pitchFor(size.width, size.height), [size.width, size.height]);

  /** Where the camera stands, as a unit vector off the target. */
  const wantDir = useMemo(
    () =>
      new THREE.Vector3(
        Math.sin(CAM_YAW) * Math.cos(pitch),
        Math.sin(pitch),
        Math.cos(CAM_YAW) * Math.cos(pitch),
      ).normalize(),
    [pitch],
  );
  /** The live one, eased toward it, so a rotation is a camera move and not a cut. */
  const dir = useRef(wantDir.clone());
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

  /**
   * TWO FINGERS ARE THE CAMERA. One finger is the world.
   *
   * `build-game-camera-controls` asks for the camera gesture to be separate from
   * the movement gesture, and on a screen with no room for a second zone the
   * separation is the finger count: one finger walks (the Conductor's tap), two
   * frame. Pinching scales the same `zoom` the wheel writes, so a phone and a
   * mouse cannot end up with different limits; the centroid drags the look-at
   * off him by at most `PAN_MAX` metres and it eases home the moment both
   * fingers leave, which is the reset framing that costs nothing to discover.
   *
   * The arithmetic for the drag is the real one rather than a damped guess: a
   * pixel across the frame is `2 * d * tan(fov/2) / height` metres at the
   * look-at plane, and a pixel UP the frame covers that over `sin(pitch)` of
   * ground because the plane is tilted away. So the ground stays under the
   * fingers, which is the only version of this that feels like anything.
   */
  useEffect(() => {
    const el = gl.domElement;
    const pts = new Map<number, { x: number; y: number }>();
    let pinchDist = 0;
    let pinchZoom = 1;
    const panFrom = { x: 0, y: 0 };
    const panStart = new THREE.Vector3();

    const two = () => {
      const [a, b] = [...pts.values()];
      return {
        d: Math.hypot(a.x - b.x, a.y - b.y),
        cx: (a.x + b.x) / 2,
        cy: (a.y + b.y) / 2,
      };
    };

    const down = (e: PointerEvent) => {
      if (e.pointerType !== "touch") return;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size !== 2) return;
      const r = rt.current;
      if (!r) return;
      // A second finger is a camera gesture, so whatever the first one asked the
      // walker to do is cancelled: nobody pinches and means "walk over there".
      r.dest = null;
      r.intent = null;
      r.panning = true;
      const t = two();
      pinchDist = Math.max(1, t.d);
      pinchZoom = r.zoom;
      panFrom.x = t.cx;
      panFrom.y = t.cy;
      panStart.copy(r.pan);
    };

    const move = (e: PointerEvent) => {
      if (e.pointerType !== "touch" || !pts.has(e.pointerId)) return;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const r = rt.current;
      if (!r || !r.panning || pts.size < 2) return;
      const t = two();
      r.zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, pinchZoom * (pinchDist / Math.max(1, t.d))));

      const rect = el.getBoundingClientRect();
      const mPerPx = (2 * r.dist * TAN_HALF_FOV) / Math.max(1, rect.height);
      const dx = (t.cx - panFrom.x) * mPerPx;
      // The plane is tilted away, so a pixel up the frame is more ground than a
      // pixel across it. `sin(pitch)` is exactly how much more.
      const dy = ((t.cy - panFrom.y) * mPerPx) / Math.max(0.2, Math.sin(pitch));
      // Screen right and screen up, on the ground, at this yaw. Drag the world:
      // the ground goes the way the fingers go, so the target goes the other.
      const rx = -Math.cos(CAM_YAW);
      const rz = Math.sin(CAM_YAW);
      const ux = -Math.sin(CAM_YAW);
      const uz = -Math.cos(CAM_YAW);
      r.pan.set(
        panStart.x - (dx * rx - dy * ux),
        0,
        panStart.z - (dx * rz - dy * uz),
      );
      if (r.pan.length() > PAN_MAX) r.pan.setLength(PAN_MAX);
    };

    const up = (e: PointerEvent) => {
      if (e.pointerType !== "touch") return;
      pts.delete(e.pointerId);
      if (pts.size < 2 && rt.current) rt.current.panning = false;
    };

    el.addEventListener("pointerdown", down, { passive: true });
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerup", up, { passive: true });
    window.addEventListener("pointercancel", up, { passive: true });
    return () => {
      el.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      if (rt.current) rt.current.panning = false;
    };
  }, [gl, rt, pitch]);

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

    // Two fingers hold it off him; letting go brings it home over a third of a
    // second. Reduced motion gets there in one frame, like everything else here.
    if (!r.panning && r.pan.lengthSq() > 1e-6) {
      if (r.reduced) r.pan.set(0, 0, 0);
      else r.pan.multiplyScalar(Math.max(0, 1 - Math.min(1, dt * 3.4)));
    }

    // The pitch changes when the phone turns over. Easing the direction vector
    // makes that a camera move rather than a cut, and costs one lerp a frame.
    if (r.reduced) dir.current.copy(wantDir);
    else dir.current.lerp(wantDir, Math.min(1, dt * 4)).normalize();

    const want = base * r.zoom;
    r.dist += (want - r.dist) * (r.reduced ? 1 : Math.min(1, dt * 4));

    const tx = look.current.x + r.pan.x;
    const tz = look.current.z + r.pan.z;
    r.target.set(tx, look.current.y, tz);
    if (target.current) target.current.copy(r.target);

    const d = r.dist;
    camera.position.set(
      tx + dir.current.x * d,
      look.current.y + dir.current.y * d,
      tz + dir.current.z * d,
    );
    camera.lookAt(r.target);
  });

  return null;
}
