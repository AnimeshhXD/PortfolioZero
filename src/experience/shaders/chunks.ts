/**
 * GLSL chunk library. Compose into ShaderMaterial sources with template literals.
 *
 *   vertexShader:   `${GLOBALS}\n${NOISE}\n ... varying float vViewDepth; ... vViewDepth = -mvPosition.z;`
 *   fragmentShader: `${GLOBALS}\n${FOG}\n ... col = pzFog(col, vViewDepth);`
 */

/** Declarations for every global uniform (see uniforms.ts). Safe to include in both stages. */
export const GLOBALS = /* glsl */ `
uniform float uTime;
uniform vec3 uFogColor;
uniform float uFogDensity;
uniform vec2 uPointer;
uniform vec3 uPointerWorld;
uniform float uPointerInfluence;
uniform float uFocus;
uniform float uAperture;
uniform float uPixelRatio;
uniform float uViewportHeight;
uniform vec3 uKeyDir;
uniform vec3 uKeyColor;
uniform vec3 uRimDir;
uniform vec3 uRimColor;
uniform vec3 uAmbient;
uniform vec3 uCameraPos;
uniform float uReducedMotion;
`;

/** 3D simplex noise (Ashima / Gustavson, MIT) + fbm. */
export const NOISE = /* glsl */ `
vec3 pz_mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 pz_mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 pz_permute(vec4 x) { return pz_mod289(((x * 34.0) + 1.0) * x); }
vec4 pz_taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = pz_mod289(i);
  vec4 p = pz_permute(pz_permute(pz_permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = pz_taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}
float fbm3(vec3 p) {
  float a = 0.5;
  float s = 0.0;
  for (int i = 0; i < 3; i++) { s += a * snoise(p); p *= 2.02; a *= 0.5; }
  return s;
}
vec3 curlish(vec3 p) {
  return vec3(snoise(p + vec3(0.0, 17.1, 3.3)), snoise(p + vec3(41.7, 0.0, 9.2)), snoise(p + vec3(5.5, 23.9, 0.0)));
}
float pzHash(float n) { return fract(sin(n * 127.1 + 311.7) * 43758.5453123); }
`;

/** Exponential-squared fog matching THREE.FogExp2 + helpers for opaque and additive materials. */
export const FOG = /* glsl */ `
float pzFogFactor(float depth) {
  float f = uFogDensity * depth;
  return 1.0 - exp(-f * f);
}
vec3 pzFog(vec3 col, float depth) { return mix(col, uFogColor, pzFogFactor(depth)); }
/** Additive/emissive things should fade INTO fog, not turn fog-coloured. */
float pzFogFade(float depth) { return 1.0 - pzFogFactor(depth); }
`;

/** Physically-restrained lighting for custom surfaces: key (lambert + soft spec), rim, ambient. */
export const LIGHT = /* glsl */ `
vec3 pzLight(vec3 n, vec3 v, vec3 albedo, float rough, float metal) {
  vec3 l = normalize(uKeyDir);
  float ndl = max(dot(n, l), 0.0);
  vec3 h = normalize(l + v);
  float shin = mix(96.0, 6.0, rough);
  float spec = pow(max(dot(n, h), 0.0), shin) * (1.0 - rough) * mix(0.18, 0.6, metal);
  vec3 diffuse = albedo * ndl * (1.0 - metal * 0.6);
  vec3 keyTerm = (diffuse + spec * mix(vec3(1.0), albedo, metal)) * uKeyColor;
  float rim = pow(1.0 - max(dot(n, v), 0.0), 3.0) * max(dot(n, -normalize(uRimDir)) * 0.5 + 0.5, 0.0);
  vec3 rimTerm = rim * uRimColor;
  return keyTerm + rimTerm + albedo * uAmbient;
}
`;

/**
 * Point sprite sizing with depth-of-field (bokeh) — doc 3 §3 focus pulls on particles.
 * Call in vertex shader after computing mvPosition. Writes vCoc (0 = in focus).
 */
export const POINTS_VERT = /* glsl */ `
varying float vCoc;
float pzPointSize(float baseSize, float viewDepth) {
  float coc = uAperture * abs(viewDepth - uFocus) / max(viewDepth, 0.5);
  vCoc = clamp(coc, 0.0, 3.0);
  float px = baseSize * (1.0 + vCoc * 2.2) * uPixelRatio * uViewportHeight / max(viewDepth, 0.25);
  return clamp(px, 0.0, 96.0 * uPixelRatio);
}
`;

/** Soft volumetric disc for gl_PointCoord; defocused points get dimmer & softer. */
export const POINTS_FRAG = /* glsl */ `
varying float vCoc;
float pzDisc() {
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c) * 2.0;
  float core = exp(-d * d * mix(5.0, 2.2, clamp(vCoc, 0.0, 1.0)));
  float edge = 1.0 - smoothstep(0.75, 1.0, d);
  return core * edge / (1.0 + vCoc * vCoc * 2.5);
}
`;

/** Common easing in GLSL. */
export const EASE_GLSL = /* glsl */ `
float pzEaseOut(float t) { t = clamp(t, 0.0, 1.0); float u = 1.0 - t; return 1.0 - u * u * u * u; }
float pzEaseInOut(float t) { t = clamp(t, 0.0, 1.0); return -(cos(3.14159265 * t) - 1.0) * 0.5; }
`;
