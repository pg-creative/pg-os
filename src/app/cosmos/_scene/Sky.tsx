"use client";

/**
 * The sky, as a dome you can actually see, by the hour, over a biome that keeps
 * its own register.
 *
 * WHAT CHANGED THIS ROUND. Round two's sky ran its ramp over SCREEN uv: `vUv.y`
 * 0 at the bottom of the frame, 1 at the top, and the moon at a fixed screen
 * position. That works only while the whole sky fills the frame, and with the
 * camera pitched into the floor it filled none of it. This one reconstructs the
 * view ray per pixel from the inverse projection and ramps on its ELEVATION, so
 * the horizon is at the horizon, the zenith is overhead, and the moon hangs at a
 * fixed bearing in the world rather than in the corner of the screen. Turn the
 * camera and it stays where it was; walk toward it and it does not move, which
 * is what a moon does.
 *
 * The register owns the hue family and the hour owns the value. That separation
 * is what makes five biomes under one sky read as one world rather than five
 * screenshots: riso stays cream at every hour, it just gets a lower sun.
 *
 * A drei ScreenQuad renders nothing here, which is the most common way this
 * exact shader ships broken: a plane of [2,2] with a vertex shader writing clip
 * coordinates directly is the fix, and it is round one's, kept.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { PHASES, phaseForHour } from "../../_components/emaki/theme";
import type { Phase as WorldPhase } from "./contract";
import type { Palette } from "./registers";
import { NOISE } from "./glsl";
import { CAM_YAW } from "./IsoCamera";
import { MIST } from "./toon";

const FRAG = /* glsl */ `
  precision highp float;
  varying vec2 vUv;

  uniform float uTime;
  uniform vec3  uTop;
  uniform vec3  uMid;
  uniform vec3  uHorizon;
  uniform vec3  uGlow;
  /** Sun and moon as world bearings: elevation in sin form, azimuth in radians. */
  uniform float uGlowEl;
  uniform float uGlowAz;
  uniform float uBanding;
  uniform float uMistDensity;
  uniform float uMoon;
  /** The moon's own bearing and size, in the same sin-elevation form. */
  uniform float uMoonEl;
  uniform float uMoonAz;
  uniform float uMoonR;
  uniform mat4  uInvProj;
  uniform mat3  uCamRot;

  ${NOISE}

  vec3 posterize(vec3 c, float steps) {
    float l = dot(c, vec3(0.299, 0.587, 0.114));
    float q = floor(l * steps + 0.5) / steps;
    return c * (q / max(l, 0.0001));
  }

  /** Angular distance between two bearings, cheap enough for two lights. */
  float bearing(vec3 dir, float el, float az) {
    vec3 to = vec3(sin(az) * sqrt(max(0.0, 1.0 - el * el)), el, cos(az) * sqrt(max(0.0, 1.0 - el * el)));
    return length(dir - to);
  }

  void main() {
    // The view ray for this pixel, in world space.
    vec4 clip = vec4(vUv * 2.0 - 1.0, 1.0, 1.0);
    vec4 eye = uInvProj * clip;
    vec3 dir = normalize(uCamRot * (eye.xyz / eye.w));

    // Elevation, 0 at the horizon, 1 overhead. Below the horizon the ground is
    // in front of this pixel anyway; hold the horizon colour so the seam where
    // the plane runs out is invisible.
    float y = clamp(dir.y, 0.0, 1.0);

    // THE RAMP IS COMPRESSED ON PURPOSE. This camera can see about nine degrees
    // of sky, which is 0.16 of elevation, so a ramp that spends its first third
    // reaching the mid stop paints one flat murky band and nothing else. These
    // stops put the whole gradient inside the band the frame actually holds:
    // lit at the horizon, deep plum a hand's width above it.
    vec3 col = mix(uHorizon, uMid, smoothstep(0.0, 0.075, y));
    col = mix(col, uTop, smoothstep(0.05, 0.30, y));

    // One low sun where the register puts it. Never a lens flare. And never at
    // all where there is a moon: the depths get one red disc and nothing else,
    // and a warm glow on the other side of the sky made them read as dusk.
    float d = bearing(dir, uGlowEl, uGlowAz);
    col += uGlow * pow(max(0.0, 1.0 - d * 0.9), 4.0) * 0.9 * (1.0 - uMoon);

    // The depths get one red moon and nothing else in the sky. Where it hangs is
    // set in TypeScript, beside the camera's own pitch, because the two numbers
    // are one number: see MOON_EL.
    if (uMoon > 0.5) {
      float md = bearing(dir, uMoonEl, uMoonAz);
      col = mix(col, uGlow, smoothstep(uMoonR * 1.10, uMoonR * 0.92, md));
      col += uGlow * pow(max(0.0, 1.0 - md * 5.5), 3.0) * 0.65;
    }

    // Slow cloud banding, the only motion up there. Weather thickens it.
    vec2 q = vec2(atan(dir.x, dir.z) * 1.4 + uTime * 0.004, y * 6.0);
    col += (fbm4(q) - 0.5) * 0.08 * (0.55 + uMistDensity) * smoothstep(0.0, 0.18, y);

    // Riso: quantize to ink steps and kill the gradient entirely.
    if (uBanding > 0.5) col = posterize(col, 6.0);

    gl_FragColor = vec4(col, 1.0);
  }
`;

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

export interface SkyLook {
  top: string;
  mid: string;
  horizon: string;
  glow: string;
  /** Sine of the sun's elevation, and its bearing in radians. */
  glowEl: number;
  glowAz: number;
  moon: boolean;
}

/**
 * WHERE THE MOON HANGS, and why it is these three numbers.
 *
 * The Critic's deduction 3: the disc sat at asin(0.17) = 9.8 degrees of
 * elevation and this camera holds 6.5 degrees of sky at the top centre, so the
 * red moon of the depths was three and a third degrees above the frame on every
 * device. It was never a moon anyone could see.
 *
 * The camera's own arithmetic decides this, so it cannot drift again. The top
 * edge of the frame sits at `FOV/2 - PITCH` degrees of elevation; a direction at
 * elevation `e` and `h` degrees off the view axis lands at NDC
 * `tan(e + PITCH) / (cos(h) * tan(FOV/2))`. At 3.6 degrees up and 6.3 degrees
 * off-axis the disc's centre lands at 0.87 of the frame and its top edge at
 * 0.93, inside the band on the desktop, at DPR 2 and on a phone (a narrower lens
 * moves it sideways, never up). The horizon is at 0.686, so it clears that too:
 * a moon standing in the sky over the crypt, not behind the reader's head.
 */
const MOON_ELEV_DEG = 3.6;
const MOON_RADIUS_DEG = 1.4;
/** Off the view axis, so it is not a bullseye behind the walker. */
const MOON_OFFSET_DEG = 6.3;
const D2R = Math.PI / 180;
/** The bearing the camera looks along, from its yaw. */
const VIEW_AZ = Math.atan2(-Math.sin(CAM_YAW), -Math.cos(CAM_YAW));
export const MOON_EL = Math.sin(MOON_ELEV_DEG * D2R);
export const MOON_AZ = VIEW_AZ + MOON_OFFSET_DEG * D2R;
/** Chord between two unit vectors that far apart, which is what `bearing` returns. */
export const MOON_R = 2 * Math.sin((MOON_RADIUS_DEG * D2R) / 2);

/**
 * The hour, live, ticked on the minute.
 *
 * The Critic's deduction 4: `new Date().getHours()` inside a memo meant a
 * session that started at 17:50 was still painting five in the afternoon at
 * midnight. This aligns to the next minute boundary and then runs on the minute,
 * so the sky turns over at 18:00 while he is standing in it, and the tick costs
 * one comparison an hour of React work because the state only changes when the
 * hour does.
 */
export function useHour(): number {
  const [hour, setHour] = useState(() => new Date().getHours());
  useEffect(() => {
    let timer = 0;
    const tick = () => {
      setHour((h) => {
        const now = new Date().getHours();
        return now === h ? h : now;
      });
      const ms = 60_000 - (Date.now() % 60_000) + 250;
      timer = window.setTimeout(tick, ms);
    };
    timer = window.setTimeout(tick, 60_000 - (Date.now() % 60_000) + 250);
    return () => window.clearTimeout(timer);
  }, []);
  return hour;
}

/**
 * The register's hues, moved by the hour. `theme` is PG's light/dark toggle: in
 * light mode the sky never goes below a twilight value, so the world is legible
 * on cream paper at three in the morning; in dark mode the hour runs to its full
 * depth. It shifts the value, never the hue: the biome stays itself.
 */
export function skyFor(
  p: Palette,
  phase: WorldPhase,
  hour: number,
  theme: "light" | "dark",
): SkyLook {
  const resolved =
    phase === "clock"
      ? phaseForHour(hour)
      : phase === "night-when-on"
        ? "night"
        : phase;
  const base: SkyLook = {
    top: p.skyTop,
    mid: p.skyMid,
    horizon: p.skyHorizon,
    glow: p.skyGlow,
    glowEl: 0.16,
    glowAz: -2.9,
    moon: false,
  };

  if (resolved === "midnight" || resolved === "night") {
    return {
      ...base,
      top: shade(p.skyTop, theme === "light" ? -0.05 : -0.3),
      mid: shade(p.skyMid, theme === "light" ? -0.05 : -0.34),
      horizon: shade(p.skyHorizon, theme === "light" ? -0.16 : -0.42),
      glow: PHASES.night.foxfire,
      glowEl: 0.42,
      moon: p.banding < 0.5 && p.mistDensity > 0.6,
    };
  }
  if (resolved === "day") {
    return {
      ...base,
      top: shade(p.skyTop, p.banding > 0.5 ? 0 : 0.5),
      mid: shade(p.skyMid, p.banding > 0.5 ? 0 : 0.44),
      horizon: shade(p.skyHorizon, p.banding > 0.5 ? 0.04 : 0.3),
      glow: p.skyGlow,
      glowEl: 0.44,
    };
  }
  // Twilight is the authored value: every register was painted at dusk first.
  return base;
}

/** Lighten or darken a hex toward white or black. */
function shade(hex: string, t: number): string {
  const n = parseInt(hex.slice(1), 16);
  const to = t >= 0 ? 255 : 0;
  const k = Math.abs(t);
  const r = Math.round(((n >> 16) & 255) + (to - ((n >> 16) & 255)) * k);
  const g = Math.round(((n >> 8) & 255) + (to - ((n >> 8) & 255)) * k);
  const b = Math.round((n & 255) + (to - (n & 255)) * k);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

/**
 * The red on the ash: light the moon actually throws.
 *
 * A moon in the sky and no sign of it on the floor is a sticker. One soft pool
 * on the ground under the moon's own bearing, following the eye so it is always
 * "over there" rather than a rug he can walk off, at the register's own glow
 * hex. Always mounted, faded to nothing where there is no moon, so the depths
 * cost the scene no new shader program to enter.
 */
function moonPoolTexture(): THREE.CanvasTexture {
  const size = 128;
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255,255,255,0.85)");
  g.addColorStop(0.45, "rgba(255,255,255,0.34)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

let POOL: THREE.CanvasTexture | null = null;

function MoonPool({ color, on }: { color: string; on: boolean }) {
  const mesh = useRef<THREE.Mesh>(null);
  const material = useMemo(() => {
    if (!POOL) POOL = moonPoolTexture();
    return new THREE.MeshBasicMaterial({
      map: POOL,
      color: new THREE.Color(color),
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
      fog: false,
    });
  }, [color]);

  useFrame((_, dt) => {
    const m = mesh.current;
    if (!m) return;
    const eye = MIST.uFocus.value;
    m.position.set(eye.x + Math.sin(MOON_AZ) * 30, 0.03, eye.z + Math.cos(MOON_AZ) * 30);
    const want = on ? 0.5 : 0;
    material.opacity += (want - material.opacity) * Math.min(1, dt * 2.5);
    m.visible = material.opacity > 0.004;
  });

  return (
    <mesh
      ref={mesh}
      material={material}
      rotation={[-Math.PI / 2, 0, 0]}
      renderOrder={-60}
      frustumCulled={false}
    >
      <planeGeometry args={[74, 74]} />
    </mesh>
  );
}

export function Sky({
  look,
  banding,
  mistDensity,
}: {
  look: SkyLook;
  banding: number;
  mistDensity: number;
}) {
  const mat = useRef<THREE.ShaderMaterial>(null);
  const camera = useThree((s) => s.camera);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uTop: { value: new THREE.Color(look.top) },
      uMid: { value: new THREE.Color(look.mid) },
      uHorizon: { value: new THREE.Color(look.horizon) },
      uGlow: { value: new THREE.Color(look.glow) },
      uGlowEl: { value: look.glowEl },
      uGlowAz: { value: look.glowAz },
      uBanding: { value: banding },
      uMistDensity: { value: mistDensity },
      uMoon: { value: look.moon ? 1 : 0 },
      uMoonEl: { value: MOON_EL },
      uMoonAz: { value: MOON_AZ },
      uMoonR: { value: MOON_R },
      uInvProj: { value: new THREE.Matrix4() },
      uCamRot: { value: new THREE.Matrix3() },
    }),
    // Rebuilt on every look change: five uniform objects is cheaper than a
    // per-frame branch, and the look only changes when the biome or hour does.
    [look, banding, mistDensity],
  );

  useFrame((_, dt) => {
    const m = mat.current;
    if (!m) return;
    m.uniforms.uTime.value += dt;
    m.uniforms.uInvProj.value.copy(camera.projectionMatrixInverse);
    m.uniforms.uCamRot.value.setFromMatrix4(camera.matrixWorld);
  });

  return (
    <>
      <mesh frustumCulled={false} renderOrder={-100}>
        <planeGeometry args={[2, 2]} />
        <shaderMaterial
          ref={mat}
          vertexShader={VERT}
          fragmentShader={FRAG}
          uniforms={uniforms}
          depthWrite={false}
          depthTest={false}
          fog={false}
        />
      </mesh>
      <MoonPool color={look.glow} on={look.moon} />
    </>
  );
}
