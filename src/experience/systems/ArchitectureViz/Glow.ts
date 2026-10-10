/**
 * Light-as-material primitives (doc 1 §3.7): soft glows (practicals, nodes, threshold lights, distant
 * people-points) and volumetric beams (scanning key, protocol beams, rare god-ray shafts).
 * Bloom stays restrained: these are soft falloffs, never hard neon.
 */
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  ConeGeometry,
  DoubleSide,
  Mesh,
  PlaneGeometry,
  Points,
  ShaderMaterial,
  type Vector3,
} from 'three';
import type { GlobalUniforms } from '../../shaders/uniforms';
import { FOG, GLOBALS } from '../../shaders/chunks';

/** A camera-facing soft glow (billboard quad). Size is in world units. */
export class Glow {
  readonly mesh: Mesh<PlaneGeometry, ShaderMaterial>;

  constructor(uniforms: GlobalUniforms, opts: { size?: number; color?: string | Color; intensity?: number; falloff?: number } = {}) {
    const material = new ShaderMaterial({
      uniforms: {
        ...uniforms,
        uColor: { value: new Color(opts.color ?? '#9fb4ff') },
        uIntensity: { value: opts.intensity ?? 1 },
        uFalloff: { value: opts.falloff ?? 2.4 },
        uSize: { value: opts.size ?? 1 },
      },
      vertexShader: /* glsl */ `
        uniform float uSize;
        varying vec2 vUv;
        varying float vDepth;
        void main() {
          vUv = uv;
          vec4 center = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
          float s = length(vec3(modelMatrix[0].x, modelMatrix[0].y, modelMatrix[0].z));
          center.xy += position.xy * uSize * s;
          vDepth = -center.z;
          gl_Position = projectionMatrix * center;
        }
      `,
      fragmentShader: /* glsl */ `
        ${GLOBALS}
        ${FOG}
        uniform vec3 uColor;
        uniform float uIntensity;
        uniform float uFalloff;
        varying vec2 vUv;
        varying float vDepth;
        void main() {
          float d = length(vUv - 0.5) * 2.0;
          float g = exp(-d * d * uFalloff) * (1.0 - smoothstep(0.85, 1.0, d));
          float a = g * uIntensity * pzFogFade(vDepth * 0.8);
          if (a < 0.002) discard;
          gl_FragColor = vec4(uColor, a);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      fog: false,
    });
    this.mesh = new Mesh(new PlaneGeometry(1, 1), material);
    this.mesh.frustumCulled = false;
  }

  set intensity(v: number) {
    this.mesh.material.uniforms.uIntensity.value = v;
    this.mesh.visible = v > 0.002;
  }

  get color(): Color {
    return this.mesh.material.uniforms.uColor.value as Color;
  }

  dispose(): void {
    this.mesh.removeFromParent();
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}

/** Many soft glows in one draw call (constellations, distant points of light, lattice nodes). */
export class GlowField {
  readonly points: Points<BufferGeometry, ShaderMaterial>;
  readonly brightness: BufferAttribute;

  constructor(uniforms: GlobalUniforms, positions: Float32Array, opts: { size?: number; color?: string | Color; colorB?: string | Color; tint?: Float32Array } = {}) {
    const n = positions.length / 3;
    const geo = new BufferGeometry();
    geo.setAttribute('position', new BufferAttribute(positions, 3));
    this.brightness = new BufferAttribute(new Float32Array(n).fill(1), 1);
    geo.setAttribute('aBright', this.brightness);
    geo.setAttribute('aTint', new BufferAttribute(opts.tint ?? new Float32Array(n), 1));
    const material = new ShaderMaterial({
      uniforms: {
        ...uniforms,
        uColor: { value: new Color(opts.color ?? '#ffe3c6') },
        uColorB: { value: new Color(opts.colorB ?? opts.color ?? '#ffe3c6') },
        uSize: { value: opts.size ?? 0.12 },
        uIntensity: { value: 1 },
      },
      vertexShader: /* glsl */ `
        ${GLOBALS}
        attribute float aBright;
        attribute float aTint;
        uniform float uSize;
        varying float vB;
        varying float vT;
        varying float vDepth;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vDepth = -mv.z;
          gl_Position = projectionMatrix * mv;
          vB = aBright;
          vT = aTint;
          gl_PointSize = clamp(uSize * (0.6 + aBright * 0.8) * uPixelRatio * uViewportHeight / max(vDepth, 0.3), 0.0, 128.0 * uPixelRatio);
        }
      `,
      fragmentShader: /* glsl */ `
        ${GLOBALS}
        ${FOG}
        uniform vec3 uColor;
        uniform vec3 uColorB;
        uniform float uIntensity;
        varying float vB;
        varying float vT;
        varying float vDepth;
        void main() {
          float d = length(gl_PointCoord - 0.5) * 2.0;
          float g = exp(-d * d * 4.0) * (1.0 - smoothstep(0.8, 1.0, d));
          float a = g * vB * uIntensity * pzFogFade(vDepth * 0.6);
          if (a < 0.002) discard;
          gl_FragColor = vec4(mix(uColor, uColorB, vT) * (1.0 + vB * 0.6), a);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      fog: false,
    });
    this.points = new Points(geo, material);
    this.points.frustumCulled = false;
  }

  set intensity(v: number) {
    this.points.material.uniforms.uIntensity.value = v;
    this.points.visible = v > 0.002;
  }

  /** Per-point brightness 0..1 — call commit() after writes. */
  setBrightness(i: number, v: number): void {
    this.brightness.setX(i, v);
  }

  commit(): void {
    this.brightness.needsUpdate = true;
  }

  dispose(): void {
    this.points.removeFromParent();
    this.points.geometry.dispose();
    this.points.material.dispose();
  }
}

/**
 * Volumetric light beam / shaft (scanning key, protocol beams, threshold volumes, rare god rays).
 * Apex at the object origin, opening along -Y by default; orient with lookAt/rotation.
 */
export class LightBeam {
  readonly mesh: Mesh<ConeGeometry, ShaderMaterial>;

  constructor(uniforms: GlobalUniforms, opts: { length?: number; radius?: number; color?: string | Color; intensity?: number } = {}) {
    const length = opts.length ?? 12;
    const geo = new ConeGeometry(opts.radius ?? 2, length, 32, 1, true);
    geo.translate(0, -length / 2, 0);
    const material = new ShaderMaterial({
      uniforms: {
        ...uniforms,
        uColor: { value: new Color(opts.color ?? '#cfe6ff') },
        uIntensity: { value: opts.intensity ?? 0.5 },
        uLength: { value: length },
      },
      vertexShader: /* glsl */ `
        varying float vAlong;
        varying vec3 vN;
        varying vec3 vV;
        varying float vDepth;
        uniform float uLength;
        void main() {
          vAlong = clamp(-position.y / uLength, 0.0, 1.0);
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vN = normalize(normalMatrix * normal);
          vV = normalize(-mv.xyz);
          vDepth = -mv.z;
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        ${GLOBALS}
        ${FOG}
        uniform vec3 uColor;
        uniform float uIntensity;
        varying float vAlong;
        varying vec3 vN;
        varying vec3 vV;
        varying float vDepth;
        void main() {
          float edge = pow(abs(dot(normalize(vN), normalize(vV))), 1.8);
          float along = smoothstep(0.0, 0.08, vAlong) * (1.0 - smoothstep(0.55, 1.0, vAlong));
          float a = edge * along * uIntensity * pzFogFade(vDepth * 0.5);
          if (a < 0.002) discard;
          gl_FragColor = vec4(uColor, a);
        }
      `,
      transparent: true,
      depthWrite: false,
      side: DoubleSide,
      blending: AdditiveBlending,
      fog: false,
    });
    this.mesh = new Mesh(geo, material);
    this.mesh.frustumCulled = false;
  }

  set intensity(v: number) {
    this.mesh.material.uniforms.uIntensity.value = v;
    this.mesh.visible = v > 0.002;
  }

  /** Point the beam (apex stays at its position) toward a world target. */
  aim(target: Vector3): void {
    this.mesh.lookAt(target);
    this.mesh.rotateX(-Math.PI / 2);
  }

  dispose(): void {
    this.mesh.removeFromParent();
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}
