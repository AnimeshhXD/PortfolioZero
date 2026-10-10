/**
 * SCENE 0 — BOOT SEQUENCE / SINGLE DECISION  (doc 5 §10, doc 6 §2, doc 11 §2, doc 12 §2, doc 15 §1)
 *
 * Black void. Two sentences resolve from fog to ink and dissolve into dust that the quiet seed (SOC-0)
 * absorbs; then motes organise into the signature silhouette and the seed is primed (SOC-1).
 * Plays itself on first load (~20s); scroll can lead. No terminals, no loading bars, no typing.
 *
 * Beat map (scene progress):
 *   0.00–0.08 silence, particles drift                       (doc 6 beat 1 / F0)
 *   0.08–0.24 sentence 1 emerges (fog→ink) + light pass      (beat 2 / F20)
 *   0.24–0.34 hold                                           (F40 "fully resolved")
 *   0.34–0.46 sentence 1 dissolves → dust absorbed by seed   (beat 3 / F60)
 *   0.46–0.60 sentence 2 emerges, key warms, slight push-in  (beat 4 / F80)
 *   0.60–0.70 hold
 *   0.70–0.82 sentence 2 dissolves → dust absorbed           (beat 5)
 *   0.80–1.00 motes organise into the seed silhouette; SOC-0 → SOC-1 primed; hold  (beat 6 / F100)
 */
import { Color, Vector3 } from 'three';
import type { SceneContext, SceneFrame } from '../../../types/scene';
import { BaseScene } from '../BaseScene';
import type { TextBlock } from '../../ui/CinematicTextLayer';
import type { GlyphDust } from '../../systems/ParticleSystem/GlyphDust';
import { MorphPoints } from '../../systems/ParticleSystem/MorphPoints';
import { Glow } from '../../systems/ArchitectureViz';
import { sampleSignatureSurface } from '../../systems/SignatureObject/SignatureObject';
import { SOC } from '../../systems/SignatureObject/socStates';
import { identity } from '../../../content/identity';
import { beat, bell, lerp, smoothstep } from '../../../utils/math';
import { easeOutPremium } from '../../../utils/easing';
import { colorTrack, shotTrack, track, type ShotOut } from '../../../utils/timeline';
import { rng } from '../../../utils/rng';
import { EMISSION, FOG, LENS, PARTICLE, TEMPERATURE, CURTAIN } from '../../../tokens/tokens';
import { PALETTES } from '../../../tokens/palettes';

const SEED_POS = new Vector3(0, 0, 0);
const WARM_ACCENT = '#ffd9b0';
const COOL_ACCENT = PALETTES.boot.accentA;

class Scene0Boot extends BaseScene {
  private s1!: TextBlock;
  private s2!: TextBlock;
  private dust1!: GlyphDust;
  private dust2!: GlyphDust;
  private seedShell!: MorphPoints;
  private volume!: Glow;

  private shot = shotTrack([
    { at: 0.0, position: [0, 0, 9.5], target: [0, 0, 0], lens: LENS.mid + 5 },
    { at: 0.44, position: [0, 0, 9.5], target: [0, 0, 0], lens: LENS.mid + 5 },
    { at: 0.6, position: [0, 0.05, 8.7], target: [0, 0.02, 0], lens: LENS.mid + 6 },
    { at: 0.82, position: [0, 0.03, 8.9], target: [0, 0, 0], lens: LENS.mid + 6 },
    { at: 1.0, position: [0, 0.1, 8.4], target: [0, 0.05, 0], lens: LENS.hero - 8 },
  ]);
  private shotOut: ShotOut = { position: new Vector3(), target: new Vector3(), fov: 35, roll: 0 };
  private key = colorTrack([
    { at: 0, value: TEMPERATURE.cool5400 },
    { at: 0.44, value: TEMPERATURE.cool5400 },
    { at: 0.58, value: TEMPERATURE.warm3800 },
    { at: 0.8, value: TEMPERATURE.warm3800 },
    { at: 1, value: TEMPERATURE.cool5400 },
  ]);
  private skyIntensity = track([
    { at: 0, value: 0.55 },
    { at: 0.8, value: 0.65 },
    { at: 1, value: 1 },
  ]);
  private tmp = new Color();
  private warm = new Color(WARM_ACCENT);
  private reducedRest = new Vector3(0, 0, 9.2);

  constructor() {
    super('boot', 'boot');
  }

  protected build(ctx: SceneContext): void {
    const [line1, line2] = identity.boot;
    // Both sentences occupy the same optical centre (layered), never stacked like a list.
    this.s1 = this.text({ text: line1, style: 'narrative', slot: 'center', accent: COOL_ACCENT, stagger: 0.55, className: 'pz-layer' });
    this.s2 = this.text({ text: line2, style: 'narrative', slot: 'center', accent: WARM_ACCENT, stagger: 0.5, className: 'pz-layer' });
    this.dust1 = this.dust(this.s1, { mode: 'absorb', color: COOL_ACCENT, depth: 7.5 });
    this.dust2 = this.dust(this.s2, { mode: 'absorb', color: WARM_ACCENT, depth: 7.5 });

    // "faint volume blue in upper center" — the ambient anchor (doc 11 §2 secondary focal point)
    this.volume = this.track(new Glow(ctx.uniforms, { size: 9, color: '#24357a', intensity: 0.06, falloff: 3.4 }));
    this.volume.mesh.position.set(0, 2.4, -9);
    this.add(this.volume.mesh);

    // Motes that organise into the seed silhouette (beat 6). End = SOC-1 hull surface around the seed.
    const n = ctx.quality.count(1400);
    const r = rng(0xb007);
    const start = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const [x, y, z] = r.onSphere(r.range(2.6, 6.5));
      start[i * 3] = x;
      start[i * 3 + 1] = y * 0.7;
      start[i * 3 + 2] = z * 0.6;
    }
    const end = sampleSignatureSurface(n, 0x5eed, SOC[1].scale * 1.04);
    for (let i = 0; i < n; i++) {
      end[i * 3] += SEED_POS.x;
      end[i * 3 + 1] += SEED_POS.y;
      end[i * 3 + 2] += SEED_POS.z;
    }
    this.seedShell = this.track(
      new MorphPoints(ctx.uniforms, { start, end, colorA: '#9fb4ff', colorB: '#d6e2ff', size: 0.03, stagger: 0.7, swirl: 0.9, drift: 0.05 }),
    );
    this.seedShell.setFadeWindow(0.92, 1.0);
    this.add(this.seedShell.points);
  }

  update(f: SceneFrame): void {
    const p = f.progress;
    const d = this.directives;
    const rm = f.reducedMotion;

    // ── typography: fog → ink → ash (absorbed by the seed) ──
    const e1 = beat(p, 0.08, 0.24, easeOutPremium);
    const d1 = beat(p, 0.34, 0.46);
    this.s1.set(e1, d1, beat(p, 0.13, 0.3));
    this.dust1.update(d1, this.ctx.signaturePosition);

    const e2 = beat(p, 0.46, 0.6, easeOutPremium);
    const d2 = beat(p, 0.7, 0.82);
    this.s2.set(e2, d2, beat(p, 0.52, 0.68));
    this.dust2.update(d2, this.ctx.signaturePosition);

    // ── seed silhouette organises (beat 6) ──
    const organise = beat(p, 0.8, 0.98);
    this.seedShell.mix = organise;
    this.seedShell.opacity = smoothstep(0.78, 0.84, p) * (1 - f.exit);

    // ── camera: hold → slight push during sentence 2 → settle → ready-to-travel ──
    this.shot(p, this.shotOut);
    d.camera.position.copy(this.shotOut.position);
    d.camera.target.copy(this.shotOut.target);
    if (rm) d.camera.position.lerp(this.reducedRest, 0.5);
    d.camera.fov = this.shotOut.fov;

    // ── light: near-invisible key; warmer for "Mine was to build." ──
    this.key(p, d.lighting.keyColor);
    d.lighting.keyIntensity = lerp(0.25, 0.55, smoothstep(0.4, 0.6, p));
    d.sky.intensity = this.skyIntensity(p);
    this.volume.intensity = lerp(0.05, 0.1, smoothstep(0.75, 1, p)) + bell(p, 0.17, 0.1) * 0.03;

    // ── fog: nearly absent; a whisper veil forms as the environment materialises ──
    d.fog.density = lerp(FOG.F0 + 0.004, FOG.F1, smoothstep(0.8, 1, p));
    d.fog.curtain = CURTAIN.F0;

    // ── particles: sparse calm motes, slightly denser around the text beats ──
    d.particles.density = lerp(PARTICLE.P1.density * 0.6, PARTICLE.P1.density, smoothstep(0.75, 1, p)) + bell(p, 0.4, 0.12) * 0.08;
    d.particles.speed = PARTICLE.P1.speed;
    d.particles.focus = this.shotOut.position.z;
    d.particles.aperture = 0.55;
    d.particles.intensity = 0.75;

    // ── signature: SOC-0 quiet seed → absorbs fragments → SOC-1 primed ──
    const absorbing = Math.max(bell(p, 0.43, 0.08), bell(p, 0.79, 0.08));
    d.signature.soc = lerp(0, 0.92, smoothstep(0.82, 1, p));
    d.signature.position.copy(SEED_POS);
    d.signature.scale = 1;
    d.signature.visibility = lerp(0.55, 1, smoothstep(0.3, 0.9, p));
    d.signature.emission = lerp(EMISSION.G1 * 0.45, EMISSION.G1, smoothstep(0.8, 1, p)) + absorbing * EMISSION.G1 * 0.8;
    d.signature.absorb = absorbing * 0.85;
    this.tmp.set(COOL_ACCENT);
    d.signature.accentA.copy(this.tmp).lerp(this.warm, smoothstep(0.5, 0.62, p) * (1 - smoothstep(0.82, 1, p)));

    d.post.bloom = 0.22 + absorbing * 0.25;
  }
}

export default () => new Scene0Boot();
