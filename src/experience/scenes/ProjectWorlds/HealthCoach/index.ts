/**
 * WORLD 7 — PERSONAL HEALTH COACH  (doc 2 §8, doc 11 §9, doc 12 §9, doc 14 SOC-7, doc 15 §8)
 *
 * "Fragmented memories compress into coherent guidance — calm replaces cold darkness."
 * Arc: fragmentation → gentle compression → warmth → continuous knowledge flow → peace.
 *
 *   0.00–0.25 cold darkness: memory shards drift independently
 *   0.25–0.48 gentle compression: shards fold onto curved surfaces around the knowledge chamber (memory compression)
 *   0.46–0.62 the folds merge into ONE continuous knowledge ribbon (streaming responses); warmth arrives
 *   0.55–0.68 cooperative agent threads intertwine with the ribbon; energy stays restrained (cost-aware: never overdraws)
 *   0.68+     title climax → peace → dossier
 *   exit      (TX-Dissolve) the ribbon steadies, its light flows into the signature, the world quiets.
 */
import { CatmullRomCurve3, Color, Vector3 } from 'three';
import type { SceneContext, SceneFrame } from '../../../../types/scene';
import { BaseScene } from '../../BaseScene';
import { Dossier } from '../shared/Dossier';
import { EnergyLines, Panes } from '../../../systems/ArchitectureViz';
import { MorphPoints } from '../../../systems/ParticleSystem/MorphPoints';
import { getProject } from '../../../../content/projects';
import { EMISSION, FOG, GLOW, LENS, PARTICLE, TEMPERATURE } from '../../../../tokens/tokens';
import { PALETTES } from '../../../../tokens/palettes';
import { beat, bell, clamp, lerp, smoothstep } from '../../../../utils/math';
import { easeInOutPremium } from '../../../../utils/easing';
import { colorTrack, shotTrack, type ShotOut } from '../../../../utils/timeline';
import { rng } from '../../../../utils/rng';

const CHAMBER = new Vector3(0, 0.4, -3);
const ROSE = PALETTES.healthcoach.accentA;
const DEEP_CYAN = PALETTES.healthcoach.accentB;
const COLD = '#6f9fc0';

/** The knowledge ribbon: one continuous, unbroken loop around the receiving volume. */
function ribbonPoint(a: number, lift = 0, radial = 0, out = new Vector3()): Vector3 {
  const r = 2.25 + 0.32 * Math.sin(2 * a) + radial;
  return out.set(
    CHAMBER.x + Math.cos(a) * r,
    CHAMBER.y + Math.sin(2 * a) * 0.5 + Math.sin(a) * 0.22 + lift,
    CHAMBER.z + Math.sin(a) * r * 0.72,
  );
}

class HealthCoachWorld extends BaseScene {
  private project = getProject('healthcoach');
  private dossier!: Dossier;
  private shards!: Panes;
  private scatter: Float32Array = new Float32Array(0);
  private fold: Float32Array = new Float32Array(0);
  private shardOrder: Float32Array = new Float32Array(0);
  private ribbon!: EnergyLines;
  private threads!: EnergyLines;
  private arcs!: EnergyLines;
  private forming!: MorphPoints;
  private release!: MorphPoints;

  private shot = shotTrack([
    { at: 0.0, position: [0, 3.3, 12.8], target: [0, 0.2, -3], lens: LENS.wide + 6 },
    { at: 0.4, position: [1.3, 2.9, 11.2], target: [0, 0.3, -3], lens: LENS.wide + 8 },
    { at: 0.62, position: [0.7, 2.5, 10.2], target: [0, 0.45, -3], lens: LENS.mid },
    { at: 0.76, position: [0, 2.1, 9.7], target: [0, 0.6, -3], lens: LENS.mid + 3 },
    { at: 1.0, position: [-0.8, 2.05, 9.5], target: [0, 0.6, -3], lens: LENS.mid + 3 },
  ]);
  private shotOut: ShotOut = { position: new Vector3(), target: new Vector3(), fov: 35, roll: 0 };
  private key = colorTrack([
    { at: 0, value: '#9fb7d6' },
    { at: 0.3, value: '#b7c3d9' },
    { at: 0.6, value: TEMPERATURE.warm3500 },
    { at: 1, value: TEMPERATURE.warm3500 },
  ]);
  private ambient = colorTrack([
    { at: 0, value: '#0c1220' },
    { at: 0.6, value: PALETTES.healthcoach.ambient },
    { at: 1, value: PALETTES.healthcoach.ambient },
  ]);
  private v = new Vector3();
  private cCold = new Color(COLD);
  private cRose = new Color(ROSE);
  private cCyan = new Color(DEEP_CYAN);

  constructor() {
    super('healthcoach', 'healthcoach');
  }

  protected build(ctx: SceneContext): void {
    const r = rng(0x4ea1);
    const u = ctx.uniforms;

    /* ── memory shards: independent fragments in cold darkness → curved folds (compression) ── */
    const ns = ctx.quality.count(240);
    this.shards = this.track(new Panes(u, { count: ns, width: 0.32, height: 0.46, colorA: COLD, colorB: '#9fc3dc', opacity: 0.2, lines: 0.15, additive: true }));
    this.scatter = new Float32Array(ns * 6);
    this.fold = new Float32Array(ns * 6);
    this.shardOrder = new Float32Array(ns);
    for (let i = 0; i < ns; i++) {
      const [x, y, z] = r.onSphere(r.range(3.8, 11));
      this.scatter[i * 6] = CHAMBER.x + x;
      this.scatter[i * 6 + 1] = CHAMBER.y + y * 0.6;
      this.scatter[i * 6 + 2] = CHAMBER.z + z * 0.8;
      this.scatter[i * 6 + 3] = r.range(-1.2, 1.2);
      this.scatter[i * 6 + 4] = r.range(-1.2, 1.2);
      this.scatter[i * 6 + 5] = r.range(-1.2, 1.2);
      // folds: three nested curved surfaces wrapping the receiving volume
      const R = [2.4, 2.95, 3.5][i % 3];
      const ua = r.range(-1.9, 1.9) + Math.PI / 2;
      const va = r.range(-0.55, 0.55);
      this.fold[i * 6] = CHAMBER.x + Math.cos(ua) * Math.cos(va) * R;
      this.fold[i * 6 + 1] = CHAMBER.y + Math.sin(va) * R * 0.75;
      this.fold[i * 6 + 2] = CHAMBER.z - Math.sin(ua) * Math.cos(va) * R * 0.8;
      this.fold[i * 6 + 3] = -va;
      this.fold[i * 6 + 4] = ua - Math.PI / 2;
      this.fold[i * 6 + 5] = 0;
      this.shardOrder[i] = r.next();
      this.shards.tint.setX(i, r.next());
    }
    this.shards.commit(false, true);
    this.add(this.shards.mesh);

    /* ── the continuous knowledge ribbon (five parallel strands read as one band) ── */
    const steps = 120;
    const strands: CatmullRomCurve3[] = [];
    for (let k = 0; k < 5; k++) {
      const pts: Vector3[] = [];
      for (let s = 0; s < steps; s++) pts.push(ribbonPoint((s / steps) * Math.PI * 2, (k - 2) * 0.055, (k - 2) * 0.02));
      strands.push(new CatmullRomCurve3(pts, true));
    }
    this.ribbon = this.track(
      new EnergyLines(u, { curves: strands, radius: 0.016, order: [0.1, 0.05, 0, 0.05, 0.1], tint: [0, 0.25, 0.5, 0.75, 1], colorA: ROSE, colorB: DEEP_CYAN, stagger: 0.15, tubularSegments: 240 }),
    );
    this.ribbon.uniforms.uPulses.value = 3;
    this.ribbon.uniforms.uPulseAmount.value = 0.22;
    this.add(this.ribbon.mesh);

    /* ── cooperative agent threads, intertwining with the ribbon ── */
    const threadCurves: CatmullRomCurve3[] = [];
    for (let k = 0; k < 3; k++) {
      const pts: Vector3[] = [];
      for (let s = 0; s < steps; s++) {
        const a = (s / steps) * Math.PI * 2;
        const ph = 7 * a + (k * Math.PI * 2) / 3;
        pts.push(ribbonPoint(a, Math.sin(ph) * 0.2, Math.cos(ph) * 0.2));
      }
      threadCurves.push(new CatmullRomCurve3(pts, true));
    }
    this.threads = this.track(new EnergyLines(u, { curves: threadCurves, radius: 0.006, order: [0, 0.3, 0.6], tint: [0.2, 0.5, 0.8], colorA: '#ffd3dd', colorB: '#a6e2ee', stagger: 0.3, tubularSegments: 360 }));
    this.add(this.threads.mesh);

    /* ── knowledge chamber: a few gentle glass boundaries ── */
    const arcCurves = [0, 1, 2].map((k) => {
      const pts: Vector3[] = [];
      const tilt = (k - 1) * 0.5;
      for (let s = 0; s <= 40; s++) {
        const a = Math.PI * (0.1 + 0.8 * (s / 40));
        const R = 3.9 + k * 0.35;
        pts.push(new Vector3(CHAMBER.x + Math.cos(a) * R, CHAMBER.y + Math.sin(a) * R * 0.62 * Math.cos(tilt) - 1.1, CHAMBER.z - Math.sin(a) * R * Math.sin(tilt) * 0.5 - 1.2 - k * 0.6));
      }
      return new CatmullRomCurve3(pts);
    });
    this.arcs = this.track(new EnergyLines(u, { curves: arcCurves, radius: 0.007, order: [0, 0.5, 1], colorA: '#f6c3d1', colorB: '#9fd2e0', stagger: 0.4 }));
    this.arcs.uniforms.uPulseAmount.value = 0;
    this.add(this.arcs.mesh);

    /* ── folds → ribbon: particles carry the compressed memories into the continuous flow ── */
    const np = ctx.quality.count(1600);
    const fs = new Float32Array(np * 3);
    const fe = new Float32Array(np * 3);
    for (let i = 0; i < np; i++) {
      const j = Math.floor(r.next() * ns);
      fs[i * 3] = this.fold[j * 6] + r.range(-0.15, 0.15);
      fs[i * 3 + 1] = this.fold[j * 6 + 1] + r.range(-0.15, 0.15);
      fs[i * 3 + 2] = this.fold[j * 6 + 2] + r.range(-0.15, 0.15);
      ribbonPoint(r.next() * Math.PI * 2, r.range(-0.12, 0.12), r.range(-0.04, 0.04), this.v);
      fe[i * 3] = this.v.x;
      fe[i * 3 + 1] = this.v.y;
      fe[i * 3 + 2] = this.v.z;
    }
    this.forming = this.track(new MorphPoints(u, { start: fs, end: fe, colorA: '#ffc2d2', colorB: '#a6e2ee', size: 0.026, stagger: 0.6, swirl: 0.5, drift: 0.04 }));
    this.forming.setFadeWindow(0.86, 1);
    this.add(this.forming.points);

    /* ── exit: ribbon light flows into the signature (completion toward SOC-8) ── */
    const re = new Float32Array(np * 3);
    for (let i = 0; i < np; i++) {
      const [x, y, z] = r.inSphere(0.3);
      re[i * 3] = CHAMBER.x + x;
      re[i * 3 + 1] = CHAMBER.y + y * 1.6;
      re[i * 3 + 2] = CHAMBER.z + z;
    }
    this.release = this.track(new MorphPoints(u, { start: fe.slice(), end: re, colorA: '#ffd9e2', colorB: '#a6e2ee', size: 0.026, stagger: 0.55, swirl: 0.35 }));
    this.release.setFadeWindow(0.85, 1);
    this.add(this.release.points);

    this.dossier = new Dossier(
      { text: (o) => this.text(o), portal: (o) => this.portal(o), dust: (b, o) => this.dust(b, o) },
      this.project,
      { accent: '#f6b2c5', accentB: '#8fd0e0', lines: ['PERSONAL', 'HEALTH COACH'] },
    );
  }

  update(f: SceneFrame): void {
    const p = f.progress;
    const d = this.directives;
    const rm = f.reducedMotion;
    const enter = f.enter;
    const exit = f.exit;
    const t = f.time;

    const compress = beat(p, 0.24, 0.5);
    const flow = beat(p, 0.46, 0.62);
    const warmth = smoothstep(0.3, 0.66, p);
    const climax = bell(p, 0.73, 0.06);
    const dossier = Dossier.presence(p);
    const quiet = beat(exit, 0, 0.6);
    // the pointer warms the scene slightly (doc 2 §8 interactive behaviour)
    const touch = rm ? 0 : (f.pointer.y * 0.5 + 0.5) * 0.08;

    /* ── shards: drift independently → fold → dissolve into the ribbon ── */
    const n = this.shardOrder.length;
    const drift = rm ? 0.2 : 1;
    for (let i = 0; i < n; i++) {
      const o = this.shardOrder[i];
      const a = easeInOutPremium(clamp(compress * 1.5 - o * 0.5));
      const sx = this.scatter[i * 6] + Math.sin(t * 0.11 + i) * 0.25 * drift;
      const sy = this.scatter[i * 6 + 1] + Math.cos(t * 0.09 + i * 1.7) * 0.2 * drift;
      const sz = this.scatter[i * 6 + 2];
      const x = lerp(sx, this.fold[i * 6], a);
      const y = lerp(sy, this.fold[i * 6 + 1], a);
      const z = lerp(sz, this.fold[i * 6 + 2], a);
      const rx = lerp(this.scatter[i * 6 + 3] + t * 0.02 * drift, this.fold[i * 6 + 3], a);
      const ry = lerp(this.scatter[i * 6 + 4], this.fold[i * 6 + 4], a);
      const rz = lerp(this.scatter[i * 6 + 5], 0, a);
      // memory compression: many shards → fewer, denser forms
      const sc = lerp(1, 0.7, a) * (1 - smoothstep(o * 0.1 + 0.48, o * 0.1 + 0.6, p) * 0.9);
      this.shards.setInstance(i, x, y, z, rx, ry, rz, sc, sc);
    }
    this.shards.commit(true, false);
    const su = this.shards.uniforms;
    (su.uColorA.value as Color).copy(this.cCold).lerp(this.cRose, warmth);
    (su.uColorB.value as Color).set('#9fc3dc').lerp(this.cCyan, warmth);
    su.uOpacity.value = enter * lerp(0.22, 0.3, compress) * (1 - smoothstep(0.5, 0.66, p) * 0.85) * (1 - quiet);
    su.uDrift.value = rm ? 0.03 : 0.1;

    /* ── ribbon: forms continuously, then flows steadily — no spikes, never overdraws ── */
    this.forming.mix = flow;
    this.forming.opacity = enter * smoothstep(0.44, 0.5, p) * (1 - smoothstep(0.6, 0.68, p) * 0.85) * 0.9;
    this.ribbon.draw = beat(p, 0.5, 0.64);
    this.ribbon.opacity = enter * (1 - 0.45 * dossier) * (1 - quiet);
    const ru = this.ribbon.uniforms;
    ru.uFlow.value = rm ? 0.03 : 0.1;
    ru.uIntensity.value = 0.75 + 0.15 * warmth + touch;
    this.threads.draw = beat(p, 0.56, 0.66);
    this.threads.opacity = enter * 0.7 * (1 - 0.5 * dossier) * (1 - quiet);
    this.threads.uniforms.uFlow.value = rm ? 0.03 : 0.08;
    this.arcs.draw = beat(p, 0.3, 0.5);
    this.arcs.opacity = enter * lerp(0.1, 0.22, warmth) * (1 - 0.5 * dossier) * (1 - quiet);
    this.arcs.uniforms.uIntensity.value = 0.45;
    this.release.mix = beat(exit, 0.05, 0.9);
    this.release.opacity = smoothstep(0, 0.1, exit) * 0.85;

    this.dossier.update(p, exit, this.ctx.signaturePosition);

    /* ── camera: slightly above the receiving volume, calm, orbit-ready; more negative space ── */
    this.shot(p, this.shotOut);
    d.camera.position.copy(this.shotOut.position);
    d.camera.target.copy(this.shotOut.target);
    d.camera.fov = this.shotOut.fov;
    if (rm) d.camera.position.lerp(this.v.set(0, 2.6, 10.8), 0.35);
    // exit: the camera begins to circle slowly (doc 2 §8 transition behaviour)
    if (exit > 0 && !rm) {
      const ang = exit * 0.35;
      const dx = d.camera.position.x - CHAMBER.x;
      const dz = d.camera.position.z - CHAMBER.z;
      d.camera.position.x = CHAMBER.x + dx * Math.cos(ang) - dz * Math.sin(ang);
      d.camera.position.z = CHAMBER.z + dx * Math.sin(ang) + dz * Math.cos(ang);
    }
    d.camera.roll = 0;

    /* ── light: cold darkness → warm calm; ambient warms enough for clarity ── */
    this.key(p, d.lighting.keyColor);
    d.lighting.keyIntensity = lerp(0.3, 0.95, warmth) + touch;
    d.lighting.keyDirection.set(-0.35, 0.8, 0.45).normalize();
    this.ambient(p, d.lighting.ambientColor);
    d.lighting.ambientIntensity = lerp(0.18, 0.32, warmth);
    d.lighting.rimIntensity = lerp(0.25, 0.6, warmth);
    d.lighting.pointerInfluence = 0.6;

    /* ── fog: comforting volume that steadily reduces ── */
    d.fog.density = lerp(FOG.F2 * 1.1, FOG.F1 * 0.7, smoothstep(0.1, 0.7, p)) + (1 - enter) * FOG.F2;
    d.fog.curtain = 0;
    d.sky.intensity = lerp(0.55, 1, warmth);
    d.sky.rays = 0;

    /* ── particles: shard dust early → calm ambient motes ── */
    d.particles.density = lerp(PARTICLE.P2.density, PARTICLE.P1.density * 0.7, warmth);
    d.particles.color.set(COLD).lerp(this.cRose, warmth * 0.6);
    d.particles.speed = PARTICLE.P1.speed;
    d.particles.focus = lerp(13, 10.5, smoothstep(0.3, 0.7, p));
    d.particles.aperture = 0.5 + (1 - enter) * 0.6;
    d.particles.intensity = lerp(0.75, 0.45, dossier);
    d.particles.flow.set(0, 0, 0);

    /* ── signature: SOC-7 memory compression ribbon at the receiving volume ── */
    d.signature.soc = 7;
    d.signature.position.copy(CHAMBER);
    d.signature.scale = 0.82;
    d.signature.visibility = lerp(0.3, 1, smoothstep(0.4, 0.62, p));
    d.signature.emission = lerp(EMISSION.G1 * 0.5, EMISSION.G1 * 1.15, warmth) + climax * (EMISSION.G2 - EMISSION.G1) * 0.7 - dossier * EMISSION.G1 * 0.2;
    d.signature.absorb = 0;
    d.signature.accentA.copy(this.cRose);
    d.signature.accentB.copy(this.cCyan);
    d.signature.spin = 0;

    d.post.bloom = GLOW.G1 + climax * (GLOW.G2 - GLOW.G1) * 0.7;
    d.post.vignette = 0.52;
    d.post.exposure = 1;
    d.post.grain = 0.03;
  }
}

export default () => new HealthCoachWorld();
