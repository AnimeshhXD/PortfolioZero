/**
 * Scene contract (doc 9 §3.1): prepareAssets() · enter() · update(progress, inputState) · exit() · cleanup().
 * Every scene writes SceneDirectives each frame; the orchestrator blends them across transitions and
 * applies them to the shared directors (camera, sky, fog, lighting, signature, particles, post).
 */
import type { Color, Group, PerspectiveCamera, Scene, Vector3, WebGLRenderer } from 'three';
import type { TransitionKind } from '../tokens/tokens';
import type { TextLayer } from '../experience/ui/CinematicTextLayer';
import type { PortalLayer } from '../experience/ui/PortalButtons';
import type { GlyphDustSystem } from '../experience/systems/ParticleSystem/GlyphDust';
import type { GlobalUniforms } from '../experience/shaders/uniforms';
import type { QualityProfile } from '../experience/orchestration/QualityDirector';

export type SceneId =
  | 'boot'
  | 'identity'
  | 'lawlens'
  | 'triage'
  | 'workplace'
  | 'benefitbridge'
  | 'mavira'
  | 'healthcoach'
  | 'ending';

export type QualityTier = 'high' | 'medium' | 'low';

export interface PointerState {
  /** Damped pointer in NDC (-1..1), +y up. Touch drives the same vector. */
  x: number;
  y: number;
  /** True while the pointer is over the window / a finger is down. */
  active: boolean;
}

export interface SceneFrame {
  /** 0..1 within this scene's scroll band (damped, with catch-up). */
  progress: number;
  /** 0 = still deep in the incoming fog curtain, 1 = arrived. 1 whenever inside the band. */
  enter: number;
  /** 0 = in band, 1 = fully absorbed by the outgoing transition. Non-zero only while leaving. */
  exit: number;
  /** Seconds since experience start. */
  time: number;
  /** Seconds since last frame (clamped to ≤ 1/20). */
  dt: number;
  pointer: PointerState;
  /** Damped progress velocity (scene-bands per second, signed) — use for "breathing" intensity. */
  velocity: number;
  reducedMotion: boolean;
  tier: QualityTier;
  aspect: number;
}

/* ───────── Directives — the per-frame "shot sheet" a scene hands to the directors ───────── */

export interface CameraShot {
  position: Vector3;
  target: Vector3;
  /** Vertical fov in degrees. Use lensToFov(mm) / LENS tokens. */
  fov: number;
  roll: number;
}

export interface SkyState {
  top: Color;
  horizon: Color;
  bottom: Color;
  /** God rays 0..1 — rare and meaningful (doc 1 §4.6). */
  rays: number;
  rayColor: Color;
  /** World-space direction the rays radiate from. */
  rayDirection: Vector3;
  /** Brightness multiplier for the whole sky (0..1.5). */
  intensity: number;
}

export interface LightingState {
  keyColor: Color;
  keyIntensity: number;
  /** Direction the key light comes FROM (world space, normalized by the director). */
  keyDirection: Vector3;
  rimColor: Color;
  rimIntensity: number;
  rimDirection: Vector3;
  ambientColor: Color;
  ambientIntensity: number;
  /** How much the pointer pivots the key light (0..1). */
  pointerInfluence: number;
}

export interface FogState {
  /** FogExp2 density — use FOG tokens (F0..F3) or lerps between them. */
  density: number;
  color: Color;
  /** Camera-attached fog curtain 0..1 — use CURTAIN tokens. */
  curtain: number;
}

export interface SignatureState {
  /** SOC evolution state 0..8 (fractional = blending between states). */
  soc: number;
  /** World position of the object (scenes live at origin). */
  position: Vector3;
  /** Multiplier on the SOC's canonical scale. */
  scale: number;
  /** Emission multiplier — use EMISSION tokens (G0..G3). */
  emission: number;
  accentA: Color;
  accentB: Color;
  /** 0..1 absorbing-lens intensity (spiral intake + shell glow). */
  absorb: number;
  /** 0..1 overall presence. */
  visibility: number;
  /** Extra Y rotation speed (rad/s); keep tiny. */
  spin: number;
}

export interface ParticleState {
  /** Fraction of the ambient mote pool visible (PARTICLE tokens). */
  density: number;
  color: Color;
  /** Point size multiplier. */
  size: number;
  /** Drift speed (PARTICLE tokens). */
  speed: number;
  /** Focus distance from camera (world units) — drives bokeh/DOF on motes. */
  focus: number;
  /** Bokeh strength 0..1 (0 = everything sharp). */
  aperture: number;
  /** Extra drift vector (world units/s), e.g. passage streaming. */
  flow: Vector3;
  /** 0..1 brightness. */
  intensity: number;
}

export interface PostState {
  /** Bloom strength — use GLOW tokens. */
  bloom: number;
  exposure: number;
  vignette: number;
  grain: number;
}

export interface SceneDirectives {
  camera: CameraShot;
  sky: SkyState;
  lighting: LightingState;
  fog: FogState;
  signature: SignatureState;
  particles: ParticleState;
  post: PostState;
}

/* ───────── Context handed to scenes ───────── */

export interface SceneContext {
  renderer: WebGLRenderer;
  /** The live camera — read-only (projections, distances). Never move it directly; write directives.camera. */
  camera: PerspectiveCamera;
  /** The root THREE.Scene. Prefer adding objects to your own scene.root. */
  world: Scene;
  text: TextLayer;
  portals: PortalLayer;
  glyphDust: GlyphDustSystem;
  /** Shared uniforms to plug into custom ShaderMaterials (time, fog, pointer, focus, key light…). */
  uniforms: GlobalUniforms;
  quality: QualityProfile;
  /** Current world-space position of the signature object (updated every frame by the director). */
  signaturePosition: Vector3;
  reducedMotion(): boolean;
}

export interface CinematicScene {
  readonly id: SceneId;
  /** Added to the world by the orchestrator; toggled visible on enter/exit. */
  readonly root: Group;
  /** Mutated in update(); read by the orchestrator after every update(). */
  readonly directives: SceneDirectives;
  /** Build geometry/materials/text (idempotent; may be called again after cleanup()). */
  prepareAssets(ctx: SceneContext): Promise<void> | void;
  /** Becomes the visible world. */
  enter(): void;
  /** Called every frame while the scene is on stage (including during its transitions). */
  update(frame: SceneFrame): void;
  /** No longer visible — hide text, portals, and anything outside root. */
  exit(): void;
  /** Dispose GPU resources and DOM nodes. */
  cleanup(): void;
}

export interface SceneDefinition {
  id: SceneId;
  /** Human title (accessibility, debug). */
  title: string;
  /** Scroll band length in vh units. */
  band: number;
  /** Transition into the NEXT scene (doc 7 §12). */
  transitionOut: TransitionKind;
  /** Local progress values that are "readable holds" — keyboard stepping targets. */
  holds: readonly number[];
  /** Canonical SOC state of this scene (doc 14). */
  soc: number;
  load: () => Promise<{ default: () => CinematicScene }>;
}
