"use client";

/**
 * A room that breathes: a cut frame sequence, scrubbed onto one canvas texture.
 *
 * PG's ruling of 2026-09-09 made Higgsfield first-class, and the first thing it
 * produced was motion: the hall interior animated from its own painted plate
 * (locked camera, the hearth and lantern flickering, the paper windows breathing,
 * dust in the light), and the same for the lake, the party sky and the red moon.
 * The keeper cuts each mp4 to 12 fps WebP frames beside the world it belongs to
 * and a room says `loop: plates/hall-loop`; the folder's own `frames.json`
 * carries the count, the rate and the size, so nothing here counts a folder over
 * HTTP and the frame rate is not a number typed twice.
 *
 * WHY THE CANVAS PATH AND NOT NINETY-SIX TEXTURES. A 1280 by 720 frame decoded
 * is 3.7 MB of RGBA; ninety-six of them held at once is 354 MB, on a page whose
 * whole texture budget is sixty-five. So the COMPRESSED bytes are held (about
 * 60 KB a frame, six megabytes for the set, fetched once and never again) and
 * exactly the frames around the playhead are decoded, drawn to one canvas, and
 * closed. Steady state is one canvas, one GPU texture and three ImageBitmaps,
 * whatever the length of the loop.
 *
 * PING-PONG, not wrap. An image-to-video loop starts at the painting and drifts;
 * it does not come home to the same pixel, so a wrap is a visible jolt once a
 * cycle. Playing it out and back has no seam by construction, and for flicker,
 * breathing windows and still water there is no direction to be wrong about. It
 * also doubles the cycle, which is the right direction for something that is
 * supposed to be ambient.
 *
 * ITS OWN CLOCK. Nothing here is driven by scroll, by the walker, or by a page
 * being open. A hearth burns whether or not anyone is looking at it.
 *
 * AND IT BURNS FOR FREE WHEN NOBODY IS LOOKING. Round three uploaded a 1280 by
 * 720 `CanvasTexture` twelve to fourteen times a second, in every world, forever:
 * about 45 MB/s of texture bandwidth on a phone the proxy cannot model for heat
 * or battery, bought for a change of 0.4 percent of the frame in the depths and
 * 2.3 in the party (the Critic's deduction 10). Three things pay that back and
 * none of them is the flicker:
 *
 *   RATE, by register. `LOOP_BUDGET` below. A hearth in the practice is the best
 *   thing in the build and keeps its twelve; a red moon that changes four tenths
 *   of one percent gets four. The clock still runs at the loop's authored speed,
 *   so the fire is never in slow motion; frames are SAMPLED, not stretched.
 *
 *   RESOLUTION, by register and by device. A 1280 by 720 plate lands on a wall
 *   that is at most a few hundred pixels of glass. The canvas is capped, the
 *   bitmap is scaled into it by `drawImage` (free, on the GPU), and a phone takes
 *   two thirds of the cap again. Bandwidth is width times height, so this is the
 *   larger half of the saving.
 *
 *   VISIBILITY. A loop whose wall is behind the camera, or whose tab is hidden,
 *   uploads nothing. The clock keeps running (`step(dt, false)` advances `t` and
 *   returns), so the hearth is where it should be when you turn round, which is
 *   the difference between not-drawing and pausing.
 */

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

/**
 * How much a register's loop is worth: uploads a second, and the widest canvas
 * it may hold. Measured change over 700 ms, from the Critic's `d1-report.json`:
 * the yard 10.5 percent, the practice 1.4, the party 2.3, the depths 0.4.
 */
const LOOP_BUDGET: Record<string, { rate: number; width: number }> = {
  /** The hall's hearth, the lantern, the paper windows. PG's own best frame. */
  painted: { rate: 12, width: 960 },
  /** The yard's water, which moves more than anything else in the cosmos. */
  riso: { rate: 8, width: 832 },
  /** The party's sky. Stars do not need twelve. */
  watercolor: { rate: 6, width: 640 },
  /** The red moon over the depths: four tenths of a percent, in near darkness. */
  paperback: { rate: 4, width: 512 },
};

export function loopBudget(
  register: string | null | undefined,
  phone: boolean,
): { rate: number; width: number } {
  const b = (register && LOOP_BUDGET[register]) || LOOP_BUDGET.painted;
  return { rate: b.rate, width: phone ? Math.round(b.width * 0.66) : b.width };
}

export interface RoomLoop {
  /** Asset URL up to the frame number; a frame is `${base}001` with no extension. */
  base: string;
  count: number;
  fps: number;
  width: number;
  height: number;
}

/** How many frames ahead of the playhead are kept decoded, at a minimum. */
const LOOKAHEAD = 3;
/** How many frame fetches are in the air at once on a cold start. */
const FETCH_LANES = 6;

class LoopPlayer {
  readonly texture: THREE.CanvasTexture;
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D | null;
  private readonly loop: RoomLoop;
  private readonly bytes: (Blob | null)[];
  private readonly fetching = new Set<number>();
  private readonly bitmaps = new Map<number, ImageBitmap>();
  private readonly decoding = new Set<number>();
  private t = 0;
  private drawn = -1;
  private dead = false;
  private lanes = 0;
  /** Seconds between uploads, from the register's budget. */
  private readonly period: number;
  private readonly ahead: number;
  private since = Infinity;

  constructor(loop: RoomLoop, budget: { rate: number; width: number }) {
    this.loop = loop;
    this.period = 1 / Math.max(1, budget.rate);
    // The lookahead has to cover one SAMPLE, not one frame: at 4 uploads a second
    // on a 12 fps loop the playhead jumps three frames between draws.
    this.ahead = Math.max(LOOKAHEAD, Math.ceil(loop.fps / Math.max(1, budget.rate)) + 1);
    this.bytes = new Array(loop.count).fill(null);
    this.canvas = document.createElement("canvas");
    // Capped, aspect kept, never scaled UP: a small loop stays its own size.
    const cap = Math.min(loop.width, Math.max(160, Math.round(budget.width)));
    this.canvas.width = cap;
    this.canvas.height = Math.max(1, Math.round((loop.height * cap) / loop.width));
    this.ctx = this.canvas.getContext("2d", { alpha: false });
    // A canvas nobody has drawn on yet is transparent black, which would flash a
    // hole in the wall for one frame. Fill it with the register's own dark.
    if (this.ctx) {
      this.ctx.fillStyle = "#1A1410";
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.generateMipmaps = false;
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.magFilter = THREE.LinearFilter;
    this.texture.wrapS = THREE.ClampToEdgeWrapping;
    this.texture.wrapT = THREE.ClampToEdgeWrapping;
  }

  /** True once there is a real frame on the canvas. */
  ready(): boolean {
    return this.drawn >= 0;
  }

  private url(i: number): string {
    return `${this.loop.base}${String(i + 1).padStart(3, "0")}`;
  }

  private want(i: number): void {
    if (this.dead || i < 0 || i >= this.loop.count) return;
    if (!this.bytes[i]) {
      if (this.fetching.has(i) || this.lanes >= FETCH_LANES) return;
      this.fetching.add(i);
      this.lanes++;
      void fetch(this.url(i))
        .then((r) => (r.ok ? r.blob() : Promise.reject(new Error("frame"))))
        .then((b) => {
          if (!this.dead) this.bytes[i] = b;
        })
        .catch(() => {
          /* A frame that will not load is one frame. The loop skips it. */
        })
        .finally(() => {
          this.fetching.delete(i);
          this.lanes--;
        });
      return;
    }
    if (this.bitmaps.has(i) || this.decoding.has(i)) return;
    this.decoding.add(i);
    void createImageBitmap(this.bytes[i] as Blob)
      .then((bm) => {
        if (this.dead) {
          bm.close();
          return;
        }
        this.bitmaps.set(i, bm);
      })
      .catch(() => {})
      .finally(() => this.decoding.delete(i));
  }

  /** Out and back, so the seam a generated loop always has never shows. */
  private indexAt(t: number): number {
    const n = this.loop.count;
    if (n <= 1) return 0;
    const span = 2 * (n - 1);
    const f = Math.floor(t * this.loop.fps) % span;
    return f < n ? f : span - f;
  }

  /**
   * `live` false is "nobody can see this wall": the clock still runs so the fire
   * is in the right place when he turns round, and not one byte is uploaded.
   */
  step(dt: number, live = true): void {
    if (this.dead) return;
    this.t += dt;
    if (!live) return;
    this.since += dt;
    if (this.since < this.period) return;
    this.since = 0;

    const i = this.indexAt(this.t);
    // The playhead and the few frames after it, in whichever direction it runs.
    const dir = this.indexAt(this.t + 1 / this.loop.fps) >= i ? 1 : -1;
    for (let k = 0; k <= this.ahead; k++) this.want(i + dir * k);
    // On a cold start there is nothing decoded at all; pull the first frames in
    // so the wall is painted rather than dark while the rest arrive.
    if (this.drawn < 0) for (let k = 0; k < FETCH_LANES; k++) this.want(k);

    const bm = this.bitmaps.get(i);
    if (bm && i !== this.drawn && this.ctx) {
      this.ctx.drawImage(bm, 0, 0, this.canvas.width, this.canvas.height);
      this.texture.needsUpdate = true;
      this.drawn = i;
    }
    // Close anything the playhead has left behind. Bounded by construction.
    if (this.bitmaps.size > this.ahead + 3) {
      for (const [k, v] of this.bitmaps) {
        if (Math.abs(k - i) <= this.ahead + 1) continue;
        v.close();
        this.bitmaps.delete(k);
      }
    }
  }

  dispose(): void {
    this.dead = true;
    for (const bm of this.bitmaps.values()) bm.close();
    this.bitmaps.clear();
    this.texture.dispose();
  }
}

/**
 * One room's loop as a live texture, or null.
 *
 * The player is stepped from a plain rAF rather than `useFrame`, on purpose: the
 * canvas runs `frameloop="demand"` while he is idle, and a hearth that stops
 * flickering because nobody moved for ninety seconds is worse than no hearth.
 * The texture upload still only happens on a frame the renderer draws.
 */
export function useRoomLoop(
  loop: RoomLoop | null,
  budget: { rate: number; width: number },
  /**
   * Can anyone see this wall right now? Read every frame, never a dep, so the
   * scene can answer it from a frustum test without remounting the player. The
   * clock runs either way; only the upload stops.
   */
  seen?: React.RefObject<boolean>,
): THREE.Texture | null {
  const [, bump] = useState(0);
  const player = useRef<LoopPlayer | null>(null);
  // Read inside the tick, so changing a budget number does not tear down a
  // player that has six megabytes of frames in it.
  const rate = budget.rate;
  const width = budget.width;

  useEffect(() => {
    if (!loop || typeof document === "undefined") {
      player.current = null;
      bump((n) => n + 1);
      return;
    }
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const p = new LoopPlayer(loop, { rate, width });
    player.current = p;
    bump((n) => n + 1);

    let raf = 0;
    let last = performance.now();
    let announced = false;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const now = performance.now();
      const dt = Math.min(0.25, (now - last) / 1000);
      last = now;
      // Reduced motion gets the first frame and then stands still, which is what
      // a still of a breathing room is.
      // A HIDDEN TAB UPLOADS NOTHING, and neither does a wall behind the camera.
      // The first frame is always drawn, or the hall would have a dark rectangle
      // where its painting is until he happens to look at it.
      const live = !document.hidden && (!announced || seen?.current !== false);
      p.step(reduced && announced ? 0 : dt, live);
      if (!announced && p.ready()) {
        announced = true;
        bump((n) => n + 1);
      }
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      p.dispose();
      if (player.current === p) player.current = null;
    };
  }, [loop, rate, width, seen]);

  return player.current?.ready() ? player.current.texture : null;
}
