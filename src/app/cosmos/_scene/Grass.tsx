"use client";

/**
 * Instanced grass, in a patch that follows the eye.
 *
 * EXTENDS Forge `components/painted-billboards/GrassField.tsx` (MIT, PG's own):
 * crossed planes, vertex-coloured root to tip, swayed by the shared wind chunk.
 * One change, and it is the one that makes it affordable across five biomes on
 * one plane: the field is not laid over a whole world. It is a fixed number of
 * blades in a square around the camera target, scattered from a hash of the
 * world cell they land in, so walking re-lays them silently in front of the eye
 * and nothing is ever instanced out in the mist where nobody is standing.
 *
 * The scatter is deterministic per cell, so a screenshot of a place is the same
 * screenshot tomorrow (`test-playable-web-games`), and re-laying happens on an
 * eight unit step rather than every frame.
 *
 * Cost: one draw call, one geometry, one material, whatever the biome. Under
 * reduced motion this component is never mounted at all, because the canvas
 * isn't.
 */

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { attachWind } from "./wind";

const CELL = 8;

function hash2(x: number, y: number): number {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Two crossed quads with a colour ramp baked into the vertices. */
function bladeGeometry(w: number, h: number, root: string, tip: string) {
  const a = new THREE.PlaneGeometry(w, h, 1, 3);
  const b = a.clone().rotateY(Math.PI / 2);
  const merged = merge([a, b]);
  merged.translate(0, h / 2, 0);
  const pos = merged.attributes.position;
  const colours = new Float32Array(pos.count * 3);
  const c0 = new THREE.Color(root);
  const c1 = new THREE.Color(tip);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const t = THREE.MathUtils.clamp((pos.getY(i) + h / 2) / h, 0, 1);
    c.copy(c0).lerp(c1, t);
    colours.set([c.r, c.g, c.b], i * 3);
  }
  merged.setAttribute("color", new THREE.BufferAttribute(colours, 3));
  a.dispose();
  b.dispose();
  return merged;
}

/** A local merge, so this file has no drei dependency. */
function merge(list: THREE.BufferGeometry[]) {
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const index: number[] = [];
  let offset = 0;
  for (const g of list) {
    const p = g.attributes.position;
    const n = g.attributes.normal;
    const u = g.attributes.uv;
    for (let i = 0; i < p.count; i++) {
      positions.push(p.getX(i), p.getY(i), p.getZ(i));
      normals.push(n.getX(i), n.getY(i), n.getZ(i));
      uvs.push(u.getX(i), u.getY(i));
    }
    const idx = g.index;
    if (idx) for (let i = 0; i < idx.count; i++) index.push(idx.getX(i) + offset);
    offset += p.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  out.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  out.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  out.setIndex(index);
  return out;
}

export function GrassField({
  target,
  root,
  tip,
  count = 1500,
  radius = 26,
}: {
  target: React.RefObject<THREE.Vector3>;
  root: string;
  tip: string;
  count?: number;
  radius?: number;
}) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const at = useRef<[number, number]>([NaN, NaN]);

  const { geometry, material } = useMemo(() => {
    const geometry = bladeGeometry(0.34, 0.62, root, tip);
    const material = new THREE.MeshLambertMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
      fog: true,
    });
    attachWind(material, 1);
    // Every grass field in the cosmos compiles ONE program, whatever the
    // register: the colour lives in the vertices, not in a define.
    material.customProgramCacheKey = () => "cosmos-grass";
    return { geometry, material };
  }, [root, tip]);

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  const lay = useMemo(() => {
    const o = new THREE.Object3D();
    return (cx: number, cz: number, m: THREE.InstancedMesh) => {
      for (let i = 0; i < count; i++) {
        // Deterministic from the instance index and the patch cell: the same
        // ground grows the same grass every time the eye comes back to it.
        const a = hash2(i * 7919, Math.round(cx));
        const b = hash2(i * 104729 + 13, Math.round(cz));
        const ang = a * Math.PI * 2;
        const rad = Math.sqrt(b) * radius;
        const x = cx + Math.cos(ang) * rad;
        const z = cz + Math.sin(ang) * rad;
        const s = 0.7 + hash2(Math.round(x * 4), Math.round(z * 4)) * 0.75;
        o.position.set(x, 0, z);
        o.rotation.set(0, a * Math.PI * 3.1, 0);
        o.scale.set(s, s, s);
        o.updateMatrix();
        m.setMatrixAt(i, o.matrix);
      }
      m.instanceMatrix.needsUpdate = true;
      m.computeBoundingSphere();
    };
  }, [count, radius]);

  useFrame(() => {
    const m = mesh.current;
    const t = target.current;
    if (!m || !t) return;
    const cx = Math.round(t.x / CELL) * CELL;
    const cz = Math.round(t.z / CELL) * CELL;
    if (at.current[0] === cx && at.current[1] === cz) return;
    at.current = [cx, cz];
    lay(cx, cz, m);
  });

  return (
    <instancedMesh
      ref={mesh}
      args={[geometry, material, count]}
      receiveShadow
      frustumCulled={false}
    />
  );
}
