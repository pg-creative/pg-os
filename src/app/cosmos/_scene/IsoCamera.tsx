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
 * The portrait pitch: FOURTEEN degrees, which is a degree and a half SHALLOWER
 * than the desk, and round three had it two degrees steeper.
 *
 * Round three reasoned that a tall frame wants more ground, pitched down to
 * 17.5, and got a phone picture with an eleven percent strip of sky at the top
 * and lavender murk under it. PG's own plate is the argument against: half of
 * `04-twilight-shrine` is plum sky with cream in it, and that sky is most of
 * why the plate is beautiful. A portrait frame has the height to spend on it.
 *
 * At 14 degrees the horizon lands at 0.594 in clip space and the sky band is
 * 20.3 percent of the glass, which is the reference's own proportion. What pays
 * for it is the forward bias below: the ground that used to sit under him now
 * sits ahead of him, so nothing is lost to the swap except the lawn behind his
 * back, which nobody was walking to.
 *
 * The depths' red moon no longer constrains this. `Sky.tsx` derives its
 * elevation from the pitch in use so the disc lands at the same 0.80 of clip
 * space at every pitch, which is the fix round three named and left.
 */
export const PITCH_NARROW = 0.2443;

/** The pitch this viewport gets. One switch, and the camera eases across it. */
export function pitchFor(width: number, height: number): number {
  const aspect = width / Math.max(height, 1);
  return aspect < NARROW_ASPECT ? PITCH_NARROW : PITCH;
}

export const MIN_ZOOM = 0.62;
export const MAX_ZOOM = 2.0;

const TAN_HALF_FOV = Math.tan(((FOV / 2) * Math.PI) / 180);

/** The wide rule: back off gently with the aspect, between 17 and 30 units. */
function wideDistance(aspect: number): number {
  return Math.min(30, Math.max(17, 19 * Math.pow(1.6 / aspect, 0.45)));
}

/**
 * How far back a phone held upright stands. PG'S NUMBER, NOT A DERIVED ONE.
 *
 * Round three chose the other side of this trade and PG opened it in bed:
 * "It's awful", "That's like inoperably bad r u fr". The Wayfarer was 36 px on
 * an 844 px frame. The instruction that replaced it names pixels: "90 to 130 px
 * tall on the phone glass".
 *
 * THE TRADE IS ABSOLUTE AND IT IS WORTH WRITING DOWN, because the previous pass
 * spent a round discovering it the expensive way. Under a perspective camera the
 * ground WIDTH across the glass and the hero's FRACTION of the frame are locked
 * together by geometry alone:
 *
 *     width_across = hero_height * aspect / hero_fraction
 *
 * No lens and no distance changes that product. On a 0.462 frame with him at an
 * eighth of the height, the world is about six metres across, full stop. Round
 * three bought eight metres either side of him and paid for it with a 36 px
 * speck. This round buys the character and pays with the width.
 *
 * What makes the width affordable is DEPTH, which the same geometry gives away
 * free: at a shallow pitch the frame's vertical extent runs all the way to the
 * horizon, so a portrait phone is a corridor rather than a keyhole. That only
 * reads if the corridor is pointed AHEAD of him, which is what `heroNdcY` below
 * is for. The two changes are one change; neither works alone.
 *
 * 18 units, measured: 116 px at 390 by 844, in the middle of PG's band.
 */
const NARROW_DISTANCE = 18;

/** 0 at a wide frame, 1 at a phone held upright, smooth across the middle. */
function narrowness(aspect: number): number {
  const t = Math.min(1, Math.max(0, (0.85 - aspect) / 0.3));
  return t * t * (3 - 2 * t);
}

/**
 * How far back the camera sits at zoom 1, for a viewport of this shape.
 *
 * Desktop lands at 19 units, unchanged, which puts the Wayfarer at about an
 * eighth of the frame's height: he is a person in a valley, not a portrait.
 * A phone lands at 18. The two are blended across aspect 0.85 to 0.55 rather
 * than switched at a threshold, because an iPad turning over used to cross a
 * step of nine units in one frame.
 */
export function baseDistance(width: number, height: number): number {
  const aspect = Math.max(0.3, width / Math.max(height, 1));
  const wide = wideDistance(aspect);
  return wide + (NARROW_DISTANCE - wide) * narrowness(aspect);
}

/**
 * WHERE HIS FEET LAND ON THE GLASS, in clip space. The composition, as a number.
 *
 * Round three left the look-at centred on him, and named the consequence in its
 * own notes without fixing it: "the bottom of a portrait frame is the empty
 * ground BEHIND him ... about 40 percent of the picture". Forty percent of a
 * phone screen spent on lawn nobody is walking to.
 *
 * The reference (Crayon's "Where the Wind Wanders") puts its heroine about
 * three fifths of the way down and gives everything above her to the valley.
 * PG's own plate does the same: the flute player sits low and right, and the
 * whole upper half is sky and hills.
 *
 * So this is the target, and the bias needed to hit it is SOLVED each frame
 * rather than dialled in, which is what keeps it true under zoom. Desktop's
 * number is -0.185 because that is where a 19 unit, 15.5 degree camera already
 * puts him with no bias at all: the wide frame is unchanged by construction,
 * and zooming out no longer drifts him toward the middle.
 */
const HERO_NDC_Y_WIDE = -0.185;
const HERO_NDC_Y_NARROW = -0.45;

export function heroNdcY(width: number, height: number): number {
  const aspect = Math.max(0.3, width / Math.max(height, 1));
  const t = narrowness(aspect);
  return HERO_NDC_Y_WIDE + (HERO_NDC_Y_NARROW - HERO_NDC_Y_WIDE) * t;
}

/**
 * How far AHEAD of him the look-at sits, so his feet land on `wantNdcY`.
 *
 * Closed form, no damping, no guess. The camera stands `d cos(pitch)` of ground
 * behind the look-at at height `d sin(pitch) + lookY`; a ground point at range
 * R from it is depressed `atan(h/R)` below horizontal and therefore lands at
 * `tan(pitch - atan(h/R)) / tan(fov/2)` in clip space. Set that equal to the
 * target and R falls out; the bias is the difference.
 *
 * Clamped at zero because a wide frame must never pull the look-at BEHIND him:
 * that is the one direction this could regress the desktop.
 */
function forwardBias(dist: number, pitch: number, lookY: number, wantNdcY: number): number {
  const h = dist * Math.sin(pitch) + lookY;
  const a = Math.atan(wantNdcY * TAN_HALF_FOV);
  const drop = pitch - a;
  if (drop <= 0.02) return 0;
  const R = h / Math.tan(drop);
  return Math.max(0, dist * Math.cos(pitch) - R);
}

/** As far as two fingers may carry the look-at off the Wayfarer, in metres. */
export const PAN_MAX = 12;

/**
 * How much wider the establishing shot stands, as a fraction of the play frame.
 *
 * 0.42 at 18 units is 25.6, which on a phone is the valley and the hall with
 * him small in it, and the ease into 18 is the world coming to meet you. Small
 * on purpose: a cold load has about a second and a half of anybody's patience,
 * and a camera that travels a long way in that time reads as a cutscene rather
 * than as the picture settling.
 */
const ENTRY_PULL = 0.42;
/** Seconds the establishing shot takes to hand the frame over. */
export const ENTRY_SECONDS = 2.6;

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
  /** Where his feet belong on the glass for a viewport this shape. */
  const wantNdcY = useMemo(
    () => heroNdcY(size.width, size.height),
    [size.width, size.height],
  );
  /** Screen-up on the ground, at this yaw. The bias runs along it. */
  const fwd = useMemo(
    () => ({ x: -Math.sin(CAM_YAW), z: -Math.cos(CAM_YAW) }),
    [],
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
      // SCREEN RIGHT AND SCREEN UP, ON THE GROUND, and both signs matter.
      //
      // The camera looks along `f = (-sin yaw, 0, -cos yaw)` across the plane,
      // so screen-right is `cross(f, up) = (cos yaw, 0, -sin yaw)` and screen-up
      // on the ground is `f` itself. The first pass had the right vector
      // NEGATED and the two axes then disagreed with each other: dragging
      // sideways moved the camera and dragging up and down moved the world, on
      // the same two fingers, in the same gesture.
      //
      // Drag the world, on both axes: the ground under the fingers goes where
      // the fingers go, so the target goes the other way. Screen y grows
      // downward, which is the second sign.
      const rx = Math.cos(CAM_YAW);
      const rz = -Math.sin(CAM_YAW);
      const ux = -Math.sin(CAM_YAW);
      const uz = -Math.cos(CAM_YAW);
      r.pan.set(
        panStart.x - dx * rx + dy * ux,
        0,
        panStart.z - dx * rz + dy * uz,
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

    // THE ESTABLISHING SHOT. `r.entry` runs 1 to 0 over the first beat of a
    // cold load, and while it is above zero the camera stands further back and
    // eases in. Nothing else in the scene knows about it: the frame just opens.
    const want = base * r.zoom * (1 + ENTRY_PULL * r.entry);
    r.dist += (want - r.dist) * (r.reduced ? 1 : Math.min(1, dt * 4));

    // AND HIS FEET LAND WHERE THE COMPOSITION WANTS THEM. Solved from the
    // distance in use, so a pinch does not slide him up the glass, and pushed
    // along the camera's own forward on the ground, so he keeps the same spot
    // on screen whichever way he is walking.
    const bias = forwardBias(r.dist, pitch, look.current.y, wantNdcY);
    const tx = look.current.x + r.pan.x + fwd.x * bias;
    const tz = look.current.z + r.pan.z + fwd.z * bias;
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
