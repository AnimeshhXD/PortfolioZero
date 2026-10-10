/**
 * Conduits — the Triage world's energy tubes with PER-CURVE colour (EnergyLines only mixes two colours,
 * and the thresholds need three). One merged mesh = one draw call.
 *
 *  - draw-in / retract along each curve with stagger (uDraw), soft head glow
 *  - instability: wobble (vertex curl, zero at anchors) + contained flicker
 *  - "execution cadence": comet pulses whose spacing inside each cycle follows the resume latencies
 *    vector search 120 : context pruning 40 : AI reasoning 150 (marks at 0, 120/310, 160/310)
 *  - optional per-curve gradient from a neutral ink at the start into the curve colour (decision lines)
 *  - closed loops (threshold outlines) skip the end fade so the seam never shows
 */
import { AdditiveBlending, BufferAttribute, Color, Mesh, ShaderMaterial, TubeGeometry, Vector3, type BufferGeometry, type Curve } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { GlobalUniforms } from '../../../shaders/uniforms';
import { FOG, GLOBALS, NOISE } from '../../../shaders/chunks';

export interface ConduitSpec {
  curve: Curve<Vector3>;
  color: string;
  radius: number;
  /** Stagger order 0..1 (low draws first, retracts last). */
  order: number;
  closed?: boolean;
  /** 0..1 how strongly cadence pulses show on this curve. */
  cadence?: number;
  /** 0 = flat colour, 1 = neutral ink → colour along the curve. */
  gradient?: number;
  segments?: number;
}

/** Cadence marks inside one 310ms cycle: starts of vector search, context pruning, AI reasoning. */
export const CADENCE_MARKS = new Vector3(0, 120 / 310, 160 / 310);

export class Conduits {
  readonly mesh: Mesh<BufferGeometry, ShaderMaterial>;

  constructor(uniforms: GlobalUniforms, specs: readonly ConduitSpec[], opts: { stagger?: number; neutral?: string } = {}) {
    const col = new Color();
    const geos = specs.map((s) => {
      const g = new TubeGeometry(s.curve, s.segments ?? 72, s.radius, 6, s.closed ?? false);
      const count = g.getAttribute('position').count;
      col.set(s.color);
      const c = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        c[i * 3] = col.r;
        c[i * 3 + 1] = col.g;
        c[i * 3 + 2] = col.b;
      }
      g.setAttribute('aColor', new BufferAttribute(c, 3));
      g.setAttribute('aLine', new BufferAttribute(new Float32Array(count).fill(s.order), 1));
      g.setAttribute('aEnds', new BufferAttribute(new Float32Array(count).fill(s.closed ? 0 : 1), 1));
      g.setAttribute('aCad', new BufferAttribute(new Float32Array(count).fill(s.cadence ?? 0), 1));
      g.setAttribute('aGrad', new BufferAttribute(new Float32Array(count).fill(s.gradient ?? 0), 1));
      return g;
    });
    const merged = geos.length === 1 ? geos[0] : mergeGeometries(geos, false);
    if (!merged) throw new Error('Conduits: merge failed');
    if (geos.length > 1) geos.forEach((g) => g.dispose());

    const material = new ShaderMaterial({
      uniforms: {
        ...uniforms,
        uDraw: { value: 1 },
        uStagger: { value: opts.stagger ?? 0.5 },
        uOpacity: { value: 1 },
        uIntensity: { value: 1 },
        uWobble: { value: 0 },
        uFlicker: { value: 0 },
        uNeutral: { value: new Color(opts.neutral ?? '#dfeee6') },
        uCadence: { value: 0 },
        uCadenceFlow: { value: 0.11 },
        uCycles: { value: 1 },
        uPulseWidth: { value: 0.012 },
        uMarks: { value: CADENCE_MARKS.clone() },
      },
      vertexShader: /* glsl */ `
        ${GLOBALS}
        ${NOISE}
        attribute float aLine;
        attribute vec3 aColor;
        attribute float aEnds;
        attribute float aCad;
        attribute float aGrad;
        uniform float uWobble;
        varying float vT;
        varying float vLine;
        varying vec3 vColor;
        varying float vEnds;
        varying float vCad;
        varying float vGrad;
        varying vec3 vN;
        varying vec3 vV;
        varying float vDepth;
        void main() {
          vT = uv.x;
          vLine = aLine;
          vColor = aColor;
          vEnds = aEnds;
          vCad = aCad;
          vGrad = aGrad;
          vec3 p = position;
          float anchor = sin(3.14159265 * uv.x);
          p += curlish(p * 0.6 + aLine * 13.0 + uTime * 0.35) * uWobble * anchor * (1.0 - uReducedMotion * 0.7);
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          vN = normalize(normalMatrix * normal);
          vV = normalize(-mv.xyz);
          vDepth = -mv.z;
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        ${GLOBALS}
        ${FOG}
        uniform float uDraw;
        uniform float uStagger;
        uniform float uOpacity;
        uniform float uIntensity;
        uniform float uFlicker;
        uniform vec3 uNeutral;
        uniform float uCadence;
        uniform float uCadenceFlow;
        uniform float uCycles;
        uniform float uPulseWidth;
        uniform vec3 uMarks;
        varying float vT;
        varying float vLine;
        varying vec3 vColor;
        varying float vEnds;
        varying float vCad;
        varying float vGrad;
        varying vec3 vN;
        varying vec3 vV;
        varying float vDepth;

        // comet: sharp head travelling toward +t, soft tail behind it
        float comet(float x, float m) {
          float d = x - m;
          d -= floor(d + 0.5);
          float w = uPulseWidth;
          return d >= 0.0 ? exp(-(d * d) / (w * w)) : exp(d / (w * 3.2));
        }

        void main() {
          float local = clamp(uDraw * (1.0 + uStagger) - vLine * uStagger, 0.0, 1.0);
          float head = local * 1.02;
          if (vT > head) discard;
          float headGlow = smoothstep(head - 0.06, head, vT) * step(local, 0.999);
          float core = pow(abs(dot(normalize(vN), normalize(vV))), 1.4);
          float ends = mix(1.0, smoothstep(0.0, 0.03, vT) * smoothstep(1.0, 0.97, vT), vEnds);
          float flick = 1.0 - uFlicker * (0.5 + 0.5 * sin(uTime * 23.0 + vLine * 50.0)) * (1.0 - uReducedMotion);
          float x = fract(vT * uCycles - uTime * uCadenceFlow);
          float cad = (comet(x, uMarks.x) + comet(x, uMarks.y) + comet(x, uMarks.z)) * uCadence * vCad;
          vec3 base = mix(vColor, mix(uNeutral, vColor, smoothstep(0.05, 0.85, vT)), vGrad);
          vec3 col = mix(base, vec3(1.0), clamp(cad * 0.35, 0.0, 0.6));
          float energy = (0.3 + core * 0.85 + headGlow * 1.4 + cad * 2.4) * ends * flick * uIntensity;
          float a = clamp(core * 0.85 + 0.15, 0.0, 1.0) * uOpacity * ends * pzFogFade(vDepth);
          if (a < 0.002) discard;
          gl_FragColor = vec4(col * energy, a);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      fog: false,
    });
    this.mesh = new Mesh(merged, material);
    this.mesh.frustumCulled = false;
  }

  get uniforms(): ShaderMaterial['uniforms'] {
    return this.mesh.material.uniforms;
  }

  set draw(v: number) {
    this.mesh.material.uniforms.uDraw.value = v;
    this.sync();
  }

  set opacity(v: number) {
    this.mesh.material.uniforms.uOpacity.value = v;
    this.sync();
  }

  private sync(): void {
    const u = this.mesh.material.uniforms;
    this.mesh.visible = (u.uDraw.value as number) > 0.0005 && (u.uOpacity.value as number) > 0.002;
  }

  dispose(): void {
    this.mesh.removeFromParent();
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}
