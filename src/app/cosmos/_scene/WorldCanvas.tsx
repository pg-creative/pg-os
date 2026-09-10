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
import {
  createRuntime,
  HERO_RADIUS,
  recentre,
  stepWalker,
  STEER_MARGIN,
  STRIDE,
  type Runtime,
} from "./runtime";
import { EMITTER_SOCKET, PROPS } from "./props";
import { CAM_YAW, ENTRY_SECONDS, IsoCamera } from "./IsoCamera";
import { Ground } from "./Ground";
import { coverFor, GrassField, type Clearing } from "./Grass";
import { Sky, skyFor, useHour, type SkyLook } from "./Sky";
import { World, worldBlockers } from "./World";
import { Hero } from "./Hero";
import { Postfx, type PostQuality } from "./Postfx";
import { MIST } from "./toon";
import { WIND_CLOCK } from "./wind";

/**
 * Stand this close for this long and the page unfolds. Or press E.
 *
 * DERIVED, not chosen. The Critic's deduction 6 was that the hint printed inside
 * 3.6 m, the page opened inside 1.2 m, and the steering parks him at
 * `blocker + 0.42 of him + 0.55 of margin`, so "stand still" was a lie at
 * exactly the distance the world puts him. Round 2.1's first answer was 1.75,
 * chosen by hand against a page card's 0.34 blocker, and a standing stone's 0.75
 * blocker parks him at 1.72 to 1.77: two centimetres outside it, so a monument
 * still opened nothing. A number chosen by hand is a bug waiting for a bigger
 * prop. This one is the largest interactable blocker in the registry plus the
 * steering it implies plus a step, so it cannot fall behind again.
 */
export const REACH =
  Math.max(
    PROPS["standing-stone"].blockers[0].r,
    PROPS["stone-lantern"].blockers[0].r,
    0.34,
  ) +
  HERO_RADIUS +
  STEER_MARGIN +
  0.3;
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

/**
 * A handset, by the only measure that survives being turned on its side.
 *
 * 700 CSS pixels on the SHORT edge. It re-reads on resize and on
 * `orientationchange`, because the answer has to change while the page is open:
 * r3f takes `dpr` as a prop and will resize the drawing buffer when it changes,
 * so rotating a phone re-caps the render rather than keeping whatever the first
 * paint decided.
 */
export function usePhone(): boolean {
  const [phone, setPhone] = useState(false);
  useEffect(() => {
    const read = () => setPhone(Math.min(window.innerWidth, window.innerHeight) < 700);
    read();
    window.addEventListener("resize", read, { passive: true });
    window.addEventListener("orientationchange", read, { passive: true });
    return () => {
      window.removeEventListener("resize", read);
      window.removeEventListener("orientationchange", read);
    };
  }, []);
  return phone;
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
  night,
}: {
  rt: React.RefObject<Runtime>;
  worlds: WorldManifest[];
  onTick: (s: HudState) => void;
  onOpen: (id: string) => void;
  onDoor: (to: string, kind: "mist" | "stairs") => void;
  onStep: () => void;
  theme: "light" | "dark";
  /** The register's own hour, for the foreground shape the ground draws. */
  night: number;
}) {
  const gl = useThree((s) => s.gl);
  const acc = useRef(0);
  const lastStep = useRef(0);

  /**
   * Everything a click can be aimed at, as a sphere in world space.
   *
   * The Critic's deduction 9: the click handler raycast the y = 0 plane only, so
   * a click on a card's FACE, which hangs at y = 1.0, landed `1.0 / tan(15.5)` =
   * 3.6 m behind the card and walked him past the thing he pointed at. The card's
   * own r3f handler never fired for a mouse, because that path is a 400 ms hold
   * meant for a thumb.
   *
   * Testing the ray against a sphere per interactable is exact enough (they are
   * all about a metre across), costs a few dozen dot products on a pointerdown,
   * and does not depend on r3f's event system running before this listener.
   */
  const aims = useMemo(() => {
    const out: { id: string; c: THREE.Vector3; r: number }[] = [];
    for (const w of worlds) {
      for (const o of w.objects) out.push({ id: o.id, c: new THREE.Vector3(o.at.x, 1.0, o.at.z), r: 0.8 });
      for (const m of w.monuments) out.push({ id: m.id, c: new THREE.Vector3(m.at.x, 1.3, m.at.z), r: 1.0 });
      for (const room of w.layout.rooms) {
        for (const d of room.doors) {
          if (d.kind !== "stairs") continue;
          out.push({ id: `door:${d.to}`, c: new THREE.Vector3(d.at.x, 0.4, d.at.z), r: 1.2 });
        }
      }
    }
    return out;
  }, [worlds]);

  /**
   * Click to move, or click to go and look at a thing. On a thumb, TAP to move.
   *
   * A MOUSE DECIDES ON THE WAY DOWN AND A THUMB ON THE WAY UP, and the two are
   * not the same gesture. A finger that presses is not yet asking for anything:
   * it might be the first of two about to pinch (`IsoCamera`), or it might be a
   * hold on a card, which is the open gesture and must not also walk him at the
   * thing it just opened. So a touch is a walk order only if it lifts inside
   * two thirds of a second, within twelve pixels of where it landed, and alone.
   * Everything a mouse does is exactly what it did before.
   */
  useEffect(() => {
    const el = gl.domElement;
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const hit = new THREE.Vector3();
    const v = new THREE.Vector3();

    /** Where the Wayfarer is on the glass, in client pixels, or null. */
    const heroOnGlass = (): { x: number; y: number } | null => {
      const r = rt.current;
      const cam = (el as HTMLCanvasElement & { __cam?: THREE.Camera }).__cam;
      if (!r || !cam) return null;
      const rect = el.getBoundingClientRect();
      v.set(r.pos.x, 0.9, r.pos.z).project(cam);
      if (v.z > 1) return null;
      return {
        x: rect.left + ((v.x + 1) / 2) * rect.width,
        y: rect.top + ((1 - v.y) / 2) * rect.height,
      };
    };

    /** A finger within this of him is on him. Never smaller than a tap target. */
    const ON_HERO_PX = 44;
    const onHero = (x: number, y: number) => {
      const h = heroOnGlass();
      return !!h && Math.hypot(h.x - x, h.y - y) <= ON_HERO_PX;
    };

    const act = (clientX: number, clientY: number) => {
      const r = rt.current;
      if (!r || r.paused) return;
      const rect = el.getBoundingClientRect();
      ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      const cam = (el as HTMLCanvasElement & { __cam?: THREE.Camera }).__cam;
      if (!cam) return;
      ray.setFromCamera(ndc, cam);

      // A thing first. Nearest along the ray wins, so a card in front of a stone
      // takes the click.
      let best: { id: string; c: THREE.Vector3 } | null = null;
      let bestT = Infinity;
      for (const a of aims) {
        if (ray.ray.distanceSqToPoint(a.c) > a.r * a.r) continue;
        const t = ray.ray.origin.distanceToSquared(a.c);
        if (t < bestT) {
          bestT = t;
          best = a;
        }
      }
      if (best) {
        // Walk to the thing's reach, not to the thing: arriving THROUGH it is
        // what the steering spends its whole budget preventing.
        const dx = r.pos.x - best.c.x;
        const dz = r.pos.z - best.c.z;
        const L = Math.hypot(dx, dz) || 1;
        const stand = Math.min(L, REACH - 0.35);
        r.dest = new THREE.Vector3(best.c.x + (dx / L) * stand, 0, best.c.z + (dz / L) * stand);
        r.intent = { id: best.id, until: performance.now() + 12_000 };
        return;
      }

      // The ground, as before. The plane is always there, at exactly y = 0.
      r.intent = null;
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

    const touches = new Set<number>();
    let tap: { x: number; y: number; at: number } | null = null;
    let lastHeroTap = 0;

    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== "touch") {
        act(e.clientX, e.clientY);
        return;
      }
      touches.add(e.pointerId);
      // A second finger is the camera's, and it cancels the first one's tap.
      if (touches.size > 1) tap = null;
      else tap = { x: e.clientX, y: e.clientY, at: performance.now() };
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "touch" || !tap) return;
      if (Math.hypot(e.clientX - tap.x, e.clientY - tap.y) > 12) tap = null;
    };

    const onUp = (e: PointerEvent) => {
      if (e.pointerType !== "touch") return;
      touches.delete(e.pointerId);
      const t = tap;
      tap = null;
      const r = rt.current;
      if (!t || touches.size || !r) return;
      // A hold is the OPEN gesture (`press` in this file, 400 ms). It is not a
      // walk order, and firing both is how a held thumb ends up walking him into
      // the thing it just unfolded.
      if (performance.now() - t.at > 650) return;
      // TWO TAPS ON HIM PUT THE CAMERA BACK, and one tap on him is still a tap
      // on the ground.
      //
      // The first version of this swallowed any tap inside his 44 px target so
      // that a double tap would not also walk him, and the phone leg found what
      // that costs: at 43 units back, a point seven metres in front of him lands
      // 28 px from his middle, so "tap the ground to walk" stopped working for
      // the whole of the near field. The frame is the thing that got bigger, so
      // the dead zone had to go. A single tap near him walks like any other; the
      // second one inside a third of a second recentres AND cancels the walk
      // order the first one just placed, which is the only part that needed to
      // be special.
      if (onHero(t.x, t.y)) {
        const now = performance.now();
        if (now - lastHeroTap < 340) {
          lastHeroTap = 0;
          recentre(r);
          r.dest = null;
          r.intent = null;
          return;
        }
        lastHeroTap = now;
      }
      act(t.x, t.y);
    };

    el.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    window.addEventListener("pointercancel", onUp, { passive: true });
    return () => {
      el.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [gl, rt, aims]);

  /**
   * THE ARMING. Nothing about attention runs until he has touched the thing.
   *
   * The Critic's deduction 1, and it is the one that matters most: the dwell ran
   * on a timer from the first frame, so a reload that landed inside reach opened
   * a page at 1.2 s and posted attention to the vault every 1.2 s after that, ten
   * writes in twelve seconds of a man not being at his desk. Attention he never
   * gave, written down as attention.
   */
  useEffect(() => {
    const arm = () => {
      if (!rt.current) return;
      rt.current.armed = true;
      // And the establishing shot hands the frame over the instant anybody
      // touches the glass. Nobody sits through a camera move they did not ask
      // for, twice.
      rt.current.entry = 0;
    };
    const opts = { capture: true, passive: true } as const;
    window.addEventListener("pointerdown", arm, opts);
    window.addEventListener("keydown", arm, opts);
    window.addEventListener("touchstart", arm, opts);
    window.addEventListener("wheel", arm, opts);
    return () => {
      window.removeEventListener("pointerdown", arm, opts);
      window.removeEventListener("keydown", arm, opts);
      window.removeEventListener("touchstart", arm, opts);
      window.removeEventListener("wheel", arm, opts);
    };
  }, [rt]);

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

    // THE ESTABLISHING SHOT, spent. One subtraction, and it is over: the camera
    // reads `entry` and eases, so the settle is the existing damping rather
    // than a second animation with its own opinion about easing.
    if (r.entry > 0) r.entry = r.reduced ? 0 : Math.max(0, r.entry - dt / ENTRY_SECONDS);

    // The mist takes the lantern, the eye and the register, once, for everything.
    MIST.uTime.value += dt;
    MIST.uLantern.value.copy(r.lantern);
    MIST.uFocus.value.copy(r.target);
    MIST.uFloor.value = theme === "light" ? 1 : 0;
    MIST.uNight.value = night;
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

    // The latch clears the moment the thing it belongs to is no longer the thing
    // in front of him. That, and nothing else, is "once per approach".
    if (r.latched && r.near?.id !== r.latched) r.latched = null;

    // Sitting: the hearth mat, and only the hearth mat. Read BEFORE the dwell,
    // because sitting suspends it.
    const room = roomAt(here, r.pos.x, r.pos.z);
    const fire = room?.lights.find((l) => l.emitter === "fire");
    r.sitting = !!fire && Math.hypot(fire.at.x - r.pos.x, fire.at.z - r.pos.z) < 1.9;

    // A click on a thing: he walks there and it opens when he arrives. Not on a
    // timer, not before he gets there, and never at all if he changed his mind
    // and clicked the grass instead.
    const fire1 = (id: string) => {
      r.latched = id;
      r.dwell = 0;
      if (id.startsWith("door:")) onDoor(id.slice(5), "stairs");
      else onOpen(id);
    };
    if (r.intent) {
      if (performance.now() > r.intent.until) r.intent = null;
      else if (!r.moving && r.near?.id === r.intent.id) {
        const id = r.intent.id;
        r.intent = null;
        fire1(id);
      }
    }

    // Dwell: ARMED, standing still, in reach, and not already opened on this
    // approach. Moving resets it, which is the difference between attention and
    // passing by. Sitting at the fire is not dwelling on the card 1.1 m away:
    // the thread is what opens there.
    if (r.armed && r.near && !r.moving && !r.sitting && r.latched !== r.near.id) {
      r.dwell += 0.25;
      if (r.dwell >= DWELL_S) fire1(r.near.id);
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
  const k = 0.68 + weather.key * 0.5;
  /**
   * THE HOUR IS THE REGISTER'S, NOT THE TOGGLE'S.
   *
   * This line was `const day = theme === "light"` and it is the single largest
   * cause of what PG opened on his phone. His own standing rule puts every
   * surface in light mode by default; the cosmos read that as daylight and
   * drove a 1.28 intensity pale-pink sun over a register whose sky is `#0e0816`.
   * A gouache twilight under a noon key is mud, and mud has no focal point.
   *
   * `p.night` comes off the register's own sky. `themeLift` is what the toggle
   * is actually allowed to do: light mode lifts the whole picture about a fifth
   * of a stop so the world is legible on a bright phone at arm's length, and
   * dark mode lets it sit down. It moves the VALUE and never the hour.
   */
  const night = p.night;
  const themeLift = theme === "light" ? 1.18 : 1.0;

  return (
    <>
      {/* Three lights adding to about 3.2 of irradiance put every lit face of
          the ground past white, and a painted world with blown highlights is a
          grey one. About 1.6 total keeps the toon ramp inside its own colour.

          AT NIGHT THE BUDGET MOVES rather than shrinking: the key comes down
          and the hemisphere goes up, because moonlight is mostly sky and only a
          little direction. What that buys is the thing the plate has and round
          three did not: a cool, modelled, LOW-contrast world with one hot warm
          thing standing in it. */}
      <hemisphereLight
        color={p.key}
        groundColor={p.ambient}
        intensity={(0.62 + night * 0.26) * k * themeLift}
      />
      <ambientLight color={p.fill} intensity={(0.2 - night * 0.05) * k * themeLift} />
      <directionalLight
        ref={dir}
        color={p.key}
        intensity={(1.28 - night * 0.42) * k * themeLift}
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

// ── The light pool ───────────────────────────────────────────────────────────

/**
 * EVERY LIGHT IN THE COSMOS, THROUGH A FIXED NUMBER OF SLOTS.
 *
 * The Critic's deduction 5, and it is arithmetic rather than taste. Three bakes
 * `NUM_POINT_LIGHTS` into every material's GLSL as a define, so the moment the
 * count changes, every material in the scene recompiles. Round 2.1 gave the
 * biome he stood in six lights and each neighbour two, which means crossing a
 * border changed the count three times and cost twenty-three programs and an
 * 83 ms frame on Metal, twenty-four on SwiftShader.
 *
 * Eight slots, always mounted, always visible, never counted differently. A slot
 * with nothing near it is turned down to zero intensity, which is a uniform and
 * costs nothing to change. Which emitter owns which slot is decided by distance
 * to the walker on a slow tick, across every world in sight, so the nearest
 * eight flames in the cosmos are the eight that light, and no emitter can be
 * starved by the room order it happens to sit in (which was deduction 8 of the
 * round before).
 *
 * Nine point lights reach a fragment in total: these eight and the lantern in
 * his hand. That number is now a constant of the build.
 */
const LIGHT_SLOTS = 8;

function LightPool({
  rt,
  worlds,
  night,
}: {
  rt: React.RefObject<Runtime>;
  worlds: WorldManifest[];
  /** The register's own hour. A lamp at midnight has to carry the picture. */
  night: number;
}) {
  const refs = useRef<(THREE.PointLight | null)[]>([]);
  const acc = useRef(0);

  const all = useMemo(
    () =>
      worlds.flatMap((w) =>
        lightsFor(w).map((l) => ({
          world: w.id,
          x: l.at.x,
          z: l.at.z,
          y: l.lamp ? (EMITTER_SOCKET[l.emitter] ?? 1.2) : 0.22,
          color: l.color,
          range: l.range,
          intensity: l.intensity,
        })),
      ),
    [worlds],
  );

  const assign = useCallback(() => {
    const r = rt.current;
    if (!r) return;
    const ranked = [...all]
      .sort(
        (a, b) =>
          Math.hypot(a.x - r.pos.x, a.z - r.pos.z) - Math.hypot(b.x - r.pos.x, b.z - r.pos.z),
      )
      .slice(0, LIGHT_SLOTS);
    for (let i = 0; i < LIGHT_SLOTS; i++) {
      const slot = refs.current[i];
      if (!slot) continue;
      const l = ranked[i];
      if (!l) {
        slot.intensity = 0;
        continue;
      }
      slot.position.set(l.x, l.y, l.z);
      slot.color.set(l.color);
      slot.distance = l.range;
      /**
       * A neighbour's lamp still burns, a little further off, so a biome's edge
       * reads as somewhere rather than as a wall of dark.
       *
       * AND EVERY LAMP GETS LOUDER AS THE HOUR GETS DARKER. This is the other
       * half of the murk fix and it does not work without the first: the key
       * came down 0.42 and the lamps go up 1.85, so the RATIO between the one
       * warm thing and everything else moves by about three times. That ratio
       * is the whole composition of PG's plate, where a single paper lantern
       * out-values an entire twilight sky.
       *
       * The vault still says how bright each lamp is and what colour it burns;
       * this only says what a lamp is worth at this hour.
       */
      slot.intensity =
        l.intensity * (1 + night * 0.85) * (l.world === r.world ? 1 : 0.7);
    }
  }, [all, rt]);

  useFrame((_, dt) => {
    acc.current += dt;
    if (acc.current < 0.4) return;
    acc.current = 0;
    assign();
  });
  useEffect(() => assign(), [assign]);

  return (
    <>
      {Array.from({ length: LIGHT_SLOTS }, (_, i) => (
        <pointLight
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          intensity={0}
          distance={1}
          decay={1.7}
        />
      ))}
    </>
  );
}

// ── The warm-up ──────────────────────────────────────────────────────────────

/**
 * Compile everything the scene can draw, once, before it has to draw it.
 *
 * `renderer.compile(scene, camera)` walks the tree and builds a program for
 * every material it finds, under the lights that are actually mounted. With the
 * light count fixed above and one cache key per mist material, that is the whole
 * program set: a border crossing after this has nothing left to compile, which
 * is the thing the round asked to be able to prove.
 *
 * The count is left on the canvas element as a plain number so a harness can
 * read it before and after a walk without the scene shipping a debug object.
 */
function Warmup() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  useEffect(() => {
    let raf = 0;
    // One frame in: the first render has mounted the props and their materials.
    raf = requestAnimationFrame(() => {
      void gl.compile(scene, camera);
      const el = gl.domElement as HTMLCanvasElement & { __programs?: number };
      el.__programs = gl.info.programs?.length ?? 0;
    });
    const tick = window.setInterval(() => {
      const el = gl.domElement as HTMLCanvasElement & { __programs?: number };
      el.__programs = gl.info.programs?.length ?? 0;
    }, 500);
    return () => {
      cancelAnimationFrame(raf);
      window.clearInterval(tick);
    };
  }, [gl, scene, camera]);
  return null;
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

  /**
   * The rigged Wayfarer, when the vault names one. He is one traveller, so the
   * world he is standing in gets first say and any world that declares a model
   * answers otherwise: he does not become a different man at a border.
   */
  const heroModel = useMemo(
    () => current?.hero_model ?? worlds.find((w) => w.hero_model)?.hero_model ?? null,
    [current, worlds],
  );

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
  const pressFrom = useRef<{ x: number; y: number } | null>(null);
  /** Where the pointer that is about to reach a card came down. Capture phase,
      so it is already written by the time r3f hands the mesh its event. */
  const lastDown = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const press = useCallback(
    (id: string) => {
      const r = rt.current;
      if (!r) return;
      r.hovered = id;
      r.intent = null;
      pressFrom.current = { ...lastDown.current };
      // A held finger opens it; a tap that lifts inside 400 ms only walks there.
      pressTimer.current = window.setTimeout(() => onOpen(id), 400);
    },
    [onOpen, rt],
  );
  const release = useCallback(() => {
    pressFrom.current = null;
    if (pressTimer.current !== null) {
      window.clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  }, []);
  useEffect(() => () => release(), [release]);

  /**
   * A HOLD THAT MOVES IS NOT A HOLD.
   *
   * A card's own `onPointerUp` cancels the timer, but a thumb that lands on a
   * card and then drags (the start of a pinch, or a finger sliding off) never
   * fires one on that mesh, so the four hundred milliseconds ran out and a page
   * unfolded in the middle of a camera gesture. Movement past twelve pixels, a
   * second finger, or the pointer being cancelled by the browser all release it.
   */
  useEffect(() => {
    const moved = (e: PointerEvent) => {
      const from = pressFrom.current;
      if (!from) return;
      if (Math.hypot(e.clientX - from.x, e.clientY - from.y) > 12) release();
    };
    const down = (e: PointerEvent) => {
      lastDown.current = { x: e.clientX, y: e.clientY };
      if (e.isPrimary === false) release();
    };
    const opts = { capture: true, passive: true } as const;
    window.addEventListener("pointermove", moved, { passive: true });
    window.addEventListener("pointerdown", down, opts);
    window.addEventListener("pointercancel", release, { passive: true });
    return () => {
      window.removeEventListener("pointermove", moved);
      window.removeEventListener("pointerdown", down, opts);
      window.removeEventListener("pointercancel", release);
    };
  }, [release]);

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
          setQuality((q) =>
            q === "full" ? "cheap" : q === "cheap" ? "grain" : q === "grain" ? "off" : q,
          );
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
   *
   * THE SHORT EDGE DECIDES, not the width. `innerWidth < 700` called a phone a
   * phone until it was turned on its side, and then an 844 by 390 iPhone asked
   * for 1.5 device pixels per CSS pixel on the hardest frame in the build: the
   * landscape leg is a 2.16 aspect, which is more full-screen shader than the
   * desktop draws, on a tenth of the fill rate. The short edge is 390 either way
   * up, and it is the honest test for "this is a handset".
   */
  const phone = usePhone();
  /**
   * A HANDSET SKIPS THE DEPTH OF FIELD AND SPENDS THE PIXELS INSTEAD.
   *
   * Round three capped a phone at one device pixel per CSS pixel, so an iPhone
   * rendered the world at 390 by 844 and the display blew it up to 1170 by 2532.
   * Everything soft, every edge three pixels wide, the Wayfarer a smudge before
   * he was ever a speck. That is a large part of "inoperably bad".
   *
   * Two at 390 by 844 is 1.32 megapixels, which is LESS than the 2.16 by 1.35
   * this build already draws on the desk, and the bokeh that used to eat the
   * difference is off on this path. The adaptive ladder still runs underneath
   * and can take it to `off`.
   */
  const dpr = useMemo<[number, number]>(() => {
    if (reduced) return [1, 1];
    return phone ? [1.5, 2] : [1, 1.5];
  }, [reduced, phone]);

  // The ladder starts two rungs down on a handset, and never climbs.
  useEffect(() => {
    if (phone) setQuality((q) => (q === "full" || q === "cheap" ? "grain" : q));
  }, [phone]);

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
      {/* THE VAULT SAYS WHAT THE FLOOR IS. `ground: ash` is the depths, and a
          meadow through a crypt is the same bug as a dock beside a shrine: the
          scene deciding something the vault already answered. Stone and grass
          both grow it; ash and anything else the vault invents grow nothing. */}
      <GrassField
        key={current?.layout.ground ?? "grass"}
        target={target}
        /* ROOTED IN THE GROUND ITSELF. `foliage` is a mid green whatever the
           register, so on the forge's cream flagstones the blades read as dark
           chips scattered on a page and on the practice as pale spikes. A blade
           that starts at the floor's own colour and ends at the register's grass
           emerges from the ground instead of sitting on it, in every biome, for
           free: the colour is in the vertices. */
        root={palette.ground}
        tip={palette.grass}
        clearings={clearings}
        /* The vault's word decides how thick the cover is, not whether there is
           any: a meadow is thick, a flagged yard carries weeds in its joints,
           ash carries nothing. `coverFor` holds the numbers. */
        count={Math.round(3000 * coverFor(current?.layout.ground))}
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
            lightBudget={LIGHT_SLOTS}
            current={isHere}
          />
        );
      })}

      <LightPool rt={rt} worlds={visible} night={palette.night} />

      <Hero
        rt={rt}
        p={palette}
        lanternColor={palette.flame}
        lanternRange={9}
        model={heroModel}
      />

      <Warmup />
      <Conductor
        rt={rt}
        worlds={worlds}
        onTick={handleTick}
        onOpen={onOpen}
        onDoor={onDoor}
        onStep={onStep}
        theme={theme}
        night={palette.night}
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
