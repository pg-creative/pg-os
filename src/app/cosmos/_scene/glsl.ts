/**
 * Shared GLSL chunks for the cosmos scene.
 *
 * EXTENDS: `~/cortex/forge/library/shaders/flashpoint-shaders/glsl.ts`. NOISE is
 * that file's hash / value-noise / fbm block, taken verbatim so the mist here and
 * the fire there are the same noise. ShaderQuad's uniform contract is kept, its
 * imports are flattened, because in the library they are broken.
 *
 * GLSL ES 1.00, which is what three's ShaderMaterial defaults to: `varying`, not
 * `in`/`out`, and `precision highp float;` at the top of every fragment shader.
 */

/** Fullscreen quad vertex shader: writes clip coords, ignores the camera. */
export const SCREEN_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

/** Ordinary in-world vertex shader for the plate planes and object cards. */
export const WORLD_VERT = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorld;
  void main() {
    vUv = uv;
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorld = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

/** Verbatim from flashpoint's glsl.ts. Compact and battle-tested. */
export const NOISE = /* glsl */ `
  float hash21(vec2 p){ p = fract(p*vec2(123.34,456.21)); p += dot(p,p+45.32); return fract(p.x*p.y); }
  float hash13(vec3 p){ p = fract(p*0.3183099+0.1); p *= 17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }

  float vnoise(vec2 p){
    vec2 i = floor(p); vec2 f = fract(p);
    vec2 u = f*f*(3.0-2.0*f);
    float a = hash21(i);
    float b = hash21(i+vec2(1.0,0.0));
    float c = hash21(i+vec2(0.0,1.0));
    float d = hash21(i+vec2(1.0,1.0));
    return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
  }

  float vnoise3(vec3 x){
    vec3 i = floor(x); vec3 f = fract(x);
    f = f*f*(3.0-2.0*f);
    float n = mix(mix(mix(hash13(i+vec3(0,0,0)),hash13(i+vec3(1,0,0)),f.x),
                      mix(hash13(i+vec3(0,1,0)),hash13(i+vec3(1,1,0)),f.x),f.y),
                  mix(mix(hash13(i+vec3(0,0,1)),hash13(i+vec3(1,0,1)),f.x),
                      mix(hash13(i+vec3(0,1,1)),hash13(i+vec3(1,1,1)),f.x),f.y),f.z);
    return n;
  }

  float fbm(vec2 p){
    float v=0.0, a=0.5;
    mat2 m=mat2(1.6,1.2,-1.2,1.6);
    for(int i=0;i<6;i++){ v+=a*vnoise(p); p=m*p; a*=0.5; }
    return v;
  }

  // Four octaves. The six-octave fbm above is flashpoint's, kept verbatim and
  // used where detail earns its cost; at the scales the sky and the mist run at,
  // octaves five and six are below a pixel and only cost fill rate.
  float fbm4(vec2 p){
    float v=0.0, a=0.5;
    mat2 m=mat2(1.6,1.2,-1.2,1.6);
    for(int i=0;i<4;i++){ v+=a*vnoise(p); p=m*p; a*=0.5; }
    return v;
  }

  float fbm3(vec3 p){
    float v=0.0, a=0.5;
    for(int i=0;i<5;i++){ v+=a*vnoise3(p); p*=2.02; a*=0.5; }
    return v;
  }
`;

/**
 * The mist function every material shares.
 *
 * `uUntouched` is days-since-touched normalised 0..1 (attention.json drives it),
 * `uFocusDistance` is how far this object is from what the eye is on. Mist never
 * deletes anything: at full untouched the object is still there, just far away
 * behind weather.
 */
export const MIST = /* glsl */ `
  float mistAmount(vec2 uv, float t, float untouched, float focusDistance, float scale, float speed) {
    vec2 q = uv * scale;
    q.x += t * speed;
    // One cheap warp instead of a nested fbm: a single vnoise reads the same at
    // this scale and costs four octaves less per pixel, on a pass that runs
    // fullscreen three times over.
    q.y += (vnoise(q * 1.7 + t * speed * 0.4) - 0.5) * 0.5;
    float n = fbm4(q);
    // Untouched drives how much of the noise reads as cloud; focus distance
    // pushes a flat veil on top so the thing you are not looking at recedes.
    float veil = clamp(untouched * 0.72 + focusDistance * 0.34, 0.0, 1.0);
    return clamp(smoothstep(0.34, 0.92, n) * veil + veil * 0.28, 0.0, 0.94);
  }
`;

/** Paper grain. Register-dependent: riso wants a lot of it, watercolor almost none. */
export const GRAIN = /* glsl */ `
  float grain(vec2 uv, float t, float scale) {
    return hash21(floor(uv * 900.0 / max(scale, 0.001)) + floor(t * 12.0)) - 0.5;
  }
`;
