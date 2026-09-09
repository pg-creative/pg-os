"use client";

/**
 * Procedural props, from code, with named sockets.
 *
 * FOLLOWS: `build-hybrid-game-assets` ("expose a factory with named parts,
 * stable sockets, deterministic variation, collider guidance, and reusable
 * materials") and `author-game-levels` ("motivate every local light": every
 * emitter here is a visible object that a light is attached to, never a floating
 * point light with a story attached afterwards).
 *
 * Nothing is imported. No GLB, no paid asset, no marketplace kit. Every shape is
 * a box, a cylinder, a cone or a four-sided pyramid from the four shared
 * geometries in `toon.ts`, scaled and coloured from the register's palette. A
 * pine is a trunk and three cones. A shrine hall is a plinth, six posts, three
 * walls and two roof slabs. That constraint is the look: it is why the world
 * reads as a painted toy and not as a bought one.
 *
 * COLLISION lives beside the geometry, not inside it. Each entry declares
 * `blockers`, a list of circles in local space, and the placement layer turns
 * them into world circles the walker steers around. Level data never infers
 * collision from decoration (`author-game-levels`).
 */

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Palette } from "../palette";
import type { Runtime } from "../runtime";
import { GEO, toon } from "../toon";

export interface PropProps {
  p: Palette;
  /** Deterministic 0..1 from the placement seed. Same room, same world, forever. */
  v: number;
  /**
   * The walker, for the one thing geometry needs to know about him: whether he
   * is underneath it. `build-game-camera-controls` asks for an occlusion policy
   * that never hides the player and never makes geometry invisible globally, so
   * the hall's roof fades and only the hall's roof, and only while he is in it.
   */
  rt?: React.RefObject<Runtime>;
}

export interface Blocker {
  x: number;
  z: number;
  r: number;
}

export interface PropDef {
  Component: (props: PropProps) => React.ReactElement | null;
  /** Circles in local space, before the placement's rotation and scale. */
  blockers: Blocker[];
  /** Named attachment points in local space. */
  sockets?: Record<string, [number, number, number]>;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

type Vec3 = [number, number, number];

function Box({
  at,
  size,
  color,
  rot,
  shadow = true,
}: {
  at: Vec3;
  size: Vec3;
  color: string;
  rot?: Vec3;
  shadow?: boolean;
}) {
  return (
    <mesh
      geometry={GEO.box}
      material={toon(color)}
      position={at}
      scale={size}
      rotation={rot}
      castShadow={shadow}
      receiveShadow
    />
  );
}

function Cyl({
  at,
  r,
  h,
  color,
  rot,
  shadow = true,
}: {
  at: Vec3;
  r: number;
  h: number;
  color: string;
  rot?: Vec3;
  shadow?: boolean;
}) {
  return (
    <mesh
      geometry={GEO.cyl}
      material={toon(color)}
      position={at}
      scale={[r * 2, h, r * 2]}
      rotation={rot}
      castShadow={shadow}
      receiveShadow
    />
  );
}

function Cone({
  at,
  r,
  h,
  color,
  rot,
  four = false,
}: {
  at: Vec3;
  r: number;
  h: number;
  color: string;
  rot?: Vec3;
  four?: boolean;
}) {
  return (
    <mesh
      geometry={four ? GEO.pyr : GEO.cone}
      material={toon(color)}
      position={at}
      scale={[r * 2, h, r * 2]}
      rotation={rot}
      castShadow
      receiveShadow
    />
  );
}

/**
 * A flame: a small emissive body that flickers, and nothing else. The LIGHT that
 * belongs to it is mounted by the room's light list at the same coordinates, so
 * a flame you can see and a light you can feel are always the same object.
 */
export function Flame({
  color,
  core,
  size = 1,
  seed = 0,
}: {
  color: string;
  core: string;
  size?: number;
  seed?: number;
}) {
  const g = useRef<THREE.Group>(null);
  const inner = useMemo(() => toon(core, { noMist: true, emissive: core, emissiveIntensity: 1.3 }), [core]);
  const outer = useMemo(
    () => toon(color, { noMist: true, transparent: true, opacity: 0.55, emissive: color, emissiveIntensity: 0.9 }),
    [color],
  );
  useFrame((state) => {
    if (!g.current) return;
    const t = state.clock.elapsedTime + seed * 7.13;
    // Two out-of-phase sines, not random: a flame breathes, it does not stutter.
    const s = 1 + Math.sin(t * 5.1) * 0.09 + Math.sin(t * 11.7) * 0.05;
    g.current.scale.set(size * (2 - s) * 0.5 + size * 0.5, size * s, size * (2 - s) * 0.5 + size * 0.5);
    g.current.position.y = Math.sin(t * 3.3) * 0.012;
  });
  return (
    <group ref={g}>
      <mesh geometry={GEO.cone} material={outer} scale={[0.34, 0.62, 0.34]} position={[0, 0.31, 0]} />
      <mesh geometry={GEO.cone} material={inner} scale={[0.17, 0.36, 0.17]} position={[0, 0.19, 0]} />
    </group>
  );
}

// ── The props ────────────────────────────────────────────────────────────────

/** A gate you walk through. Two posts, a curved lintel, a tie beam. */
const Torii = ({ p }: PropProps) => (
  <group>
    <Cyl at={[-1.5, 1.35, 0]} r={0.17} h={2.7} color={p.roof} />
    <Cyl at={[1.5, 1.35, 0]} r={0.17} h={2.7} color={p.roof} />
    <Box at={[0, 2.62, 0]} size={[4.1, 0.2, 0.42]} color={p.roof} />
    <Box at={[0, 2.86, 0]} size={[4.6, 0.17, 0.3]} color={p.roof} rot={[0.04, 0, 0]} />
    <Box at={[0, 2.16, 0]} size={[3.4, 0.16, 0.3]} color={p.roof} />
  </group>
);

/** Stone lantern. The socket `flame` is where the room's light hangs. */
const StoneLantern = ({ p }: PropProps) => (
  <group>
    <Cyl at={[0, 0.1, 0]} r={0.34} h={0.2} color={p.stoneDark} />
    <Cyl at={[0, 0.52, 0]} r={0.13} h={0.68} color={p.stone} />
    <Cyl at={[0, 0.92, 0]} r={0.3} h={0.14} color={p.stone} />
    <Box at={[0, 1.16, 0]} size={[0.42, 0.36, 0.42]} color={p.stone} />
    <Cone at={[0, 1.44, 0]} r={0.4} h={0.3} color={p.stoneDark} four />
    <mesh geometry={GEO.sphere} material={toon(p.stone)} position={[0, 1.62, 0]} scale={0.11} castShadow />
  </group>
);

/**
 * The shrine hall: home base. A plinth at ground level (no traversal elevation,
 * `author-game-levels` one-plane rule), six posts, three walls, a hip roof, an
 * opening in the back wall where the stair goes down.
 *
 * The roof is the one occluder in the world big enough to hide him, so it has
 * its own material (not the shared cache, which every other roof in the cosmos
 * would fade with it) and it thins to a quarter while he is inside. Fading, not
 * hiding: the hall still reads as a room with a roof on it from every angle.
 */
const ShrineHall = ({ p, rt }: PropProps) => {
  const self = useRef<THREE.Group>(null);
  const here = useMemo(() => new THREE.Vector3(), []);
  const roofMat = useMemo(() => {
    const m = toon(p.roof).clone();
    m.transparent = true;
    m.opacity = 1;
    m.depthWrite = true;
    return m;
  }, [p.roof]);

  useFrame((_, dt) => {
    const r = rt?.current;
    if (!r || !self.current) return;
    // The footprint, in the hall's own local numbers, plus a step of margin.
    // Read from the group's world position rather than assumed at the origin:
    // the hall stands wherever its room's anchor puts it, and a footprint test
    // in world coordinates would fade the roof in the wrong place forever.
    self.current.getWorldPosition(here);
    const lx = r.pos.x - here.x;
    const lz = r.pos.z - here.z;
    const inside = Math.abs(lx) < 7.6 && lz > -5.2 && lz < 5.6;
    const want = inside ? 0.22 : 1;
    roofMat.opacity += (want - roofMat.opacity) * Math.min(1, dt * 4);
    roofMat.depthWrite = roofMat.opacity > 0.92;
  });

  return (
  <group ref={self}>
    {/* Floor, 1 cm of dressing, not a step. */}
    <Box at={[0, 0.03, 0]} size={[13, 0.06, 9]} color={p.wood} shadow={false} />
    <Box at={[0, 0.08, 0]} size={[12.2, 0.04, 8.2]} color={p.woodDark} shadow={false} />
    {/* Posts. */}
    {[-5.6, 0, 5.6].map((x) =>
      [-3.9, 3.9].map((z) => (
        <Cyl key={`${x}:${z}`} at={[x, 1.6, z]} r={0.19} h={3.2} color={p.wood} />
      )),
    )}
    {/* Back wall, with a gap in the middle for the stair. */}
    <Box at={[-3.7, 1.5, -4.1]} size={[5.4, 3, 0.34]} color={p.woodDark} />
    <Box at={[3.7, 1.5, -4.1]} size={[5.4, 3, 0.34]} color={p.woodDark} />
    <Box at={[0, 2.6, -4.1]} size={[2.2, 0.8, 0.34]} color={p.woodDark} />
    {/* Side walls, half height, so the room reads open to the valley. */}
    <Box at={[-6.2, 0.8, 0]} size={[0.3, 1.6, 8.4]} color={p.woodDark} />
    <Box at={[6.2, 0.8, 0]} size={[0.3, 1.6, 8.4]} color={p.woodDark} />
    {/* Roof: two slabs and a ridge, on their own fading material. */}
    <mesh geometry={GEO.box} material={roofMat} position={[0, 3.6, -2.4]} scale={[14.4, 0.28, 6]} rotation={[-0.34, 0, 0]} castShadow receiveShadow />
    <mesh geometry={GEO.box} material={roofMat} position={[0, 3.6, 2.4]} scale={[14.4, 0.28, 6]} rotation={[0.34, 0, 0]} castShadow receiveShadow />
    <mesh geometry={GEO.box} material={roofMat} position={[0, 4.5, 0]} scale={[14.8, 0.3, 0.6]} castShadow />
    {/* The steps up to the front, three flat slabs, all at ground height. */}
    <Box at={[0, 0.02, 5.1]} size={[7, 0.04, 1]} color={p.stone} shadow={false} />
    <Box at={[0, 0.02, 6.0]} size={[8, 0.04, 1]} color={p.stoneDark} shadow={false} />
  </group>
  );
};

/** The stair down. A dark mouth in the floor with three treads inside it. */
const StairsDown = ({ p }: PropProps) => (
  <group>
    <Box at={[0, 0.02, 0]} size={[2.2, 0.05, 2.6]} color="#0B0810" shadow={false} />
    <Box at={[0, -0.06, 0.9]} size={[1.9, 0.12, 0.4]} color={p.stone} shadow={false} />
    <Box at={[0, -0.24, 0.4]} size={[1.9, 0.12, 0.4]} color={p.stoneDark} shadow={false} />
    <Box at={[0, -0.44, -0.1]} size={[1.9, 0.12, 0.4]} color="#1A1418" shadow={false} />
    <Box at={[-1.2, 0.34, 0]} size={[0.24, 0.68, 2.8]} color={p.stone} />
    <Box at={[1.2, 0.34, 0]} size={[0.24, 0.68, 2.8]} color={p.stone} />
  </group>
);

/**
 * One flat slab. Walkable, no blocker: a path that stops you is not a path.
 *
 * A slab per placement rather than four, because the dressing already lays a
 * chain of them down a room's long axis. Four per placement, overlapping four
 * more, read as scattered tiles instead of a way to walk.
 */
const StonePath = ({ p, v }: PropProps) => (
  <Box
    at={[(v - 0.5) * 0.22, 0.02, 0]}
    size={[1.45, 0.05, 1.0]}
    color={v > 0.5 ? p.stone : p.stoneDark}
    rot={[0, (v - 0.5) * 0.14, 0]}
    shadow={false}
  />
);

const Pine = ({ p, v }: PropProps) => {
  const h = 3.2 + v * 1.9;
  return (
    <group>
      <Cyl at={[0, h * 0.28, 0]} r={0.15 + v * 0.05} h={h * 0.56} color={p.trunk} />
      <Cone at={[0, h * 0.62, 0]} r={1.25} h={1.5} color={p.foliage} />
      <Cone at={[0, h * 0.84, 0]} r={0.95} h={1.25} color={p.foliageDark} />
      <Cone at={[0, h * 1.02, 0]} r={0.62} h={1.0} color={p.foliage} />
    </group>
  );
};

const Rock = ({ p, v }: PropProps) => (
  <mesh
    geometry={GEO.sphere}
    material={toon(v > 0.5 ? p.stone : p.stoneDark)}
    position={[0, 0.22 + v * 0.14, 0]}
    scale={[0.7 + v * 0.5, 0.5 + v * 0.3, 0.62 + v * 0.4]}
    rotation={[v * 1.2, v * 3.1, v * 0.6]}
    receiveShadow
  />
);

const GrassTuft = ({ p, v }: PropProps) => (
  <group>
    {[0, 1, 2].map((i) => (
      <mesh
        key={i}
        geometry={GEO.cone}
        material={toon(i % 2 ? p.foliage : p.foliageDark)}
        position={[(i - 1) * 0.14, 0.2, ((v * 11 + i) % 1) * 0.2 - 0.1]}
        scale={[0.14, 0.42 + v * 0.2, 0.14]}
        rotation={[((v * 7 + i) % 1) * 0.5 - 0.25, 0, ((v * 5 + i) % 1) * 0.5 - 0.25]}
      />
    ))}
  </group>
);

/** A dock over the water, and the boat tied to it. */
const Dock = ({ p }: PropProps) => (
  <group>
    {[0, 1, 2, 3, 4].map((i) => (
      <Box key={i} at={[0, 0.24, -i * 1.3]} size={[2.4, 0.12, 1.15]} color={p.wood} />
    ))}
    {[-1, 1].map((s) =>
      [0, 2, 4].map((i) => (
        <Cyl key={`${s}:${i}`} at={[s * 1.0, 0.02, -i * 1.3]} r={0.11} h={0.5} color={p.woodDark} />
      )),
    )}
  </group>
);

const Boat = ({ p }: PropProps) => (
  <group rotation={[0, 0.3, 0]}>
    <Box at={[0, 0.16, 0]} size={[1.1, 0.3, 3.2]} color={p.wood} />
    <Cone at={[0, 0.16, 1.9]} r={0.55} h={0.9} color={p.wood} rot={[Math.PI / 2, 0, 0]} />
    <Box at={[0, 0.36, -0.4]} size={[1.0, 0.1, 0.8]} color={p.woodDark} />
  </group>
);

/** The lake: one plane with a painted-water shader, mounted by Water.tsx. */
const Couch = ({ p }: PropProps) => (
  <group>
    <Box at={[0, 0.34, 0]} size={[2.6, 0.42, 1.1]} color={p.roof} />
    <Box at={[0, 0.72, -0.42]} size={[2.6, 0.72, 0.28]} color={p.roof} />
    <Box at={[-1.28, 0.58, 0]} size={[0.24, 0.6, 1.1]} color={p.woodDark} />
    <Box at={[1.28, 0.58, 0]} size={[0.24, 0.6, 1.1]} color={p.woodDark} />
    {[-1.1, 1.1].map((x) =>
      [-0.42, 0.42].map((z) => (
        <Cyl key={`${x}:${z}`} at={[x, 0.07, z]} r={0.07} h={0.14} color={p.woodDark} />
      )),
    )}
  </group>
);

const Dog = ({ p, v }: PropProps) => (
  <group rotation={[0, v * 2 - 1, 0]}>
    <Box at={[0, 0.36, 0]} size={[0.34, 0.3, 0.78]} color={p.wood} />
    <Box at={[0, 0.52, 0.46]} size={[0.28, 0.26, 0.3]} color={p.wood} />
    <Cone at={[-0.09, 0.68, 0.44]} r={0.07} h={0.16} color={p.woodDark} />
    <Cone at={[0.09, 0.68, 0.44]} r={0.07} h={0.16} color={p.woodDark} />
    <Box at={[0, 0.5, 0.62]} size={[0.14, 0.12, 0.14]} color={p.woodDark} />
    {[-0.11, 0.11].map((x) =>
      [-0.28, 0.28].map((z) => (
        <Cyl key={`${x}:${z}`} at={[x, 0.11, z]} r={0.05} h={0.22} color={p.woodDark} />
      )),
    )}
    <Cyl at={[0, 0.5, -0.44]} r={0.045} h={0.34} color={p.wood} rot={[0.8, 0, 0]} />
  </group>
);

/** A monument: a leaning slab of cut stone, raised by a LEDGER line. */
const StandingStone = ({ p, v }: PropProps) => (
  <group rotation={[0, v * 3.1, 0]}>
    <Cyl at={[0, 0.09, 0]} r={0.78} h={0.18} color={p.stoneDark} />
    <Box
      at={[0, 1.05 + v * 0.4, 0]}
      size={[0.92, 2.1 + v * 0.8, 0.34]}
      color={p.stone}
      rot={[v * 0.06 - 0.03, 0, v * 0.08 - 0.04]}
    />
    <Cone at={[0, 2.2 + v * 0.8, 0]} r={0.6} h={0.4} color={p.stoneDark} four rot={[0, Math.PI / 4, 0]} />
  </group>
);

/** A brazier: three legs, a bowl, and the socket the fire sits in. */
const Brazier = ({ p }: PropProps) => (
  <group>
    {[0, 1, 2].map((i) => (
      <Cyl
        key={i}
        at={[Math.cos((i / 3) * Math.PI * 2) * 0.24, 0.3, Math.sin((i / 3) * Math.PI * 2) * 0.24]}
        r={0.06}
        h={0.6}
        color={p.stoneDark}
        rot={[Math.sin((i / 3) * Math.PI * 2) * 0.16, 0, -Math.cos((i / 3) * Math.PI * 2) * 0.16]}
      />
    ))}
    <Cyl at={[0, 0.66, 0]} r={0.42} h={0.22} color={p.stoneDark} />
    <Cyl at={[0, 0.78, 0]} r={0.34} h={0.06} color="#1A1214" />
  </group>
);

/** An altar: a stone table with a flame standing on it. */
const Altar = ({ p }: PropProps) => (
  <group>
    <Box at={[0, 0.12, 0]} size={[2.0, 0.24, 1.2]} color={p.stoneDark} />
    <Box at={[0, 0.52, 0]} size={[1.5, 0.6, 0.85]} color={p.stone} />
    <Box at={[0, 0.9, 0]} size={[2.2, 0.18, 1.35]} color={p.stoneDark} />
    <Cyl at={[0, 1.06, 0]} r={0.3} h={0.16} color={p.stone} />
  </group>
);

/** A wall torch on a short post, for a corridor that has no wall. */
const Torch = ({ p }: PropProps) => (
  <group>
    <Cyl at={[0, 0.85, 0]} r={0.07} h={1.7} color={p.woodDark} />
    <Cyl at={[0, 1.74, 0]} r={0.15} h={0.2} color={p.stoneDark} />
  </group>
);

/** The hearth: a woven mat and a ring of stones. Walk onto it and you sit. */
const Hearth = ({ p }: PropProps) => (
  <group>
    <Box at={[0, 0.11, 0]} size={[2.3, 0.04, 2.0]} color={p.wood} shadow={false} />
    <Box at={[0, 0.115, 0]} size={[2.0, 0.03, 1.72]} color={p.stoneDark} shadow={false} />
    {Array.from({ length: 8 }, (_, i) => {
      const a = (i / 8) * Math.PI * 2;
      return (
        <mesh
          key={i}
          geometry={GEO.sphere}
          material={toon(p.stoneDark)}
          position={[Math.cos(a) * 0.78, 0.14, Math.sin(a) * 0.78]}
          scale={[0.3, 0.22, 0.28]}
          castShadow
        />
      );
    })}
    <Cyl at={[0, 0.13, 0]} r={0.5} h={0.08} color="#1A1214" />
  </group>
);

/** A low fence rail, for a shore or a yard edge. */
const Fence = ({ p }: PropProps) => (
  <group>
    {[-1.5, 0, 1.5].map((x) => (
      <Cyl key={x} at={[x, 0.45, 0]} r={0.08} h={0.9} color={p.woodDark} />
    ))}
    <Box at={[0, 0.72, 0]} size={[3.4, 0.09, 0.12]} color={p.wood} />
    <Box at={[0, 0.42, 0]} size={[3.4, 0.09, 0.12]} color={p.wood} />
  </group>
);

// ── The registry ─────────────────────────────────────────────────────────────

export const PROPS: Record<string, PropDef> = {
  torii: { Component: Torii, blockers: [{ x: -1.5, z: 0, r: 0.4 }, { x: 1.5, z: 0, r: 0.4 }] },
  lantern: {
    Component: StoneLantern,
    blockers: [{ x: 0, z: 0, r: 0.5 }],
    sockets: { flame: [0, 1.18, 0] },
  },
  hall: {
    Component: ShrineHall,
    blockers: [
      { x: -6.3, z: -2.6, r: 0.9 },
      { x: -6.3, z: 2.6, r: 0.9 },
      { x: 6.3, z: -2.6, r: 0.9 },
      { x: 6.3, z: 2.6, r: 0.9 },
      { x: -3.7, z: -4.1, r: 1.7 },
      { x: 3.7, z: -4.1, r: 1.7 },
    ],
  },
  stairs: { Component: StairsDown, blockers: [], sockets: { down: [0, -0.4, 0] } },
  path: { Component: StonePath, blockers: [] },
  pine: { Component: Pine, blockers: [{ x: 0, z: 0, r: 0.62 }] },
  rock: { Component: Rock, blockers: [{ x: 0, z: 0, r: 0.6 }] },
  grass: { Component: GrassTuft, blockers: [] },
  dock: { Component: Dock, blockers: [] },
  boat: { Component: Boat, blockers: [{ x: 0, z: 0, r: 1.0 }] },
  couch: { Component: Couch, blockers: [{ x: 0, z: 0, r: 1.2 }] },
  dog: { Component: Dog, blockers: [{ x: 0, z: 0, r: 0.4 }] },
  stone: {
    Component: StandingStone,
    blockers: [{ x: 0, z: 0, r: 0.75 }],
    sockets: { face: [0, 1.4, 0.3] },
  },
  brazier: {
    Component: Brazier,
    blockers: [{ x: 0, z: 0, r: 0.55 }],
    sockets: { flame: [0, 0.86, 0] },
  },
  altar: {
    Component: Altar,
    blockers: [{ x: 0, z: 0, r: 1.1 }],
    sockets: { flame: [0, 1.16, 0] },
  },
  torch: {
    Component: Torch,
    blockers: [{ x: 0, z: 0, r: 0.3 }],
    sockets: { flame: [0, 1.88, 0] },
  },
  hearth: { Component: Hearth, blockers: [], sockets: { flame: [0, 0.2, 0] } },
  fence: { Component: Fence, blockers: [{ x: -1.5, z: 0, r: 0.2 }, { x: 1.5, z: 0, r: 0.2 }] },
};

/** Which prop stands under which kind of emitter. The source-to-light inventory. */
export const EMITTER_PROP: Record<string, string> = {
  lantern: "lantern",
  torch: "torch",
  brazier: "brazier",
  altar: "altar",
  fire: "hearth",
  window: "",
};
