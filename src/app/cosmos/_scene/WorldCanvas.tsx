"use client";

/**
 * WorldCanvas — the one WebGL layer, mounted inside the slot EmakiBackdrop owns.
 *
 * EXTENDS: `_components/emaki/EmakiBackdrop.tsx` (the fixed inset-0 z0 slot; this
 * component never opens its own), `_components/useIdleDetector.tsx` (the existing
 * 90 s detector, reused rather than re-implemented), and `dev/backdrop-lab`'s depth
 * ratios through lib/cosmos/layout.ts.
 *
 * It fuses the recipe's z0 to z2 into one WebGL layer: sky, plates, objects,
 * monuments, mist and particles all live in the canvas. z3, the dwell panel, stays
 * DOM, because a page of PG's own words should be selectable text in the world's
 * register, not a texture.
 *
 * Scroll is Lenis plus GSAP ScrollTrigger, and progress is always
 * (viewportTop - sectionTop) / (sectionHeight - viewportHeight). Never wheel delta,
 * which desyncs the moment anyone flicks a trackpad, and never elapsed time, which
 * is not scroll at all.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { useIdleDetector } from "../../_components/useIdleDetector";
import { PHASES } from "../../_components/emaki/theme";
import { DEPTHS } from "../../../lib/cosmos/layout";
import type { SceneManifest } from "./types";
import { Sky } from "./Sky";
import { PlatePlane, type PlateLayer } from "./PlatePlane";
import { Mist } from "./Mist";
import { Particles } from "./Particles";
import { VaultObjects } from "./VaultObject";
import { Monuments } from "./Monument";
import { AmbientBedToggle } from "./AmbientBed";

/** Dwell, not click. 900 ms of held attention is what counts as looking. */
const DWELL_MS = 900;

/**
 * Weather maps to sky, mist density and particle count. Nothing else. No
 * threshold, no streak, no grade, and a null (the witness has not run, or the
 * Whoop token is dead) leaves the sky exactly where it was.
 */
function mistFromWeather(w: SceneManifest["weather"], base: number): number {
  let d = base;
  if (typeof w.days_since_ship === "number") {
    d += Math.min(w.days_since_ship, 14) * 0.012;
  }
  if (typeof w.recovery === "number") {
    // Low recovery reads as a thicker morning, never as a warning.
    d += (1 - Math.min(Math.max(w.recovery / 100, 0), 1)) * 0.14;
  }
  return Math.min(Math.max(d, 0.08), 0.95);
}

export function WorldCanvas({
  manifest,
  source,
  onSource,
  onDwell,
}: {
  manifest: SceneManifest;
  /** Which painting of the same subject is on the planes right now. */
  source: "a" | "b";
  onSource: (next: "a" | "b") => void;
  onDwell: (id: string | null) => void;
}) {
  const progressRef = useRef(0);
  const parallaxRef = useRef({ x: 0, y: 0 });
  const targetRef = useRef({ x: 0, y: 0 });
  const [hovered, setHovered] = useState<string | null>(null);
  const [reduced, setReduced] = useState(false);
  const dwellTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dwellFor = useRef<string | null>(null);

  const idle = useIdleDetector({ timeoutMs: 90_000 });

  const tk = PHASES[manifest.phase];
  const mistDensity = useMemo(
    () => mistFromWeather(manifest.weather, manifest.preset.mist.density),
    [manifest],
  );

  const getProgress = useCallback(() => progressRef.current, []);
  const getParallax = useCallback(() => parallaxRef.current, []);

  // ── Reduced motion. The canvas unmounts entirely; the still plate remains. ──
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  // ── Scroll. Lenis drives, ScrollTrigger measures, the rule does the maths. ──
  useEffect(() => {
    if (reduced) return;
    gsap.registerPlugin(ScrollTrigger);

    const lenis = new Lenis({ duration: 1.1, smoothWheel: true });
    const section = document.getElementById("cosmos-scroll");

    const onRaf = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(onRaf);
    gsap.ticker.lagSmoothing(0);
    lenis.on("scroll", ScrollTrigger.update);

    let trigger: ScrollTrigger | null = null;
    if (section) {
      trigger = ScrollTrigger.create({
        trigger: section,
        start: "top top",
        end: "bottom bottom",
        // (viewportTop - sectionTop) / (sectionHeight - viewportHeight), which is
        // exactly what ScrollTrigger's progress is between these two markers.
        onUpdate: (self) => {
          progressRef.current = self.progress;
        },
      });
    }

    const onPointer = (e: PointerEvent) => {
      targetRef.current.x = (e.clientX / window.innerWidth - 0.5) * 2;
      targetRef.current.y = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener("pointermove", onPointer, { passive: true });

    let raf = 0;
    const smooth = () => {
      parallaxRef.current.x += (targetRef.current.x - parallaxRef.current.x) * 0.06;
      parallaxRef.current.y += (targetRef.current.y - parallaxRef.current.y) * 0.06;
      raf = requestAnimationFrame(smooth);
    };
    raf = requestAnimationFrame(smooth);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onPointer);
      gsap.ticker.remove(onRaf);
      trigger?.kill();
      lenis.destroy();
    };
  }, [reduced]);

  // ── Dwell. Hover or touch-hold for 900 ms unfolds the page. ──
  const startDwell = useCallback(
    (id: string) => {
      if (dwellFor.current === id) return;
      dwellFor.current = id;
      if (dwellTimer.current) clearTimeout(dwellTimer.current);
      dwellTimer.current = setTimeout(() => {
        onDwell(id);
        // Attention only. The witness owns `touched:` in frontmatter; the panel
        // records that PG looked, and nothing else.
        void fetch("/api/cosmos/touch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
          keepalive: true,
        }).catch(() => {});
      }, DWELL_MS);
    },
    [onDwell],
  );

  const cancelDwell = useCallback(() => {
    dwellFor.current = null;
    if (dwellTimer.current) {
      clearTimeout(dwellTimer.current);
      dwellTimer.current = null;
    }
  }, []);

  useEffect(() => () => cancelDwell(), [cancelDwell]);

  // ── The three plate planes, at backdrop-lab's ported depths. ──
  const plate = source === "b" && manifest.heroAlt ? manifest.heroAlt : manifest.hero;
  const layers: PlateLayer[] = useMemo(() => {
    const [far, mid, , near] = DEPTHS;
    return [
      {
        // The distant valley. The whole plate, biggest, furthest, most air.
        depth: far,
        still: plate,
        maskTop: 1.0,
        maskFeather: 0.02,
        opacity: 1,
        size: [26, 14.6],
        z: -11.4,
      },
      {
        // The middle ground: the lower two thirds of the same painting, a real
        // slab of it rather than a ghost copy, at its own depth and rate.
        depth: mid,
        still: plate,
        maskTop: 0.62,
        maskFeather: 0.16,
        opacity: 0.96,
        size: [15, 8.4],
        z: -6.3,
      },
      {
        // The near ground: the loop, scrubbed by scroll, cropped to the steps.
        depth: near,
        still: null,
        frames: manifest.frames,
        maskTop: 0.46,
        maskFeather: 0.14,
        opacity: 1,
        size: [10.4, 5.85],
        z: -1.6,
      },
    ];
  }, [manifest, plate]);

  // Under reduced motion there is no canvas at all: EmakiBackdrop's still plate
  // is already behind this, and it is a complete picture on its own.
  if (reduced) return null;

  return (
    <>
      <Canvas
        dpr={[1, 1.8]}
        frameloop={idle ? "demand" : "always"}
        gl={{ antialias: false, alpha: true, powerPreference: "high-performance" }}
        camera={{ position: [0, 0, 5], fov: 42, near: 0.1, far: 60 }}
        style={{ position: "absolute", inset: 0 }}
        onPointerMissed={() => {
          setHovered(null);
          cancelDwell();
          onDwell(null);
        }}
      >
        <Sky preset={manifest.preset} phase={manifest.phase} mistDensity={mistDensity} />

        {layers.map((layer, i) => (
          <PlatePlane
            key={i}
            layer={layer}
            preset={manifest.preset}
            mistDensity={mistDensity}
            progress={getProgress}
            parallax={getParallax}
          />
        ))}

        <Monuments
          monuments={manifest.monuments}
          preset={manifest.preset}
          // Wet dark slate, not a text token: the earlier pass used PHASES
          // textMuted, which at twilight is a pale lavender, and the stones read
          // as fog panels standing in the valley.
          ink="#2A2233"
          light={tk.goldBright}
          mistDensity={mistDensity}
        />

        <VaultObjects
          objects={manifest.objects}
          preset={manifest.preset}
          paper="#EFE2C6"
          ink={tk.panelInkBorder}
          edge={tk.goldBright}
          hovered={hovered}
          onHover={setHovered}
          onDwellStart={startDwell}
          onDwellCancel={cancelDwell}
        />

        <Particles preset={manifest.preset} progress={getProgress} />

        <Mist
          preset={manifest.preset}
          mistDensity={mistDensity}
          progress={getProgress}
        />
      </Canvas>

      <div className="cosmos-chrome">
        {/* Light-mode-independent phase indicator. The world is twilight because
            the plate is twilight, and it says so rather than implying it. */}
        <span className="cosmos-chip" aria-label={`Phase: ${tk.phaseName}`}>
          <span aria-hidden>◗</span>
          <span>{tk.phaseName.toLowerCase()}</span>
        </span>
        {/* Two paintings of the same subject in the same register, one from
            Higgsfield's still and one from Midjourney, switchable live. Taste is
            PG's call and it is easier to make with both on the same wall. */}
        {manifest.heroAlt && (
          <button
            type="button"
            className="cosmos-chip"
            aria-label={`Plate source ${source === "a" ? "A" : "B"}, click to switch`}
            onClick={() => onSource(source === "a" ? "b" : "a")}
          >
            <span aria-hidden>◨</span>
            <span>plate {source}</span>
          </button>
        )}
        <AmbientBedToggle />
      </div>
    </>
  );
}
