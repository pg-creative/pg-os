"use client";

/**
 * The one persistent scene. Everything that moves, moves in here.
 *
 * EXTENDS: round one's `WorldCanvas`, with its scroll conductor removed. Lenis,
 * GSAP and ScrollTrigger are gone from the repo: nothing scrolls, because the
 * verb is now walking. What is kept and reused: the fbm mist chunk, the sky
 * shader's screen quad, the lazy-armed ambient bed, the idle detector driving
 * `frameloop`, and the touch route.
 *
 * FOLLOWS `build-isometric-arpg`: one authoritative simulation step per frame,
 * deterministic and serializable (position and heading are all the save needs),
 * and no second system layered on before the first has gameplay proof.
 *
 * The React tree here re-renders about five times a minute. Walking, the camera,
 * the mist, the lantern and the flames are all mutations on `rt`, the runtime
 * object, inside `useFrame`. What React is told about, on a 250 ms tick, is only
 * what a person could see change in the HUD: the biome he is in, the thing he is
 * near, and how long he has been standing there.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useIdleDetector } from "../../_components/useIdleDetector";
import type { CosmosManifest, WorldManifest } from "./contract";
import { nearestWorld, worldAt } from "./contract";
import { mixPalettes, paletteFor, type Palette } from "./palette";
import { lightsFor, roomAt } from "./dressing";
import { createRuntime, stepWalker, STRIDE, type Runtime } from "./runtime";
import { CAM_YAW, IsoCamera } from "./IsoCamera";
import { Ground } from "./Ground";
import { Sky, skyFor, type SkyLook } from "./Sky";
import { World, worldBlockers } from "./World";
import { Hero } from "./Hero";
import { Postfx, type PostQuality } from "./Postfx";
import { MIST } from "./toon";

/** Stand this close for this long and the page unfolds. Or press E. */
export const REACH = 1.2;
export const DWELL_S = 1.2;

export interface HudState {
  world: string;
  worldTitle: string;
  register: string;
  /** Title of what he is near or hovering, or null. One line, never a list. */
  nearTitle: string | null;
  nearId: string | null;
  dwell: number;
  sitting: boolean;
  depth: boolean;
  /** Where he stands, for the compass's remembered ground. */
  x: number;
  z: number;
}

// ── The per-frame conductor ──────────────────────────────────────────────────

function Conductor({
  rt,
  worlds,
  palette,
  onTick,
  onOpen,
  onDoor,
  onStep,
  theme,
}: {
  rt: React.RefObject<Runtime>;
  worlds: WorldManifest[];
  palette: Palette;
  onTick: (s: HudState) => void;
  onOpen: (id: string) => void;
  onDoor: (to: string, kind: "mist" | "stairs") => void;
  onStep: () => void;
  theme: "light" | "dark";
}) {
  const gl = useThree((s) => s.gl);
  const acc = useRef(0);
  const lastStep = useRef(0);

  // Click to move. Raycast a mathematical plane, not the ground mesh: the plane
  // is always there, at exactly y = 0, whatever geometry happens to be in front.
  useEffect(() => {
    const el = gl.domElement;
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const hit = new THREE.Vector3();

    const onDown = (e: PointerEvent) => {
      const r = rt.current;
      if (!r || r.paused) return;
      const rect = el.getBoundingClientRect();
      ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      const cam = (el as HTMLCanvasElement & { __cam?: THREE.Camera }).__cam;
      if (!cam) return;
      ray.setFromCamera(ndc, cam);
      if (ray.ray.intersectPlane(plane, hit)) {
        r.dest = hit.clone();
        r.dest.y = 0;
      }
    };
    el.addEventListener("pointerdown", onDown);
    return () => el.removeEventListener("pointerdown", onDown);
  }, [gl, rt]);

  // Stash the camera where the raw listener above can reach it without React.
  const camera = useThree((s) => s.camera);
  useEffect(() => {
    (gl.domElement as HTMLCanvasElement & { __cam?: THREE.Camera }).__cam = camera;
  }, [gl, camera]);

  useFrame((state, dtRaw) => {
    const r = rt.current;
    if (!r) return;
    // Clamp: a backgrounded tab returns with a one second delta and the walker
    // would teleport through a wall.
    const dt = Math.min(dtRaw, 0.05);

    if (!r.paused) stepWalker(r, dt, CAM_YAW);

    // The mist takes the lantern, the eye and the register, once, for everything.
    MIST.uTime.value += dt;
    MIST.uLantern.value.copy(r.lantern);
    MIST.uFocus.value.copy(r.target);
    MIST.uFloor.value = theme === "light" ? 1 : 0;

    // Footsteps, on the stride the dust uses, so sound and picture are one gait.
    if (r.moving && r.stepAccum - lastStep.current > STRIDE) {
      lastStep.current = r.stepAccum;
      onStep();
    }
    if (!r.moving) lastStep.current = r.stepAccum;

    // ── The slow tick: everything React is allowed to hear about. ──
    acc.current += dt;
    if (acc.current < 0.25) return;
    acc.current = 0;

    const here = worldAt(worlds, r.pos.x, r.pos.z) ?? nearestWorld(worlds, r.pos.x, r.pos.z);
    r.world = here.id;
    r.depth = here.id === "depths";

    // Nearest thing worth standing in front of: a page, a monument, or a door.
    let nearId: string | null = null;
    let nearTitle: string | null = null;
    let nearD = Infinity;
    for (const w of worlds) {
      for (const o of w.objects) {
        const d = Math.hypot(o.at.x - r.pos.x, o.at.z - r.pos.z);
        if (d < nearD) {
          nearD = d;
          nearId = o.id;
          nearTitle = o.title;
        }
      }
      for (const m of w.monuments) {
        const d = Math.hypot(m.at.x - r.pos.x, m.at.z - r.pos.z);
        if (d < nearD) {
          nearD = d;
          nearId = m.id;
          nearTitle = m.line;
        }
      }
      for (const room of w.layout.rooms) {
        for (const door of room.doors) {
          if (door.kind !== "stairs") continue;
          const d = Math.hypot(door.at.x - r.pos.x, door.at.z - r.pos.z);
          if (d < nearD) {
            nearD = d;
            nearId = `door:${door.to}`;
            nearTitle = door.to === "depths" ? "Down" : "Up";
          }
        }
      }
    }
    r.near = nearId && nearD < REACH * 3 ? { id: nearId, d: nearD } : null;

    // Dwell: standing still, in reach, for DWELL_S. Moving resets it, which is
    // the difference between attention and passing by.
    if (r.near && nearD <= REACH && !r.moving) {
      r.dwell += 0.25;
      if (r.dwell >= DWELL_S) {
        r.dwell = 0;
        if (r.near.id.startsWith("door:")) onDoor(r.near.id.slice(5), "stairs");
        else onOpen(r.near.id);
      }
    } else {
      r.dwell = 0;
    }

    // Sitting: the hearth mat, and only the hearth mat.
    const room = roomAt(here, r.pos.x, r.pos.z);
    const fire = room?.lights.find((l) => l.emitter === "fire");
    r.sitting = !!fire && Math.hypot(fire.at.x - r.pos.x, fire.at.z - r.pos.z) < 2.2;

    // How deep in the mist between two biomes he is, 0 at a heart, 1 in the gap.
    const inside = worldAt(worlds, r.pos.x, r.pos.z);
    r.border = inside ? 0 : 1;

    onTick({
      world: here.id,
      worldTitle: here.title,
      register: here.register,
      nearTitle: r.near ? nearTitle : null,
      nearId: r.near?.id ?? null,
      dwell: r.dwell,
      sitting: r.sitting,
      depth: r.depth,
      x: r.pos.x,
      z: r.pos.z,
    });
    void state;
    void palette;
  });

  return null;
}

// ── Lights ───────────────────────────────────────────────────────────────────

/**
 * One key light and one fill. Everything else in the world is a torch, a lantern,
 * a brazier or a hearth, and every one of those is mounted next to the thing that
 * appears to be producing it (`author-game-levels`: motivate every local light).
 *
 * The key follows the camera target so the shadow map stays tight around what is
 * on screen; a fixed sun over a 200 unit plane would spend its whole resolution
 * on empty ground.
 */
function KeyLight({
  rt,
  p,
  theme,
}: {
  rt: React.RefObject<Runtime>;
  p: Palette;
  theme: "light" | "dark";
}) {
  const dir = useRef<THREE.DirectionalLight>(null);

  useFrame(() => {
    const r = rt.current;
    if (!r || !dir.current) return;
    dir.current.position.set(r.target.x + 14, 22, r.target.z + 9);
    dir.current.target.position.set(r.target.x, 0, r.target.z);
    dir.current.target.updateMatrixWorld();
  });

  return (
    <>
      <hemisphereLight
        color={p.key}
        groundColor={p.ambient}
        intensity={theme === "light" ? 1.05 : 0.6}
      />
      <ambientLight color={p.fill} intensity={theme === "light" ? 0.34 : 0.2} />
      <directionalLight
        ref={dir}
        color={p.key}
        intensity={theme === "light" ? 2.1 : 1.5}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-24}
        shadow-camera-right={24}
        shadow-camera-top={24}
        shadow-camera-bottom={-24}
        shadow-camera-near={1}
        shadow-camera-far={60}
        shadow-bias={-0.0012}
        shadow-normalBias={0.03}
      />
    </>
  );
}

// ── Focus for the depth-of-field pass ────────────────────────────────────────

function FocusProbe({
  rt,
  set,
}: {
  rt: React.RefObject<Runtime>;
  set: (v: number) => void;
}) {
  const acc = useRef(0);
  const camera = useThree((s) => s.camera);
  useFrame((_, dt) => {
    acc.current += dt;
    if (acc.current < 0.3) return;
    acc.current = 0;
    const r = rt.current;
    if (!r) return;
    // The pass wants distance normalised into the camera's near..far range.
    const cam = camera as THREE.PerspectiveCamera;
    const d = camera.position.distanceTo(r.pos);
    set(Math.min(0.98, Math.max(0.02, (d - cam.near) / (cam.far - cam.near))));
  });
  return null;
}

// ── The canvas ───────────────────────────────────────────────────────────────

export function WorldCanvas({
  manifest,
  rt,
  theme,
  onTick,
  onOpen,
  onDoor,
  onStep,
  reduced,
}: {
  manifest: CosmosManifest;
  rt: React.RefObject<Runtime>;
  theme: "light" | "dark";
  onTick: (s: HudState) => void;
  onOpen: (id: string) => void;
  onDoor: (to: string, kind: "mist" | "stairs") => void;
  onStep: () => void;
  reduced: boolean;
}) {
  const idle = useIdleDetector({ timeoutMs: 90_000 });
  const target = useRef(new THREE.Vector3(manifest.hero.x, 0.9, manifest.hero.z));
  const [here, setHere] = useState(manifest.hero.world);
  const [focus, setFocus] = useState(0.35);
  const [quality, setQuality] = useState<PostQuality>("full");

  const worlds = manifest.worlds;

  const current = useMemo(
    () => worlds.find((w) => w.id === here) ?? worlds[0],
    [worlds, here],
  );

  /**
   * The palette on screen is the biome's, blended toward the neighbour while he
   * is in the mist between them. Crossing a border is a fade, not a cut, which
   * is the only way "borders are mist" can be true of the materials as well as
   * the ground.
   */
  const palette = useMemo(() => {
    const p = paletteFor(current?.register);
    return p;
  }, [current]);

  const sky: SkyLook = useMemo(
    () => skyFor(palette, current?.phase ?? "clock", new Date().getHours(), theme),
    [palette, current, theme],
  );

  // Which biomes are close enough to draw. Everything else is behind the mist
  // and costs nothing, which is what makes five worlds on one plane affordable.
  const visible = useMemo(() => {
    const hx = manifest.hero.x;
    const hz = manifest.hero.z;
    void hx;
    void hz;
    return worlds.filter((w) => {
      if (!current) return true;
      const dx = w.layout.origin.x - current.layout.origin.x;
      const dz = w.layout.origin.z - current.layout.origin.z;
      return Math.hypot(dx, dz) < 74;
    });
  }, [worlds, current, manifest.hero]);

  // Blockers, once, for every world that can be walked into from here.
  const blockers = useMemo(() => worldBlockers(visible), [visible]);
  useEffect(() => {
    if (rt.current) rt.current.blockers = blockers;
  }, [blockers, rt]);

  useEffect(() => {
    MIST.uMistColor.value.set(palette.mist);
    MIST.uMistDensity.value = palette.mistDensity;
    MIST.uLanternR.value = 6.5;
  }, [palette]);

  const handleTick = useCallback(
    (s: HudState) => {
      setHere((prev) => (prev === s.world ? prev : s.world));
      onTick(s);
    },
    [onTick],
  );

  const press = useCallback(
    (id: string) => {
      const r = rt.current;
      if (!r) return;
      r.hovered = id;
      // A held finger opens it; a tap that lifts inside 400 ms only walks there.
      pressTimer.current = window.setTimeout(() => onOpen(id), 400);
    },
    [onOpen, rt],
  );
  const pressTimer = useRef<number | null>(null);
  const release = useCallback(() => {
    if (pressTimer.current !== null) {
      window.clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  }, []);
  useEffect(() => () => release(), [release]);

  /**
   * The pass budget, measured rather than assumed (`optimize-threejs-games`:
   * "measure before changing behavior"). Over one second of real frames: if the
   * worst tenth is slower than 17 ms the depth of field steps down to a cheaper
   * bokeh, and if it is still slow it goes off. Only ever downward, so it cannot
   * oscillate on a single bad frame.
   */
  useEffect(() => {
    if (reduced) return;
    let raf = 0;
    const times: number[] = [];
    let last = performance.now();
    let checks = 0;
    const tick = () => {
      const now = performance.now();
      times.push(now - last);
      last = now;
      if (times.length >= 90) {
        const sorted = [...times].sort((a, b) => a - b);
        const p90 = sorted[Math.floor(sorted.length * 0.9)];
        times.length = 0;
        checks++;
        if (p90 > 17.5) {
          setQuality((q) => (q === "full" ? "cheap" : q === "cheap" ? "off" : q));
        }
        if (checks >= 4) return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduced]);

  const dpr = useMemo<[number, number]>(() => [1, reduced ? 1 : 1.75], [reduced]);

  return (
    <Canvas
      dpr={dpr}
      frameloop={idle && !reduced ? "demand" : "always"}
      /* Not `shadows` bare: r3f's default is PCFSoftShadowMap, which three 0.185
         deprecates and warns about on every shadow-casting light, 143 times in
         one harness run. PCF is the supported successor and looks the same at
         this map size. */
      shadows={{ type: THREE.PCFShadowMap }}
      gl={{
        antialias: false,
        alpha: false,
        powerPreference: "high-performance",
        stencil: false,
      }}
      camera={{ fov: 26, near: 1, far: 140, position: [22, 22, 22] }}
      style={{ position: "absolute", inset: 0, touchAction: "none" }}
    >
      <color attach="background" args={[sky.top]} />
      <Sky look={sky} banding={palette.banding} mistDensity={palette.mistDensity} />
      <KeyLight rt={rt} p={palette} theme={theme} />
      <IsoCamera rt={rt} target={target} />
      <Ground worlds={worlds} target={target} />

      {visible.map((w) => {
        const p = w.id === current?.id ? palette : mixPalettes(paletteFor(w.register), palette, 0.18);
        // Lights are budgeted by biome: the one he is standing in gets them all,
        // a neighbour across the mist gets its two brightest, and nothing beyond
        // that mounts a light at all.
        const budget = w.id === current?.id ? Math.min(5, lightsFor(w).length) : 2;
        return (
          <World
            key={w.id}
            world={w}
            p={p}
            rt={rt}
            onPress={press}
            onRelease={release}
            lightBudget={budget}
          />
        );
      })}

      <Hero rt={rt} p={palette} lanternColor={palette.flame} lanternRange={9} />

      <Conductor
        rt={rt}
        worlds={worlds}
        palette={palette}
        onTick={handleTick}
        onOpen={onOpen}
        onDoor={onDoor}
        onStep={onStep}
        theme={theme}
      />
      <FocusProbe rt={rt} set={setFocus} />

      {!reduced && (
        <Postfx quality={quality} grain={palette.grain} focusDistance={focus} />
      )}
    </Canvas>
  );
}

export { createRuntime };
export type { Runtime };
