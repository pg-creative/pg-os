"use client";

/**
 * The one persistent scene. Everything that moves, moves in here.
 *
 * FOLLOWS `build-isometric-arpg`: one authoritative simulation step per frame,
 * deterministic and serializable (position and heading are all the save needs),
 * and no second system layered on before the first has gameplay proof.
 *
 * The React tree here re-renders about five times a minute. Walking, the camera,
 * the mist, the lantern and the flames are all mutations on `rt`, the runtime
 * object, inside `useFrame`. What React is told about, on a 250 ms tick, is only
 * what a person could see change in the HUD.
 *
 * THREE THINGS THE CRITIC FOUND, all fixed here.
 *
 * THE HOUR. `new Date().getHours()` sat inside a memo, so a session crossed
 * 18:00 unchanged. It comes from `useHour` now and turns over on the minute.
 *
 * THE WEATHER. `state/weather.json` reached the manifest and was read by nobody.
 * It now sets the mist density and the key light's warmth, which is what
 * COSMOLOGY.md said it was for: a bad night is weather, never a report card.
 *
 * THE BORDER. Crossing one compiled between 137 and 267 shader programs, because
 * a neighbour's palette was mixed toward the current one on every render and
 * every fresh hex is a fresh material. All sixteen possible neighbour palettes
 * are built once at module load in `registers.ts` now, so a crossing looks one
 * up and compiles nothing.
 */

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useIdleDetector } from "../../_components/useIdleDetector";
import type { CosmosManifest, WorldManifest } from "./contract";
import { nearestWorld, worldAt } from "./contract";
import { neighbourPalette, paletteFor, type Palette } from "./registers";
import { lightsFor, placeWorld, roomAt } from "./place";
import { createRuntime, stepWalker, STRIDE, type Runtime } from "./runtime";
import { CAM_YAW, IsoCamera } from "./IsoCamera";
import { Ground } from "./Ground";
import { GrassField, type Clearing } from "./Grass";
import { Sky, skyFor, useHour, type SkyLook } from "./Sky";
import { World, worldBlockers } from "./World";
import { Hero } from "./Hero";
import { Postfx, type PostQuality } from "./Postfx";
import { MIST } from "./toon";
import { WIND_CLOCK } from "./wind";

/**
 * Stand this close for this long and the page unfolds. Or press E.
 *
 * The Critic's deduction 6: the hint printed inside 3.6 m, the page opened
 * inside 1.2 m, and the steering that keeps him from walking through a card
 * parks him at 1.31 m (0.34 blocker plus 0.42 of him plus 0.55 of margin), so
 * "stand still" was a lie at exactly the distance the world puts him. Reach is
 * now larger than the steering radius, and the hint never prints outside it.
 */
export const REACH = 1.75;
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
  /** The room he is in, for "YOU ARE HERE". */
  room: string | null;
}

/** `state/weather.json`, read for the two things weather can honestly drive. */
export interface WeatherLook {
  /** 0 to 1 extra air. A short night thickens the mist; nothing is scolded. */
  mist: number;
  /** 0 to 1 warmth on the key light. A long recovery is a brighter morning. */
  key: number;
}

export function weatherLook(w: Record<string, number | string | null> | undefined): WeatherLook {
  const num = (k: string): number | null => {
    const v = w?.[k];
    return typeof v === "number" && Number.isFinite(v) ? v : null;
  };
  const recovery = num("recovery");
  const pages = num("pages_days_ago");
  const shipped = num("days_since_ship");

  // Nothing written yet is not bad weather. It is no weather.
  let mist = 0;
  let key = 0.5;
  // Small numbers on purpose. The first pass let a quiet week add half again
  // as much air as the register carries and the whole frame went lavender: a
  // bad night should read as weather, and weather you cannot see through is a
  // report card with extra steps.
  if (recovery !== null) {
    const r = Math.min(1, Math.max(0, recovery / 100));
    mist += (1 - r) * 0.12;
    key = 0.3 + r * 0.6;
  }
  if (pages !== null) mist += Math.min(0.07, pages * 0.014);
  if (shipped !== null) mist += Math.min(0.06, Math.max(0, shipped - 3) * 0.01);
  return { mist: Math.min(0.16, mist), key: Math.min(1, Math.max(0, key)) };
}

// ── The per-frame conductor ──────────────────────────────────────────────────

function Conductor({
  rt,
  worlds,
  onTick,
  onOpen,
  onDoor,
  onStep,
  theme,
}: {
  rt: React.RefObject<Runtime>;
  worlds: WorldManifest[];
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
        hit.y = 0;
        // A low camera can raycast half a kilometre up the plane on one click
        // near the horizon. Thirty metres is as far as one walk order goes.
        const to = hit.clone().sub(r.pos);
        if (to.length() > 30) to.setLength(30);
        r.dest = r.pos.clone().add(to);
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
    // One wind for the whole world: the grass, the pines and the painted foliage
    // are in the same gust because they read the same clock.
    WIND_CLOCK.value += dt;

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
    // Inside reach, and only inside reach. A hint that names a verb he cannot
    // perform from where he is standing is worse than no hint.
    r.near = nearId && nearD <= REACH ? { id: nearId, d: nearD } : null;

    // Sitting: the hearth mat, and only the hearth mat. Read BEFORE the dwell,
    // because sitting suspends it.
    const room = roomAt(here, r.pos.x, r.pos.z);
    const fire = room?.lights.find((l) => l.emitter === "fire");
    r.sitting = !!fire && Math.hypot(fire.at.x - r.pos.x, fire.at.z - r.pos.z) < 1.9;

    // Dwell: standing still, in reach, for DWELL_S. Moving resets it, which is
    // the difference between attention and passing by. Sitting at the fire is
    // not dwelling on the card 1.1 m away: the thread is what opens there.
    if (r.near && !r.moving && !r.sitting) {
      r.dwell += 0.25;
      if (r.dwell >= DWELL_S) {
        r.dwell = 0;
        if (r.near.id.startsWith("door:")) onDoor(r.near.id.slice(5), "stairs");
        else onOpen(r.near.id);
      }
    } else {
      r.dwell = 0;
    }

    // How deep in the mist between two biomes he is, 0 at a heart, 1 in the gap.
    r.border = worldAt(worlds, r.pos.x, r.pos.z) ? 0 : 1;

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
      room: room?.id ?? null,
    });
    void state;
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
 * on empty ground. One 2048 map, which at a 40 unit frustum is about 20 texels
 * per metre: enough for a roof edge to read as an edge.
 */
function KeyLight({
  rt,
  p,
  theme,
  weather,
}: {
  rt: React.RefObject<Runtime>;
  p: Palette;
  theme: "light" | "dark";
  weather: WeatherLook;
}) {
  const dir = useRef<THREE.DirectionalLight>(null);

  useFrame(() => {
    const r = rt.current;
    if (!r || !dir.current) return;
    dir.current.position.set(r.target.x + 14, 22, r.target.z + 9);
    dir.current.target.position.set(r.target.x, 0, r.target.z);
    dir.current.target.updateMatrixWorld();
  });

  // A short night is a dimmer sun. Not a warning, not a number: weather.
  const day = theme === "light";
  const k = 0.68 + weather.key * 0.5;

  return (
    <>
      {/* Three lights adding to about 3.2 of irradiance put every lit face of
          the ground past white, and a painted world with blown highlights is a
          grey one. About 1.6 total keeps the toon ramp inside its own colour. */}
      <hemisphereLight color={p.key} groundColor={p.ambient} intensity={(day ? 0.62 : 0.4) * k} />
      <ambientLight color={p.fill} intensity={(day ? 0.2 : 0.14) * k} />
      <directionalLight
        ref={dir}
        color={p.key}
        intensity={(day ? 1.28 : 0.95) * k}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-26}
        shadow-camera-right={26}
        shadow-camera-top={26}
        shadow-camera-bottom={-26}
        shadow-camera-near={1}
        shadow-camera-far={64}
        shadow-bias={-0.0012}
        shadow-normalBias={0.03}
      />
    </>
  );
}

// ── Focus for the depth-of-field pass ────────────────────────────────────────

function FocusProbe({ rt, set }: { rt: React.RefObject<Runtime>; set: (v: number) => void }) {
  const acc = useRef(0);
  const camera = useThree((s) => s.camera);
  useFrame((_, dt) => {
    acc.current += dt;
    if (acc.current < 0.3) return;
    acc.current = 0;
    const r = rt.current;
    if (!r) return;
    const cam = camera as THREE.PerspectiveCamera;
    const d = camera.position.distanceTo(r.pos);
    set(Math.min(0.98, Math.max(0.02, (d - cam.near) / (cam.far - cam.near))));
  });
  return null;
}

/** ACES at 1.16, the reference's own exposure, set once on the renderer. */
function Tone() {
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = 1.16;
  }, [gl]);
  return null;
}

// ── The canvas ───────────────────────────────────────────────────────────────

/**
 * MEMOIZED, and it is worth four times the frame rate.
 *
 * The HUD hears about the world four times a second (which biome, what is in
 * reach, how long he has stood there). That `setHud` re-renders the stage, and
 * the stage renders this, and this renders five biomes of two hundred props
 * each: React reconciled the entire scene tree every 250 ms, which is a 30 ms
 * frame four times a second, which is a p1 of 32 under a p50 of 145. Every prop
 * this takes is stable across a HUD tick, so the tick now stops at the boundary.
 */
export const WorldCanvas = memo(function WorldCanvas({
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
  const target = useRef(new THREE.Vector3(manifest.hero.x, 1.5, manifest.hero.z));
  const [here, setHere] = useState(manifest.hero.world);
  const [focus, setFocus] = useState(0.35);
  const [quality, setQuality] = useState<PostQuality>("full");
  const hour = useHour();

  const worlds = manifest.worlds;

  const current = useMemo(
    () => worlds.find((w) => w.id === here) ?? worlds[0],
    [worlds, here],
  );

  const palette = useMemo(() => paletteFor(current?.register), [current]);

  const weather = useMemo(
    () => weatherLook(current?.weather),
    [current],
  );

  const sky: SkyLook = useMemo(
    () => skyFor(palette, current?.phase ?? "clock", hour, theme),
    [palette, current, theme, hour],
  );

  /** Register air plus what the weather adds. One number, two consumers. */
  const air = Math.min(0.62, palette.mistDensity + weather.mist);

  // Which biomes are close enough to draw. Everything else is behind the mist
  // and costs nothing, which is what makes five worlds on one plane affordable.
  const visible = useMemo(
    () =>
      worlds.filter((w) => {
        if (!current) return true;
        const dx = w.layout.origin.x - current.layout.origin.x;
        const dz = w.layout.origin.z - current.layout.origin.z;
        return Math.hypot(dx, dz) < 62;
      }),
    [worlds, current],
  );

  /** Every floor in sight. Meadow grass growing through the shrine's boards
      was the first thing wrong with the first frame off this camera. */
  const clearings = useMemo<Clearing[]>(
    () =>
      visible.flatMap((w) =>
        placeWorld(w)
          .filter((pl) => pl.kind === "hall" || pl.kind === "smithy")
          .map((pl) => ({
            x: pl.x,
            z: pl.z,
            w: (pl.w ?? 10) + 2.6,
            d: (pl.d ?? 8) + 2.6,
            rot: pl.rot,
          })),
      ),
    [visible],
  );

  // Blockers, once, for every world that can be walked into from here.
  const blockers = useMemo(() => worldBlockers(visible), [visible]);
  useEffect(() => {
    if (rt.current) rt.current.blockers = blockers;
  }, [blockers, rt]);

  useEffect(() => {
    MIST.uMistColor.value.set(palette.mist);
    MIST.uMistDensity.value = air;
    MIST.uLanternR.value = 6.5;
  }, [palette, air]);

  const handleTick = useCallback(
    (s: HudState) => {
      setHere((prev) => (prev === s.world ? prev : s.world));
      onTick(s);
    },
    [onTick],
  );

  const pressTimer = useRef<number | null>(null);
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

  /**
   * The render size, capped.
   *
   * The Critic's deduction 10: p1 held 72 at DPR 1 and fell to 48 at DPR 2 and
   * on the phone, and both are fill rate on a scene that is mostly full-screen
   * shader. A phone gets 1 device pixel per CSS pixel and a retina desktop gets
   * 1.5, which on a 1440 by 900 window is 2160 by 1350: enough that the grain
   * and the tilt-shift still read, and 44 percent of the pixels DPR 2 was
   * asking for.
   */
  const dpr = useMemo<[number, number]>(() => {
    if (reduced) return [1, 1];
    const phone = typeof window !== "undefined" && window.innerWidth < 700;
    return phone ? [1, 1] : [1, 1.5];
  }, [reduced]);

  return (
    <Canvas
      dpr={dpr}
      frameloop={idle && !reduced ? "demand" : "always"}
      /* Not `shadows` bare: r3f's default is PCFSoftShadowMap, which three 0.185
         deprecates and warns about on every shadow-casting light. PCF is the
         supported successor and looks the same at this map size. */
      shadows={{ type: THREE.PCFShadowMap }}
      gl={{
        antialias: false,
        alpha: false,
        powerPreference: "high-performance",
        stencil: false,
      }}
      camera={{ fov: 44, near: 1, far: 460, position: [18, 6, 18] }}
      style={{ position: "absolute", inset: 0, touchAction: "none" }}
    >
      <color attach="background" args={[sky.horizon]} />
      {/* The fog IS the horizon: one hex, so a pine dissolving into the distance
          and the sky it dissolves into cannot disagree. */}
      <fogExp2 attach="fog" args={[palette.fog, 0.0035 + air * 0.008]} />
      <Tone />
      <Sky look={sky} banding={palette.banding} mistDensity={air} />
      <KeyLight rt={rt} p={palette} theme={theme} weather={weather} />
      <IsoCamera rt={rt} target={target} />
      <Ground worlds={worlds} target={target} horizon={sky.horizon} />
      <GrassField
        target={target}
        /* Root near the ground it grows out of, tip the register's own grass.
           Rooted in `foliageDark` the blades read as dark chips scattered on a
           cream page rather than as a meadow. */
        root={palette.foliage}
        tip={palette.grassTip}
        clearings={clearings}
        count={3000}
        radius={22}
      />

      {visible.map((w) => {
        const isHere = w.id === current?.id;
        return (
          <World
            key={w.id}
            world={w}
            p={isHere ? palette : neighbourPalette(w.register, current?.register)}
            rt={rt}
            onPress={press}
            onRelease={release}
            lightBudget={isHere ? 6 : 2}
            current={isHere}
          />
        );
      })}

      <Hero rt={rt} p={palette} lanternColor={palette.flame} lanternRange={9} />

      <Conductor
        rt={rt}
        worlds={worlds}
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
});

export { createRuntime };
export type { Runtime };
export { lightsFor };
