/**
 * P-01 Ambient Micro-Mote Particle Cloud (doc 13 §3).
 * Volumetric motes in a box that wraps around the camera (infinite field, single draw call).
 * Depth-respecting (never 2D overlays — Law 8), bokeh DOF from the shared focus uniforms,
 * subtle pointer-light response (doc 1 §3.5: "intensity shifts"), fog-faded.
 */
import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, Points, ShaderMaterial, Vector3 } from 'three';
import type { ParticleState } from '../../../types/scene';
import type { GlobalUniforms } from '../../shaders/uniforms';
import { FOG, GLOBALS, NOISE, POINTS_FRAG, POINTS_VERT } from '../../shaders/chunks';
import { rng } from '../../../utils/rng';
import { DEPTH } from '../../../tokens/tokens';

const BOX = new Vector3(46, 28, 64);

export class AmbientMotes {
  readonly points: Points<BufferGeometry, ShaderMaterial>;
  private offset = new Vector3();

  constructor(uniforms: GlobalUniforms, count: number) {
    const r = rng(0x5eed01);
    const pos = new Float32Array(count * 3);
    const seed = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (r.next() - 0.5) * BOX.x;
      pos[i * 3 + 1] = (r.next() - 0.5) * BOX.y;
      pos[i * 3 + 2] = (r.next() - 0.5) * BOX.z;
      seed[i] = r.next();
    }
    const geo = new BufferGeometry();
    geo.setAttribute('position', new BufferAttribute(pos, 3));
    geo.setAttribute('aSeed', new BufferAttribute(seed, 1));

    const material = new ShaderMaterial({
      uniforms: {
        ...uniforms,
        uBox: { value: BOX },
        uOffset: { value: this.offset },
        uDensity: { value: 0.3 },
        uColor: { value: new Color('#9fb4ff') },
        uSize: { value: 1 },
        uIntensity: { value: 1 },
        uSpeed: { value: 0.2 },
      },
      vertexShader: /* glsl */ `
        ${GLOBALS}
        ${NOISE}
        ${POINTS_VERT}
        attribute float aSeed;
        uniform vec3 uBox;
        uniform vec3 uOffset;
        uniform float uDensity;
        uniform float uSize;
        uniform float uSpeed;
        varying float vAlpha;
        varying float vDepth;
        varying float vLit;
        void main() {
          // wrap the field around the camera (offset accumulates drift on the CPU)
          vec3 p = position + uOffset;
          vec3 rel = mod(p - uCameraPos + uBox * 0.5, uBox) - uBox * 0.5;
          vec3 world = uCameraPos + rel;
          // slow organic swirl
          float t = uTime * 0.05 * (0.4 + uSpeed);
          world += curlish(world * 0.08 + vec3(aSeed * 10.0, t, -t)) * 0.35 * (1.0 - uReducedMotion * 0.8);
          // pointer: motes near the light anchor drift gently away from it
          vec3 toP = world - uPointerWorld;
          float pd = length(toP);
          float near = exp(-pd * pd * 0.04) * uPointerInfluence;
          world += normalize(toP + 1e-4) * near * 0.6 * (1.0 - uReducedMotion);
          vLit = near;
          vec4 mv = viewMatrix * vec4(world, 1.0);
          float depth = -mv.z;
          vDepth = depth;
          gl_Position = projectionMatrix * mv;
          float visible = step(aSeed, uDensity);
          float edge = smoothstep(0.0, 0.18, 1.0 - max(max(abs(rel.x) / (uBox.x * 0.5), abs(rel.y) / (uBox.y * 0.5)), abs(rel.z) / (uBox.z * 0.5)));
          float nearFade = smoothstep(0.6, 2.2, depth);
          float twinkle = 0.75 + 0.25 * sin(uTime * (0.4 + aSeed * 0.9) + aSeed * 40.0);
          vAlpha = visible * edge * nearFade * twinkle;
          gl_PointSize = pzPointSize(0.028 * uSize * (0.55 + aSeed * 0.9), depth) * visible;
        }
      `,
      fragmentShader: /* glsl */ `
        ${GLOBALS}
        ${FOG}
        ${POINTS_FRAG}
        uniform vec3 uColor;
        uniform float uIntensity;
        varying float vAlpha;
        varying float vDepth;
        varying float vLit;
        void main() {
          float a = pzDisc() * vAlpha * pzFogFade(vDepth * 0.7);
          if (a < 0.003) discard;
          vec3 col = uColor * (0.55 + vLit * 0.9) * uIntensity;
          gl_FragColor = vec4(col, a);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      fog: false,
    });
    this.points = new Points(geo, material);
    this.points.name = 'AmbientMotes';
    this.points.frustumCulled = false;
    this.points.renderOrder = DEPTH.front;
  }

  apply(state: ParticleState, dt: number, reducedMotion: boolean): void {
    const u = this.points.material.uniforms;
    u.uDensity.value = state.density;
    (u.uColor.value as Color).copy(state.color);
    u.uSize.value = state.size;
    u.uIntensity.value = state.intensity;
    u.uSpeed.value = state.speed;
    // Base drift: a gentle fall + lateral float; flow adds passage streaming (collapse transitions).
    const k = reducedMotion ? 0.35 : 1;
    this.offset.x += (state.flow.x + 0.05 * state.speed) * dt * k;
    this.offset.y += (state.flow.y - 0.12 * state.speed) * dt * k;
    this.offset.z += (state.flow.z + 0.03 * state.speed) * dt * k;
  }

  dispose(): void {
    this.points.geometry.dispose();
    this.points.material.dispose();
  }
}
