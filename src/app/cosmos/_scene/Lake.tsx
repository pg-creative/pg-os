"use client";

/**
 * The lake: one plane, painted water.
 *
 * Not a reflective surface and not a normal-mapped ocean. Painted water in this
 * register is three things: a flat body colour, a few bands of lighter ink where
 * the light catches, and a rim of foam at the shore. All three are one fragment
 * shader over two triangles, which is also the cheapest water anyone will ever
 * write.
 *
 * It sits a centimetre below the ground plane's zero so the shore reads as a
 * shore and not as a seam. The lake is NOT walkable and says so in `World.tsx`,
 * where it contributes one collision circle; the dock over it declares none, so
 * the boards are the way out onto the water.
 */

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Palette } from "./palette";
import { NOISE } from "./glsl";
import { MIST } from "./toon";

const VERT = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorldPosC;
  void main() {
    vUv = uv;
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPosC = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const FRAG = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  varying vec3 vWorldPosC;

  uniform float uTime;
  uniform vec3  uShallow;
  uniform vec3  uDeep;
  uniform vec3  uInk;
  uniform float uBanding;
  uniform vec3  uMistColor;
  uniform float uMistDensity;
  uniform vec3  uLantern;
  uniform float uLanternR;
  uniform vec3  uFocus;

  ${NOISE}

  vec3 posterize(vec3 c, float steps) {
    float l = dot(c, vec3(0.299, 0.587, 0.114));
    float q = floor(l * steps + 0.5) / steps;
    return c * (q / max(l, 0.0001));
  }

  void main() {
    vec2 wp = vWorldPosC.xz;

    // Depth: the middle of the body is deep, the rim is shallow.
    vec2 c = abs(vUv - 0.5) * 2.0;
    float edge = max(c.x, c.y);
    float depth = 1.0 - smoothstep(0.45, 1.0, edge);

    vec3 col = mix(uShallow, uDeep, depth);

    // Two crossing bands of drift. Painted water moves in strokes, not ripples.
    float a = fbm4(wp * 0.34 + vec2(uTime * 0.05, 0.0));
    float b = fbm4(wp * 0.19 - vec2(0.0, uTime * 0.033));
    float stroke = smoothstep(0.54, 0.66, a) * 0.5 + smoothstep(0.58, 0.72, b) * 0.5;
    col = mix(col, uInk, stroke * 0.32);

    // Foam at the shore: one hard step, because paper does not blur. Tight, and
    // toward a lit version of the water rather than toward the page: a wide white
    // rim turns a lake into a bathtub, which is exactly what it did on the first
    // pass.
    float foam = smoothstep(0.90, 0.995, edge + (a - 0.5) * 0.07);
    col = mix(col, mix(uShallow, uInk, 0.45), foam * 0.6);

    if (uBanding > 0.5) col = posterize(col, 6.0);

    // The same mist rule as every other surface, so the lake recedes with the
    // land instead of staying a bright rectangle in the fog.
    float lant = distance(vWorldPosC, uLantern);
    float lit = 1.0 - smoothstep(uLanternR * 0.3, uLanternR, lant);
    float far = smoothstep(14.0, 44.0, distance(wp, uFocus.xz));
    float veil = clamp(uMistDensity * (0.3 + 0.7 * far) * (1.0 - lit * 0.9), 0.0, 0.9);
    col = mix(col, uMistColor, veil);

    gl_FragColor = vec4(col, 1.0);
  }
`;

export function Lake({
  x,
  z,
  w,
  d,
  p,
}: {
  x: number;
  z: number;
  w: number;
  d: number;
  p: Palette;
}) {
  const mat = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uShallow: { value: new THREE.Color(p.water) },
      uDeep: { value: new THREE.Color(p.waterDeep) },
      uInk: { value: new THREE.Color(p.paper) },
      uBanding: { value: p.banding },
      uMistColor: MIST.uMistColor,
      uMistDensity: MIST.uMistDensity,
      uLantern: MIST.uLantern,
      uLanternR: MIST.uLanternR,
      uFocus: MIST.uFocus,
    }),
    [p],
  );

  useFrame((_, dt) => {
    if (mat.current) mat.current.uniforms.uTime.value += dt;
  });

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.015, z]} receiveShadow={false}>
      <planeGeometry args={[w, d, 1, 1]} />
      <shaderMaterial
        ref={mat}
        vertexShader={VERT}
        fragmentShader={FRAG}
        uniforms={uniforms}
      />
    </mesh>
  );
}
