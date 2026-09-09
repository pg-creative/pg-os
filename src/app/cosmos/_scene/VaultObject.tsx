"use client";

/**
 * VaultObject — a page in the vault, standing in the world as a thing.
 *
 * EXTENDS: `_components/emaki/materials.tsx` WashiPanel (the washi surface with a
 * kintsugi edge) translated from a DOM card into a lit quad, and the per-object
 * mist contract from glsl.ts. One InstancedMesh carries every object so the whole
 * set costs one draw call: the budget for the scene is 40 and the sky, three
 * plates, the mist pass and the monuments already take seven.
 *
 * Nothing text-first. The object is a shape in the weather; its title is one line
 * of troika text underneath, and its prose exists only once you dwell on it.
 */

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import type { ScenePreset } from "../../../lib/cosmos/vault";
import type { ObjectSpec } from "./types";
import { GRAIN, MIST, NOISE } from "./glsl";

const VERT = /* glsl */ `
  attribute float aUntouched;
  attribute float aFocus;
  attribute vec3  aTint;
  varying vec2  vUv;
  varying float vUntouched;
  varying float vFocus;
  varying vec3  vTint;
  void main() {
    vUv = uv;
    vUntouched = aUntouched;
    vFocus = aFocus;
    vTint = aTint;
    gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
  }
`;

const FRAG = /* glsl */ `
  precision highp float;
  varying vec2  vUv;
  varying float vUntouched;
  varying float vFocus;
  varying vec3  vTint;

  uniform float uTime;
  uniform vec3  uPaper;
  uniform vec3  uInk;
  uniform vec3  uEdge;
  uniform vec3  uMistColor;
  uniform float uMistScale;
  uniform float uMistSpeed;
  uniform float uGrain;
  uniform float uGrainScale;

  ${NOISE}
  ${MIST}
  ${GRAIN}

  void main() {
    vec2 p = vUv - 0.5;

    // An ema tag: a small hanging plaque with a crisp deckle edge, not a blur.
    // The edges are tight on purpose. A soft-edged rectangle at this size reads
    // as fog on the lens, which is exactly what the first pass looked like.
    float deckle = (vnoise(vec2(vUv.y * 26.0, 3.0)) - 0.5) * 0.016
                 + (vnoise(vec2(vUv.x * 26.0, 9.0)) - 0.5) * 0.010;
    float halfW = 0.30 + deckle;
    float halfH = 0.40 + deckle;
    float inX = 1.0 - smoothstep(halfW - 0.008, halfW, abs(p.x));
    float inY = 1.0 - smoothstep(halfH - 0.008, halfH, abs(p.y));
    float body = inX * inY;

    // The cord it hangs from, one thin line up from the top edge.
    float cord = (1.0 - smoothstep(0.0, 0.006, abs(p.x)))
               * step(halfH, p.y) * (1.0 - smoothstep(halfH, 0.5, p.y));

    if (body + cord <= 0.004) discard;

    // Warm washi, tinted by page type, with the lantern side lit.
    vec3 col = mix(uPaper, vTint, 0.34);
    col *= 0.82 + smoothstep(0.42, -0.3, p.x) * 0.3;

    // Fibres, so it is paper and not a card.
    col += (vnoise(vec2(vUv.x * 90.0, vUv.y * 14.0)) - 0.5) * 0.055;

    // One ink border just inside the edge, the way a plaque is bound.
    float border = (1.0 - smoothstep(halfW - 0.030, halfW - 0.022, abs(p.x)))
                 * (1.0 - smoothstep(halfH - 0.030, halfH - 0.022, abs(p.y)));
    col = mix(uInk, col, clamp(border + 0.12, 0.0, 1.0));

    // Kintsugi: one gold seam down the paper, never two.
    float seam = 1.0 - smoothstep(0.0, 0.009,
      abs(p.x + 0.085 + (vnoise(vec2(vUv.y * 7.0, 4.0)) - 0.5) * 0.06));
    col = mix(col, uEdge, seam * body * 0.62);

    col = mix(col, uEdge * 0.9, cord * 0.8);

    // The mist rule: untouched things fade INTO the weather, they never vanish.
    // The alpha floor is what "never deletes" means in pixels: at full mist the
    // tag is still a shape you can find, not an absence.
    float m = mistAmount(vUv, uTime, vUntouched, vFocus, uMistScale, uMistSpeed);
    col = mix(col, uMistColor, m * 0.55);

    col += grain(vUv, uTime, uGrainScale) * uGrain;

    float a = max(body, cord * 0.55) * (0.42 + (1.0 - m) * 0.58);
    gl_FragColor = vec4(col, a);
  }
`;

export function VaultObjects({
  objects,
  preset,
  paper,
  ink,
  edge,
  hovered,
  onHover,
  onDwellStart,
  onDwellCancel,
}: {
  objects: ObjectSpec[];
  preset: ScenePreset;
  paper: string;
  ink: string;
  edge: string;
  hovered: string | null;
  onHover: (id: string | null) => void;
  onDwellStart: (id: string) => void;
  onDwellCancel: () => void;
}) {
  const inst = useRef<THREE.InstancedMesh>(null);
  const mat = useRef<THREE.ShaderMaterial>(null);
  const { invalidate } = useThree();

  const count = Math.max(objects.length, 1);

  const { untouched, focus, tint } = useMemo(() => {
    const u = new Float32Array(count);
    const f = new Float32Array(count);
    const t = new Float32Array(count * 3);
    const warm = new THREE.Color(preset.sky.glow);
    const cool = new THREE.Color(preset.mist.color);
    objects.forEach((o, i) => {
      u[i] = o.untouched;
      f[i] = 0;
      // Type gives each kind of page its own tint inside one palette: a creed is
      // warmer than a place, a chapter cooler. Still one register.
      const mix = o.type === "creed" ? 0.15 : o.type === "chapter" ? 0.8 : 0.45;
      const c = warm.clone().lerp(cool, mix);
      t[i * 3] = c.r;
      t[i * 3 + 1] = c.g;
      t[i * 3 + 2] = c.b;
    });
    return { untouched: u, focus: f, tint: t };
  }, [objects, count, preset]);

  // Place the instances once. Geometry is server-decided, so it never shuffles.
  useEffect(() => {
    const m = inst.current;
    if (!m) return;
    const dummy = new THREE.Object3D();
    objects.forEach((o, i) => {
      dummy.position.set(o.x, o.y, o.z);
      dummy.rotation.set(0, o.spin * 0.4, o.spin * 0.12);
      dummy.scale.set(o.scale * 1.5, o.scale * 2.15, 1);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
    m.count = objects.length;
    m.instanceMatrix.needsUpdate = true;
    invalidate();
  }, [objects, invalidate]);

  // Focus distance: the hovered object is in focus, everything else recedes.
  useEffect(() => {
    const m = inst.current;
    if (!m) return;
    const attr = m.geometry.getAttribute("aFocus") as THREE.BufferAttribute;
    objects.forEach((o, i) => {
      attr.setX(i, hovered && hovered !== o.id ? 0.55 : 0);
    });
    attr.needsUpdate = true;
    invalidate();
  }, [hovered, objects, invalidate]);

  useFrame((_, dt) => {
    if (mat.current) mat.current.uniforms.uTime.value += dt;
    const m = inst.current;
    if (!m) return;
    // A slow breath, so the paper is alive without ever calling attention.
    m.rotation.z = Math.sin(performance.now() * 0.00013) * 0.006;
  });

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uPaper: { value: new THREE.Color(paper) },
      uInk: { value: new THREE.Color(ink) },
      uEdge: { value: new THREE.Color(edge) },
      uMistColor: { value: new THREE.Color(preset.mist.color) },
      uMistScale: { value: preset.mist.scale },
      uMistSpeed: { value: preset.mist.speed },
      uGrain: { value: preset.grain.amount },
      uGrainScale: { value: preset.grain.scale },
    }),
    [paper, ink, edge, preset],
  );

  if (objects.length === 0) return null;

  return (
    <group>
      <instancedMesh
        ref={inst}
        args={[undefined, undefined, count]}
        frustumCulled={false}
        onPointerMove={(e) => {
          const id = objects[e.instanceId ?? -1]?.id ?? null;
          if (id) {
            e.stopPropagation();
            onHover(id);
            onDwellStart(id);
          }
        }}
        onPointerOut={() => {
          onHover(null);
          onDwellCancel();
        }}
      >
        <planeGeometry args={[1, 1, 1, 1]}>
          <instancedBufferAttribute
            attach="attributes-aUntouched"
            args={[untouched, 1]}
          />
          <instancedBufferAttribute attach="attributes-aFocus" args={[focus, 1]} />
          <instancedBufferAttribute attach="attributes-aTint" args={[tint, 3]} />
        </planeGeometry>
        <shaderMaterial
          ref={mat}
          vertexShader={VERT}
          fragmentShader={FRAG}
          uniforms={uniforms}
          transparent
          depthWrite={false}
        />
      </instancedMesh>

      {/* Titles. troika text through drei, one line, in the world's ink. */}
      {objects.map((o) => (
        <Text
          key={o.id}
          position={[o.x, o.y - o.scale * 1.18, o.z + 0.02]}
          fontSize={0.112}
          color={hovered === o.id ? "#FFFFFF" : "#F6E3C2"}
          anchorX="center"
          anchorY="middle"
          maxWidth={2.4}
          outlineWidth={0.014}
          outlineColor="#160a20"
          outlineOpacity={0.92}
          fillOpacity={0.82 + (1 - o.untouched) * 0.18}
        >
          {o.title}
        </Text>
      ))}
    </group>
  );
}
