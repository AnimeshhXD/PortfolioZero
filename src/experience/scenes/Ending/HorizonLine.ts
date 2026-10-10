/**
 * The Next-Chapter Horizon — a single thin line of first light where the stone floor meets the sky,
 * behind the completed sculpture. It is the only "new" light in the ending: it gathers as the final
 * sentence resolves (resolution → anticipation, doc 2 §9) and then simply holds.
 *
 * One draw call: an open cylinder arc far behind the set (world-fixed, so the slow orbit reads as
 * travel around the sculpture), additive, depth-tested so the stone floor veils its lower half.
 * Not a god ray, not a sun — a horizon that has started to glow.
 */
import { AdditiveBlending, Color, CylinderGeometry, DoubleSide, Mesh, ShaderMaterial } from 'three';
import type { GlobalUniforms } from '../../shaders/uniforms';
import { GLOBALS, NOISE } from '../../shaders/chunks';

export interface HorizonLineOptions {
  radius: number;
  /** World y of the luminous line. */
  y: number;
  /** Azimuth (rad, three.js cylinder convention: 0 = +Z, π = −Z) the arc is centred on. */
  azimuth: number;
  /** Total arc length (rad). */
  arc: number;
  color: string;
  haloColor: string;
}

const HEIGHT = 26;

export class HorizonLine {
  readonly mesh: Mesh<CylinderGeometry, ShaderMaterial>;

  constructor(uniforms: GlobalUniforms, opts: HorizonLineOptions) {
    const geo = new CylinderGeometry(opts.radius, opts.radius, HEIGHT, 96, 1, true, opts.azimuth - opts.arc / 2, opts.arc);
    const material = new ShaderMaterial({
      uniforms: {
        ...uniforms,
        uColor: { value: new Color(opts.color) },
        uHalo: { value: new Color(opts.haloColor) },
        uIntensity: { value: 0 },
        uHeight: { value: HEIGHT },
        uArc: { value: opts.arc },
        uSpread: { value: 1 },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        ${GLOBALS}
        ${NOISE}
        uniform vec3 uColor;
        uniform vec3 uHalo;
        uniform float uIntensity;
        uniform float uHeight;
        uniform float uArc;
        uniform float uSpread;
        varying vec2 vUv;
        void main() {
          float y = (vUv.y - 0.5) * uHeight;
          // the line itself — razor thin, then a soft atmospheric halo that rises more than it falls
          float line = exp(-y * y / 0.05);
          float glow = exp(-y * y / 1.1) * 0.32;
          float halo = exp(-(y * y) / (y > 0.0 ? 30.0 : 6.0)) * 0.16;
          // the arc fades at both ends; brightest directly behind the sculpture
          float u = vUv.x;
          float ends = smoothstep(0.0, 0.25, u) * smoothstep(1.0, 0.75, u);
          // light gathers behind the sculpture and thins toward the frame edges
          float ang = (u - 0.5) * uArc;
          float width = mix(0.035, 0.26, uSpread);
          float centre = mix(0.02, 0.14, uSpread) + (1.0 - mix(0.02, 0.14, uSpread)) * exp(-ang * ang / width);
          // barely-visible atmospheric breathing along the line (no flicker)
          float air = 0.92 + 0.08 * snoise(vec3(u * 6.0, uTime * 0.015, 1.3));
          vec3 col = (uColor * (line + glow) + uHalo * halo) * ends * centre * air * uIntensity;
          float dither = (pzHash(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) - 0.5) / 255.0;
          gl_FragColor = vec4(col + dither, 1.0);
        }
      `,
      transparent: true,
      depthWrite: false,
      side: DoubleSide,
      blending: AdditiveBlending,
      fog: false,
    });
    this.mesh = new Mesh(geo, material);
    this.mesh.position.y = opts.y;
    this.mesh.frustumCulled = false;
    this.mesh.name = 'Ending:HorizonLine';
  }

  set intensity(v: number) {
    this.mesh.material.uniforms.uIntensity.value = v;
    this.mesh.visible = v > 0.002;
  }

  /** 0 = a soft gleam directly behind the sculpture · 1 = the line has drawn out across the horizon. */
  set spread(v: number) {
    this.mesh.material.uniforms.uSpread.value = v;
  }

  dispose(): void {
    this.mesh.removeFromParent();
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}
