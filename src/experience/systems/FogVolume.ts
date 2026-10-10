/**
 * F-01 Volumetric Fog Volume System (doc 13 §4) — camera-attached layered curtain.
 * Several depth-separated noise planes give foreground/background fog ordering (doc 1 §3.4) and
 * act as the "travel gate" between worlds. Hidden entirely when the curtain is ~0 (no overdraw).
 */
import { Color, Mesh, PlaneGeometry, ShaderMaterial, type PerspectiveCamera } from 'three';
import type { GlobalUniforms } from '../shaders/uniforms';
import { GLOBALS, NOISE } from '../shaders/chunks';
import { DEPTH } from '../../tokens/tokens';

const DEPTHS = [2.2, 4, 7, 11, 17, 26];

export class FogVolume {
  private planes: Mesh<PlaneGeometry, ShaderMaterial>[] = [];
  private amount = 0;
  private color = new Color();

  constructor(
    private readonly camera: PerspectiveCamera,
    uniforms: GlobalUniforms,
    count: number,
  ) {
    const geo = new PlaneGeometry(1, 1);
    const n = Math.max(2, Math.min(DEPTHS.length, count));
    const depths = DEPTHS.slice(DEPTHS.length - n);
    depths.forEach((depth, i) => {
      const material = new ShaderMaterial({
        uniforms: {
          ...uniforms,
          uAmount: { value: 0 },
          uColor: { value: this.color },
          uLayer: { value: i / Math.max(1, n - 1) },
          uSeed: { value: i * 13.7 },
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
          uniform float uAmount;
          uniform vec3 uColor;
          uniform float uLayer;
          uniform float uSeed;
          varying vec2 vUv;
          void main() {
            vec2 p = (vUv - 0.5) * vec2(1.8, 1.0);
            float drift = uTime * (0.012 + uLayer * 0.01);
            float n = fbm3(vec3(p * (1.6 + uLayer), drift + uSeed));
            n = n * 0.5 + 0.5;
            // the curtain grows outward from the centre as it thickens (doc 2 §2 "fog grows outward like a curtain")
            float r = length(p);
            float grow = smoothstep(1.4, 0.0, r - uAmount * 1.6);
            float a = uAmount * mix(n * grow, 1.0, uAmount * uAmount);
            a *= mix(0.55, 1.0, uLayer);
            gl_FragColor = vec4(uColor * (0.85 + n * 0.3), clamp(a, 0.0, 1.0));
          }
        `,
        transparent: true,
        depthWrite: false,
        depthTest: false,
        fog: false,
      });
      const m = new Mesh(geo, material);
      m.position.set(0, 0, -depth);
      m.renderOrder = DEPTH.curtain + 10 - i;
      m.frustumCulled = false;
      m.visible = false;
      m.userData.depth = depth;
      this.planes.push(m);
      camera.add(m);
    });
  }

  /** Size planes to fill the frustum at their depth. */
  resize(): void {
    const cam = this.camera;
    for (const m of this.planes) {
      const d = m.userData.depth as number;
      const h = 2 * Math.tan((cam.fov * Math.PI) / 360) * d * 1.15;
      m.scale.set(h * cam.aspect, h, 1);
    }
  }

  set(amount: number, color: Color): void {
    this.amount = amount;
    this.color.copy(color);
    const visible = amount > 0.004;
    this.resize();
    this.planes.forEach((m, i) => {
      m.visible = visible;
      // far planes thicken first; near planes only at the heaviest dissolve (F3)
      const layerT = i / Math.max(1, this.planes.length - 1);
      const local = Math.min(1, Math.max(0, (amount - (1 - layerT) * 0.35) / (1 - (1 - layerT) * 0.35)));
      m.material.uniforms.uAmount.value = local;
    });
  }

  get value(): number {
    return this.amount;
  }

  dispose(): void {
    for (const m of this.planes) {
      m.removeFromParent();
      m.material.dispose();
    }
    this.planes[0]?.geometry.dispose();
    this.planes = [];
  }
}
