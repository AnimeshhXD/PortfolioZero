/**
 * QualityDirector — device class detection + adaptive degradation (doc 8 §1, §3, §7).
 * "Performance over spectacle" (doc 17 §4): we only ever step DOWN at runtime, never oscillate.
 */
import type { WebGLRenderer } from 'three';
import type { QualityTier } from '../../types/scene';

export interface QualityProfile {
  readonly tier: QualityTier;
  readonly initialTier: QualityTier;
  readonly dprCap: number;
  readonly bloom: 'full' | 'half' | 'off';
  /** Ambient mote pool size. */
  readonly motes: number;
  /** Fog curtain planes. */
  readonly fogPlanes: number;
  /** Per-glyph blur emergence (else block-level). */
  readonly perCharBlur: boolean;
  readonly isMobile: boolean;
  /** Scale a particle/instance count for the current tier (high 1, medium .6, low .35). */
  count(n: number): number;
  onChange(cb: (tier: QualityTier) => void): () => void;
}

const SPEC: Record<QualityTier, { dprCap: number; bloom: 'full' | 'half' | 'off'; motes: number; fogPlanes: number; perCharBlur: boolean; factor: number }> = {
  high: { dprCap: 1.75, bloom: 'full', motes: 2400, fogPlanes: 6, perCharBlur: true, factor: 1 },
  medium: { dprCap: 1.3, bloom: 'half', motes: 1500, fogPlanes: 4, perCharBlur: true, factor: 0.6 },
  low: { dprCap: 1, bloom: 'off', motes: 700, fogPlanes: 3, perCharBlur: false, factor: 0.35 },
};

const ORDER: QualityTier[] = ['high', 'medium', 'low'];

export class QualityDirector implements QualityProfile {
  tier: QualityTier;
  readonly initialTier: QualityTier;
  readonly isMobile: boolean;
  private listeners = new Set<(tier: QualityTier) => void>();
  private acc = 0;
  private frames = 0;
  private slowWindows = 0;
  private warmup = 3; // seconds ignored after load / tier change (shader compiles, asset builds)
  private locked: boolean;

  constructor(renderer: WebGLRenderer, forced?: QualityTier | null) {
    this.isMobile =
      matchMedia('(pointer: coarse)').matches ||
      /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) ||
      Math.min(screen.width, screen.height) < 600;
    this.locked = !!forced;
    this.tier = forced ?? QualityDirector.detect(renderer, this.isMobile);
    this.initialTier = this.tier;
  }

  static detect(renderer: WebGLRenderer, isMobile: boolean): QualityTier {
    if (isMobile) return 'low';
    const gl = renderer.getContext();
    let gpu: string;
    try {
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      gpu = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : '';
    } catch {
      gpu = '';
    }
    if (/swiftshader|llvmpipe|software|basic render/i.test(gpu)) return 'low';
    if (/intel|uhd|iris|mali|adreno|powervr|apple m1|apple gpu/i.test(gpu) && !/nvidia|geforce|radeon|rtx|gtx|apple m[2-9]/i.test(gpu)) {
      return 'medium';
    }
    const cores = navigator.hardwareConcurrency ?? 4;
    return cores <= 4 ? 'medium' : 'high';
  }

  get dprCap(): number {
    return SPEC[this.tier].dprCap;
  }
  get bloom(): 'full' | 'half' | 'off' {
    return SPEC[this.tier].bloom;
  }
  get motes(): number {
    return SPEC[this.tier].motes;
  }
  get fogPlanes(): number {
    return SPEC[this.tier].fogPlanes;
  }
  get perCharBlur(): boolean {
    return SPEC[this.tier].perCharBlur;
  }

  count(n: number): number {
    return Math.max(1, Math.round(n * SPEC[this.tier].factor));
  }

  onChange(cb: (tier: QualityTier) => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  /** Feed frame times. Steps down after 3 consecutive 2s windows averaging < ~48fps. */
  sample(dt: number): void {
    if (this.locked) return;
    if (this.warmup > 0) {
      this.warmup -= dt;
      return;
    }
    this.acc += dt;
    this.frames++;
    if (this.acc < 2) return;
    const avg = this.acc / this.frames;
    this.acc = 0;
    this.frames = 0;
    if (avg > 1 / 48) this.slowWindows++;
    else this.slowWindows = 0;
    if (this.slowWindows >= 3) {
      this.slowWindows = 0;
      this.stepDown();
    }
  }

  /** Called when the page is hidden/resumed so stalls don't count as slow frames. */
  resetWindow(): void {
    this.acc = 0;
    this.frames = 0;
    this.warmup = 1.5;
  }

  private stepDown(): void {
    const i = ORDER.indexOf(this.tier);
    if (i >= ORDER.length - 1) return;
    this.tier = ORDER[i + 1];
    this.warmup = 3;
    for (const cb of this.listeners) cb(this.tier);
  }
}
