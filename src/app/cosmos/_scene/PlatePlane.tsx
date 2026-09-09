"use client";

/**
 * PlatePlane — the painting, on separated planes at real depth.
 *
 * EXTENDS: `src/app/dev/backdrop-lab/page.tsx`. Its depth ratios [0.06, 0.24,
 * 0.52, 1.0] come across verbatim (see lib/cosmos/layout.ts DEPTHS) and its
 * diagnosis is the reason this file exists: the shipped backdrop "stacks the same
 * image three times at 0.06 to 0.2 opacity and moves the copies at different
 * speeds. That is a double-image smear, not parallax." So the three planes here
 * are three different SLABS of the painting, each masked to its own band of the
 * frame, at three real z depths. The ratio between their rates is the depth cue.
 *
 * The near plane is the loop, scrubbed. Frames are decoded on demand into ONE
 * reusable canvas per layer and pushed with CanvasTexture.needsUpdate. Never
 * video.currentTime: iOS Safari snaps a seeking video to frame 0 until a touch and
 * desktop Safari flashes black. And never 96 resident textures: at 1280x720 that
 * is about 275 MB of VRAM for one world.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { ScenePreset } from "../../../lib/cosmos/vault";
import { GRAIN, MIST, NOISE, WORLD_VERT } from "./glsl";

const FRAG = /* glsl */ `
  precision highp float;
  varying vec2 vUv;

  uniform sampler2D uMap;
  uniform float uTime;
  uniform float uHasMap;
  uniform float uMaskTop;      // band of the plate this plane shows
  uniform float uMaskFeather;
  uniform float uOpacity;
  uniform float uDepth;        // 0 far, 1 near
  uniform vec3  uMistColor;
  uniform float uMistDensity;
  uniform float uMistScale;
  uniform float uMistSpeed;
  uniform float uGrain;
  uniform float uGrainScale;

  ${NOISE}
  ${MIST}
  ${GRAIN}

  void main() {
    vec4 tex = uHasMap > 0.5 ? texture2D(uMap, vUv) : vec4(0.0);
    if (uHasMap < 0.5) discard;

    // Each plane owns one horizontal band of the painting. Feathered, so the
    // slabs overlap without showing a seam or doubling the same pixels.
    float mask = 1.0 - smoothstep(uMaskTop - uMaskFeather, uMaskTop + uMaskFeather, vUv.y);
    if (mask <= 0.001) discard;

    vec3 col = tex.rgb;

    // Aerial perspective: the far slab loses contrast and drifts toward the mist
    // colour. This is what makes depth read, not opacity.
    float aerial = (1.0 - uDepth) * uMistDensity;
    col = mix(col, uMistColor, aerial * 0.62);
    col = mix(vec3(dot(col, vec3(0.299, 0.587, 0.114))), col, 1.0 - aerial * 0.4);

    // Weather sitting in front of the slab.
    float m = mistAmount(vUv, uTime, uMistDensity * (1.0 - uDepth * 0.55), 0.0, uMistScale, uMistSpeed);
    col = mix(col, uMistColor, m * 0.42);

    col += grain(vUv, uTime, uGrainScale) * uGrain;

    gl_FragColor = vec4(col, mask * uOpacity);
  }
`;

export interface PlateLayer {
  /** 0..1, backdrop-lab's depth ratio. */
  depth: number;
  /** Still URL, or null when this layer scrubs the sequence. */
  still: string | null;
  /** The 96-frame sequence. Only the near layer uses it. */
  frames?: string[];
  maskTop: number;
  maskFeather: number;
  opacity: number;
  /** World-space size. Far planes are bigger so they cover the same solid angle. */
  size: [number, number];
  z: number;
}

/**
 * Loads a still into a texture. One texture per layer, resident for the session.
 */
function useStill(url: string | null): THREE.Texture | null {
  const [tex, setTex] = useState<THREE.Texture | null>(null);
  const { invalidate } = useThree();

  useEffect(() => {
    if (!url) return;
    let dead = false;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (dead) return;
      const t = new THREE.Texture(img);
      t.colorSpace = THREE.SRGBColorSpace;
      t.minFilter = THREE.LinearFilter;
      t.magFilter = THREE.LinearFilter;
      t.generateMipmaps = false;
      t.needsUpdate = true;
      setTex(t);
      invalidate();
    };
    img.src = url;
    return () => {
      dead = true;
      img.onload = null;
    };
  }, [url, invalidate]);

  return tex;
}

/**
 * The scrub. One 1280x720 canvas, one CanvasTexture, frames decoded on demand.
 *
 * Decoding is async and a scroll can outrun it, so the newest requested index
 * always wins and stale decodes are dropped rather than queued: scrubbing back
 * and forth must not build a backlog.
 */
function useScrubbedSequence(frames: string[] | undefined, progress: () => number) {
  const { invalidate } = useThree();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const texRef = useRef<THREE.CanvasTexture | null>(null);
  const wantRef = useRef(-1);
  const shownRef = useRef(-1);
  const busyRef = useRef(false);
  const cacheRef = useRef(new Map<number, HTMLImageElement>());
  const [ready, setReady] = useState(false);

  // The single reusable canvas and its texture.
  const tex = useMemo(() => {
    if (typeof document === "undefined" || !frames || frames.length === 0) return null;
    const c = document.createElement("canvas");
    c.width = 1280;
    c.height = 720;
    canvasRef.current = c;
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.minFilter = THREE.LinearFilter;
    t.magFilter = THREE.LinearFilter;
    t.generateMipmaps = false;
    texRef.current = t;
    return t;
  }, [frames]);

  useEffect(() => {
    return () => {
      texRef.current?.dispose();
      cacheRef.current.clear();
    };
  }, []);

  const draw = (img: HTMLImageElement, index: number) => {
    const c = canvasRef.current;
    const t = texRef.current;
    if (!c || !t) return;
    const g = c.getContext("2d");
    if (!g) return;
    g.drawImage(img, 0, 0, c.width, c.height);
    t.needsUpdate = true;
    shownRef.current = index;
    if (!ready) setReady(true);
    invalidate();
  };

  const pump = () => {
    if (!frames || busyRef.current) return;
    const want = wantRef.current;
    if (want < 0 || want === shownRef.current) return;

    const cached = cacheRef.current.get(want);
    if (cached) {
      draw(cached, want);
      return;
    }

    busyRef.current = true;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      busyRef.current = false;
      // Keep a small rolling cache so a slow scrub back does not refetch.
      if (cacheRef.current.size > 24) {
        const first = cacheRef.current.keys().next().value;
        if (first !== undefined) cacheRef.current.delete(first);
      }
      cacheRef.current.set(want, img);
      // The newest request wins: if scroll moved on, skip straight to it.
      if (wantRef.current === want) draw(img, want);
      else pump();
    };
    img.onerror = () => {
      busyRef.current = false;
    };
    img.src = frames[want];
  };

  useFrame(() => {
    if (!frames || frames.length === 0) return;
    const p = Math.min(Math.max(progress(), 0), 1);
    const idx = Math.min(frames.length - 1, Math.round(p * (frames.length - 1)));
    if (idx !== wantRef.current) {
      wantRef.current = idx;
      pump();
    } else {
      pump();
    }
  });

  return { tex, ready };
}

export function PlatePlane({
  layer,
  preset,
  mistDensity,
  progress,
  parallax,
}: {
  layer: PlateLayer;
  preset: ScenePreset;
  mistDensity: number;
  /** Scroll progress 0..1, read fresh every frame. */
  progress: () => number;
  /** Pointer offset in -1..1, already smoothed by the canvas. */
  parallax: () => { x: number; y: number };
}) {
  const mesh = useRef<THREE.Mesh>(null);
  const mat = useRef<THREE.ShaderMaterial>(null);

  const still = useStill(layer.still);
  const scrub = useScrubbedSequence(layer.frames, progress);
  const map = scrub.tex ?? still;

  const uniforms = useMemo(
    () => ({
      uMap: { value: null as THREE.Texture | null },
      uHasMap: { value: 0 },
      uTime: { value: 0 },
      uMaskTop: { value: layer.maskTop },
      uMaskFeather: { value: layer.maskFeather },
      uOpacity: { value: layer.opacity },
      uDepth: { value: layer.depth },
      uMistColor: { value: new THREE.Color(preset.mist.color) },
      uMistDensity: { value: mistDensity },
      uMistScale: { value: preset.mist.scale },
      uMistSpeed: { value: preset.mist.speed },
      uGrain: { value: preset.grain.amount },
      uGrainScale: { value: preset.grain.scale },
    }),
    [layer, preset, mistDensity],
  );

  useEffect(() => {
    if (!mat.current) return;
    mat.current.uniforms.uMap.value = map;
    mat.current.uniforms.uHasMap.value = map ? 1 : 0;
  }, [map]);

  useFrame((_, dt) => {
    if (mat.current) mat.current.uniforms.uTime.value += dt;
    if (!mesh.current) return;

    const p = progress();
    const par = parallax();

    // The depth cue: amplitude scales with depth, so near moves further than far
    // for the same input. That RATIO is the whole effect.
    const amp = 0.12 + layer.depth * 1.35;
    mesh.current.position.x = par.x * amp * 0.45;
    // Scroll pushes the ground down and the sky up, the multiplane camera move.
    mesh.current.position.y = layer.z * 0 + par.y * amp * 0.22 - p * amp * 0.9;
    mesh.current.position.z = layer.z;
  });

  return (
    <mesh ref={mesh} position={[0, 0, layer.z]} frustumCulled={false}>
      <planeGeometry args={[layer.size[0], layer.size[1], 1, 1]} />
      <shaderMaterial
        ref={mat}
        vertexShader={WORLD_VERT}
        fragmentShader={FRAG}
        uniforms={uniforms}
        transparent
        depthWrite={false}
      />
    </mesh>
  );
}
