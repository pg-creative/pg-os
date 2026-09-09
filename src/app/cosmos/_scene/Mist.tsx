"use client";

/**
 * Mist — two jobs, two mechanisms, on purpose.
 *
 * EXTENDS: `_components/emaki/materials.tsx` FoxfireLayer's per-phase ambient (the
 * drifting orbs and per-phase wash), and the fbm chunk in
 * `forge/library/shaders/flashpoint-shaders/glsl.ts`.
 *
 *   1. PER-OBJECT DISSOLVE lives in each object's own material, through the shared
 *      `mistAmount()` in glsl.ts with per-object `uUntouched` and `uFocusDistance`.
 *      It is a function of days since touched and it never deletes: at full mist
 *      the page is still there, just behind weather.
 *   2. This file is job two: ONE fullscreen atmosphere pass, done as a second quad
 *      in front of the scene rather than as postprocessing. postprocessing is
 *      deferred to round two (it pins three below 0.186), and a quad costs one
 *      draw call against an EffectComposer's extra render targets.
 *
 * Particles do NOT ride this pass. They were a 46-iteration loop per pixel here,
 * which is 46 tests across every pixel on screen for 46 things the size of a
 * fingernail. They live in Particles.tsx as a Points cloud instead: same picture,
 * 46 vertices, and the single biggest reason this scene holds its frame rate.
 */

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { ScenePreset } from "../../../lib/cosmos/vault";
import { GRAIN, NOISE, SCREEN_VERT } from "./glsl";

const FRAG = /* glsl */ `
  precision highp float;
  varying vec2 vUv;

  uniform float uTime;
  uniform vec2  uRes;
  uniform vec3  uMistColor;
  uniform float uMistDensity;
  uniform float uMistScale;
  uniform float uMistSpeed;
  uniform float uGrain;
  uniform float uGrainScale;
  uniform float uScroll;

  ${NOISE}
  ${GRAIN}

  void main() {
    float aspect = uRes.x / max(uRes.y, 1.0);

    // Distance fog: thicker low in the frame where the ground is, thinner at the
    // top where the sky already carries the colour.
    vec2 q = vUv * uMistScale;
    q.x += uTime * uMistSpeed;
    q.y += uScroll * 0.35;
    float n = fbm4(q + (vnoise(q * 1.9) - 0.5) * 0.6);
    float band = smoothstep(0.72, 0.05, vUv.y);
    float fog = clamp(smoothstep(0.36, 0.95, n) * uMistDensity * band, 0.0, 0.72);

    vec3 col = uMistColor;
    float a = fog * 0.62;

    // Paper grain over the whole frame, the register's amount.
    float g = grain(vUv, uTime, uGrainScale);
    col += g * uGrain;
    a = clamp(a + abs(g) * uGrain * 0.55, 0.0, 1.0);

    // Corner vignette instead of a flat veil, so the middle keeps its colour.
    vec2 v = vUv - 0.5;
    float vig = smoothstep(0.34, 0.78, length(v * vec2(aspect, 1.0)));
    col = mix(col, uMistColor * 0.35, vig * 0.55);
    a = clamp(a + vig * 0.3, 0.0, 1.0);

    gl_FragColor = vec4(col, a);
  }
`;

export function Mist({
  preset,
  mistDensity,
  progress,
}: {
  preset: ScenePreset;
  mistDensity: number;
  progress: () => number;
}) {
  const mat = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uRes: { value: new THREE.Vector2(1440, 900) },
      uMistColor: { value: new THREE.Color(preset.mist.color) },
      uMistDensity: { value: mistDensity },
      uMistScale: { value: preset.mist.scale },
      uMistSpeed: { value: preset.mist.speed },
      uGrain: { value: preset.grain.amount },
      uGrainScale: { value: preset.grain.scale },
      uScroll: { value: 0 },
    }),
    [preset, mistDensity],
  );

  useFrame((state, dt) => {
    if (!mat.current) return;
    mat.current.uniforms.uTime.value += dt;
    mat.current.uniforms.uScroll.value = progress();
    mat.current.uniforms.uRes.value.set(state.size.width, state.size.height);
  });

  return (
    <mesh frustumCulled={false} renderOrder={100}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={mat}
        vertexShader={SCREEN_VERT}
        fragmentShader={FRAG}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        depthTest={false}
      />
    </mesh>
  );
}
