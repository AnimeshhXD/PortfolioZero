/**
 * S-01 Sky Gradient Layer (doc 13 §4): gradient sky + barely-visible light motion + rare god rays.
 * Follows the camera so it reads as infinitely far.
 */
import { BackSide, Mesh, ShaderMaterial, SphereGeometry, type Camera } from 'three';
import type { SkyState } from '../../types/scene';
import type { GlobalUniforms } from '../shaders/uniforms';
import { GLOBALS, NOISE } from '../shaders/chunks';
import { DEPTH } from '../../tokens/tokens';

export class Sky {
  readonly mesh: Mesh<SphereGeometry, ShaderMaterial>;

  constructor(uniforms: GlobalUniforms) {
    const material = new ShaderMaterial({
      uniforms: {
        ...uniforms,
        uTop: { value: null },
        uHorizon: { value: null },
        uBottom: { value: null },
        uRays: { value: 0 },
        uRayColor: { value: null },
        uRayDir: { value: null },
        uIntensity: { value: 1 },
      },
      vertexShader: /* glsl */ `
        varying vec3 vDir;
        void main() {
          vDir = normalize(position);
          vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          gl_Position = p.xyww;
        }
      `,
      fragmentShader: /* glsl */ `
        ${GLOBALS}
        ${NOISE}
        uniform vec3 uTop;
        uniform vec3 uHorizon;
        uniform vec3 uBottom;
        uniform float uRays;
        uniform vec3 uRayColor;
        uniform vec3 uRayDir;
        uniform float uIntensity;
        varying vec3 vDir;
        void main() {
          vec3 d = normalize(vDir);
          float h = d.y;
          vec3 col = mix(uHorizon, uTop, smoothstep(0.0, 0.75, h));
          col = mix(col, uBottom, smoothstep(0.0, -0.6, h));
          // slow atmospheric drift — "barely visible light motion"
          float n = fbm3(d * 2.2 + vec3(0.0, uTime * 0.006, uTime * 0.004));
          col *= 1.0 + n * 0.035;
          // god rays: angular streaks radiating from uRayDir (rare, meaningful)
          if (uRays > 0.001) {
            vec3 rd = normalize(uRayDir);
            float c = max(dot(d, rd), 0.0);
            vec3 side = normalize(cross(rd, vec3(0.0, 1.0, 0.0)) + 1e-4);
            vec3 up2 = cross(side, rd);
            float ang = atan(dot(d, up2), dot(d, side));
            float streaks = 0.55 + 0.45 * snoise(vec3(ang * 7.0, uTime * 0.02, 0.0));
            float glow = pow(c, 18.0) * 0.9 + pow(c, 4.0) * 0.35 * streaks;
            col += uRayColor * glow * uRays;
          }
          // dither to avoid banding on deep gradients
          float dither = (pzHash(dot(gl_FragCoord.xy, vec2(12.9898, 78.233)) + uTime) - 0.5) / 255.0;
          gl_FragColor = vec4(col * uIntensity + dither, 1.0);
        }
      `,
      side: BackSide,
      depthWrite: false,
      fog: false,
    });
    this.mesh = new Mesh(new SphereGeometry(1000, 48, 24), material);
    this.mesh.name = 'Sky';
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = DEPTH.back;
  }

  apply(state: SkyState, camera: Camera): void {
    const u = this.mesh.material.uniforms;
    u.uTop.value = state.top;
    u.uHorizon.value = state.horizon;
    u.uBottom.value = state.bottom;
    u.uRays.value = state.rays;
    u.uRayColor.value = state.rayColor;
    u.uRayDir.value = state.rayDirection;
    u.uIntensity.value = state.intensity;
    this.mesh.position.copy(camera.position);
  }
}
