"use client";

/**
 * One biome, standing on the shared plane.
 *
 * Everything here comes from the manifest: rooms become props through
 * `dressing.ts`, `room.lights` become a lit emitter AND the light it throws (one
 * row, both objects, so an unexplained floating light is not a thing that can
 * happen), pages become objects you can unfold, and LEDGER lines become standing
 * stones.
 *
 * NO TEXT IN THE WORLD. Titles live in the HUD, on hover and on approach. A world
 * with a label floating over every object is a diagram; the reference we are
 * repurposing puts one name on the character card and one on the thread panel and
 * that is all, and PG's own rule is that visible text at rest stays at the card,
 * the compass and one hint.
 */

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Monument, Room, SceneObject, WorldManifest } from "./contract";
import { untouchedFor } from "./contract";
import type { Palette } from "./palette";
import { blockersFor, dressWorld, lightsFor, type Placement } from "./dressing";
import { Flame, PROPS } from "./props";
import { GEO, toon } from "./toon";
import type { Runtime } from "./runtime";
import { Lake } from "./Lake";

// ── A page, standing in a room ───────────────────────────────────────────────

/**
 * An ema tag: a paper card hung on a wooden stake, the shape the shrine already
 * uses for a written thing left in a place. Its own plate is the face of the card
 * when the vault names one, so "no page without a plate" is visible on the object
 * and not only inside the panel (the Critic's deduction 6).
 */
function PageObject({
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

  const plateTex = useMemo(() => {
    if (!o.plate?.url) return null;
    const t = new THREE.TextureLoader().load(o.plate.url);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [o.plate?.url]);

  const faceMat = useMemo(() => {
    if (plateTex) {
      return new THREE.MeshBasicMaterial({ map: plateTex, toneMapped: false });
    }
    return toon(p.paper, { untouched });
  }, [plateTex, p.paper, untouched]);

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
        // The Critic's deduction 4: a stationary finger opened nothing, because
        // only pointermove was bound. Down starts the hold, up cancels it, and
        // that is the whole phone story.
        onPointerDown={(e) => {
          e.stopPropagation();
          onPress(o.id);
        }}
        onPointerUp={() => onRelease()}
      >
        {/* Stake. */}
        <mesh geometry={GEO.cyl} material={toon(p.woodDark)} position={[0, 0.42, 0]} scale={[0.07, 0.84, 0.07]} castShadow />
        {/* Card, with its own painting when it has one. */}
        <mesh material={faceMat} position={[0, 1.0, 0.02]} castShadow>
          <planeGeometry args={[0.82, 0.62]} />
        </mesh>
        <mesh geometry={GEO.box} material={toon(p.woodDark, { untouched })} position={[0, 1.0, -0.01]} scale={[0.9, 0.7, 0.03]} castShadow />
        {/* A small cap so the tag reads as hung, not planted. */}
        <mesh geometry={GEO.box} material={toon(p.wood, { untouched })} position={[0, 1.38, 0]} scale={[0.98, 0.08, 0.1]} castShadow />
      </group>
    </group>
  );
}

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
  const Def = PROPS.stone;
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

// ── The biome ────────────────────────────────────────────────────────────────

/**
 * One room's props, in a group that switches itself off when he is nowhere near
 * it.
 *
 * This is the single biggest performance decision in the scene, and it was made
 * with a measurement (`optimize-threejs-games`: measure first). Four biomes of
 * procedural dressing is about two thousand small meshes; three walks every one
 * of them twice a frame, once for the shadow map and once for the colour pass,
 * and the first probe came back at four frames a second with a 570 ms worst
 * frame. Culling by room takes the traversal to the handful of rooms he can
 * actually see.
 *
 * Two mechanisms, both cheap. `visible = false` on a group makes three skip the
 * whole subtree in one test rather than per mesh. `matrixAutoUpdate = false`
 * stops it recomputing world matrices for scenery that has not moved since it
 * was placed and never will.
 */
function RoomProps({
  room,
  placements,
  p,
  rt,
}: {
  room: Room;
  placements: Placement[];
  p: Palette;
  rt: React.RefObject<Runtime>;
}) {
  const group = useRef<THREE.Group>(null);
  const acc = useRef(0);
  // The room's own reach: its half diagonal plus the distance he can see past it.
  const radius = useMemo(
    () => Math.hypot(room.size.w, room.size.d) / 2 + 34,
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
      {placements.map((pl) => {
        const def = PROPS[pl.kind];
        if (!def) return null;
        return (
          <group
            key={pl.key}
            position={[pl.x, 0, pl.z]}
            rotation={[0, pl.rot, 0]}
            scale={pl.scale}
          >
            <def.Component p={p} v={pl.v} rt={rt} />
          </group>
        );
      })}
    </group>
  );
}

export function World({
  world,
  p,
  rt,
  onPress,
  onRelease,
  lightBudget,
}: {
  world: WorldManifest;
  p: Palette;
  rt: React.RefObject<Runtime>;
  onPress: (id: string) => void;
  onRelease: () => void;
  /** How many local lights this biome may mount right now. Distance decides. */
  lightBudget: number;
}) {
  const byRoom = useMemo(() => {
    const all = dressWorld(world);
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

  // Water rooms carry a lake. The room is the authority on where the shore is.
  const lakes = useMemo(
    () =>
      world.layout.rooms.filter((r) =>
        /water|lake|pond/i.test(r.id),
      ),
    [world],
  );

  return (
    <group>
      {world.layout.rooms.map((room) => {
        const pls = byRoom.get(room.id);
        if (!pls) return null;
        return (
          <RoomProps key={room.id} room={room} placements={pls} p={p} rt={rt} />
        );
      })}

      {lakes.map((r) => (
        <Lake
          key={r.id}
          x={r.anchor.x}
          z={r.anchor.z}
          w={r.size.w}
          d={r.size.d}
          p={p}
        />
      ))}

      {/* The flames, and the lights they throw. One row of the manifest, two
          objects, always at the same coordinates. */}
      {lights.slice(0, lightBudget).map((l) => {
        const kind = l.emitter;
        const socket =
          kind === "lantern"
            ? 1.18
            : kind === "torch"
              ? 1.88
              : kind === "brazier"
                ? 0.86
                : kind === "altar"
                  ? 1.16
                  : kind === "fire"
                    ? 0.2
                    : 2.2;
        return (
          <group key={l.id} position={[l.at.x, socket, l.at.z]}>
            {kind !== "window" && (
              <Flame
                color={p.flame}
                core={p.flameCore}
                size={kind === "fire" ? 1.5 : kind === "altar" ? 1.2 : 0.85}
                seed={l.at.x * 0.13 + l.at.z * 0.29}
              />
            )}
            <pointLight
              color={l.color}
              intensity={l.intensity}
              distance={l.range}
              decay={1.7}
            />
          </group>
        );
      })}

      {world.objects.map((o) => (
        <PageObject key={o.id} o={o} p={p} rt={rt} onPress={onPress} onRelease={onRelease} />
      ))}

      {world.monuments.map((m) => (
        <MonumentStone key={m.id} m={m} p={p} rt={rt} onPress={onPress} onRelease={onRelease} />
      ))}
    </group>
  );
}

/** Every collision circle in a set of worlds, in world coordinates. */
export function worldBlockers(worlds: WorldManifest[]) {
  const out = worlds.flatMap((w) => blockersFor(dressWorld(w)));
  for (const w of worlds) {
    for (const o of w.objects) out.push({ x: o.at.x, z: o.at.z, r: 0.34 });
    for (const m of w.monuments) out.push({ x: m.at.x, z: m.at.z, r: 0.8 });
    // A lake is not walkable. One circle per water room keeps him on the shore
    // without a navmesh, and the dock is walkable because it declares no blocker.
    for (const r of w.layout.rooms) {
      if (/water|lake|pond/i.test(r.id)) {
        out.push({
          x: r.anchor.x,
          z: r.anchor.z - r.size.d * 0.1,
          r: Math.min(r.size.w, r.size.d) * 0.44,
        });
      }
    }
  }
  return out;
}
