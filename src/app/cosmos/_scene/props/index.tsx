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
 * a box, a cylinder, a cone or a four-sided pyramid from the shared geometries
 * in `toon.ts`. A pine is a trunk and three cones. That constraint is the look:
 * it is why the world reads as a painted toy and not as a bought one, and it is
 * also the FLOOR: every entry here declares a `height`, and when the vault has a
 * painted cutout for the same word (`worlds/<id>/cutouts/<prop>.png`) the scene
 * billboards the painting instead and this geometry never mounts. Procedural
 * first so nothing waits on the painter; painted the moment the paint lands.
 *
 * COLLISION lives beside the geometry, not inside it. Each entry declares
 * `blockers`, circles in local space, and the placement layer turns them into
 * world circles the walker steers around. A prop whose collision depends on its
 * footprint declares `blockersFor(w, d)` instead: the hall's walls are SEGMENTS,
 * a chain of equal small circles, because round two's four fat corner discs
 * overlapped into a pocket in each back corner that the hard correction then
 * pushed him further into (the Critic's deduction 7).
 */

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Palette } from "../registers";
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
  /** The room's footprint, for props that ARE the room. */
  w?: number;
  d?: number;
  /** Where the stair cuts the floor, in the prop's own local coordinates. */
  gap?: { x: number; z: number } | null;
  /** The world's own painting, when this prop is the room that holds it. */
  interior?: string | null;
  /** Where the painted feature (a hearth) sits in that painting, 0..1 across. */
  interiorU?: number;
  /** And where the real thing it must line up with stands, in local x. */
  interiorAt?: number;
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
  /** For props sized by their room. Overrides `blockers` when present. */
  blockersFor?: (w: number, d: number) => Blocker[];
  /** World height of the painted cutout that may replace this geometry. */
  height: number;
  /** Painted foliage sways; a dock does not. */
  wind?: number;
  /** Named attachment points in local space. */
  sockets?: Record<string, [number, number, number]>;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

type Vec3 = [number, number, number];

function Box({ at, size, color, rot, shadow = true }: { at: Vec3; size: Vec3; color: string; rot?: Vec3; shadow?: boolean }) {
  return (
    <mesh geometry={GEO.box} material={toon(color)} position={at} scale={size} rotation={rot} castShadow={shadow} receiveShadow />
  );
}

function Cyl({ at, r, h, color, rot, shadow = true }: { at: Vec3; r: number; h: number; color: string; rot?: Vec3; shadow?: boolean }) {
  return (
    <mesh geometry={GEO.cyl} material={toon(color)} position={at} scale={[r * 2, h, r * 2]} rotation={rot} castShadow={shadow} receiveShadow />
  );
}

function Cone({ at, r, h, color, rot, four = false }: { at: Vec3; r: number; h: number; color: string; rot?: Vec3; four?: boolean }) {
  return (
    <mesh geometry={four ? GEO.pyr : GEO.cone} material={toon(color)} position={at} scale={[r * 2, h, r * 2]} rotation={rot} castShadow receiveShadow />
  );
}

/** A wall as a chain of equal small circles. No pockets, so no corner traps. */
function segment(x0: number, z0: number, x1: number, z1: number, r = 0.42): Blocker[] {
  const len = Math.hypot(x1 - x0, z1 - z0);
  const n = Math.max(2, Math.ceil(len / (r * 1.35)));
  const out: Blocker[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    out.push({ x: x0 + (x1 - x0) * t, z: z0 + (z1 - z0) * t, r });
  }
  return out;
}

/**
 * A flame: a small emissive body that flickers, and nothing else. The LIGHT that
 * belongs to it is mounted by the room's light list at the same coordinates, so
 * a flame you can see and a light you can feel are always the same object.
 */
export function Flame({ color, core, size = 1, seed = 0 }: { color: string; core: string; size?: number; seed?: number }) {
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

/** A bell under a small roof, on two posts. Struck by nobody; it is a landmark. */
const ShrineBell = ({ p }: PropProps) => (
  <group>
    <Cyl at={[-0.85, 1.1, 0]} r={0.11} h={2.2} color={p.wood} />
    <Cyl at={[0.85, 1.1, 0]} r={0.11} h={2.2} color={p.wood} />
    <Box at={[0, 2.28, 0]} size={[2.3, 0.16, 0.7]} color={p.woodDark} />
    <Cone at={[0, 2.5, 0]} r={1.35} h={0.44} color={p.roof} four />
    <Cyl at={[0, 1.62, 0]} r={0.3} h={0.62} color={p.stoneDark} />
    <mesh geometry={GEO.sphere} material={toon(p.stoneDark)} position={[0, 1.3, 0]} scale={[0.62, 0.34, 0.62]} castShadow />
    <Box at={[0, 1.72, 0.62]} size={[0.1, 0.1, 1.1]} color={p.wood} />
  </group>
);

/**
 * A paper window: a lit shoji panel on a frame, standing where a `window` light
 * is declared. The Critic's deduction 8: `window` mapped to no prop at all and
 * the scene mounted its point light anyway, so the hall had two lamps made of
 * nothing. The panel is emissive, so it reads as the source of its own light.
 */
const PaperWindow = ({ p }: PropProps) => {
  // Emissive at 0.9 on a near-white core blew to a flat white slab under ACES,
  // and three of them stood in the hall reading as headstones. A lit paper
  // window is warm and DIM: the light it throws is the point, not the panel.
  const glow = useMemo(
    () => toon(p.flame, { noMist: true, emissive: p.flame, emissiveIntensity: 0.34 }),
    [p.flame],
  );
  return (
    <group>
      <Box at={[0, 0.95, 0]} size={[1.5, 1.9, 0.14]} color={p.woodDark} />
      <mesh geometry={GEO.box} material={glow} position={[0, 1.0, 0.08]} scale={[1.16, 1.42, 0.04]} />
      {[-0.34, 0.34].map((x) => (
        <Box key={x} at={[x * 1.16, 1.0, 0.12]} size={[0.05, 1.42, 0.04]} color={p.woodDark} shadow={false} />
      ))}
      {[-0.28, 0.28].map((y) => (
        <Box key={y} at={[0, 1.0 + y * 1.42, 0.12]} size={[1.16, 0.05, 0.04]} color={p.woodDark} shadow={false} />
      ))}
    </group>
  );
};

/**
 * The shrine hall: home base, sized to its room, open to the valley at the
 * front, with the stair cut through its floor where the VAULT puts the door.
 *
 * The roof is the one occluder in the world big enough to hide him, so it has
 * its own material (not the shared cache, which every other roof in the cosmos
 * would fade with it) and it thins while he is inside. Fading, not hiding: the
 * hall still reads as a room with a roof on it from every angle.
 *
 * The back wall wears the world's own painting when the vault has one, lined up
 * so the painted hearth sits over the real hearth's light.
 */
const ShrineHall = ({ p, rt, w = 12, d = 10, gap, interior, interiorU = 0.355, interiorAt = 0 }: PropProps) => {
  const self = useRef<THREE.Group>(null);
  const here = useMemo(() => new THREE.Vector3(), []);
  const hw = w / 2;
  const hd = d / 2;

  const roofMat = useMemo(() => {
    const m = toon(p.roof).clone();
    m.transparent = true;
    m.opacity = 1;
    m.depthWrite = true;
    return m;
  }, [p.roof]);

  const art = useMemo(() => {
    if (!interior) return null;
    const t = new THREE.TextureLoader().load(interior);
    t.colorSpace = THREE.SRGBColorSpace;
    return new THREE.MeshBasicMaterial({ map: t, toneMapped: false, fog: true });
  }, [interior]);

  useFrame((_, dt) => {
    const r = rt?.current;
    if (!r || !self.current) return;
    self.current.getWorldPosition(here);
    const dx = r.pos.x - here.x;
    const dz = r.pos.z - here.z;
    const inside = Math.hypot(dx, dz) < Math.max(hw, hd) + 1.2;
    const want = inside ? 0.16 : 1;
    roofMat.opacity += (want - roofMat.opacity) * Math.min(1, dt * 4);
    roofMat.depthWrite = roofMat.opacity > 0.92;
  });

  // The floor, as four boards around the stair's hole. No hole, one board.
  const gx = gap?.x ?? 0;
  const gz = gap?.z ?? 0;
  const GW = 1.5;
  const GD = 1.6;
  const boards: Vec3[][] = gap
    ? [
        [[0, 0.05, (gz + GD + hd) / 2], [w, 0.1, Math.max(0.1, hd - gz - GD)]],
        [[0, 0.05, (gz - GD - hd) / 2], [w, 0.1, Math.max(0.1, hd + gz - GD)]],
        [[(gx + GW + hw) / 2, 0.05, gz], [Math.max(0.1, hw - gx - GW), 0.1, GD * 2]],
        [[(gx - GW - hw) / 2, 0.05, gz], [Math.max(0.1, hw + gx - GW), 0.1, GD * 2]],
      ]
    : [[[0, 0.05, 0], [w, 0.1, d]]];

  return (
    <group ref={self}>
      {boards.map((b, i) => (
        <Box key={i} at={b[0]} size={b[1]} color={i % 2 ? p.woodDark : p.wood} shadow={false} />
      ))}

      {/* Posts: six, thin, and their blockers are thin too. */}
      {[-hw + 0.5, 0, hw - 0.5].map((x) =>
        [-hd + 0.5, hd - 0.5].map((z) => (
          <Cyl key={`${x}:${z}`} at={[x, 1.6, z]} r={0.17} h={3.2} color={p.wood} />
        )),
      )}

      {/* Back wall, in two panels with the stair's gap between them. */}
      <Box at={[-(hw + gx) / 2 - GW / 2, 1.5, -hd]} size={[Math.max(0.2, hw + gx - GW), 3, 0.3]} color={p.woodDark} />
      <Box at={[(hw - gx) / 2 + GW / 2, 1.5, -hd]} size={[Math.max(0.2, hw - gx - GW), 3, 0.3]} color={p.woodDark} />
      <Box at={[gx, 2.7, -hd]} size={[GW * 2, 0.6, 0.3]} color={p.woodDark} />

      {/* The painting, on the inside of that wall. */}
      {art && (
        <mesh
          material={art}
          position={[interiorAt - (interiorU - 0.5) * (w - 0.8), 1.45, -hd + 0.18]}
          renderOrder={-5}
        >
          <planeGeometry args={[w - 0.8, (w - 0.8) * 0.24]} />
        </mesh>
      )}

      {/* Side rails, low, so nothing between the eye and him is taller than he is. */}
      <Box at={[-hw, 0.5, 0]} size={[0.26, 1.0, d]} color={p.woodDark} />
      <Box at={[hw, 0.5, 0]} size={[0.26, 1.0, d]} color={p.woodDark} />

      {/* Roof: two slabs and a ridge, on their own fading material. */}
      <mesh geometry={GEO.box} material={roofMat} position={[0, 3.6, -hd * 0.5]} scale={[w + 2.4, 0.28, d * 0.62]} rotation={[-0.34, 0, 0]} castShadow receiveShadow />
      <mesh geometry={GEO.box} material={roofMat} position={[0, 3.6, hd * 0.5]} scale={[w + 2.4, 0.28, d * 0.62]} rotation={[0.34, 0, 0]} castShadow receiveShadow />
      <mesh geometry={GEO.box} material={roofMat} position={[0, 4.5, 0]} scale={[w + 2.8, 0.3, 0.6]} castShadow />

      {/* Steps down to the ground at the open front. All at ground height. */}
      <Box at={[0, 0.02, hd + 0.6]} size={[w * 0.6, 0.04, 1]} color={p.stone} shadow={false} />
      <Box at={[0, 0.02, hd + 1.5]} size={[w * 0.7, 0.04, 1]} color={p.stoneDark} shadow={false} />
    </group>
  );
};

/** The forge's shed: the same grammar, one wall, an open front and a chimney. */
const Smithy = ({ p, w = 10, d = 8 }: PropProps) => {
  const hw = w / 2;
  const hd = d / 2;
  return (
    <group>
      <Box at={[0, 0.05, 0]} size={[w, 0.1, d]} color={p.stoneDark} shadow={false} />
      <Box at={[0, 1.4, -hd]} size={[w, 2.8, 0.4]} color={p.stone} />
      <Box at={[-hw, 1.0, 0]} size={[0.34, 2.0, d]} color={p.stone} />
      {[-hw + 0.4, hw - 0.4].map((x) => (
        <Cyl key={x} at={[x, 1.4, hd - 0.4]} r={0.19} h={2.8} color={p.woodDark} />
      ))}
      <mesh geometry={GEO.box} material={toon(p.roof)} position={[0, 3.1, 0]} scale={[w + 1.4, 0.3, d + 1.2]} rotation={[0.16, 0, 0]} castShadow receiveShadow />
      <Box at={[hw - 1.2, 2.6, -hd + 0.6]} size={[1.1, 4.2, 1.1]} color={p.stoneDark} />
    </group>
  );
};

/**
 * The stair down: a hole with treads in it, standing at the door's own
 * coordinates. Round two drew its mouth at y 0.02 UNDER floorboards at 0.03 to
 * 0.10, so the way down was two pale stubs in a wall (the Critic's deduction 7).
 * The mouth is now proud of any floor a room can have, and the hall cuts a real
 * hole for it.
 */
const StairsDown = ({ p }: PropProps) => (
  <group>
    <Box at={[0, 0.12, 0]} size={[2.6, 0.06, 2.9]} color="#0B0810" shadow={false} />
    <Box at={[0, 0.05, 1.15]} size={[2.2, 0.16, 0.46]} color={p.stone} shadow={false} />
    <Box at={[0, -0.16, 0.6]} size={[2.2, 0.16, 0.46]} color={p.stoneDark} shadow={false} />
    <Box at={[0, -0.38, 0.05]} size={[2.2, 0.16, 0.46]} color="#241C20" shadow={false} />
    <Box at={[0, -0.6, -0.5]} size={[2.2, 0.16, 0.46]} color="#120E12" shadow={false} />
    {/* A rail either side, so the hole reads as a way down and not as a stain. */}
    <Box at={[-1.42, 0.42, 0]} size={[0.22, 0.66, 3.0]} color={p.stone} />
    <Box at={[1.42, 0.42, 0]} size={[0.22, 0.66, 3.0]} color={p.stone} />
  </group>
);

/**
 * A path: one feathered strip down a room's long axis, not a chain of slabs.
 * The edge and the length are shader uniforms, so a wide room gets a wide way
 * through it and the sides dissolve into the ground rather than stopping at a
 * tile.
 */
const PathStrip = ({ p, w = 8, d = 8 }: PropProps) => {
  const long = Math.max(w, d);
  const material = useMemo(() => {
    const m = new THREE.MeshBasicMaterial({
      color: new THREE.Color(p.stone),
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      fog: true,
    });
    m.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <dithering_fragment>",
        `#include <dithering_fragment>
         float ex = 1.0 - smoothstep(0.16, 0.5, abs(vMapUv.x - 0.5));
         float ey = 1.0 - smoothstep(0.3, 0.5, abs(vMapUv.y - 0.5));
         gl_FragColor.a *= ex * ey;`,
      );
    };
    m.customProgramCacheKey = () => "cosmos-path";
    // A map is what gives the shader its uv varying; a 1x1 white pixel is the
    // cheapest one that exists.
    m.map = whitePixel();
    return m;
  }, [p.stone]);

  return (
    <mesh material={material} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]} renderOrder={-4}>
      <planeGeometry args={[long * 0.92, 3.4]} />
    </mesh>
  );
};

let WHITE: THREE.Texture | null = null;
function whitePixel(): THREE.Texture {
  if (WHITE) return WHITE;
  const data = new Uint8Array([255, 255, 255, 255]);
  const t = new THREE.DataTexture(data, 1, 1);
  t.needsUpdate = true;
  WHITE = t;
  return t;
}

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

/** A dock over the water. Walkable: it declares no blocker. */
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

/** A plain bench. Two of them make a place people sit together. */
const Bench = ({ p }: PropProps) => (
  <group>
    <Box at={[0, 0.44, 0]} size={[2.1, 0.12, 0.6]} color={p.wood} />
    <Box at={[0, 0.74, -0.24]} size={[2.1, 0.5, 0.1]} color={p.wood} />
    {[-0.85, 0.85].map((x) => (
      <Box key={x} at={[x, 0.22, 0]} size={[0.16, 0.44, 0.5]} color={p.woodDark} />
    ))}
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

/** A garden gnome. Small, painted, and entirely serious about it. */
const Gnome = ({ p }: PropProps) => (
  <group>
    <Cone at={[0, 0.26, 0]} r={0.24} h={0.52} color={p.paper} />
    <mesh geometry={GEO.sphere} material={toon("#F0D8BC")} position={[0, 0.58, 0]} scale={0.2} castShadow />
    <Cone at={[0, 0.82, 0]} r={0.2} h={0.42} color={p.flame} />
    <Box at={[0, 0.5, 0.14]} size={[0.18, 0.14, 0.06]} color={p.stone} />
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

const Altar = ({ p }: PropProps) => (
  <group>
    <Box at={[0, 0.12, 0]} size={[2.0, 0.24, 1.2]} color={p.stoneDark} />
    <Box at={[0, 0.52, 0]} size={[1.5, 0.6, 0.85]} color={p.stone} />
    <Box at={[0, 0.9, 0]} size={[2.2, 0.18, 1.35]} color={p.stoneDark} />
    <Cyl at={[0, 1.06, 0]} r={0.3} h={0.16} color={p.stone} />
  </group>
);

const Torch = ({ p }: PropProps) => (
  <group>
    <Cyl at={[0, 0.85, 0]} r={0.07} h={1.7} color={p.woodDark} />
    <Cyl at={[0, 1.74, 0]} r={0.15} h={0.2} color={p.stoneDark} />
  </group>
);

/** The hearth: a woven mat and a ring of stones. Walk onto it and you sit. */
const Hearth = ({ p }: PropProps) => (
  <group>
    <Box at={[0, 0.13, 0]} size={[2.3, 0.04, 2.0]} color={p.wood} shadow={false} />
    <Box at={[0, 0.135, 0]} size={[2.0, 0.03, 1.72]} color={p.stoneDark} shadow={false} />
    {Array.from({ length: 8 }, (_, i) => {
      const a = (i / 8) * Math.PI * 2;
      return (
        <mesh
          key={i}
          geometry={GEO.sphere}
          material={toon(p.stoneDark)}
          position={[Math.cos(a) * 0.78, 0.16, Math.sin(a) * 0.78]}
          scale={[0.3, 0.22, 0.28]}
          castShadow
        />
      );
    })}
    <Cyl at={[0, 0.15, 0]} r={0.5} h={0.08} color="#1A1214" />
  </group>
);

const Fence = ({ p }: PropProps) => (
  <group>
    {[-1.5, 0, 1.5].map((x) => (
      <Cyl key={x} at={[x, 0.45, 0]} r={0.08} h={0.9} color={p.woodDark} />
    ))}
    <Box at={[0, 0.72, 0]} size={[3.4, 0.09, 0.12]} color={p.wood} />
    <Box at={[0, 0.42, 0]} size={[3.4, 0.09, 0.12]} color={p.wood} />
  </group>
);

/** A door in a wall of earth. Shut. The depths keep what they keep. */
const CryptDoor = ({ p }: PropProps) => (
  <group>
    <Box at={[0, 1.5, -0.3]} size={[3.4, 3.0, 0.6]} color={p.stoneDark} />
    <Box at={[0, 1.15, 0]} size={[1.8, 2.3, 0.24]} color={p.woodDark} />
    <Cyl at={[0, 2.3, 0.02]} r={0.9} h={0.24} color={p.woodDark} rot={[Math.PI / 2, 0, 0]} />
    <mesh geometry={GEO.sphere} material={toon(p.stone)} position={[0.5, 1.1, 0.16]} scale={0.12} castShadow />
  </group>
);

/** The forge's own door, hot on the inside. */
const SmithyDoor = ({ p }: PropProps) => {
  const glow = useMemo(
    () => toon(p.flame, { noMist: true, emissive: p.flame, emissiveIntensity: 1.1 }),
    [p.flame],
  );
  return (
    <group>
      <Box at={[0, 1.4, -0.25]} size={[3.0, 2.8, 0.5]} color={p.stone} />
      <mesh geometry={GEO.box} material={glow} position={[0, 1.05, 0]} scale={[1.6, 2.1, 0.12]} />
      <Box at={[0, 2.3, 0.1]} size={[2.4, 0.3, 0.4]} color={p.woodDark} />
    </group>
  );
};

/** An anvil on a block. The one shape everybody recognises. */
const Anvil = ({ p }: PropProps) => (
  <group>
    <Cyl at={[0, 0.28, 0]} r={0.42} h={0.56} color={p.trunk} />
    <Box at={[0, 0.66, 0]} size={[1.1, 0.22, 0.44]} color={p.stoneDark} />
    <Box at={[0, 0.5, 0]} size={[0.6, 0.18, 0.34]} color={p.stoneDark} />
    <Cone at={[0.72, 0.66, 0]} r={0.2} h={0.5} color={p.stoneDark} rot={[0, 0, -Math.PI / 2]} />
  </group>
);

/**
 * A heart-shaped light on a pole. The party's landmark: PG's own "the heart in
 * the night sky", standing at ground level where people are.
 */
const HeartLight = ({ p }: PropProps) => {
  const glow = useMemo(
    () => toon(p.flame, { noMist: true, emissive: p.flame, emissiveIntensity: 1.5 }),
    [p.flame],
  );
  return (
    <group>
      <Cyl at={[0, 1.3, 0]} r={0.08} h={2.6} color={p.woodDark} />
      {[-0.24, 0.24].map((x) => (
        <mesh key={x} geometry={GEO.sphere} material={glow} position={[x, 2.9, 0]} scale={0.34} />
      ))}
      <mesh geometry={GEO.cone} material={glow} position={[0, 2.5, 0]} scale={[0.66, 0.7, 0.5]} rotation={[Math.PI, 0, 0]} />
    </group>
  );
};

/**
 * Still water: a flat sheet with a painted surface. Not a lake with a dock and a
 * boat bolted on, which is what an English word in a room id grew last round.
 * The dock and the boat are props a room may ask for, separately, on purpose.
 */
const StillWater = ({ p, w = 12, d = 10 }: PropProps) => {
  const material = useMemo(() => {
    const m = new THREE.MeshLambertMaterial({
      color: new THREE.Color(p.water),
      transparent: true,
      opacity: 0.88,
      fog: true,
    });
    m.onBeforeCompile = (shader) => {
      shader.uniforms.uDeep = { value: new THREE.Color(p.waterDeep) };
      shader.fragmentShader =
        "uniform vec3 uDeep;\n" +
        shader.fragmentShader.replace(
          "#include <dithering_fragment>",
          `#include <dithering_fragment>
           float r = length(vMapUv - 0.5) * 2.0;
           gl_FragColor.rgb = mix(uDeep, gl_FragColor.rgb, smoothstep(0.15, 1.0, r));
           gl_FragColor.a *= 1.0 - smoothstep(0.86, 1.0, r);`,
        );
    };
    m.customProgramCacheKey = () => "cosmos-water";
    m.map = whitePixel();
    return m;
  }, [p.water, p.waterDeep]);

  return (
    <mesh material={material} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]} receiveShadow>
      <planeGeometry args={[w * 0.86, d * 0.8]} />
    </mesh>
  );
};

// ── The registry ─────────────────────────────────────────────────────────────

export const PROPS: Record<string, PropDef> = {
  torii: { Component: Torii, height: 3.0, blockers: [{ x: -1.5, z: 0, r: 0.4 }, { x: 1.5, z: 0, r: 0.4 }] },
  "stone-lantern": {
    Component: StoneLantern,
    height: 1.7,
    blockers: [{ x: 0, z: 0, r: 0.5 }],
    sockets: { flame: [0, 1.18, 0] },
  },
  "shrine-bell": { Component: ShrineBell, height: 2.8, blockers: [{ x: -0.85, z: 0, r: 0.3 }, { x: 0.85, z: 0, r: 0.3 }] },
  "paper-window": {
    Component: PaperWindow,
    height: 1.9,
    blockers: [{ x: 0, z: 0, r: 0.5 }],
    sockets: { flame: [0, 1.0, 0] },
  },
  hall: {
    Component: ShrineHall,
    height: 5,
    blockers: [],
    // Segments, never discs. This is the corner trap, closed.
    blockersFor: (w, d) => {
      const hw = w / 2;
      const hd = d / 2;
      return [
        ...segment(-hw, -hd, -hw * 0.28, -hd),
        ...segment(hw * 0.28, -hd, hw, -hd),
        ...segment(-hw, -hd, -hw, hd),
        ...segment(hw, -hd, hw, hd),
      ];
    },
  },
  smithy: {
    Component: Smithy,
    height: 4,
    blockers: [],
    blockersFor: (w, d) => [
      ...segment(-w / 2, -d / 2, w / 2, -d / 2),
      ...segment(-w / 2, -d / 2, -w / 2, d / 2),
    ],
  },
  stair: { Component: StairsDown, height: 1, blockers: [], sockets: { down: [0, -0.4, 0] } },
  path: { Component: PathStrip, height: 0, blockers: [] },
  pine: { Component: Pine, height: 5.0, wind: 0.7, blockers: [{ x: 0, z: 0, r: 0.62 }] },
  rock: { Component: Rock, height: 0.8, blockers: [{ x: 0, z: 0, r: 0.6 }] },
  grass: { Component: GrassTuft, height: 0.6, wind: 1, blockers: [] },
  dock: { Component: Dock, height: 0.5, blockers: [] },
  boat: { Component: Boat, height: 1.0, blockers: [{ x: 0, z: 0, r: 1.0 }] },
  couch: { Component: Couch, height: 1.1, blockers: [{ x: 0, z: 0, r: 1.2 }] },
  bench: { Component: Bench, height: 1.0, blockers: [{ x: 0, z: 0, r: 0.8 }] },
  dog: { Component: Dog, height: 0.8, blockers: [{ x: 0, z: 0, r: 0.4 }] },
  gnome: { Component: Gnome, height: 1.0, blockers: [{ x: 0, z: 0, r: 0.3 }] },
  "standing-stone": {
    Component: StandingStone,
    height: 2.6,
    blockers: [{ x: 0, z: 0, r: 0.75 }],
    sockets: { face: [0, 1.4, 0.3] },
  },
  brazier: {
    Component: Brazier,
    height: 1.0,
    blockers: [{ x: 0, z: 0, r: 0.55 }],
    sockets: { flame: [0, 0.86, 0] },
  },
  altar: {
    Component: Altar,
    height: 1.2,
    blockers: [{ x: 0, z: 0, r: 1.1 }],
    sockets: { flame: [0, 1.16, 0] },
  },
  torch: {
    Component: Torch,
    height: 2.0,
    blockers: [{ x: 0, z: 0, r: 0.3 }],
    sockets: { flame: [0, 1.88, 0] },
  },
  hearth: { Component: Hearth, height: 0.5, blockers: [], sockets: { flame: [0, 0.2, 0] } },
  fence: { Component: Fence, height: 0.9, blockers: [{ x: -1.5, z: 0, r: 0.2 }, { x: 1.5, z: 0, r: 0.2 }] },
  "crypt-door": { Component: CryptDoor, height: 3.0, blockers: [{ x: 0, z: 0, r: 1.5 }] },
  "smithy-door": { Component: SmithyDoor, height: 2.8, blockers: [{ x: 0, z: 0, r: 1.4 }] },
  anvil: { Component: Anvil, height: 1.0, blockers: [{ x: 0, z: 0, r: 0.6 }] },
  "heart-light": { Component: HeartLight, height: 3.2, blockers: [{ x: 0, z: 0, r: 0.35 }] },
  "still-water": {
    Component: StillWater,
    height: 0,
    blockers: [],
    // Water is not walkable. One circle sized to the room, which is why it asks.
    blockersFor: (w, d) => [{ x: 0, z: 0, r: Math.min(w, d) * 0.42 }],
  },
};

/** Which prop stands under which kind of emitter. The source-to-light inventory. */
export const EMITTER_PROP: Record<string, string> = {
  lantern: "stone-lantern",
  torch: "torch",
  brazier: "brazier",
  altar: "altar",
  fire: "hearth",
  window: "paper-window",
};

/** Where a light hangs on the prop that motivates it. One row, both objects. */
export const EMITTER_SOCKET: Record<string, number> = {
  lantern: 1.18,
  torch: 1.88,
  brazier: 0.86,
  altar: 1.16,
  fire: 0.24,
  window: 1.0,
};
