/**
 * Instanced translucent panes — one draw call for hundreds/thousands of planar fragments:
 * contract pages & clauses (LawLens-X), message rectangles (Workplace), government forms (BenefitBridge),
 * boot fragments (Mavira), memory shards (Health Coach).
 *
 * Per-instance attributes: aGlow (0..1 emission), aTint (0..1 between colours), aSeed.
 * Built-in behaviours: abstract ruled "content" lines (unreadable, never UI), a scanning light sweep,
 * shader-side drift, fog-aware, soft edges (never card-like hard borders).
 */
import {
  Color,
  DoubleSide,
  DynamicDrawUsage,
  InstancedBufferAttribute,
  InstancedMesh,
  Matrix4,
  NormalBlending,
  AdditiveBlending,
  PlaneGeometry,
  ShaderMaterial,
  Vector3,
  Quaternion,
  Euler,
} from 'three';
import type { GlobalUniforms } from '../../shaders/uniforms';
import { FOG, GLOBALS, NOISE } from '../../shaders/chunks';

export interface PanesOptions {
  count: number;
  width: number;
  height: number;
  colorA?: string | Color;
  colorB?: string | Color;
  /** Emission colour for glowing instances (e.g. the red clause). */
  glowColor?: string | Color;
  /** Base opacity. Default 0.16. */
  opacity?: number;
  /** Faux text lines density 0..1 (0 = blank). Default 0.6. */
  lines?: number;
  /** Additive (energy) or normal (paper/stone) blending. Default normal. */
  additive?: boolean;
}

const _m = new Matrix4();
const _p = new Vector3();
const _q = new Quaternion();
const _s = new Vector3();
const _e = new Euler();

export class Panes {
  readonly mesh: InstancedMesh<PlaneGeometry, ShaderMaterial>;
  readonly glow: InstancedBufferAttribute;
  readonly tint: InstancedBufferAttribute;
  readonly seed: InstancedBufferAttribute;

  constructor(uniforms: GlobalUniforms, opts: PanesOptions) {
    const geo = new PlaneGeometry(opts.width, opts.height, 1, 1);
    this.glow = new InstancedBufferAttribute(new Float32Array(opts.count), 1);
    this.glow.setUsage(DynamicDrawUsage);
    this.tint = new InstancedBufferAttribute(new Float32Array(opts.count), 1);
    this.seed = new InstancedBufferAttribute(new Float32Array(opts.count).map((_, i) => ((i * 0.6180339887) % 1 + 1) % 1), 1);
    geo.setAttribute('aGlow', this.glow);
    geo.setAttribute('aTint', this.tint);
    geo.setAttribute('aSeed', this.seed);

    const material = new ShaderMaterial({
      uniforms: {
        ...uniforms,
        uColorA: { value: new Color(opts.colorA ?? '#9fc7e8') },
        uColorB: { value: new Color(opts.colorB ?? opts.colorA ?? '#b7a6ff') },
        uGlowColor: { value: new Color(opts.glowColor ?? '#ee5148') },
        uOpacity: { value: opts.opacity ?? 0.16 },
        uLines: { value: opts.lines ?? 0.6 },
        uEdge: { value: 0.6 },
        /** Scan sweep: world-space plane (dir · p = pos) with soft width. */
        uScanDir: { value: new Vector3(1, 0, 0) },
        uScanPos: { value: -999 },
        uScanWidth: { value: 1.5 },
        uScanColor: { value: new Color('#8fe3ff') },
        uScanAmount: { value: 0 },
        /** Shader drift: amplitude (units) and fall speed (units/s) wrapped over uFallRange. */
        uDrift: { value: 0.15 },
        uFall: { value: 0 },
        uFallRange: { value: 20 },
        uDim: { value: 1 },
      },
      vertexShader: /* glsl */ `
        ${GLOBALS}
        ${NOISE}
        attribute float aGlow;
        attribute float aTint;
        attribute float aSeed;
        uniform float uDrift;
        uniform float uFall;
        uniform float uFallRange;
        varying vec2 vUv;
        varying float vGlow;
        varying float vTint;
        varying float vSeed;
        varying vec3 vWorld;
        varying float vDepth;
        varying float vFacing;
        void main() {
          vUv = uv;
          vGlow = aGlow;
          vTint = aTint;
          vSeed = aSeed;
          vec4 local = vec4(position, 1.0);
          #ifdef USE_INSTANCING
            vec4 w = modelMatrix * instanceMatrix * local;
            vec3 nrm = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * vec3(0.0, 0.0, 1.0));
          #else
            vec4 w = modelMatrix * local;
            vec3 nrm = normalize(mat3(modelMatrix) * vec3(0.0, 0.0, 1.0));
          #endif
          float rm = 1.0 - uReducedMotion * 0.75;
          w.xyz += curlish(vec3(aSeed * 31.0, uTime * 0.04, aSeed * 7.0)) * uDrift * rm;
          if (uFall > 0.0) {
            float y = w.y - uTime * uFall * rm * (0.6 + aSeed * 0.8);
            w.y = mod(y + uFallRange * 0.5, uFallRange) - uFallRange * 0.5;
          }
          vWorld = w.xyz;
          vec4 mv = viewMatrix * w;
          vDepth = -mv.z;
          vFacing = abs(dot(normalize(cameraPosition - w.xyz), nrm));
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        ${GLOBALS}
        ${FOG}
        uniform vec3 uColorA;
        uniform vec3 uColorB;
        uniform vec3 uGlowColor;
        uniform float uOpacity;
        uniform float uLines;
        uniform float uEdge;
        uniform vec3 uScanDir;
        uniform float uScanPos;
        uniform float uScanWidth;
        uniform vec3 uScanColor;
        uniform float uScanAmount;
        uniform float uDim;
        varying vec2 vUv;
        varying float vGlow;
        varying float vTint;
        varying float vSeed;
        varying vec3 vWorld;
        varying float vDepth;
        varying float vFacing;
        void main() {
          vec2 c = vUv - 0.5;
          // soft edges (no hard card borders) + faint brighter rim like light through a sheet edge
          vec2 e = smoothstep(vec2(0.5), vec2(0.42), abs(c));
          float body = e.x * e.y;
          float rim = (1.0 - smoothstep(0.38, 0.5, max(abs(c.x), abs(c.y)))) * smoothstep(0.3, 0.5, max(abs(c.x), abs(c.y)));
          // abstract unreadable content: ruled lines with ragged ends
          float row = floor(vUv.y * 18.0);
          float ln = smoothstep(0.42, 0.5, abs(fract(vUv.y * 18.0) - 0.5)) ;
          float len = 0.55 + 0.4 * fract(sin(row * 12.9898 + vSeed * 78.233) * 43758.5453);
          float inLine = (1.0 - ln) * step(vUv.x, len) * step(0.12, vUv.x) * step(0.1, vUv.y) * step(vUv.y, 0.9);
          inLine *= step(0.25, fract(sin(row * 3.7 + vSeed * 9.1) * 1000.0));
          vec3 base = mix(uColorA, uColorB, vTint);
          vec3 col = base * (0.55 + inLine * uLines * 0.9) + base * rim * uEdge;
          float a = uOpacity * body * (0.55 + inLine * uLines * 0.45 + rim * uEdge * 0.5) * mix(0.55, 1.0, vFacing);
          // scanning key light
          float scan = exp(-pow((dot(vWorld, normalize(uScanDir)) - uScanPos) / max(uScanWidth, 0.001), 2.0)) * uScanAmount;
          col += uScanColor * scan * 1.6;
          a += scan * 0.25 * body;
          // emissive instances (outliers, active nodes)
          col = mix(col, uGlowColor * 2.4, vGlow);
          a = mix(a, max(a, 0.85 * body), vGlow);
          col *= uDim;
          float fog = pzFogFactor(vDepth);
          col = mix(col, uFogColor, fog * (1.0 - vGlow * 0.6));
          a *= 1.0 - fog * 0.85;
          if (a < 0.002) discard;
          gl_FragColor = vec4(col, a);
        }
      `,
      transparent: true,
      depthWrite: false,
      side: DoubleSide,
      blending: opts.additive ? AdditiveBlending : NormalBlending,
      fog: false,
    });
    this.mesh = new InstancedMesh(geo, material, opts.count);
    this.mesh.instanceMatrix.setUsage(DynamicDrawUsage);
    this.mesh.frustumCulled = false;
  }

  get uniforms(): ShaderMaterial['uniforms'] {
    return this.mesh.material.uniforms;
  }

  /** Convenience: set an instance transform from position / euler rotation / uniform or vector scale. */
  setInstance(i: number, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = 1): void {
    _p.set(x, y, z);
    _q.setFromEuler(_e.set(rx, ry, rz));
    _s.set(sx, sy, sz);
    _m.compose(_p, _q, _s);
    this.mesh.setMatrixAt(i, _m);
  }

  /** Call after a batch of setInstance / glow / tint writes. */
  commit(matrices = true, attributes = true): void {
    if (matrices) this.mesh.instanceMatrix.needsUpdate = true;
    if (attributes) {
      this.glow.needsUpdate = true;
      this.tint.needsUpdate = true;
    }
  }

  dispose(): void {
    this.mesh.removeFromParent();
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
    this.mesh.dispose();
  }
}
