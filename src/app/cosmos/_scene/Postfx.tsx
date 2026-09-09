"use client";

/**
 * Tilt-shift, grain and a paper vignette. The three passes that make a world a
 * miniature rather than a landscape.
 *
 * Deferred in round one for a real reason (`postprocessing` pins three below
 * 0.186), now in: three is 0.185.0, `postprocessing@6.39.4` peers
 * ">= 0.168.0 < 0.186.0", and `@react-three/postprocessing@3.1.1` peers r3f
 * ">=9.7.0". Both hold exactly, and both are pinned here rather than caret-ranged
 * so a patch release cannot walk out of the window.
 *
 * DEPTH OF FIELD is the diorama. Focus sits on the Wayfarer, the near ground and
 * the far country blur, and a village of boxes becomes a thing on a table. It is
 * also the most expensive pass in the file, so it is the first one dropped: the
 * `quality` prop steps full, cheap (bokeh at half the kernel), then off, and the
 * canvas decides which from measured frame time and device pixel ratio rather
 * than from a guess about the machine.
 *
 * NOISE is film grain, not shader mud: a very low opacity over the whole frame,
 * enough to keep the flat toon fills from banding on a wide gradient.
 *
 * VIGNETTE is the paper edge. Not a black corner: darkened just enough that the
 * frame closes, in keeping with a painted plate that has a border.
 */

import { EffectComposer, DepthOfField, Noise, Vignette } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";

export type PostQuality = "full" | "cheap" | "off";

export function Postfx({
  quality,
  grain,
  focusDistance,
}: {
  quality: PostQuality;
  /** The register's own grain amount. Riso wants a lot, watercolor almost none. */
  grain: number;
  /** Camera distance to the Wayfarer, normalised into the pass's 0..1 space. */
  focusDistance: number;
}) {
  if (quality === "off") return null;

  return (
    <EffectComposer enableNormalPass={false} multisampling={0}>
      {quality === "full" ? (
        <DepthOfField
          focusDistance={focusDistance}
          focalLength={0.035}
          bokehScale={3.4}
          height={480}
        />
      ) : (
        <DepthOfField
          focusDistance={focusDistance}
          focalLength={0.05}
          bokehScale={1.8}
          height={240}
        />
      )}
      <Noise premultiply blendFunction={BlendFunction.SOFT_LIGHT} opacity={grain * 2.2} />
      <Vignette eskil={false} offset={0.28} darkness={0.42} />
    </EffectComposer>
  );
}
