/**
 * MorphPoints — a reusable, progress-driven point field (one draw call).
 *
 * Each point travels from `start` to `end` as `mix` goes 0 → 1, with per-point stagger, so a single
 * primitive expresses the motion grammar of every world (doc 5 §6, §7):
 *   clause fragments → neural threads · unstable sparks → locked rails · message chaos → aligned streams
 *   scattered points → lattice · glitch dust → kernel · memory shards → ribbon · words → signature seed
 *
 * Fully deterministic and scrubbable (scroll back = motion reverses). Fog-aware, bokeh-aware.
 */
import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, NormalBlending, Points, ShaderMaterial, Vector3 } from 'three';
import type { GlobalUniforms } from '../../shaders/uniforms';
import { EASE_GLSL, FOG, GLOBALS, NOISE, POINTS_FRAG, POINTS_VERT } from '../../shaders/chunks';

export interface MorphPointsOptions {
  /** Flat xyz arrays of equal length. */
  start: Float32Array;
  end: Float32Array;
  /** Optional per-point 0..1 values controlling stagger order (default: random-ish by index). */
  order?: Float32Array;
  /** Optional per-point colour mix 0..1 between colorA and colorB. */
  tint?: Float32Array;
  colorA?: Color | string;
  colorB?: Color | string;
  /** World-unit size (before perspective). Default 0.05. */
  size?: number;
  /** 0..0.95 — how spread out in time the points' journeys are. Default 0.6. */
  stagger?: number;
  /** Swirl amplitude while travelling (world units). Default 0.6. */
  swirl?: number;
  /** Idle drift amplitude at rest (world units). Default 0.08. */
  drift?: number;
  additive?: boolean;
  opacity?: number;
}

export class MorphPoints {
  readonly points: Points<BufferGeometry, ShaderMaterial>;
  readonly count: number;

  constructor(uniforms: GlobalUniforms, opts: MorphPointsOptions) {
    const n = Math.floor(opts.start.length / 3);
    if (opts.end.length !== opts.start.length) throw new Error('MorphPoints: start/end length mismatch');
    this.count = n;
    const geo = new BufferGeometry();
    geo.setAttribute('position', new BufferAttribute(opts.start, 3));
    geo.setAttribute('aEnd', new BufferAttribute(opts.end, 3));
    const order = opts.order ?? new Float32Array(n).map((_, i) => ((i * 0.6180339887) % 1 + 1) % 1);
    geo.setAttribute('aOrder', new BufferAttribute(order, 1));
    const tint = opts.tint ?? new Float32Array(n).map((_, i) => ((i * 0.7548776662) % 1 + 1) % 1);
    geo.setAttribute('aTint', new BufferAttribute(tint, 1));

    const material = new ShaderMaterial({
      uniforms: {
        ...uniforms,
        uMix: { value: 0 },
        uStagger: { value: opts.stagger ?? 0.6 },
        uSwirl: { value: opts.swirl ?? 0.6 },
        uDrift: { value: opts.drift ?? 0.08 },
        uSize: { value: opts.size ?? 0.05 },
        uOpacity: { value: opts.opacity ?? 1 },
        uColorA: { value: new Color(opts.colorA ?? '#ffffff') },
        uColorB: { value: new Color(opts.colorB ?? opts.colorA ?? '#ffffff') },
        uJitter: { value: 0 },
        uOffset: { value: new Vector3() },
        uFadeStart: { value: 0 },
        uFadeEnd: { value: 0 },
      },
      vertexShader: /* glsl */ `
        ${GLOBALS}
        ${NOISE}
        ${EASE_GLSL}
        ${POINTS_VERT}
        attribute vec3 aEnd;
        attribute float aOrder;
        attribute float aTint;
        uniform float uMix;
        uniform float uStagger;
        uniform float uSwirl;
        uniform float uDrift;
        uniform float uSize;
        uniform float uJitter;
        uniform vec3 uOffset;
        uniform float uFadeStart;
        uniform float uFadeEnd;
        varying float vTint;
        varying float vDepth;
        varying float vFade;
        void main() {
          float local = clamp((uMix * (1.0 + uStagger) - aOrder * uStagger), 0.0, 1.0);
          float e = pzEaseInOut(local);
          vec3 p = mix(position, aEnd, e);
          // swirl while in flight (zero at both ends)
          float flight = sin(3.14159265 * e);
          float rm = 1.0 - uReducedMotion * 0.7;
          p += curlish(p * 0.35 + aOrder * 7.0 + uTime * 0.03) * uSwirl * flight * rm;
          // gentle drift at rest
          p += curlish(p * 0.2 + aOrder * 3.0 + uTime * 0.02) * uDrift * rm;
          // contained jitter (instability; Mavira/Triage)
          p += (vec3(pzHash(aOrder * 91.7 + floor(uTime * 12.0)), pzHash(aOrder * 13.1 + floor(uTime * 12.0)), pzHash(aOrder * 47.3 + floor(uTime * 12.0))) - 0.5) * uJitter * rm;
          p += uOffset;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          vDepth = -mv.z;
          gl_Position = projectionMatrix * mv;
          vTint = aTint;
          // optional fade window across the journey (e.g. vanish into the signature at the end)
          vFade = (uFadeEnd > uFadeStart) ? 1.0 - smoothstep(uFadeStart, uFadeEnd, local) : 1.0;
          gl_PointSize = pzPointSize(uSize * (0.7 + aOrder * 0.6), vDepth);
        }
      `,
      fragmentShader: /* glsl */ `
        ${GLOBALS}
        ${FOG}
        ${POINTS_FRAG}
        uniform vec3 uColorA;
        uniform vec3 uColorB;
        uniform float uOpacity;
        varying float vTint;
        varying float vDepth;
        varying float vFade;
        void main() {
          float a = pzDisc() * uOpacity * vFade * pzFogFade(vDepth);
          if (a < 0.003) discard;
          vec3 col = mix(uColorA, uColorB, vTint);
          gl_FragColor = vec4(col, a);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: opts.additive === false ? NormalBlending : AdditiveBlending,
      fog: false,
    });
    this.points = new Points(geo, material);
    this.points.frustumCulled = false;
  }

  get uniforms(): ShaderMaterial['uniforms'] {
    return this.points.material.uniforms;
  }

  /** 0 = at start, 1 = at end. */
  set mix(v: number) {
    this.points.material.uniforms.uMix.value = v;
  }

  set opacity(v: number) {
    this.points.material.uniforms.uOpacity.value = v;
    this.points.visible = v > 0.002;
  }

  set jitter(v: number) {
    this.points.material.uniforms.uJitter.value = v;
  }

  setColors(a: Color | string, b?: Color | string): void {
    (this.points.material.uniforms.uColorA.value as Color).set(a);
    (this.points.material.uniforms.uColorB.value as Color).set(b ?? a);
  }

  /** Fade points out over [start,end] of their own journey (e.g. absorbed into the signature). */
  setFadeWindow(start: number, end: number): void {
    this.points.material.uniforms.uFadeStart.value = start;
    this.points.material.uniforms.uFadeEnd.value = end;
  }

  /** Replace the end positions (e.g. retarget toward the moving signature object). */
  setEnd(end: Float32Array): void {
    const attr = this.points.geometry.getAttribute('aEnd') as BufferAttribute;
    (attr.array as Float32Array).set(end);
    attr.needsUpdate = true;
  }

  dispose(): void {
    this.points.removeFromParent();
    this.points.geometry.dispose();
    this.points.material.dispose();
  }
}
