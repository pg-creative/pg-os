/**
 * Foliage wind as a vertex chunk. Roots stay planted, crowns sway.
 *
 * COPIED from Forge `components/painted-billboards/wind.ts` (MIT, PG's own),
 * which is itself written to the number read out of the reference build:
 * `transformed.x += sin(t*1.05 + worldX*0.7 + uv.y*2.0) * uv.y*uv.y * 0.10`.
 * `uv.y` squared is the whole trick: at the bottom of a plane it is zero, so the
 * base of a pine never leaves the ground while its crown moves.
 *
 * One shared clock for the scene, so ten thousand grass blades and forty cutouts
 * are all in the same gust. `uWind` is per material: grass gets 1, a pine 0.55,
 * a wooden dock 0.
 */

import type { Material, WebGLProgramParametersWithUniforms } from "three";

export type WindUniforms = { uTime: { value: number }; uWind: { value: number } };

/** The scene's one wind clock. Ticked once per frame by `WorldCanvas`. */
export const WIND_CLOCK = { value: 0 };

export const WIND_CHUNK = /* glsl */ `
  #include <begin_vertex>
  {
    float wx = (modelMatrix * vec4(position, 1.0)).x;
    float wz = (modelMatrix * vec4(position, 1.0)).z;
    float lift = uv.y * uv.y;
    transformed.x += sin(uTime * 1.05 + wx * 0.7 + uv.y * 2.0) * lift * 0.10 * uWind;
    transformed.z += cos(uTime * 0.80 + wz) * lift * 0.05 * uWind;
  }
`;

/** Patch any three material so its vertex shader sways. Shares the scene clock. */
export function attachWind(material: Material, strength = 1): WindUniforms {
  const uniforms: WindUniforms = { uTime: WIND_CLOCK, uWind: { value: strength } };
  material.onBeforeCompile = (shader: WebGLProgramParametersWithUniforms) => {
    shader.uniforms.uTime = uniforms.uTime;
    shader.uniforms.uWind = uniforms.uWind;
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nuniform float uTime;\nuniform float uWind;",
      )
      .replace("#include <begin_vertex>", WIND_CHUNK);
  };
  material.needsUpdate = true;
  return uniforms;
}
