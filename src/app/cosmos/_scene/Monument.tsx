"use client";

/**
 * Monument — a LEDGER line, standing on a path.
 *
 * EXTENDS: `~/cortex/self/LEDGER.md`, read in place by lib/cosmos/vault.ts. Not a
 * second ship log: nothing is written back, and the file's own never-restart rule
 * ("this file only grows") is why a monument is permanent once raised.
 *
 * One InstancedMesh again, stones receding along a serpentine path so the ledger
 * reads as ground you have walked rather than a list you have to read. No counts,
 * no streak, no grade anywhere on the surface: a monument is a place, and the
 * ledger records saves, it never scolds the player.
 */

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import type { ScenePreset } from "../../../lib/cosmos/vault";
import type { MonumentSpec } from "./types";
import { NOISE } from "./glsl";

const VERT = /* glsl */ `
  attribute float aSeed;
  varying vec2  vUv;
  varying float vSeed;
  varying float vDepth;
  void main() {
    vUv = uv;
    vSeed = aSeed;
    vec4 mv = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
    vDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAG = /* glsl */ `
  precision highp float;
  varying vec2  vUv;
  varying float vSeed;
  varying float vDepth;

  uniform float uTime;
  uniform vec3  uStone;
  uniform vec3  uLight;
  uniform vec3  uMistColor;
  uniform float uMistDensity;

  ${NOISE}

  void main() {
    vec2 p = vUv - vec2(0.5, 0.42);

    // A standing marker: a tapered slab with a rounded cap, weathered by noise.
    float w = 0.19 - smoothstep(0.0, 0.55, vUv.y) * 0.045;
    float edge = fbm(vec2(vUv.y * 11.0 + vSeed * 30.0, vSeed)) * 0.022;
    float body = 1.0 - smoothstep(w - 0.006, w, abs(p.x) + edge);
    body *= 1.0 - smoothstep(0.415, 0.425, abs(p.y - 0.02));
    float cap = 1.0 - smoothstep(0.118, 0.126, length(vec2(p.x, (p.y - 0.36) * 1.5)));
    body = max(body, cap);
    if (body <= 0.003) discard;

    // Stone, mossed low and lit from the lantern side. It is DARK: a monument is
    // something you notice on the ground, not a pale slab hung over the view. Two
    // earlier passes lit it like paper and it washed the painting out.
    float moss = smoothstep(0.22, -0.3, vUv.y) * fbm(vUv * 8.0 + vSeed * 12.0);
    vec3 col = mix(uStone, uStone * vec3(0.78, 1.05, 0.82), moss * 0.6);
    col *= 0.72 + smoothstep(0.35, -0.35, p.x) * 0.55;

    // The save mark: one carved notch that catches the lantern. Not a badge, and
    // never a count: twelve stones is not a score, it is twelve places.
    float notch = 1.0 - smoothstep(0.0, 0.012, abs(p.y - 0.16) + abs(p.x) * 0.32);
    col = mix(col, uLight, notch * 0.42);

    // Distance haze along the path: the oldest ships are furthest into weather.
    // Distance haze along the path. The oldest ships are furthest into weather,
    // and they FADE rather than sitting flat on top of the valley.
    float haze = clamp((vDepth - 4.0) / 9.0, 0.0, 1.0) * (0.55 + uMistDensity * 0.6);
    col = mix(col, uMistColor * 0.42, haze * 0.85);

    gl_FragColor = vec4(col, body * (1.0 - haze * 0.62) * 0.9);
  }
`;

export function Monuments({
  monuments,
  preset,
  ink,
  light,
  mistDensity,
}: {
  monuments: MonumentSpec[];
  preset: ScenePreset;
  ink: string;
  light: string;
  mistDensity: number;
}) {
  const inst = useRef<THREE.InstancedMesh>(null);
  const mat = useRef<THREE.ShaderMaterial>(null);
  const { invalidate } = useThree();

  const count = Math.max(monuments.length, 1);

  const seeds = useMemo(() => {
    const a = new Float32Array(count);
    for (let i = 0; i < count; i++) a[i] = (i * 0.618033) % 1;
    return a;
  }, [count]);

  useEffect(() => {
    const m = inst.current;
    if (!m) return;
    const dummy = new THREE.Object3D();
    monuments.forEach((mo, i) => {
      dummy.position.set(mo.x, mo.y, mo.z);
      dummy.rotation.set(0, (seeds[i] - 0.5) * 0.5, (seeds[i] - 0.5) * 0.05);
      dummy.scale.set(mo.scale * 2.0, mo.scale * 3.3, 1);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
    m.count = monuments.length;
    m.instanceMatrix.needsUpdate = true;
    invalidate();
  }, [monuments, seeds, invalidate]);

  useFrame((_, dt) => {
    if (mat.current) mat.current.uniforms.uTime.value += dt;
  });

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uStone: { value: new THREE.Color(ink) },
      uLight: { value: new THREE.Color(light) },
      uMistColor: { value: new THREE.Color(preset.mist.color) },
      uMistDensity: { value: mistDensity },
    }),
    [ink, light, preset, mistDensity],
  );

  if (monuments.length === 0) return null;

  // Only the three nearest carry a date. The rest are shapes in the distance;
  // reading the whole ledger is not the job of a world.
  const labelled = monuments.slice(-3);

  return (
    <group>
      <instancedMesh ref={inst} args={[undefined, undefined, count]} frustumCulled={false}>
        <planeGeometry args={[1, 1, 1, 1]}>
          <instancedBufferAttribute attach="attributes-aSeed" args={[seeds, 1]} />
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

      {labelled.map((mo) => (
        <Text
          key={mo.id}
          position={[mo.x, mo.y - mo.scale * 2.1, mo.z + 0.02]}
          fontSize={0.062}
          color={light}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.003}
          outlineColor="#120d04"
          outlineOpacity={0.7}
          fillOpacity={0.42}
        >
          {mo.date}
        </Text>
      ))}
    </group>
  );
}
