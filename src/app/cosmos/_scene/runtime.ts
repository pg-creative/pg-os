"use client";

/**
 * The runtime: one mutable object the whole scene reads and writes per frame.
 *
 * FOLLOWS: `optimize-threejs-games` ("avoid per-frame allocation ... throttle
 * noncritical UI updates"). None of this is React state. A walking hero at 60 fps
 * would re-render the tree sixty times a second and the HUD with it; instead the
 * scene mutates these vectors in `useFrame` and the HUD samples them on a slow
 * interval. React only hears about things that actually change: which page is
 * open, which biome he is in, what is in the satchel.
 *
 * `build-isometric-arpg` asks for simulation state that is "deterministic and
 * serializable where possible". Position and heading are; everything else is
 * derived from them each frame.
 */

import * as THREE from "three";
import type { Blocker } from "./props";

export interface Runtime {
  /** Feet on the plane. y is always 0: one gameplay plane, no exceptions. */
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  /** Click-to-move destination, or null when he is standing or on the keys. */
  dest: THREE.Vector3 | null;
  /** 1 faces east, -1 faces west. The sprite flips, it does not turn. */
  facing: number;
  moving: boolean;
  /** Where the lantern hangs. The de-mist radius is centred here, not on him. */
  lantern: THREE.Vector3;
  /** The camera's smoothed look-at. One authoritative target, and this is it. */
  target: THREE.Vector3;
  /** Camera distance in units, smoothed toward `base * zoom` each frame. */
  dist: number;
  /** How much world the wheel is asking for. 1 is the framing the viewport wants. */
  zoom: number;
  /**
   * How far two fingers have carried the look-at off him, on the ground.
   *
   * Written by the pinch-and-pan gesture in `IsoCamera`, eased back to zero the
   * moment both fingers leave, and zeroed by `recentre`. It is the only thing in
   * the build that is allowed to move the camera off the Wayfarer, and it cannot
   * hold it there: `build-game-camera-controls` asks for one authoritative
   * target and a reset framing, and this is both.
   */
  pan: THREE.Vector3;
  /** True while two fingers are down. The pan holds instead of easing home. */
  panning: boolean;
  blockers: Blocker[];
  keys: Set<string>;
  /** Which world he is standing in right now. */
  world: string;
  /** 0 at a biome's heart, 1 out in the mist between two. */
  border: number;
  /** Nearest page object and how far, recomputed on a slow tick. */
  near: { id: string; d: number } | null;
  hovered: string | null;
  /** Seconds he has been standing within reach of `near`. Dwell opens at 1.2. */
  dwell: number;
  /**
   * ATTENTION IS HIS. False until he clicks, presses a key or touches the glass;
   * the dwell does not run before that, so a fresh load never opens anything and
   * a page he did not ask for cannot write to the vault. Set once, never unset.
   */
  armed: boolean;
  /**
   * The one thing this approach has already opened. Cleared the moment something
   * else is the nearest thing in reach, which is what "once per approach" means:
   * stand there all evening and it opens once, walk away and back and it opens
   * again. Escape does not clear it, because closing a page is not asking for it.
   */
  latched: string | null;
  /**
   * What a click on a thing asked for. He walks to its reach and it opens on
   * arrival; a click on the ground clears it, and so does eight seconds of not
   * getting there.
   */
  intent: { id: string; until: number } | null;
  /** True while he is on the hearth mat. The bed swells and the thread opens. */
  sitting: boolean;
  /** Down the stair. A scene state, not a second scene. */
  depth: boolean;
  /** Distance walked since the last footstep, for the tick and the dust. */
  stepAccum: number;
  /**
   * Seconds he has been trying to reach `dest` and getting nowhere.
   *
   * The bug this closes is the one under three of the Critic's findings. A walk
   * order is a POINT, and the steering can park him short of it: against a
   * blocker, in a doorway, at the arm's length a card holds him at. `dest` was
   * only ever cleared by arriving within 28 cm of it, so a point he could not
   * quite reach meant he leaned on it forever, `moving` stayed true, and every
   * rule that waits for him to STOP never fired: the dwell, the click-to-open,
   * and the harness's own "did he get there". "Five separate walks toward the
   * hall stalled at (-3.15, 1)" was this, with a grove in the way.
   */
  stuck: number;
  reduced: boolean;
  paused: boolean;
}

/**
 * `world` is where the manifest says he is standing on this load. It used to be
 * "" until the canvas's first slow tick a quarter of a second later, which meant
 * a deep link into the depths spent that quarter second on the surface and a
 * save inside it returned early with no world to name.
 */
export function createRuntime(x: number, z: number, world = ""): Runtime {
  return {
    pos: new THREE.Vector3(x, 0, z),
    vel: new THREE.Vector3(),
    dest: null,
    facing: 1,
    moving: false,
    lantern: new THREE.Vector3(x + 0.5, 1.35, z),
    target: new THREE.Vector3(x, 0.9, z),
    dist: 19,
    zoom: 1,
    pan: new THREE.Vector3(),
    panning: false,
    blockers: [],
    keys: new Set(),
    world,
    border: 0,
    near: null,
    hovered: null,
    dwell: 0,
    armed: false,
    latched: null,
    intent: null,
    sitting: false,
    depth: world === "depths",
    stepAccum: 0,
    stuck: 0,
    reduced: false,
    paused: false,
  };
}

/**
 * PUT THE CAMERA BACK ON HIM.
 *
 * The reset framing `build-game-camera-controls` asks for, and it is two lines
 * because the camera never leaves him for any other reason: the zoom goes back
 * to what the viewport wants and the two-finger pan goes back to nothing. A
 * double tap on the Wayfarer and the "recentre" chip both call this, so the
 * gesture and the button cannot drift into meaning different things.
 */
export function recentre(rt: Runtime): void {
  rt.zoom = 1;
  rt.pan.set(0, 0, 0);
  rt.panning = false;
}

export const HERO_RADIUS = 0.42;
/**
 * How far outside a blocker the steering parks him. Everything that wants to be
 * "in reach" has to know this number, so it is exported rather than written
 * twice: REACH is derived from it in `WorldCanvas`.
 */
export const STEER_MARGIN = 0.55;
export const WALK_SPEED = 4.1;
/** Metres between footsteps. A short stride: he is small and the world is a toy. */
export const STRIDE = 0.72;

/**
 * Move one step. Steering first (so he goes AROUND a pine rather than into it),
 * then a positional correction (so he can never end up inside one).
 */
export function stepWalker(rt: Runtime, dt: number, camYaw: number): void {
  const want = new THREE.Vector3();

  // Keys beat the click: taking hold of the keyboard cancels a walk order.
  let kx = 0;
  let kz = 0;
  if (rt.keys.has("w")) kz -= 1;
  if (rt.keys.has("s")) kz += 1;
  if (rt.keys.has("a")) kx -= 1;
  if (rt.keys.has("d")) kx += 1;

  if (kx || kz) {
    rt.dest = null;
    // Screen-relative, so W is up-screen at any camera yaw, which is the only
    // thing that feels right on an isometric plane.
    const c = Math.cos(camYaw);
    const s = Math.sin(camYaw);
    want.set(kx * c - kz * s, 0, kx * s + kz * c).normalize().multiplyScalar(WALK_SPEED);
  } else if (rt.dest) {
    const to = rt.dest.clone().sub(rt.pos);
    to.y = 0;
    const d = to.length();
    if (d < 0.28) {
      rt.dest = null;
    } else {
      // Arrival: ease down over the last metre so he stops rather than skids.
      want.copy(to).normalize().multiplyScalar(WALK_SPEED * Math.min(1, d / 1.0));
    }
  }

  // Steering away from anything close, proportional to how close.
  for (const b of rt.blockers) {
    const dx = rt.pos.x - b.x;
    const dz = rt.pos.z - b.z;
    const rr = b.r + HERO_RADIUS + STEER_MARGIN;
    const d2 = dx * dx + dz * dz;
    if (d2 > rr * rr || d2 < 1e-6) continue;
    const d = Math.sqrt(d2);
    const push = (1 - d / rr) * WALK_SPEED * 1.35;
    want.x += (dx / d) * push;
    want.z += (dz / d) * push;
  }
  if (want.lengthSq() > WALK_SPEED * WALK_SPEED) {
    want.setLength(WALK_SPEED);
  }

  // Acceleration, not teleporting: 12 per second reaches full speed in a third
  // of a second, which reads as a person deciding to walk.
  rt.vel.lerp(want, Math.min(1, dt * 12));
  if (rt.vel.lengthSq() < 0.0004) rt.vel.set(0, 0, 0);

  const moved = rt.vel.length() * dt;
  rt.pos.addScaledVector(rt.vel, dt);
  rt.pos.y = 0;

  // Hard correction. Steering can be outrun; this cannot.
  for (const b of rt.blockers) {
    const dx = rt.pos.x - b.x;
    const dz = rt.pos.z - b.z;
    const rr = b.r + HERO_RADIUS;
    const d2 = dx * dx + dz * dz;
    if (d2 >= rr * rr) continue;
    const d = Math.sqrt(Math.max(d2, 1e-6));
    rt.pos.x = b.x + (dx / d) * rr;
    rt.pos.z = b.z + (dz / d) * rr;
  }

  // A WALK ORDER GIVES UP RATHER THAN GRINDS. Half a second of leaning on
  // something without covering ground means the point cannot be reached from
  // here, and standing still where he ended up is a better answer than pushing
  // at a wall until the tab closes.
  if (rt.dest && !kx && !kz) {
    if (moved < WALK_SPEED * dt * 0.18) rt.stuck += dt;
    else rt.stuck = 0;
    if (rt.stuck > 0.5) {
      rt.dest = null;
      rt.stuck = 0;
      rt.vel.set(0, 0, 0);
    }
  } else {
    rt.stuck = 0;
  }

  rt.moving = moved > 0.004;
  if (rt.moving) {
    rt.stepAccum += moved;
    if (Math.abs(rt.vel.x) > 0.08) rt.facing = rt.vel.x >= 0 ? 1 : -1;
  } else {
    rt.stepAccum = 0;
  }

  // The lantern hangs off his forward hand, a little ahead of him.
  rt.lantern.set(rt.pos.x + rt.facing * 0.6, 1.3, rt.pos.z + 0.1);
}
