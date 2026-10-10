/**
 * PageField — thousands of floating translucent contract pages in one draw call (doc 2 §3 atmosphere,
 * doc 13 P-02 family). A bespoke cousin of ArchitectureViz/Panes with what this world needs:
 *
 *  - progress-driven "slow snow" fall (uFall) + time-only micro drift, flutter and paper bend
 *  - the scanning key light (world-space plane sweep)
 *  - the red clause as a SECONDARY light source on neighbouring pages (doc 12 §4)
 *  - pointer illumination: a lamp passing over the set near uPointerWorld (doc 2 §3 interactive)
 *  - plane depth-of-field: defocused sheets soften and fade (meshes otherwise ignore DOF)
 *  - exit liquefy: sheets contract in a staggered wave while their particles flow to the signature
 *
 * Instance matrices are written once at build (all motion is shader-side → no per-frame CPU work).
 */
import { Color, DoubleSide, InstancedBufferAttribute, InstancedMesh, Matrix4, NormalBlending, PlaneGeometry, ShaderMaterial, Vector3 } from 'three';
import type { GlobalUniforms } from '../../../shaders/uniforms';
import { FOG, GLOBALS, NOISE } from '../../../shaders/chunks';
import { PAPER_GLSL } from './paper';

export interface PageInstances {
  count: number;
  /** Column-major 4×4 matrices, 16 floats per page. */
  matrices: Float32Array;
  /** 0..1 per page (look variation). */
  seed: Float32Array;
  /** 0..1 liquefy order (exit wave). */
  order: Float32Array;
  /** Fall speed multiplier. */
  fall: Float32Array;
}

export interface PageFieldOptions {
  width: number;
  height: number;
  colorA: string;
  colorB: string;
  scanColor: string;
  redColor: string;
  pointerColor: string;
  opacity: number;
}

const _m = new Matrix4();

export class PageField {
  readonly mesh: InstancedMesh<PlaneGeometry, ShaderMaterial>;

  constructor(uniforms: GlobalUniforms, inst: PageInstances, opts: PageFieldOptions) {
    const geo = new PlaneGeometry(opts.width, opts.height, 1, 1);
    geo.setAttribute('aSeed', new InstancedBufferAttribute(inst.seed, 1));
    geo.setAttribute('aOrder', new InstancedBufferAttribute(inst.order, 1));
    geo.setAttribute('aFall', new InstancedBufferAttribute(inst.fall, 1));

    const material = new ShaderMaterial({
      uniforms: {
        ...uniforms,
        uColorA: { value: new Color(opts.colorA) },
        uColorB: { value: new Color(opts.colorB) },
        uOpacity: { value: opts.opacity },
        uDim: { value: 1 },
        uFall: { value: 0 },
        uDrift: { value: 0.12 },
        uTurn: { value: 0 },
        uLiquefy: { value: 0 },
        uLiqStagger: { value: 0.7 },
        uPointerPull: { value: 0.07 },
        uScanDir: { value: new Vector3(1, 0.22, 0).normalize() },
        uScanPos: { value: -999 },
        uScanWidth: { value: 1.3 },
        uScanAmount: { value: 0 },
        uScanColor: { value: new Color(opts.scanColor) },
        uRedPos: { value: new Vector3() },
        uRedAmount: { value: 0 },
        uRedRadius: { value: 2.2 },
        uRedColor: { value: new Color(opts.redColor) },
        uPointerAmount: { value: 0.6 },
        uPointerRadius: { value: 2.4 },
        uPointerColor: { value: new Color(opts.pointerColor) },
        uDof: { value: 1 },
      },
      vertexShader: /* glsl */ `
        ${GLOBALS}
        ${NOISE}
        attribute float aSeed;
        attribute float aOrder;
        attribute float aFall;
        uniform float uFall;
        uniform float uDrift;
        uniform float uTurn;
        uniform float uLiquefy;
        uniform float uLiqStagger;
        uniform float uPointerPull;
        varying vec2 vUv;
        varying float vSeed;
        varying vec3 vWorld;
        varying float vDepth;
        varying float vFacing;
        varying float vLiq;
        void main() {
          vUv = uv;
          vSeed = aSeed;
          float rm = 1.0 - uReducedMotion * 0.75;
          vec3 lp = position;
          // paper is never perfectly flat: a slow bend across the sheet
          float bend = sin(uTime * (0.17 + aSeed * 0.1) + aSeed * 40.0) * (0.25 + 0.25 * aSeed) * rm;
          lp.z += lp.x * lp.x * 0.9 * bend;
          // flutter (time, micro) + slow scroll-driven turn about the sheet's own vertical axis
          float a = sin(uTime * (0.09 + aSeed * 0.07) + aSeed * 61.0) * 0.14 * rm + uTurn * (aSeed - 0.5) * 1.4;
          float ca = cos(a);
          float sa = sin(a);
          lp.xz = vec2(ca * lp.x + sa * lp.z, -sa * lp.x + ca * lp.z);
          vec3 ln = vec3(sa, 0.0, ca);
          // exit: sheets contract as their particles take over
          float liq = clamp(uLiquefy * (1.0 + uLiqStagger) - aOrder * uLiqStagger, 0.0, 1.0);
          vLiq = liq;
          lp *= 1.0 - 0.7 * liq;
          mat4 im = modelMatrix * instanceMatrix;
          vec4 w = im * vec4(lp, 1.0);
          vec3 center = (im * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
          vec3 off = vec3(0.0, -uFall * aFall, 0.0);
          off += curlish(vec3(aSeed * 31.0, uTime * 0.03, aSeed * 7.0)) * uDrift * rm;
          // clause fragments lean gently toward the visitor's light
          vec3 toP = uPointerWorld - (center + off);
          float pd = length(toP);
          off += (toP / max(pd, 1e-3)) * uPointerPull * exp(-pd * pd / 5.0) * uPointerInfluence * rm;
          w.xyz += off;
          vWorld = w.xyz;
          vec3 nrm = normalize(mat3(im) * ln);
          vec4 mv = viewMatrix * w;
          vDepth = -mv.z;
          vFacing = abs(dot(normalize(cameraPosition - w.xyz), nrm));
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        ${GLOBALS}
        ${FOG}
        ${PAPER_GLSL}
        uniform vec3 uColorA;
        uniform vec3 uColorB;
        uniform float uOpacity;
        uniform float uDim;
        uniform vec3 uScanDir;
        uniform float uScanPos;
        uniform float uScanWidth;
        uniform float uScanAmount;
        uniform vec3 uScanColor;
        uniform vec3 uRedPos;
        uniform float uRedAmount;
        uniform float uRedRadius;
        uniform vec3 uRedColor;
        uniform float uPointerAmount;
        uniform float uPointerRadius;
        uniform vec3 uPointerColor;
        uniform float uDof;
        varying vec2 vUv;
        varying float vSeed;
        varying vec3 vWorld;
        varying float vDepth;
        varying float vFacing;
        varying float vLiq;
        void main() {
          float coc = clamp(uAperture * abs(vDepth - uFocus) / max(vDepth, 0.5) * uDof, 0.0, 1.0);
          vec3 pp = pzPaper(vUv, vSeed, coc);
          float lines = pp.x;
          float rim = pp.y;
          float body = pp.z;
          vec3 base = mix(uColorA, uColorB, vSeed);
          vec3 col = base * (0.22 + lines * 0.42 + rim * 0.36);
          float a = uOpacity * body * (0.45 + lines * 0.38 + rim * 0.4) * mix(0.4, 1.0, vFacing);
          // scanning key light
          float sd = (dot(vWorld, uScanDir) - uScanPos) / max(uScanWidth, 1e-3);
          float scan = exp(-sd * sd) * uScanAmount;
          col += uScanColor * scan * (0.5 + lines * 1.3 + rim * 0.8);
          a += scan * 0.2 * body;
          // the red clause lights its neighbours
          vec3 rv = vWorld - uRedPos;
          float red = exp(-dot(rv, rv) / (uRedRadius * uRedRadius)) * uRedAmount;
          col += uRedColor * red * (0.35 + rim * 1.6 + lines * 0.5);
          a += red * 0.1 * body;
          // pointer: a lamp passing over the set
          vec3 pv = vWorld - uPointerWorld;
          float pl = exp(-dot(pv, pv) / uPointerRadius) * uPointerInfluence * uPointerAmount;
          col += uPointerColor * pl * (0.4 + lines * 0.9 + rim * 0.6);
          a += pl * 0.08 * body;
          col *= uDim;
          a *= mix(0.55, 1.0, uDim);
          float fog = pzFogFactor(vDepth);
          col = mix(col, uFogColor, fog);
          a *= (1.0 - fog * 0.88) * (1.0 - coc * 0.5);
          a *= 1.0 - smoothstep(0.05, 0.8, vLiq);
          // never a sheet across the lens
          a *= smoothstep(0.7, 2.4, vDepth);
          if (a < 0.002) discard;
          gl_FragColor = vec4(col, a);
        }
      `,
      transparent: true,
      depthWrite: false,
      side: DoubleSide,
      blending: NormalBlending,
      fog: false,
    });

    this.mesh = new InstancedMesh(geo, material, inst.count);
    for (let i = 0; i < inst.count; i++) {
      _m.fromArray(inst.matrices, i * 16);
      this.mesh.setMatrixAt(i, _m);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    this.mesh.frustumCulled = false;
  }

  get uniforms(): ShaderMaterial['uniforms'] {
    return this.mesh.material.uniforms;
  }

  dispose(): void {
    this.mesh.removeFromParent();
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
    this.mesh.dispose();
  }
}
