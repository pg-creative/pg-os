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
 * the far country blur, and a village of boxes becomes a thing on a table. The
 * kernel is HALF what round two used, because a camera pitched down at 49 degrees
 * saw nothing past forty metres and one pitched at 18 sees the horizon: the same
 * bokeh that read as a miniature then turns the whole upper half of this frame to
 * soup. Narrow depth of field is a look; a blurred horizon is a smear. It is
 * also the most expensive pass in the file, so it is the first one dropped: the
 * `quality` prop steps full, cheap (bokeh at half the kernel), then off, and the
 * canvas decides which from measured frame time and device pixel ratio rather
 * than from a guess about the machine.
 *
 * NOISE is film grain, not shader mud: a very low opacity over the whole frame,
 * enough to keep the flat toon fills from banding on a wide gradient. At 2.2x
 * the register's own number, riso came out as static over the whole cream
 * page; 0.9x is paper tooth, which is what riso means by grain.
 *
 * VIGNETTE is the paper edge. Not a black corner: darkened just enough that the
 * frame closes, in keeping with a painted plate that has a border.
 */

import { EffectComposer, DepthOfField, Noise, Vignette } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";

/**
 * `grain` is new this round and it is the level a PHONE starts on.
 *
 * The steps used to be full, cheap, off, and off meant no composer at all: no
 * grain, no paper edge, a flat WebGL frame. That is the wrong thing to fall back
 * to, because the grain and the vignette are what make the render look painted
 * and they cost one cheap fullscreen pass between them, while the depth of field
 * costs a downsample, two blur passes and a composite.
 *
 * So the ladder is now full, cheap, grain, off, and a handset skips the first
 * two. What that buys is the pixels: a phone rendered at one device pixel per
 * CSS pixel and was then blown up three times by the display, which is most of
 * why PG's frame looked like mush. Trading the bokeh for real resolution is not
 * close.
 */
export type PostQuality = "full" | "cheap" | "grain" | "off";

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

  if (quality === "grain") {
    return (
      <EffectComposer enableNormalPass={false} multisampling={0}>
        <Noise premultiply blendFunction={BlendFunction.SOFT_LIGHT} opacity={grain * 0.9} />
        <Vignette eskil={false} offset={0.36} darkness={0.26} />
      </EffectComposer>
    );
  }

  return (
    <EffectComposer enableNormalPass={false} multisampling={0}>
      {quality === "full" ? (
        <DepthOfField
          focusDistance={focusDistance}
          focalLength={0.42}
          bokehScale={0.9}
          height={480}
        />
      ) : (
        <DepthOfField
          focusDistance={focusDistance}
          focalLength={0.5}
          bokehScale={0.6}
          height={240}
        />
      )}
      <Noise premultiply blendFunction={BlendFunction.SOFT_LIGHT} opacity={grain * 0.9} />
      <Vignette eskil={false} offset={0.36} darkness={0.26} />
    </EffectComposer>
  );
}
