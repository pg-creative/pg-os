"use client";

/**
 * One biome, standing on the shared plane.
 *
 * Everything here comes from the manifest: a room's `props:` become props
 * through `place.ts`, `room.lights` become a lit emitter AND the light it throws
 * (one row, both objects, so an unexplained floating light is not a thing that
 * can happen), pages become ema tags you can unfold, and LEDGER lines become
 * standing stones.
 *
 * TWO CHANGES THIS ROUND, both the Critic's.
 *
 * THE PAINT. A prop is a painted cutout when the vault has one for that word in
 * that world, and the procedural factory when it does not. The probe is per URL
 * per session, cached across every prop of the same kind, and the factory draws
 * while it is in flight, so the world is whole at first paint and gets better
 * the moment the painter lands a file. Nothing here waits on art.
 *
 * THE WEIGHT. An ema tag is an 0.82 metre card, and round two textured it with
 * the page's full plate: 1456 by 816 each, Maygan's the whole 2912 by 1632 grid
 * at ten megabytes, 7.6 MB and 75 MB of GPU per cold load, for postage stamps.
 * The card now takes `card:`, the 256 px thumbnail, and the full plate is loaded
 * once, inside the panel, when he opens it.
 *
 * NO TEXT IN THE WORLD. Titles live in the HUD, on approach. A world with a
 * label floating over every object is a diagram.
 */

import { memo, useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Monument, Room, SceneObject, WorldManifest } from "./contract";
import { untouchedFor } from "./contract";
import type { Palette } from "./registers";
import { blockersFor, lightsFor, placeWorld, type Placement } from "./place";
import { Cutout, cutoutUrl, cutoutsAllowed, useCutout } from "./Cutout";
import { EMITTER_SOCKET, Flame, PROPS } from "./props";
import { GEO, toon } from "./toon";
import type { Runtime } from "./runtime";
import { Backdrop } from "./Backdrop";

/**
 * The painted interior a room's back wall wears.
 *
 * A scene-side art assignment, not vault data, and the one place in this file
 * that names a specific painting. It belongs in `world.yml` as `interior_plate:`
 * and is written down in NOTES.md as the thing to move there; it is here tonight
 * because the hall interior was painted this round, is referenced by no page, and
 * the Critic counted it as the best pixels in the build reaching nothing.
 *
 * `u` is where the painted hearth sits across the image, 0 to 1, so the fire in
 * the picture lands over the fire in the room.
 */
const INTERIOR: Record<string, { url: string; u: number }> = {
  "quiet-practice": {
    url: "/api/cosmos/asset/wall/mj-2026-09-09b/quadrants/01-hall-interior-q2",
    u: 0.355,
  },
};

// ── A page, standing in a room ───────────────────────────────────────────────

/**
 * An ema tag: a paper card hung on a wooden stake, the shape the shrine already
 * uses for a written thing left in a place. Its own thumbnail is the face of the
 * card when the vault has cut one, so "no page without a plate" is visible on the
 * object and not only inside the panel.
 */
const PageObject = memo(function PageObject({
  o,
  p,
  rt,
  onPress,
  onRelease,
}: {
  o: SceneObject;
  p: Palette;
  rt: React.RefObject<Runtime>;
  onPress: (id: string) => void;
  onRelease: () => void;
}) {
  const ring = useRef<THREE.Mesh>(null);
  const card = useRef<THREE.Group>(null);
  const untouched = untouchedFor(o.touched);
  const thumb = (o as SceneObject & { card?: { url: string } | null }).card?.url ?? null;
  const draft = (o as SceneObject & { draft?: boolean }).draft === true;

  const faceTex = useCutout(thumb);
  const faceMat = useMemo(() => {
    if (faceTex.status === "ok" && faceTex.tex) {
      return new THREE.MeshBasicMaterial({ map: faceTex.tex, toneMapped: false, fog: true });
    }
    return toon(p.paper, { untouched });
  }, [faceTex.status, faceTex.tex, p.paper, untouched]);

  const ringMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(p.flame),
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    [p.flame],
  );

  useFrame((state, dt) => {
    const r = rt.current;
    if (!r) return;
    const active = r.hovered === o.id || r.near?.id === o.id;
    const want = active ? 0.44 : 0;
    ringMat.opacity += (want - ringMat.opacity) * Math.min(1, dt * 7);
    if (ring.current) {
      const s = 1 + (active ? Math.sin(state.clock.elapsedTime * 2.4) * 0.03 : 0);
      ring.current.scale.setScalar(s);
    }
    if (card.current) {
      // The tag turns in the air, slowly, the way a paper thing does.
      card.current.rotation.y =
        Math.sin(state.clock.elapsedTime * 0.5 + o.at.x) * (r.reduced ? 0 : 0.14);
    }
  });

  return (
    <group position={[o.at.x, 0, o.at.z]}>
      {/* The soft ring on the ground: look, and a thing answers. */}
      <mesh ref={ring} material={ringMat} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <ringGeometry args={[0.66, 0.86, 28]} />
      </mesh>

      <group
        ref={card}
        onPointerOver={(e) => {
          e.stopPropagation();
          if (rt.current) rt.current.hovered = o.id;
        }}
        onPointerOut={() => {
          if (rt.current && rt.current.hovered === o.id) rt.current.hovered = null;
        }}
        // A stationary finger opens it: down starts the hold, up cancels it.
        onPointerDown={(e) => {
          e.stopPropagation();
          onPress(o.id);
        }}
        onPointerUp={() => onRelease()}
      >
        <mesh geometry={GEO.cyl} material={toon(p.woodDark)} position={[0, 0.42, 0]} scale={[0.07, 0.84, 0.07]} castShadow />
        <mesh material={faceMat} position={[0, 1.0, 0.02]} castShadow>
          <planeGeometry args={[0.82, 0.62]} />
        </mesh>
        <mesh geometry={GEO.box} material={toon(p.woodDark, { untouched })} position={[0, 1.0, -0.01]} scale={[0.9, 0.7, 0.03]} castShadow />
        <mesh geometry={GEO.box} material={toon(draft ? p.flame : p.wood, { untouched })} position={[0, 1.38, 0]} scale={[0.98, 0.08, 0.1]} castShadow />
      </group>
    </group>
  );
});

// ── A LEDGER line, standing up ───────────────────────────────────────────────

function MonumentStone({
  m,
  p,
  rt,
  onPress,
  onRelease,
}: {
  m: Monument;
  p: Palette;
  rt: React.RefObject<Runtime>;
  onPress: (id: string) => void;
  onRelease: () => void;
}) {
  const v = useMemo(() => (Math.abs(hashCode(m.id)) % 1000) / 1000, [m.id]);
  const Def = PROPS["standing-stone"];
  const ringMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(p.flame),
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    [p.flame],
  );

  useFrame((_, dt) => {
    const r = rt.current;
    if (!r) return;
    const active = r.hovered === m.id || r.near?.id === m.id;
    ringMat.opacity += ((active ? 0.4 : 0) - ringMat.opacity) * Math.min(1, dt * 7);
  });

  return (
    <group
      position={[m.at.x, 0, m.at.z]}
      onPointerOver={(e) => {
        e.stopPropagation();
        if (rt.current) rt.current.hovered = m.id;
      }}
      onPointerOut={() => {
        if (rt.current && rt.current.hovered === m.id) rt.current.hovered = null;
      }}
      onPointerDown={(e) => {
        e.stopPropagation();
        onPress(m.id);
      }}
      onPointerUp={() => onRelease()}
    >
      <mesh material={ringMat} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <ringGeometry args={[0.9, 1.12, 28]} />
      </mesh>
      <Def.Component p={p} v={v} />
    </group>
  );
}

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return h;
}

// ── One prop: painted if the vault has it, procedural if not ─────────────────

const Prop = memo(function Prop({
  pl,
  worldId,
  p,
  rt,
  interior,
  painted,
}: {
  pl: Placement;
  worldId: string;
  p: Palette;
  rt: React.RefObject<Runtime>;
  interior: { url: string; u: number } | null;
  /**
   * Prop words this world has paintings for, from the manifest. Null means the
   * reader sent no list and the scene may probe; an empty set means it sent one
   * and this world has nothing painted, so nothing is requested.
   */
  painted: Set<string> | null;
}) {
  const def = PROPS[pl.kind];
  // A room, a path and a sheet of water are shaped by their room; a painting of
  // one would be a painting of somewhere else. Those stay procedural.
  // THE LIST WINS WHEN THERE IS A LIST. `painted.has(kind) || cutoutsAllowed()`
  // read as "prefer the manifest" and behaved as "always probe": the OR is true
  // for every prop the moment `?cutouts=off` is absent, so the reader's list
  // changed nothing and nine console 404s survived it. Round 2.1 measured them.
  // A null set means the manifest carried no list and the scene may still guess.
  const paintable =
    def &&
    def.height > 0 &&
    pl.kind !== "hall" &&
    pl.kind !== "smithy" &&
    (painted ? painted.has(pl.kind) : cutoutsAllowed());
  const { status, tex } = useCutout(paintable ? cutoutUrl(worldId, pl.kind) : null);

  if (!def) return null;

  if (status === "ok" && tex) {
    return (
      <Cutout
        tex={tex}
        height={def.height * pl.scale}
        at={[pl.x, 0, pl.z]}
        // A PAINTING FACES YOU. A cutout is one flat plane, so a fixed yaw
        // shows it edge-on from half the world and the couch in the yard was a
        // dark line on the grass. Foliage keeps a fixed bearing (a pine looks
        // the same from anywhere and a swaying billboard that also turns reads
        // as a flag); everything else turns to the camera around Y.
        face={(def.wind ?? 0) === 0}
        yaw={pl.rot}
        wind={def.wind ?? 0}
        flip={(def.wind ?? 0) > 0 && pl.v > 0.5}
      />
    );
  }

  return (
    <group position={[pl.x, 0, pl.z]} rotation={[0, pl.rot, 0]} scale={pl.scale}>
      <def.Component
        p={p}
        v={pl.v}
        rt={rt}
        w={pl.w}
        d={pl.d}
        gap={pl.gap ?? null}
        interior={pl.kind === "hall" ? (interior?.url ?? null) : null}
        interiorU={interior?.u ?? 0.5}
        interiorAt={pl.interiorAt ?? 0}
      />
    </group>
  );
});

// ── The biome ────────────────────────────────────────────────────────────────

/**
 * One room's props, in a group that switches itself off when he is nowhere near
 * it.
 *
 * This is the single biggest performance decision in the scene, and it was made
 * with a measurement (`optimize-threejs-games`: measure first). Culling by room
 * takes the traversal to the handful of rooms he can actually see. `visible =
 * false` on a group makes three skip the whole subtree in one test rather than
 * per mesh; `matrixAutoUpdate = false` stops it recomputing world matrices for
 * scenery that has not moved since it was placed and never will.
 */
const RoomProps = memo(function RoomProps({
  room,
  placements,
  worldId,
  p,
  rt,
  interior,
  painted,
}: {
  room: Room;
  placements: Placement[];
  worldId: string;
  p: Palette;
  rt: React.RefObject<Runtime>;
  interior: { url: string; u: number } | null;
  /** See `Prop`: null means no list came, an empty set means one did. */
  painted: Set<string> | null;
}) {
  const group = useRef<THREE.Group>(null);
  const acc = useRef(0);
  const radius = useMemo(
    () => Math.hypot(room.size.w, room.size.d) / 2 + 42,
    [room.size.w, room.size.d],
  );

  useEffect(() => {
    if (group.current) {
      group.current.updateMatrixWorld(true);
      group.current.matrixAutoUpdate = false;
    }
  }, [placements]);

  useFrame((_, dt) => {
    const g = group.current;
    const r = rt.current;
    if (!g || !r) return;
    acc.current += dt;
    if (acc.current < 0.25) return;
    acc.current = 0;
    const d = Math.hypot(room.anchor.x - r.pos.x, room.anchor.z - r.pos.z);
    g.visible = d < radius;
  });

  return (
    <group ref={group}>
      {placements.map((pl) => (
        <Prop
          key={pl.key}
          pl={pl}
          worldId={worldId}
          p={p}
          rt={rt}
          interior={interior}
          painted={painted}
        />
      ))}
    </group>
  );
});

/** Memoized for the same reason `WorldCanvas` is: a HUD tick is not a world. */
export const World = memo(function World({
  world,
  p,
  rt,
  onPress,
  onRelease,
  lightBudget,
  current,
}: {
  world: WorldManifest;
  p: Palette;
  rt: React.RefObject<Runtime>;
  onPress: (id: string) => void;
  onRelease: () => void;
  /** How many local lights this biome may mount right now. Distance decides. */
  lightBudget: number;
  /** True while the Wayfarer is standing in this biome. */
  current: boolean;
}) {
  const byRoom = useMemo(() => {
    const all = placeWorld(world);
    const map = new Map<string, Placement[]>();
    for (const pl of all) {
      const roomId = pl.key.split(":")[0];
      const list = map.get(roomId);
      if (list) list.push(pl);
      else map.set(roomId, [pl]);
    }
    return map;
  }, [world]);

  const lights = useMemo(() => lightsFor(world), [world]);
  const interior = INTERIOR[world.id] ?? null;
  const painted = useMemo(
    () => (world.cutouts ? new Set(world.cutouts) : null),
    [world.cutouts],
  );

  /**
   * The light budget, BY DISTANCE, not by room order.
   *
   * The Critic's deduction 8: round two took the first five lights in room
   * order, so the lake lantern and the threshold gate's lantern, which is the
   * mist door's own beacon, never got a flame however close he stood to them.
   * Sorting by distance to the walker costs one pass over a list of at most a
   * dozen, on the same quarter-second tick everything else uses.
   */
  const [order, setOrder] = useState<string[]>(() => lights.map((l) => l.id));
  const acc = useRef(0);
  useFrame((_, dt) => {
    const r = rt.current;
    if (!r || lights.length <= lightBudget) return;
    acc.current += dt;
    if (acc.current < 0.5) return;
    acc.current = 0;
    const ranked = [...lights]
      .sort(
        (a, b) =>
          Math.hypot(a.at.x - r.pos.x, a.at.z - r.pos.z) -
          Math.hypot(b.at.x - r.pos.x, b.at.z - r.pos.z),
      )
      .map((l) => l.id);
    setOrder((prev) =>
      prev.length === ranked.length && prev.every((id, i) => id === ranked[i]) ? prev : ranked,
    );
  });

  const lit = useMemo(() => {
    const rank = new Map(order.map((id, i) => [id, i]));
    return [...lights]
      .sort((a, b) => (rank.get(a.id) ?? 99) - (rank.get(b.id) ?? 99))
      .slice(0, lightBudget);
  }, [lights, order, lightBudget]);

  return (
    <group>
      <Backdrop world={world} p={p} rt={rt} current={current} />

      {world.layout.rooms.map((room) => {
        const pls = byRoom.get(room.id);
        if (!pls) return null;
        return (
          <RoomProps
            key={room.id}
            room={room}
            placements={pls}
            worldId={world.id}
            p={p}
            rt={rt}
            interior={interior}
            painted={painted}
          />
        );
      })}

      {/* The flames, and the lights they throw. One row of the manifest, two
          objects, always at the same coordinates. A window's lamp is its own
          lit panel, so it gets the light and not a second flame. */}
      {lit.map((l) => {
        const socket = EMITTER_SOCKET[l.emitter] ?? 1.2;
        return (
          <group key={l.id} position={[l.at.x, socket, l.at.z]}>
            {l.emitter !== "window" && (
              <Flame
                color={p.flame}
                core={p.flameCore}
                size={l.emitter === "fire" ? 1.5 : l.emitter === "altar" ? 1.2 : 0.85}
                seed={l.at.x * 0.13 + l.at.z * 0.29}
              />
            )}
            <pointLight
              color={l.color}
              intensity={l.intensity * (current ? 1 : 0.7)}
              distance={l.range}
              decay={1.7}
            />
          </group>
        );
      })}

      {/* A monument that the keeper also lists in `objects` (so it carries a
          body to unfold) must not ALSO stand as an ema card: it is already a
          stone, three lines down. */}
      {world.objects
        .filter((o) => o.type !== "monument")
        .map((o) => (
          <PageObject key={o.id} o={o} p={p} rt={rt} onPress={onPress} onRelease={onRelease} />
        ))}

      {world.monuments.map((m) => (
        <MonumentStone key={m.id} m={m} p={p} rt={rt} onPress={onPress} onRelease={onRelease} />
      ))}
    </group>
  );
});

/** Every collision circle in a set of worlds, in world coordinates. */
export function worldBlockers(worlds: WorldManifest[]) {
  const out = worlds.flatMap((w) => blockersFor(placeWorld(w)));
  for (const w of worlds) {
    for (const o of w.objects) out.push({ x: o.at.x, z: o.at.z, r: 0.34 });
    // The same radius the standing-stone prop declares, so the distance the
    // steering parks him at is one number and not two.
    for (const m of w.monuments) {
      out.push({ x: m.at.x, z: m.at.z, r: PROPS["standing-stone"].blockers[0].r });
    }
  }
  return out;
}
