"use client";

/**
 * Sky — one fullscreen quad behind everything.
 *
 * EXTENDS: `_components/emaki/theme.ts` PHASES. It imports the same three phases
 * and the same hexes; it does not add a fourth. Round one PINS the phase from
 * world.yml rather than calling phaseForHour, because a twilight world is twilight
 * at lunch (plan 7h, D9). phaseForHour is imported and used only as the fallback
 * when a world declares no phase, so the by-the-hour path stays live for round two.
 *
 * A drei ScreenQuad renders nothing here, which is the single most common failure
 * in this stack: the shader compiles, the canvas is full size, the frame is empty.
 * A plane of [2,2] with a vertex shader writing clip coords directly is the fix.
 */

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { PHASES, phaseForHour, type Phase } from "../../_components/emaki/theme";
import type { ScenePreset } from "../../../lib/cosmos/vault";
import { NOISE, SCREEN_VERT } from "./glsl";

const FRAG = /* glsl */ `
  precision highp float;
  varying vec2 vUv;

  uniform float uTime;
  uniform vec3  uTop;
  uniform vec3  uMid;
  uniform vec3  uHorizon;
  uniform vec3  uGlow;
  uniform float uGlowY;
  uniform float uBanding;
  uniform float uMistDensity;

  ${NOISE}

  void main() {
    float y = vUv.y;

    // Three-stop vertical ramp. Painted twilight wants the plum at the top and
    // the sakura band low; riso posterizes it flat via uBanding.
    vec3 col = mix(uHorizon, uMid, smoothstep(0.0, 0.62, y));
    col = mix(col, uTop, smoothstep(0.5, 1.0, y));

    // One low sun, sitting where the register says. Never a lens flare.
    float d = distance(vec2(vUv.x, y), vec2(0.62, uGlowY));
    col += uGlow * pow(max(0.0, 1.0 - d * 1.55), 3.2) * 0.55;

    // Slow cloud banding, the only motion in the sky. Weather thickens it.
    vec2 q = vec2(vUv.x * 2.6 + uTime * 0.006, y * 5.2);
    float clouds = fbm(q) - 0.5;
    col += clouds * 0.075 * (0.55 + uMistDensity);

    // Riso: quantize to ink steps and kill the gradient entirely.
    if (uBanding > 0.5) {
      col = floor(col * 5.0 + 0.5) / 5.0;
    }

    gl_FragColor = vec4(col, 1.0);
  }
`;

function hex(c: string): THREE.Color {
  return new THREE.Color(c);
}

export function Sky({
  preset,
  phase,
  mistDensity,
}: {
  preset: ScenePreset;
  /** Pinned by the world. Null falls back to the hour, the round-two path. */
  phase: Phase | null;
  mistDensity: number;
}) {
  const mat = useRef<THREE.ShaderMaterial>(null);

  const resolved: Phase = phase ?? phaseForHour(new Date().getHours());
  const tk = PHASES[resolved];

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uTop: { value: hex(preset.sky.top) },
      uMid: { value: hex(preset.sky.mid) },
      uHorizon: { value: hex(preset.sky.horizon) },
      // The glow reads the live phase token, so the sky and the OS chrome
      // cannot drift apart: one hex, two surfaces.
      uGlow: { value: hex(tk.goldBright) },
      uGlowY: { value: preset.sky.glowY },
      uBanding: { value: preset.sky.banding },
      uMistDensity: { value: mistDensity },
    }),
    [preset, tk, mistDensity],
  );

  useFrame((_, dt) => {
    if (mat.current) mat.current.uniforms.uTime.value += dt;
  });

  return (
    <mesh frustumCulled={false} renderOrder={-100}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={mat}
        vertexShader={SCREEN_VERT}
        fragmentShader={FRAG}
        uniforms={uniforms}
        depthWrite={false}
        depthTest={false}
      />
    </mesh>
  );
}
