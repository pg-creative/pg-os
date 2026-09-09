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
  /** Camera distance, clamped by the wheel. */
  dist: number;
  distWanted: number;
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
  /** True while he is on the hearth mat. The bed swells and the thread opens. */
  sitting: boolean;
  /** Down the stair. A scene state, not a second scene. */
  depth: boolean;
  /** Distance walked since the last footstep, for the tick and the dust. */
  stepAccum: number;
  reduced: boolean;
  paused: boolean;
}

export function createRuntime(x: number, z: number): Runtime {
  return {
    pos: new THREE.Vector3(x, 0, z),
    vel: new THREE.Vector3(),
    dest: null,
    facing: 1,
    moving: false,
    lantern: new THREE.Vector3(x + 0.5, 1.35, z),
    target: new THREE.Vector3(x, 0.9, z),
    dist: 30,
    distWanted: 30,
    blockers: [],
    keys: new Set(),
    world: "",
    border: 0,
    near: null,
    hovered: null,
    dwell: 0,
    sitting: false,
    depth: false,
    stepAccum: 0,
    reduced: false,
    paused: false,
  };
}

export const HERO_RADIUS = 0.42;
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
    const rr = b.r + HERO_RADIUS + 0.55;
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
