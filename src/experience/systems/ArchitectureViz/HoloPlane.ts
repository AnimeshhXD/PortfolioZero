/**
 * IMG-01 Project Hero Screenshot Plane (doc 13 §7) — "massive, full-bleed planes, not card thumbnails"
 * (Law 31) that behave "like a hologram panel inside the world" (doc 2 §3).
 *
 * Source: a real screenshot URL (content.screenshot) when provided, otherwise procedural in-world
 * signage drawn by the scene on a canvas (resume facts only — never invented UI).
 * Reveal is a noise-threshold dissolve with a resolving edge, plus a light pass; edges feather into
 * fog so it never reads as a card.
 */
import {
  CanvasTexture,
  Color,
  DoubleSide,
  LinearFilter,
  Mesh,
  PlaneGeometry,
  SRGBColorSpace,
  ShaderMaterial,
  TextureLoader,
  type Texture,
} from 'three';
import type { GlobalUniforms } from '../../shaders/uniforms';
import { FOG, GLOBALS, NOISE } from '../../shaders/chunks';

export interface HoloPlaneOptions {
  width: number;
  height: number;
  /** Real screenshot (preferred when available). */
  imageUrl?: string;
  /** Procedural signage painter; canvas is sized `resolution` × (resolution·h/w). */
  draw?: (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
  resolution?: number;
  tint?: string | Color;
  /** Additive hologram (true) or solid image plane (false). Default true for drawn signage. */
  holographic?: boolean;
}

export class HoloPlane {
  readonly mesh: Mesh<PlaneGeometry, ShaderMaterial>;
  private texture: Texture | null = null;
  private canvas: HTMLCanvasElement | null = null;

  constructor(uniforms: GlobalUniforms, private readonly opts: HoloPlaneOptions) {
    const material = new ShaderMaterial({
      uniforms: {
        ...uniforms,
        uMap: { value: null },
        uHasMap: { value: 0 },
        uReveal: { value: 0 },
        uSweep: { value: -1 },
        uOpacity: { value: 1 },
        uTint: { value: new Color(opts.tint ?? '#bfe9ff') },
        uHolo: { value: opts.holographic ?? !opts.imageUrl ? 1 : 0 },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        varying float vDepth;
        void main() {
          vUv = uv;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vDepth = -mv.z;
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        ${GLOBALS}
        ${NOISE}
        ${FOG}
        uniform sampler2D uMap;
        uniform float uHasMap;
        uniform float uReveal;
        uniform float uSweep;
        uniform float uOpacity;
        uniform vec3 uTint;
        uniform float uHolo;
        varying vec2 vUv;
        varying float vDepth;
        void main() {
          vec4 tex = uHasMap > 0.5 ? texture2D(uMap, vUv) : vec4(0.0);
          // reveal: noise threshold dissolve, resolving edge glows briefly
          // directional resolve (left → right) with an organic, noise-perturbed front — never blotchy holes
          float n = fbm3(vec3(vUv * vec2(3.0, 2.0), 1.7)) * 0.5 + 0.5;
          float field = vUv.x * 0.72 + (1.0 - vUv.y) * 0.08 + n * 0.22;
          float t = uReveal * 1.2 - 0.06;
          float shown = smoothstep(field - 0.05, field + 0.05, t);
          float edge = (smoothstep(field - 0.03, field, t) - smoothstep(field, field + 0.03, t)) * (1.0 - smoothstep(0.85, 1.0, uReveal));
          // feathered borders dissolve into atmosphere (never a card)
          vec2 c = abs(vUv - 0.5);
          float feather = smoothstep(0.5, 0.43, c.x) * smoothstep(0.5, 0.4, c.y);
          // light pass
          float sweep = uSweep < 0.0 ? 0.0 : exp(-pow((vUv.x + vUv.y * 0.35 - uSweep * 1.5 + 0.1) / 0.06, 2.0)) * (1.0 - uReducedMotion);
          vec3 col = tex.rgb;
          float lum = dot(tex.rgb, vec3(0.299, 0.587, 0.114));
          col = mix(col, uTint * (0.25 + lum * 1.25), uHolo * 0.85);
          col += uTint * (edge * 0.45 + sweep * 0.6);
          float a = mix(1.0, max(tex.a, lum), uHolo) * shown * feather * uOpacity;
          a = max(a, edge * feather * 0.22 * uOpacity);
          col = mix(col, uFogColor, pzFogFactor(vDepth) * 0.9);
          if (a < 0.002) discard;
          gl_FragColor = vec4(col, a);
        }
      `,
      transparent: true,
      depthWrite: false,
      side: DoubleSide,
      fog: false,
    });
    this.mesh = new Mesh(new PlaneGeometry(opts.width, opts.height), material);
    this.mesh.frustumCulled = false;
    this.load();
  }

  private load(): void {
    const u = this.mesh.material.uniforms;
    if (this.opts.imageUrl) {
      new TextureLoader().load(this.opts.imageUrl, (tex) => {
        tex.colorSpace = SRGBColorSpace;
        tex.minFilter = LinearFilter;
        this.texture = tex;
        u.uMap.value = tex;
        u.uHasMap.value = 1;
      });
      return;
    }
    if (this.opts.draw) this.redraw();
  }

  /** Repaint procedural signage (e.g. after fonts load). */
  redraw(): void {
    if (!this.opts.draw) return;
    const res = this.opts.resolution ?? 1024;
    const w = res;
    const h = Math.round((res * this.opts.height) / this.opts.width);
    if (!this.canvas) this.canvas = document.createElement('canvas');
    this.canvas.width = w;
    this.canvas.height = h;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, w, h);
    this.opts.draw(ctx, w, h);
    if (!this.texture) {
      const tex = new CanvasTexture(this.canvas);
      tex.colorSpace = SRGBColorSpace;
      tex.minFilter = LinearFilter;
      this.texture = tex;
      const u = this.mesh.material.uniforms;
      u.uMap.value = tex;
      u.uHasMap.value = 1;
    } else {
      this.texture.needsUpdate = true;
    }
  }

  set reveal(v: number) {
    this.mesh.material.uniforms.uReveal.value = v;
    this.mesh.visible = v > 0.001 && (this.mesh.material.uniforms.uOpacity.value as number) > 0.001;
  }

  set sweep(v: number) {
    this.mesh.material.uniforms.uSweep.value = v;
  }

  set opacity(v: number) {
    this.mesh.material.uniforms.uOpacity.value = v;
    this.mesh.visible = v > 0.001 && (this.mesh.material.uniforms.uReveal.value as number) > 0.001;
  }

  dispose(): void {
    this.mesh.removeFromParent();
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
    this.texture?.dispose();
    this.canvas = null;
  }
}
