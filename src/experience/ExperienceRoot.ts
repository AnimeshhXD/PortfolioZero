/**
 * ExperienceRoot — the film's director's chair (doc 9 §4 component hierarchy).
 *
 *   RendererStage · CameraDirector · WorldDirector (Sky, Fog, Lighting, Signature, Motes)
 *   TextDirector (CinematicTextLayer + Portals + GlyphDust) · InputDirector · AccessibilityDirector
 *
 * Each frame: scroll → which scene(s) are on stage → scenes write directives → transitions blend
 * them (TX-Absorb / TX-Dissolve / TX-CollapsePassage, doc 7 §12) → directors apply → render.
 * Worlds stream in around the playhead (prefetch next, dispose far) — doc 8 §4.
 */
import { Raycaster, Scene, Vector2, Vector3, type WebGLRenderer } from 'three';
import type { CinematicScene, SceneContext, SceneDirectives, SceneFrame } from '../types/scene';
import { createRenderer, pixelRatioFor } from './RendererStage';
import { QualityDirector } from './orchestration/QualityDirector';
import { CameraDirector } from './orchestration/CameraDirector';
import { LightingDirector } from './orchestration/LightingDirector';
import { FogDirector } from './orchestration/FogDirector';
import { InputDirector } from './orchestration/InputDirector';
import { ScrollDirector } from './orchestration/ScrollDirector';
import { AccessibilityDirector } from './orchestration/AccessibilityDirector';
import { createGlobalUniforms, type GlobalUniforms } from './shaders/uniforms';
import { Sky } from './systems/Sky';
import { FogVolume } from './systems/FogVolume';
import { AmbientMotes } from './systems/ParticleSystem/AmbientMotes';
import { GlyphDustSystem } from './systems/ParticleSystem/GlyphDust';
import { SignatureObject } from './systems/SignatureObject/SignatureObject';
import { PostFX } from './systems/PostFX/PostFX';
import { TextLayer } from './ui/CinematicTextLayer';
import { PortalLayer } from './ui/PortalButtons';
import { MinimalOverlay } from './ui/MinimalOverlay';
import { SCENES, TX_BAND, sceneIndex } from './scenes/registry';
import { PlaceholderScene } from './scenes/PlaceholderScene';
import { copyDirectives, createDirectives, lerpDirectives } from './directives';
import { clamp, lerp, smoothstep } from '../utils/math';
import { EMISSION, FOG, TRANSITION } from '../tokens/tokens';
import type { PresetId } from '../tokens/palettes';
import type { QualityTier, SceneId } from '../types/scene';

export interface ExperienceElements {
  canvas: HTMLCanvasElement;
  textLayer: HTMLElement;
  overlay: HTMLElement;
  track: HTMLElement;
}

export interface DebugState {
  sceneId: SceneId;
  segment: 'scene' | 'tx';
  progress: number;
  position: number;
  tier: QualityTier;
  fps: number;
  loaded: SceneId[];
  settled: boolean;
}

const _fwd = new Vector3();
const _v = new Vector3();
const _ray = new Raycaster();
const _ndc = new Vector2();

export class ExperienceRoot {
  readonly world = new Scene();
  readonly uniforms: GlobalUniforms = createGlobalUniforms();
  private renderer: WebGLRenderer;
  private quality: QualityDirector;
  private cameraDir: CameraDirector;
  private lighting: LightingDirector;
  private fog: FogDirector;
  private fogVolume: FogVolume;
  private sky: Sky;
  private motes: AmbientMotes;
  private signature: SignatureObject;
  private post: PostFX;
  private text: TextLayer;
  private portals: PortalLayer;
  private glyphDust: GlyphDustSystem;
  private scroll: ScrollDirector;
  private a11y: AccessibilityDirector;
  private input: InputDirector;
  private overlay: MinimalOverlay;
  private ctx: SceneContext;

  private scenes: Array<CinematicScene | null> = SCENES.map(() => null);
  private loading: Array<Promise<CinematicScene> | null> = SCENES.map(() => null);
  private onStage = -1;
  private final: SceneDirectives = createDirectives('boot');
  private lastFinal: SceneDirectives = createDirectives('boot');
  private time = 0;
  private last = 0;
  private raf = 0;
  private running = false;
  private snapNext = true;
  private settleFrames = 0;
  private idle = 0;
  private lastScrollY = 0;
  private fpsAcc = 0;
  private fpsFrames = 0;
  private fps = 60;
  private cleanupTimer = 0;
  private pendingEndingFocus = false;
  private frame: SceneFrame;

  constructor(private readonly els: ExperienceElements) {
    const params = new URLSearchParams(location.search);
    const forcedTier = params.get('tier') as QualityTier | null;

    this.renderer = createRenderer(els.canvas);
    this.quality = new QualityDirector(this.renderer, forcedTier && ['high', 'medium', 'low'].includes(forcedTier) ? forcedTier : null);
    this.cameraDir = new CameraDirector(innerWidth / innerHeight);
    const camera = this.cameraDir.camera;
    this.world.add(camera);

    this.sky = new Sky(this.uniforms);
    this.world.add(this.sky.mesh);
    this.fogVolume = new FogVolume(camera, this.uniforms, this.quality.fogPlanes);
    this.fog = new FogDirector(this.world, this.uniforms, this.fogVolume);
    this.lighting = new LightingDirector(this.uniforms);
    this.world.add(this.lighting.group);
    this.motes = new AmbientMotes(this.uniforms, this.quality.motes);
    this.world.add(this.motes.points);
    this.signature = new SignatureObject(this.uniforms, this.quality.count(700));
    this.world.add(this.signature.group);

    this.text = new TextLayer(els.textLayer, camera);
    this.text.setQuality(this.quality.perCharBlur);
    this.portals = new PortalLayer(els.overlay, this.text);
    this.glyphDust = new GlyphDustSystem(this.world, camera, this.uniforms, this.quality);
    this.post = new PostFX(this.renderer, this.world, camera, this.quality);

    this.scroll = new ScrollDirector(
      SCENES.map((s) => ({ band: s.band, holds: s.holds })),
      TX_BAND,
      els.track,
    );
    this.a11y = new AccessibilityDirector(this.scroll);
    this.a11y.onSkipToEnding = () => this.skipToEnding();
    this.input = new InputDirector();
    this.overlay = new MinimalOverlay(els.overlay, this.a11y);
    this.text.reducedMotion = this.a11y.reducedMotion;
    this.a11y.onChange((r) => {
      this.text.reducedMotion = r;
      this.uniforms.uReducedMotion.value = r ? 1 : 0;
    });
    this.uniforms.uReducedMotion.value = this.a11y.reducedMotion ? 1 : 0;

    this.quality.onChange(() => {
      this.text.setQuality(this.quality.perCharBlur);
      this.post.applyQuality();
      this.resize();
    });

    this.ctx = {
      renderer: this.renderer,
      camera,
      world: this.world,
      text: this.text,
      portals: this.portals,
      glyphDust: this.glyphDust,
      uniforms: this.uniforms,
      quality: this.quality,
      signaturePosition: new Vector3(),
      reducedMotion: () => this.a11y.reducedMotion,
    };

    this.frame = {
      progress: 0,
      enter: 1,
      exit: 0,
      time: 0,
      dt: 0,
      pointer: this.input.pointer,
      velocity: 0,
      reducedMotion: false,
      tier: this.quality.tier,
      aspect: innerWidth / innerHeight,
    };

    window.addEventListener('resize', () => this.resize());
    document.addEventListener('visibilitychange', () => this.onVisibility());
    document.querySelector<HTMLAnchorElement>('.pz-skip')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.skipToEnding();
    });
    this.resize();
  }

  /* ───────────── lifecycle ───────────── */

  async start(): Promise<void> {
    const params = new URLSearchParams(location.search);
    const seek = params.get('seek');
    const hash = location.hash.replace('#', '');

    if (seek) {
      const [id, p] = seek.split(':');
      this.seek(id as SceneId, Number(p ?? 0));
    } else if (hash && sceneIndex(hash) >= 0) {
      this.seek(hash as SceneId, SCENES[sceneIndex(hash)].holds[0] ?? 0);
    } else {
      window.scrollTo({ top: 0, behavior: 'instant' });
      // Scene 0 plays itself on first load (doc 6 §2: ~20s), scroll can always lead.
      this.scroll.startAutoplay(this.a11y.reducedMotion ? 16 : 20, 0.6);
    }

    // Load what the first shot needs, prefetch the next (doc 8 §4.1).
    const first = this.scroll.locate(this.scroll.position).segment.index;
    await this.ensure(first);
    void this.ensure(first + 1);

    this.running = true;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.loop);
  }

  private onVisibility(): void {
    // Battery: stop rendering entirely while hidden (doc 8 §9).
    if (document.hidden) {
      this.running = false;
      cancelAnimationFrame(this.raf);
    } else if (!this.running) {
      this.running = true;
      this.quality.resetWindow();
      this.last = performance.now();
      this.raf = requestAnimationFrame(this.loop);
    }
  }

  private resize(): void {
    const w = innerWidth;
    const h = innerHeight;
    const dpr = pixelRatioFor(this.quality);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h, false);
    this.post.setSize(w, h, dpr);
    this.cameraDir.setAspect(w / h);
    this.fogVolume.resize();
    this.uniforms.uPixelRatio.value = dpr;
    this.uniforms.uViewportHeight.value = h;
    this.frame.aspect = w / h;
  }

  /* ───────────── scene streaming ───────────── */

  private ensure(index: number): Promise<CinematicScene | null> {
    if (index < 0 || index >= SCENES.length) return Promise.resolve(null);
    const ready = this.scenes[index];
    if (ready) return Promise.resolve(ready);
    const pending = this.loading[index];
    if (pending) return pending;
    const def = SCENES[index];
    const p = def
      .load()
      .then((m) => m.default())
      .catch((err) => {
        console.error(`[PROJECT ZERO] scene "${def.id}" failed to load — using placeholder`, err);
        return new PlaceholderScene(def.id, def.id as PresetId, def.title.toUpperCase(), def.soc);
      })
      .then(async (scene) => {
        this.world.add(scene.root);
        scene.root.visible = false;
        try {
          await scene.prepareAssets(this.ctx);
        } catch (err) {
          console.error(`[PROJECT ZERO] scene "${def.id}" failed in prepareAssets`, err);
        }
        this.scenes[index] = scene;
        this.loading[index] = null;
        return scene;
      });
    this.loading[index] = p;
    return p;
  }

  /** Dispose worlds far from the playhead (memory: doc 9 §12 "dispose geometries/materials"). */
  private cleanupFar(current: number): void {
    this.scenes.forEach((s, i) => {
      if (!s || i === this.onStage) return;
      if (Math.abs(i - current) > 2) {
        s.cleanup();
        s.root.removeFromParent();
        this.scenes[i] = null;
      }
    });
  }

  private setOnStage(index: number): void {
    if (this.onStage === index) return;
    const prev = this.onStage >= 0 ? this.scenes[this.onStage] : null;
    prev?.exit();
    this.onStage = index;
    this.scenes[index]?.enter();
  }

  /* ───────────── navigation ───────────── */

  seek(id: SceneId, progress: number): void {
    const i = sceneIndex(id);
    if (i < 0) return;
    this.scroll.seek(this.scroll.sceneUnits(i, progress));
    this.snapNext = true;
    this.settleFrames = 0;
    void this.ensure(i);
  }

  private skipToEnding(): void {
    const i = SCENES.length - 1;
    const holds = SCENES[i].holds;
    this.scroll.travelTo(this.scroll.sceneUnits(i, holds[holds.length - 1] ?? 0.95), this.a11y.reducedMotion);
    this.pendingEndingFocus = true;
    void this.ensure(i);
  }

  /* ───────────── the frame ───────────── */

  private loop = (now: number): void => {
    if (!this.running) return;
    this.raf = requestAnimationFrame(this.loop);
    const dt = clamp((now - this.last) / 1000, 0, 1 / 20);
    this.last = now;
    this.tick(dt);
  };

  private tick(dt: number): void {
    this.time += dt;
    const reduced = this.a11y.reducedMotion;
    this.input.update(dt, reduced);
    this.scroll.update(dt, reduced);

    const y = window.scrollY;
    this.idle = Math.abs(y - this.lastScrollY) > 0.5 ? 0 : this.idle + dt;
    this.lastScrollY = y;

    const loc = this.scroll.locate(this.scroll.position);
    const seg = loc.segment;
    const i = seg.index;
    void this.ensure(i);
    void this.ensure(i + 1);
    if (seg.kind === 'tx' || loc.local > 0.5) void this.ensure(i + 2);
    if (loc.local < 0.3) void this.ensure(i - 1);
    this.cleanupTimer += dt;
    if (this.cleanupTimer > 1.5) {
      this.cleanupTimer = 0;
      this.cleanupFar(i);
    }

    const f = this.frame;
    f.time = this.time;
    f.dt = dt;
    f.reducedMotion = reduced;
    f.tier = this.quality.tier;

    let holdCurtain = 0;
    const A = this.scenes[i];

    if (seg.kind === 'scene') {
      f.velocity = this.scroll.velocity / (seg.end - seg.start);
      if (A) {
        this.setOnStage(i);
        f.progress = loc.local;
        f.enter = 1;
        f.exit = 0;
        A.update(f);
        copyDirectives(this.final, A.directives);
      } else {
        holdCurtain = 1; // world still streaming in — hold in fog rather than show nothing
        copyDirectives(this.final, this.lastFinal);
      }
    } else {
      this.transition(i, loc.local, reduced);
      holdCurtain = this.scenes[i + 1] || loc.local < 0.5 ? 0 : 1;
    }

    // Fog cut (Home/End, long jumps) and streaming holds.
    const curtain = Math.max(this.scroll.cut, holdCurtain);
    if (curtain > 0) {
      this.final.fog.density = lerp(this.final.fog.density, FOG.F3, curtain);
    }

    // Protect hero typography readability: motes recede while titles are resolved (doc 4 §3.2).
    this.final.particles.intensity *= 1 - 0.38 * this.text.heroPresence;

    this.applyDirectors(dt, reduced, curtain);
    copyDirectives(this.lastFinal, this.final);

    if (this.pendingEndingFocus && this.onStage === SCENES.length - 1) {
      const portal = this.els.overlay.ownerDocument.querySelector<HTMLAnchorElement>('.pz-portal[data-state="live"]');
      if (portal) {
        portal.focus({ preventScroll: true });
        this.pendingEndingFocus = false;
      }
    }

    this.overlay.update({
      sceneId: seg.kind === 'scene' ? SCENES[i].id : 'tx',
      progress: seg.kind === 'scene' ? loc.local : 0,
      autoplaying: this.scroll.autoplaying,
      idleSeconds: this.idle,
    });

    this.quality.sample(dt);
    this.fpsAcc += dt;
    this.fpsFrames++;
    if (this.fpsAcc > 0.5) {
      this.fps = this.fpsFrames / this.fpsAcc;
      this.fpsAcc = 0;
      this.fpsFrames = 0;
    }
    if (this.scenes[i] && (seg.kind === 'scene' || this.scenes[i + 1])) this.settleFrames++;
  }

  /**
   * Transition band between scene i and i+1 (doc 5 §4.2 recipes, doc 3 §6):
   * fog F2→F3→F1 · camera pushes into the boundary · the signature becomes an absorbing lens on the
   * optical axis and evolves its SOC · worlds swap at peak fog.
   */
  private transition(i: number, t: number, reduced: boolean): void {
    const f = this.frame;
    const A = this.scenes[i];
    const B = this.scenes[i + 1];
    const kind = SCENES[i].transitionOut;
    const spec = TRANSITION[kind];
    const peak = Math.sin(Math.PI * clamp(t)) ** 2; // 0 → 1 → 0, flat at the centre
    const exitT = smoothstep(0, 0.5, t);
    const enterT = smoothstep(0.5, 1, t);
    f.velocity = this.scroll.velocity / TX_BAND;

    let haveA = false;
    let haveB = false;
    if (A && t < 0.62) {
      f.progress = 1;
      f.enter = 1;
      f.exit = exitT;
      if (t < 0.5) this.setOnStage(i);
      A.update(f);
      haveA = true;
    }
    if (B && t > 0.38) {
      if (t >= 0.5) this.setOnStage(i + 1);
      f.progress = 0;
      f.enter = enterT;
      f.exit = 0;
      B.update(f);
      haveB = true;
    }
    if (t >= 0.5 && !B && this.onStage === i) {
      // next world not ready: hide the outgoing one inside the fog and wait.
      A?.exit();
      this.onStage = -1;
    }

    const w = smoothstep(0.38, 0.62, t);
    if (haveA && haveB) lerpDirectives(this.final, A!.directives, B!.directives, w);
    else if (haveA) copyDirectives(this.final, A!.directives);
    else if (haveB) copyDirectives(this.final, B!.directives);
    else copyDirectives(this.final, this.lastFinal);

    const d = this.final;
    // Fog: boundary haze → heavy dissolve → whisper veil (doc 7 §7 F2→F3→F1).
    d.fog.density = lerp(d.fog.density, FOG.F3, peak);
    d.fog.curtain = Math.max(d.fog.curtain, peak * spec.curtain);

    // Camera travels INTO the fog boundary (doc 3 §6.1).
    _fwd.subVectors(d.camera.target, d.camera.position).normalize();
    const push = Math.sin(Math.PI * t) * (reduced ? 0.6 : 2.2);
    d.camera.position.addScaledVector(_fwd, push);
    d.camera.target.addScaledVector(_fwd, push);

    // Signature as absorbing lens on the optical axis (doc 14 §3).
    const pull = peak * spec.signaturePull;
    const lensDistance = lerp(8.5, 6.4, peak);
    _v.copy(d.camera.position).addScaledVector(_fwd, lensDistance);
    d.signature.position.lerp(_v, pull);
    d.signature.absorb = Math.max(d.signature.absorb, peak * (0.4 + spec.signaturePull * 0.6));
    // brightest *controlled* emission in frame (doc 3 §9): the lens peaks at G2, never blown out
    d.signature.emission = Math.min(Math.max(d.signature.emission, EMISSION.G2 * pull + EMISSION.G1 * peak), EMISSION.G2);
    d.signature.visibility = Math.max(d.signature.visibility, pull);
    d.signature.soc = lerp(SCENES[i].soc, SCENES[i + 1].soc, smoothstep(0.3, 0.7, t));
    // DOF briefly favours the signature as the transition anchor (doc 3 §9).
    d.particles.focus = lerp(d.particles.focus, lensDistance, pull);
    d.particles.aperture = lerp(d.particles.aperture, 0.35, peak);

    // Passage: motes stream past the camera (TX-CollapsePassage is the strongest).
    const flow = (reduced ? 1.5 : 7) * spec.passage * peak;
    d.particles.flow.copy(_fwd).multiplyScalar(-flow);
    d.particles.density = Math.max(d.particles.density, 0.35 + 0.4 * spec.passage * peak);
    d.post.bloom = Math.max(d.post.bloom, spec.bloom * peak);
  }

  private applyDirectors(dt: number, reduced: boolean, cutCurtain: number): void {
    const d = this.final;
    const camera = this.cameraDir.camera;
    if (this.snapNext) {
      this.cameraDir.snap(d.camera);
      this.snapNext = false;
    }
    this.cameraDir.apply(d.camera, dt, this.time, reduced);
    camera.updateMatrixWorld();

    const u = this.uniforms;
    u.uTime.value = this.time;
    u.uCameraPos.value.copy(camera.position);
    u.uFocus.value = d.particles.focus;
    u.uAperture.value = reduced ? d.particles.aperture * 0.6 : d.particles.aperture;
    u.uPointer.value.set(this.input.pointer.x, this.input.pointer.y);
    _ndc.set(this.input.pointer.x, this.input.pointer.y);
    _ray.setFromCamera(_ndc, camera);
    u.uPointerWorld.value.copy(_ray.ray.origin).addScaledVector(_ray.ray.direction, Math.max(2, d.particles.focus));

    this.sky.apply(d.sky, camera);
    this.fog.apply(d.fog, cutCurtain, d.fog.color);
    this.signature.apply(d.signature, dt, reduced);
    this.ctx.signaturePosition.copy(this.signature.worldPosition);
    this.lighting.apply(d.lighting, this.input.pointer, this.cameraDir.restTarget, reduced);
    this.motes.apply(d.particles, dt, reduced);
    this.text.update();
    this.post.render(d.post, this.time, reduced);
  }

  /* ───────────── debug (?debug) ───────────── */

  debugState(): DebugState {
    const loc = this.scroll.locate(this.scroll.position);
    return {
      sceneId: SCENES[loc.segment.index].id,
      segment: loc.segment.kind,
      progress: loc.local,
      position: this.scroll.position,
      tier: this.quality.tier,
      fps: Math.round(this.fps),
      loaded: this.scenes.map((s, i) => (s ? SCENES[i].id : null)).filter((x): x is SceneId => !!x),
      settled: this.settleFrames > 45 && Math.abs(this.scroll.position - this.scroll.target) < 0.05,
    };
  }

  /** Seek to the transition band after scene `id` at local t (debug only). */
  seekTransition(id: SceneId, t: number): void {
    const i = sceneIndex(id);
    const seg = this.scroll.segments.find((s) => s.kind === 'tx' && s.index === i);
    if (!seg) return;
    this.scroll.seek(seg.start + clamp(t) * (seg.end - seg.start));
    this.snapNext = true;
    this.settleFrames = 0;
    void this.ensure(i);
    void this.ensure(i + 1);
  }
}
