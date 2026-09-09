"use client";

/**
 * Particles — sakura on the wind at twilight, motes otherwise.
 *
 * EXTENDS: `_components/AmbientParticles.tsx` (the OS's own drifting layer) and
 * the emaki recipe's z2 particle band, moved from DOM canvas into the scene so it
 * composites with the mist and the plates instead of sitting on top of them.
 *
 * WHY ITS OWN OBJECT, not a loop inside the mist pass: drawing 46 particles by
 * testing every one of them against every pixel is 46 iterations across 1.3M
 * pixels. As a Points cloud it is 46 vertices and a handful of pixels each. Same
 * picture, and it is the single biggest reason this scene holds frame rate.
 * ("Always degrade": hard-cap the count, never let a register ask for thousands.)
 */

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { ScenePreset } from "../../../lib/cosmos/vault";

const VERT = /* glsl */ `
  attribute vec3  aSeed;    // x: lane, y: phase, z: depth
  attribute vec3  aColor;
  varying vec3  vColor;
  varying float vSpin;
  varying float vDepth;

  uniform float uTime;
  uniform float uScroll;
  uniform float uDrift;
  uniform float uWind;
  uniform float uSpan;
  uniform float uPixelRatio;

  void main() {
    float depth = aSeed.z;                       // 0.45 near .. 1.35 far
    float life = fract(aSeed.y + uTime * 0.021 * depth * -uDrift);

    float sway = sin(uTime * 0.6 * depth + aSeed.x * 40.0) * 0.9 * uWind;
    float x = (fract(aSeed.x + uScroll * 0.06 * depth) - 0.5) * uSpan * 2.0 + sway;
    float y = (life - 0.5) * uSpan * 1.15;
    float z = -1.0 - depth * 2.2;

    vColor = aColor;
    vSpin  = uTime * 0.9 * depth + aSeed.x * 40.0;
    vDepth = depth;

    vec4 mv = modelViewMatrix * vec4(x, y, z, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = (5.0 + depth * 11.0) * uPixelRatio * (6.0 / -mv.z);
  }
`;

const FRAG = /* glsl */ `
  precision mediump float;
  varying vec3  vColor;
  varying float vSpin;
  varying float vDepth;

  uniform float uPetal;

  void main() {
    vec2 d = gl_PointCoord - 0.5;
    if (uPetal > 0.5) {
      // A petal is an ellipse that flutters as it falls, not a dot.
      float c = cos(vSpin), s = sin(vSpin);
      d = mat2(c, -s, s, c) * d;
      d.y *= 1.9 + sin(vSpin * 0.7) * 0.8;
    }
    float r = length(d) * 2.0;
    float a = smoothstep(1.0, 0.15, r);
    if (a <= 0.01) discard;
    gl_FragColor = vec4(vColor, a * (0.32 + vDepth * 0.5));
  }
`;

/** Hard cap. A register can ask for more; it will not get it. */
const MAX = 90;

export function Particles({
  preset,
  progress,
}: {
  preset: ScenePreset;
  progress: () => number;
}) {
  const mat = useRef<THREE.ShaderMaterial>(null);
  const count = Math.min(preset.particles.count, MAX);

  const { seeds, colors } = useMemo(() => {
    const s = new Float32Array(count * 3);
    const c = new Float32Array(count * 3);
    const cols = preset.particles.colors.map((h) => new THREE.Color(h));
    // Deterministic: the same world always seeds the same air.
    let x = 20260909;
    const rnd = () => {
      x ^= x << 13;
      x ^= x >>> 17;
      x ^= x << 5;
      x >>>= 0;
      return x / 4294967296;
    };
    for (let i = 0; i < count; i++) {
      s[i * 3] = rnd();
      s[i * 3 + 1] = rnd();
      s[i * 3 + 2] = 0.45 + rnd() * 0.9;
      const col = cols[Math.floor(rnd() * cols.length)] ?? cols[0];
      c[i * 3] = col.r;
      c[i * 3 + 1] = col.g;
      c[i * 3 + 2] = col.b;
    }
    return { seeds: s, colors: c };
  }, [count, preset]);

  useFrame((state, dt) => {
    if (!mat.current) return;
    mat.current.uniforms.uTime.value += dt;
    mat.current.uniforms.uScroll.value = progress();
    mat.current.uniforms.uPixelRatio.value = state.viewport.dpr;
  });

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uScroll: { value: 0 },
      uDrift: { value: preset.particles.drift },
      uWind: { value: preset.particles.wind },
      uSpan: { value: 6.5 },
      uPixelRatio: { value: 1 },
      uPetal: { value: preset.particles.shape === "petal" ? 1 : 0 },
    }),
    [preset],
  );

  return (
    <points frustumCulled={false} renderOrder={60}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[new Float32Array(count * 3), 3]} />
        <bufferAttribute attach="attributes-aSeed" args={[seeds, 3]} />
        <bufferAttribute attach="attributes-aColor" args={[colors, 3]} />
      </bufferGeometry>
      <shaderMaterial
        ref={mat}
        vertexShader={VERT}
        fragmentShader={FRAG}
        uniforms={uniforms}
        transparent
        depthWrite={false}
      />
    </points>
  );
}
