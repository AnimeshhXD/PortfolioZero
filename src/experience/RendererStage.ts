/**
 * RendererStage — WebGL canvas, colour pipeline, DPR policy, resize (doc 9 §4 RendererStage).
 */
import { ACESFilmicToneMapping, SRGBColorSpace, WebGLRenderer } from 'three';
import type { QualityProfile } from './orchestration/QualityDirector';

export function createRenderer(canvas: HTMLCanvasElement): WebGLRenderer {
  const renderer = new WebGLRenderer({
    canvas,
    antialias: false,
    alpha: false,
    powerPreference: 'high-performance',
    stencil: false,
    depth: true,
  });
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.setClearColor(0x07080c, 1);
  return renderer;
}

export function pixelRatioFor(quality: QualityProfile): number {
  return Math.min(window.devicePixelRatio || 1, quality.dprCap);
}

export { supportsWebGL2 } from './capabilities';
