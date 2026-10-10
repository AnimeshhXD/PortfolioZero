/**
 * E-02 Neural Lattice / E-03 Rails / energy threads — "Energy respects physical plausibility:
 * thickness, fade, attenuation" (doc 1 §3.8).
 *
 * Many curves merged into ONE mesh (one draw call). Each curve can be drawn in (uDraw with stagger),
 * carry flowing pulses (SSE token stream, retrieval beams, WebSocket twin beams), wobble when unstable
 * (uWobble) and lock when stable. Soft core/edge falloff — no neon outlines.
 */
import { AdditiveBlending, BufferAttribute, Color, Mesh, ShaderMaterial, TubeGeometry, type BufferGeometry, type Curve, type Vector3 } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { GlobalUniforms } from '../../shaders/uniforms';
import { EASE_GLSL, FOG, GLOBALS, NOISE } from '../../shaders/chunks';

export interface EnergyLinesOptions {
  curves: ReadonlyArray<Curve<Vector3>>;
  /** Tube radius (world units). Default 0.02. */
  radius?: number;
  /** Per-curve radius multipliers. */
  radii?: readonly number[];
  /** Per-curve 0..1 stagger order (default: index order). */
  order?: readonly number[];
  /** Per-curve 0..1 tint between colorA/colorB (default: order). */
  tint?: readonly number[];
  colorA?: string | Color;
  colorB?: string | Color;
  tubularSegments?: number;
  radialSegments?: number;
  /** Draw stagger 0..0.95. Default 0.5. */
  stagger?: number;
}

export class EnergyLines {
  readonly mesh: Mesh<BufferGeometry, ShaderMaterial>;

  constructor(uniforms: GlobalUniforms, opts: EnergyLinesOptions) {
    const n = opts.curves.length;
    const geos = opts.curves.map((curve, i) => {
      const g = new TubeGeometry(curve, opts.tubularSegments ?? 64, (opts.radius ?? 0.02) * (opts.radii?.[i] ?? 1), opts.radialSegments ?? 6, false);
      const count = g.getAttribute('position').count;
      const order = opts.order?.[i] ?? (n > 1 ? i / (n - 1) : 0);
      const tint = opts.tint?.[i] ?? order;
      g.setAttribute('aLine', new BufferAttribute(new Float32Array(count).fill(order), 1));
      g.setAttribute('aTint', new BufferAttribute(new Float32Array(count).fill(tint), 1));
      return g;
    });
    const merged = geos.length === 1 ? geos[0] : mergeGeometries(geos, false);
    if (!merged) throw new Error('EnergyLines: merge failed');
    if (geos.length > 1) geos.forEach((g) => g.dispose());

    const material = new ShaderMaterial({
      uniforms: {
        ...uniforms,
        uDraw: { value: 1 },
        uStagger: { value: opts.stagger ?? 0.5 },
        uFlow: { value: 0 },
        uPulses: { value: 3 },
        uPulseAmount: { value: 0.6 },
        uWobble: { value: 0 },
        uIntensity: { value: 1 },
        uOpacity: { value: 1 },
        uColorA: { value: new Color(opts.colorA ?? '#7fe7ff') },
        uColorB: { value: new Color(opts.colorB ?? opts.colorA ?? '#a58bff') },
        uFlicker: { value: 0 },
      },
      vertexShader: /* glsl */ `
        ${GLOBALS}
        ${NOISE}
        attribute float aLine;
        attribute float aTint;
        uniform float uWobble;
        varying float vT;
        varying float vLine;
        varying float vTint;
        varying vec3 vN;
        varying vec3 vV;
        varying float vDepth;
        void main() {
          vT = uv.x;
          vLine = aLine;
          vTint = aTint;
          vec3 p = position;
          // instability: low-frequency wobble that vanishes at both anchors
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
        ${EASE_GLSL}
        ${FOG}
        uniform float uDraw;
        uniform float uStagger;
        uniform float uFlow;
        uniform float uPulses;
        uniform float uPulseAmount;
        uniform float uIntensity;
        uniform float uOpacity;
        uniform vec3 uColorA;
        uniform vec3 uColorB;
        uniform float uFlicker;
        varying float vT;
        varying float vLine;
        varying float vTint;
        varying vec3 vN;
        varying vec3 vV;
        varying float vDepth;
        void main() {
          float local = clamp(uDraw * (1.0 + uStagger) - vLine * uStagger, 0.0, 1.0);
          float head = local * 1.04;
          if (vT > head) discard;
          float headGlow = smoothstep(head - 0.08, head, vT) * step(local, 0.999);
          float core = pow(abs(dot(normalize(vN), normalize(vV))), 1.6);
          float ends = smoothstep(0.0, 0.04, vT) * smoothstep(1.0, 0.96, vT);
          float pulse = pow(0.5 + 0.5 * sin((vT * uPulses - uTime * uFlow + vLine * 7.0) * 6.2831853), 6.0) * uPulseAmount;
          float flick = 1.0 - uFlicker * (0.5 + 0.5 * sin(uTime * 23.0 + vLine * 50.0)) * (1.0 - uReducedMotion);
          vec3 col = mix(uColorA, uColorB, vTint);
          float energy = (0.35 + core * 0.9 + pulse + headGlow * 1.5) * ends * flick * uIntensity;
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

  /** 0..1 draw-in progress across all curves (with stagger). */
  set draw(v: number) {
    this.mesh.material.uniforms.uDraw.value = v;
    this.mesh.visible = v > 0.0005 && (this.mesh.material.uniforms.uOpacity.value as number) > 0.001;
  }

  set opacity(v: number) {
    this.mesh.material.uniforms.uOpacity.value = v;
    this.mesh.visible = v > 0.001 && (this.mesh.material.uniforms.uDraw.value as number) > 0.0005;
  }

  dispose(): void {
    this.mesh.removeFromParent();
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}
