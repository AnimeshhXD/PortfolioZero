/**
 * GlyphDust — "text can dissolve into particles / be absorbed by signature object glow" (doc 1 §6.7).
 *
 * When a TextBlock begins to dissolve, its glyphs are rasterised (same font, same positions) and each
 * opaque pixel cluster becomes a WebGL point placed in depth in front of the camera. As the DOM glyph
 * fades into ash, its particles take over with the SAME stagger, then drift into the signature object
 * (absorb) or rise and scatter (drift). Fully progress-driven → scrubbing back reverses it.
 */
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  Points,
  ShaderMaterial,
  Vector3,
  type PerspectiveCamera,
  type Scene,
} from 'three';
import type { TextBlock } from '../../ui/CinematicTextLayer';
import type { GlobalUniforms } from '../../shaders/uniforms';
import { EASE_GLSL, FOG, GLOBALS, NOISE, POINTS_FRAG, POINTS_VERT } from '../../shaders/chunks';
import type { QualityProfile } from '../../orchestration/QualityDirector';
import { rng } from '../../../utils/rng';
import { DEPTH } from '../../../tokens/tokens';

export interface GlyphDustOptions {
  /** Accent the dust warms into as it travels. */
  color?: string | Color;
  /** 'absorb' → flows into `target` (signature); 'drift' → rises and disperses in place. */
  mode?: 'absorb' | 'drift';
  /** Max points (scaled by quality tier). Default 2600. */
  maxPoints?: number;
  /** Distance in front of the camera where the type is "imagined" in the world. Default 7. */
  depth?: number;
}

export interface GlyphDust {
  /** dissolve 0..1 (pass the same value you give the TextBlock); target = world-space attractor. */
  update(dissolve: number, target?: Vector3): void;
  dispose(): void;
}

const _ray = new Vector3();
const _fwd = new Vector3();

class GlyphDustImpl implements GlyphDust {
  private points: Points<BufferGeometry, ShaderMaterial> | null = null;
  private captured = false;
  private disposed = false;
  private readonly color: Color;

  constructor(
    private readonly sys: GlyphDustSystem,
    private readonly block: TextBlock,
    private readonly opts: GlyphDustOptions,
  ) {
    this.color = new Color(opts.color ?? '#cfd9ff');
  }

  update(dissolve: number, target?: Vector3): void {
    if (this.disposed) return;
    if (dissolve <= 0.0005) {
      // rewound — release so the next dissolve recaptures the current layout
      if (this.captured) this.release();
      return;
    }
    if (!this.captured) this.capture();
    if (!this.points) return;
    const u = this.points.material.uniforms;
    u.uDissolve.value = dissolve;
    if (target) (u.uTarget.value as Vector3).copy(target);
    this.points.visible = dissolve < 0.9995;
  }

  private capture(): void {
    this.captured = true;
    const glyphs = this.block.glyphs();
    if (glyphs.length === 0) return;
    // Union rect of glyph boxes.
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    const rects = glyphs.map((g) => {
      const r = g.el.getBoundingClientRect();
      x0 = Math.min(x0, r.left);
      y0 = Math.min(y0, r.top);
      x1 = Math.max(x1, r.right);
      y1 = Math.max(y1, r.bottom);
      return r;
    });
    if (!isFinite(x0) || x1 - x0 < 2 || y1 - y0 < 2) return;
    const pad = 8;
    x0 -= pad;
    y0 -= pad;
    x1 += pad;
    y1 += pad;
    const w = Math.ceil(x1 - x0);
    const h = Math.ceil(y1 - y0);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    ctx.fillStyle = '#fff';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    const orderAt = new Float32Array(w * h).fill(-1);
    glyphs.forEach((g, i) => {
      const cs = getComputedStyle(g.el);
      ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      const r = rects[i];
      const cx = r.left + r.width / 2 - x0;
      const cy = r.top + r.height / 2 - y0;
      ctx.fillText(g.char, cx, cy);
      // remember glyph order per pixel column band (cheap: fill the glyph box)
      const bx0 = Math.max(0, Math.floor(r.left - x0));
      const bx1 = Math.min(w, Math.ceil(r.right - x0));
      const by0 = Math.max(0, Math.floor(r.top - y0));
      const by1 = Math.min(h, Math.ceil(r.bottom - y0));
      for (let y = by0; y < by1; y += 2) for (let x = bx0; x < bx1; x += 2) orderAt[y * w + x] = g.order;
    });
    const data = ctx.getImageData(0, 0, w, h).data;
    const max = this.sys.quality.count(this.opts.maxPoints ?? 2600);
    // Sampling stride adapts to glyph area so big monuments don't exceed the budget.
    let stride = 2;
    let candidates: number[];
    for (;;) {
      candidates = [];
      for (let y = 0; y < h; y += stride) {
        for (let x = 0; x < w; x += stride) {
          if (data[(y * w + x) * 4 + 3] > 110) candidates.push(x, y);
        }
      }
      if (candidates.length / 2 <= max * 1.6 || stride >= 10) break;
      stride += 1;
    }
    const n = Math.min(max, candidates.length / 2);
    if (n < 1) return;
    // deterministic subset
    const r = rng(this.block.text.length * 131 + w);
    const picks = new Uint32Array(candidates.length / 2).map((_, i) => i);
    for (let i = picks.length - 1; i > 0; i--) {
      const j = Math.floor(r.next() * (i + 1));
      const t = picks[i];
      picks[i] = picks[j];
      picks[j] = t;
    }

    const cam = this.sys.camera;
    cam.updateMatrixWorld();
    cam.getWorldDirection(_fwd);
    const depth = this.opts.depth ?? 7;
    const pos = new Float32Array(n * 3);
    const order = new Float32Array(n);
    const seeds = new Float32Array(n);
    for (let k = 0; k < n; k++) {
      const pi = picks[k];
      const px = candidates[pi * 2];
      const py = candidates[pi * 2 + 1];
      const sx = px + x0;
      const sy = py + y0;
      _ray.set((sx / innerWidth) * 2 - 1, -((sy / innerHeight) * 2 - 1), 0.5).unproject(cam).sub(cam.position).normalize();
      const dist = depth / Math.max(0.2, _ray.dot(_fwd));
      pos[k * 3] = cam.position.x + _ray.x * dist;
      pos[k * 3 + 1] = cam.position.y + _ray.y * dist;
      pos[k * 3 + 2] = cam.position.z + _ray.z * dist;
      const o = orderAt[(py - (py % 2)) * w + (px - (px % 2))];
      order[k] = o >= 0 ? o : px / w;
      seeds[k] = r.next();
    }
    // world size of one sampled pixel cluster at `depth`
    const pixelWorld = (2 * Math.tan((cam.fov * Math.PI) / 360) * depth) / innerHeight;
    const size = pixelWorld * stride * 1.15;

    const geo = new BufferGeometry();
    geo.setAttribute('position', new BufferAttribute(pos, 3));
    geo.setAttribute('aOrder', new BufferAttribute(order, 1));
    geo.setAttribute('aSeed', new BufferAttribute(seeds, 1));
    const stagger = Number(this.block.el.style.getPropertyValue('--stg') || 0.5);
    const material = new ShaderMaterial({
      uniforms: {
        ...this.sys.uniforms,
        uDissolve: { value: 0 },
        uStagger: { value: stagger },
        uTarget: { value: new Vector3() },
        uAbsorb: { value: this.opts.mode === 'drift' ? 0 : 1 },
        uInk: { value: new Color('#e8ebf2') },
        uAccent: { value: this.color },
        uSize: { value: size },
      },
      vertexShader: /* glsl */ `
        ${GLOBALS}
        ${NOISE}
        ${EASE_GLSL}
        ${POINTS_VERT}
        attribute float aOrder;
        attribute float aSeed;
        uniform float uDissolve;
        uniform float uStagger;
        uniform vec3 uTarget;
        uniform float uAbsorb;
        uniform float uSize;
        varying float vLocal;
        varying float vDepth;
        void main() {
          float local = clamp(uDissolve * (1.0 + uStagger) - aOrder * uStagger, 0.0, 1.0);
          vLocal = local;
          float rm = 1.0 - uReducedMotion * 0.6;
          // phase 1: lift off the glyph as ash
          vec3 drift = curlish(position * 0.6 + aSeed * 9.0 + uTime * 0.05) * 0.55 * rm + vec3(0.0, 0.35, 0.0);
          vec3 p = position + drift * pzEaseOut(min(local * 2.0, 1.0)) * (0.5 + aSeed);
          // phase 2: absorbed into the signature lens (or keep rising)
          float travel = pzEaseInOut(clamp((local - 0.25) / 0.75, 0.0, 1.0));
          vec3 spiral = vec3(cos(aSeed * 40.0 + local * 6.0), sin(aSeed * 23.0 + local * 4.0), sin(aSeed * 31.0 + local * 5.0)) * 0.5 * (1.0 - travel);
          vec3 absorbed = mix(p, uTarget + spiral, travel);
          vec3 rising = p + vec3(0.0, 1.2, -0.6) * travel + curlish(p * 0.3 + uTime * 0.03) * travel * 0.8 * rm;
          p = mix(rising, absorbed, uAbsorb);
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          vDepth = -mv.z;
          gl_Position = projectionMatrix * mv;
          gl_PointSize = pzPointSize(uSize * (0.75 + aSeed * 0.6) * mix(1.0, 0.55, travel), vDepth);
        }
      `,
      fragmentShader: /* glsl */ `
        ${GLOBALS}
        ${FOG}
        ${POINTS_FRAG}
        uniform vec3 uInk;
        uniform vec3 uAccent;
        varying float vLocal;
        varying float vDepth;
        void main() {
          // appear exactly as the DOM glyph fades, vanish on arrival
          float a = smoothstep(0.0, 0.12, vLocal) * (1.0 - smoothstep(0.82, 1.0, vLocal));
          a *= pzDisc() * pzFogFade(vDepth * 0.5);
          if (a < 0.003) discard;
          vec3 col = mix(uInk, uAccent * 1.6, smoothstep(0.1, 0.7, vLocal));
          gl_FragColor = vec4(col, a);
        }
      `,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: AdditiveBlending,
      fog: false,
    });
    const pts = new Points(geo, material);
    pts.frustumCulled = false;
    pts.renderOrder = DEPTH.lens + 5;
    pts.name = `GlyphDust:${this.block.text.slice(0, 16)}`;
    this.points = pts;
    this.sys.world.add(pts);
  }

  private release(): void {
    this.captured = false;
    if (this.points) {
      this.points.removeFromParent();
      this.points.geometry.dispose();
      this.points.material.dispose();
      this.points = null;
    }
  }

  dispose(): void {
    this.release();
    this.disposed = true;
    this.sys.forget(this);
  }
}

export class GlyphDustSystem {
  private active = new Set<GlyphDustImpl>();

  constructor(
    readonly world: Scene,
    readonly camera: PerspectiveCamera,
    readonly uniforms: GlobalUniforms,
    readonly quality: QualityProfile,
  ) {}

  create(block: TextBlock, opts: GlyphDustOptions = {}): GlyphDust {
    const d = new GlyphDustImpl(this, block, opts);
    this.active.add(d);
    return d;
  }

  forget(d: GlyphDustImpl): void {
    this.active.delete(d);
  }
}
