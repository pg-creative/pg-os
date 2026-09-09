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
