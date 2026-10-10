/**
 * Post-processing (doc 8 §2.5, doc 9 §8.2): "Bloom minimal and controlled" · "Avoid stacking multiple
 * expensive post passes". Render → UnrealBloom (half-res) → Output (ACES + sRGB) → Grade
 * (vignette, film grain, lifted blacks so ink never sits on pure #000 — doc 1 §5.7).
 */
import { HalfFloatType, Vector2, WebGLRenderTarget, type PerspectiveCamera, type Scene, type WebGLRenderer } from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import type { PostState } from '../../../types/scene';
import type { QualityProfile } from '../../orchestration/QualityDirector';

const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uVignette: { value: 0.55 },
    uGrain: { value: 0.035 },
    uTime: { value: 0 },
    uLift: { value: [0.012, 0.013, 0.02] },
    uAspect: { value: 1.6 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uVignette;
    uniform float uGrain;
    uniform float uTime;
    uniform vec3 uLift;
    uniform float uAspect;
    varying vec2 vUv;
    float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main() {
      vec3 col = texture2D(tDiffuse, vUv).rgb;
      vec2 c = (vUv - 0.5) * vec2(uAspect, 1.0);
      float vig = smoothstep(1.25, 0.25, length(c));
      col *= mix(1.0, vig, uVignette);
      // lift: intermediate blacks (no harsh pure-black edges)
      col = uLift + col * (1.0 - uLift);
      // fine film grain (luminance-weighted, temporal)
      float g = hash(vUv * vec2(1931.0, 1117.0) + fract(uTime * 7.31)) - 0.5;
      col += g * uGrain * (0.35 + 0.65 * (1.0 - dot(col, vec3(0.333))));
      gl_FragColor = vec4(col, 1.0);
    }
  `,
};

export class PostFX {
  readonly composer: EffectComposer;
  private bloom: UnrealBloomPass;
  private grade: ShaderPass;
  private size = new Vector2();

  constructor(
    private readonly renderer: WebGLRenderer,
    scene: Scene,
    camera: PerspectiveCamera,
    private readonly quality: QualityProfile,
  ) {
    renderer.getSize(this.size);
    const target = new WebGLRenderTarget(this.size.x, this.size.y, {
      type: HalfFloatType,
      samples: quality.tier === 'high' ? 4 : quality.tier === 'medium' ? 2 : 0,
    });
    this.composer = new EffectComposer(renderer, target);
    this.composer.addPass(new RenderPass(scene, camera));
    this.bloom = new UnrealBloomPass(new Vector2(this.size.x / 2, this.size.y / 2), 0.4, 0.55, 0.72);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
    this.grade = new ShaderPass(GradeShader);
    this.composer.addPass(this.grade);
    this.applyQuality();
  }

  applyQuality(): void {
    this.bloom.enabled = this.quality.bloom !== 'off';
  }

  setSize(w: number, h: number, dpr: number): void {
    this.composer.setPixelRatio(dpr);
    this.composer.setSize(w, h);
    const scale = this.quality.bloom === 'half' ? 0.35 : 0.5;
    this.bloom.resolution.set(w * dpr * scale, h * dpr * scale);
    this.bloom.setSize(w * dpr * scale, h * dpr * scale);
    this.grade.uniforms.uAspect.value = w / h;
  }

  render(state: PostState, time: number, reducedMotion: boolean): void {
    this.bloom.strength = state.bloom;
    this.renderer.toneMappingExposure = state.exposure;
    this.grade.uniforms.uVignette.value = state.vignette;
    this.grade.uniforms.uGrain.value = reducedMotion ? state.grain * 0.5 : state.grain;
    this.grade.uniforms.uTime.value = reducedMotion ? 0 : time;
    this.composer.render();
  }

  dispose(): void {
    this.composer.dispose();
  }
}
