/**
 * WORLD 6 — MAVIRA OS  (doc 2 §7, doc 11 §8, doc 12 §8, doc 13 E-04/P-04, doc 14 SOC-6, doc 15 §7)
 *
 * "Stability replaces fragmentation through security barriers and core assembly."
 * Arc: instability → fragmentation → metallic assembly → security calm → silence.
 *
 *   0.00–0.25 instability: contained signal distortion, glitch dust, fractured kernel pieces drift misaligned
 *   0.12–0.48 boot strata (Debian live-build) slide into alignment; broken boot lines become continuous
 *   0.42–0.64 the kernel frame assembles piece by piece around the signature core; seams light as pieces lock
 *   0.56–0.68 AppArmor barriers rise (translucent, minimal emission); one precise Fail2Ban detection flare;
 *             ambient noise falls away (performance & usability as visual calm)
 *   0.68+     title climax → near-silence → dossier
 *   exit      (TX-Absorb) the stability pattern flows into the signature; geometry dissolves into the next fog.
 */
import {
  BoxGeometry,
  CatmullRomCurve3,
  Color,
  Euler,
  InstancedMesh,
  Matrix4,
  Quaternion,
  Vector3,
  type MeshStandardMaterial,
} from 'three';
import type { SceneContext, SceneFrame } from '../../../../types/scene';
import { BaseScene } from '../../BaseScene';
import { Dossier } from '../shared/Dossier';
import { EnergyLines, Glow, Panes, alloy, stone } from '../../../systems/ArchitectureViz';
import { MorphPoints } from '../../../systems/ParticleSystem/MorphPoints';
import type { TextBlock } from '../../../ui/CinematicTextLayer';
import { getProject } from '../../../../content/projects';
import { EMISSION, FOG, GLOW, LENS, PARTICLE } from '../../../../tokens/tokens';
import { PALETTES } from '../../../../tokens/palettes';
import { beat, bell, clamp, envelope, hash1, lerp, smoothstep } from '../../../../utils/math';
import { easeInOutPremium, easeOutPremium } from '../../../../utils/easing';
import { shotTrack, type ShotOut } from '../../../../utils/timeline';
import { rng } from '../../../../utils/rng';

const CORE = new Vector3(0, 0.6, -4);
const STEEL = PALETTES.mavira.accentA;
const CYAN = PALETTES.mavira.accentB;
const FRAME_W = 3.4;
const FRAME_H = 6.4;
const BAR = 0.55;
const DEPTH = 0.9;
const STRATA = 7;

interface Piece {
  /** locked (assembled) transform, world space */
  pos: Vector3;
  size: Vector3;
  /** fractured offset + rotation */
  off: Vector3;
  rot: Euler;
  order: number;
  stone: boolean;
}

class MaviraWorld extends BaseScene {
  private project = getProject('mavira');
  private dossier!: Dossier;
  private pieces: Piece[] = [];
  private alloyMesh!: InstancedMesh;
  private stoneMesh!: InstancedMesh;
  private strataMesh!: InstancedMesh;
  private strataOff: Float32Array = new Float32Array(0);
  private mats: MeshStandardMaterial[] = [];
  private seams!: EnergyLines;
  private bootLines!: EnergyLines;
  private barriers!: Panes;
  private flare!: Glow;
  private glitch!: MorphPoints;
  private absorbFlow!: MorphPoints;
  private labels: TextBlock[] = [];

  private shot = shotTrack([
    { at: 0.0, position: [1.8, -1.7, 8.6], target: [0, -1.0, -4], lens: LENS.wide + 8 },
    { at: 0.3, position: [1.3, -1.3, 8.2], target: [0, -0.7, -4], lens: LENS.mid - 2 },
    { at: 0.55, position: [0.5, -0.3, 9], target: [0, 0.2, -4], lens: LENS.mid + 1 },
    { at: 0.74, position: [0, 0.5, 9.8], target: [0, 0.7, -4], lens: LENS.mid + 5 },
    { at: 1.0, position: [0.3, 0.55, 9.6], target: [0, 0.7, -4], lens: LENS.mid + 5 },
  ]);
  private shotOut: ShotOut = { position: new Vector3(), target: new Vector3(), fov: 35, roll: 0 };
  private m = new Matrix4();
  private q = new Quaternion();
  private q2 = new Quaternion();
  private e = new Euler();
  private v = new Vector3();
  private sc = new Vector3();
  private harshDir = new Vector3(-0.9, 0.25, 0.35).normalize();
  private stableDir = new Vector3(0, 0.85, 0.5).normalize();
  private cSteel = new Color(STEEL);
  private cCyan = new Color(CYAN);

  constructor() {
    super('mavira', 'mavira');
  }

  protected build(ctx: SceneContext): void {
    const r = rng(0x3a71);
    const u = ctx.uniforms;

    /* ── E-04 hardened kernel: a monolithic frame sliced into fractured pieces ── */
    const segH = FRAME_H / 6;
    const innerW = FRAME_W - BAR * 2;
    const add = (x: number, y: number, w: number, h: number, order: number) => {
      const [ox, oy, oz] = r.onSphere(r.range(1.8, 4.5));
      this.pieces.push({
        pos: new Vector3(CORE.x + x, CORE.y + y, CORE.z),
        size: new Vector3(w * 0.985, h * 0.97, DEPTH),
        off: new Vector3(ox * 1.2, oy * 0.8, oz * 0.6 + 0.8),
        rot: new Euler(r.range(-0.9, 0.9), r.range(-0.9, 0.9), r.range(-0.6, 0.6)),
        order,
        stone: this.pieces.length % 2 === 1,
      });
    };
    for (let k = 0; k < 6; k++) {
      const y = -FRAME_H / 2 + segH * (k + 0.5);
      const ord = k / 7;
      add(-(FRAME_W - BAR) / 2, y, BAR, segH, ord);
      add((FRAME_W - BAR) / 2, y, BAR, segH, ord + 0.03);
    }
    for (let k = 0; k < 3; k++) {
      const x = -innerW / 2 + (innerW / 3) * (k + 0.5);
      add(x, -FRAME_H / 2 + BAR / 2, innerW / 3, BAR, 0.02 + k * 0.02);
      add(x, FRAME_H / 2 - BAR / 2, innerW / 3, BAR, 0.86 + k * 0.04);
    }
    const box = this.track(new BoxGeometry(1, 1, 1));
    const alloyMat = this.track(alloy({ color: '#2b3038', roughness: 0.4 }));
    const stoneMat = this.track(stone({ color: '#17191d', roughness: 0.92 }));
    alloyMat.transparent = stoneMat.transparent = true;
    this.mats.push(alloyMat, stoneMat);
    const nAlloy = this.pieces.filter((p) => !p.stone).length;
    this.alloyMesh = new InstancedMesh(box, alloyMat, nAlloy);
    this.stoneMesh = new InstancedMesh(box, stoneMat, this.pieces.length - nAlloy);
    this.track({ dispose: () => (this.alloyMesh.dispose(), this.stoneMesh.dispose()) });
    this.add(this.alloyMesh, this.stoneMesh);

    /* ── seams that light as the pieces lock (barrier lines on the frame's inner edges + joints) ── */
    const z = CORE.z + DEPTH / 2 + 0.01;
    const seamCurves: CatmullRomCurve3[] = [];
    const seamOrder: number[] = [];
    for (const side of [-1, 1]) {
      const x = side * (innerW / 2);
      seamCurves.push(new CatmullRomCurve3([new Vector3(CORE.x + x, CORE.y - FRAME_H / 2 + BAR, z), new Vector3(CORE.x + x, CORE.y + FRAME_H / 2 - BAR, z)]));
      seamOrder.push(0.2);
      for (let k = 1; k < 6; k++) {
        const y = CORE.y - FRAME_H / 2 + segH * k;
        const x0 = side * (FRAME_W / 2);
        seamCurves.push(new CatmullRomCurve3([new Vector3(CORE.x + x0, y, z), new Vector3(CORE.x + x, y, z)]));
        seamOrder.push(k / 7);
      }
    }
    for (const y of [-1, 1]) {
      const yy = CORE.y + y * (FRAME_H / 2 - BAR);
      seamCurves.push(new CatmullRomCurve3([new Vector3(CORE.x - innerW / 2, yy, z), new Vector3(CORE.x + innerW / 2, yy, z)]));
      seamOrder.push(y < 0 ? 0.1 : 0.9);
    }
    this.seams = this.track(new EnergyLines(u, { curves: seamCurves, radius: 0.009, order: seamOrder, colorA: CYAN, colorB: '#d8f4ff', stagger: 0.6, tubularSegments: 8 }));
    this.seams.uniforms.uPulseAmount.value = 0.2;
    this.add(this.seams.mesh);

    /* ── boot strata (Debian live-build): stacked terraces that slide into alignment ── */
    const slab = this.track(new BoxGeometry(1, 1, 1));
    const strataMat = this.track(stone({ color: '#14171b', roughness: 0.95 }));
    strataMat.transparent = true;
    this.mats.push(strataMat);
    this.strataMesh = new InstancedMesh(slab, strataMat, STRATA);
    this.strataOff = new Float32Array(STRATA * 3);
    const bootCurves: CatmullRomCurve3[] = [];
    for (let k = 0; k < STRATA; k++) {
      this.strataOff[k * 3] = r.sign() * r.range(0.5, 1.4);
      this.strataOff[k * 3 + 1] = r.range(-0.1, 0.1);
      this.strataOff[k * 3 + 2] = r.range(-0.05, 0.05);
      const w = 9.5 - k * 0.7;
      const yy = -2.95 + k * 0.2;
      const zz = 0.4 - k * 0.85;
      bootCurves.push(new CatmullRomCurve3([new Vector3(-w / 2, yy + 0.085, zz + 0.81), new Vector3(w / 2, yy + 0.085, zz + 0.81)]));
    }
    this.add(this.strataMesh);
    this.track({ dispose: () => this.strataMesh.dispose() });
    this.bootLines = this.track(
      new EnergyLines(u, { curves: bootCurves, radius: 0.007, order: bootCurves.map((_, k) => k / STRATA), colorA: '#8fdcef', colorB: CYAN, stagger: 0.5, tubularSegments: 24 }),
    );
    this.add(this.bootLines.mesh);

    /* ── AppArmor policies: translucent enforcement barriers (glass only here) ── */
    this.barriers = this.track(new Panes(u, { count: 3, width: 3.4, height: 6.6, colorA: '#9fe7ff', colorB: '#c9d6e6', opacity: 0.06, lines: 0, additive: true }));
    this.barriers.setInstance(0, CORE.x - 3.6, CORE.y, CORE.z - 0.4, 0, 0.95, 0);
    this.barriers.setInstance(1, CORE.x + 3.6, CORE.y, CORE.z - 0.4, 0, -0.95, 0);
    this.barriers.setInstance(2, CORE.x, CORE.y, CORE.z - 1.8, 0, 0, 0, 1.5, 1);
    this.barriers.commit();
    this.barriers.uniforms.uEdge.value = 0.45;
    this.add(this.barriers.mesh);

    /* ── Fail2Ban: one precise detection flare ── */
    this.flare = this.track(new Glow(u, { size: 0.55, color: '#d6f6ff', intensity: 0, falloff: 6 }));
    this.flare.mesh.position.set(CORE.x + 2.95, CORE.y + 1.6, CORE.z + 1.2);
    this.add(this.flare.mesh);

    /* ── glitch dust (contained) ── */
    const ng = ctx.quality.count(1400);
    const gs = new Float32Array(ng * 3);
    for (let i = 0; i < ng; i++) {
      const [x, y, zz] = r.inSphere(7);
      gs[i * 3] = CORE.x + x;
      gs[i * 3 + 1] = CORE.y + y * 0.6 - 0.6;
      gs[i * 3 + 2] = CORE.z + zz * 0.6 + 1;
    }
    this.glitch = this.track(new MorphPoints(u, { start: gs, end: gs.slice(), colorA: '#cfe3ee', colorB: '#8fdcef', size: 0.022, stagger: 0, swirl: 0, drift: 0.12 }));
    this.add(this.glitch.points);

    /* ── exit: the stability pattern flows into the signature ── */
    const na = ctx.quality.count(1200);
    const as = new Float32Array(na * 3);
    const ae = new Float32Array(na * 3);
    for (let i = 0; i < na; i++) {
      const pc = this.pieces[i % this.pieces.length];
      as[i * 3] = pc.pos.x + r.range(-0.5, 0.5) * pc.size.x;
      as[i * 3 + 1] = pc.pos.y + r.range(-0.5, 0.5) * pc.size.y;
      as[i * 3 + 2] = pc.pos.z + DEPTH / 2;
      const [x, y, zz] = r.inSphere(0.3);
      ae[i * 3] = CORE.x + x;
      ae[i * 3 + 1] = CORE.y + y * 1.6;
      ae[i * 3 + 2] = CORE.z + zz;
    }
    this.absorbFlow = this.track(new MorphPoints(u, { start: as, end: ae, colorA: '#d8f4ff', colorB: CYAN, size: 0.028, stagger: 0.55, swirl: 0.45 }));
    this.absorbFlow.setFadeWindow(0.85, 1);
    this.add(this.absorbFlow.points);

    /* ── sparse in-world signage (resume vocabulary) ── */
    const label = (text: string, at: Vector3) => {
      const b = this.text({ text, style: 'label', slot: 'anchor', accent: CYAN, stagger: 0.3 });
      b.anchor = at;
      this.labels.push(b);
    };
    label('live-build', new Vector3(-3.2, -2.35, 0.9));
    label('AppArmor', new Vector3(CORE.x - 3.6, CORE.y + 3.6, CORE.z - 0.4));
    label('Fail2Ban', new Vector3(CORE.x + 3.4, CORE.y + 2.25, CORE.z + 1.2));

    this.dossier = new Dossier(
      { text: (o) => this.text(o), portal: (o) => this.portal(o), dust: (b, o) => this.dust(b, o) },
      this.project,
      { accent: '#a6ecff', accentB: '#c9d6e6' },
    );
  }

  update(f: SceneFrame): void {
    const p = f.progress;
    const d = this.directives;
    const rm = f.reducedMotion;
    const enter = f.enter;
    const exit = f.exit;
    const t = f.time;

    const instability = 1 - smoothstep(0.3, 0.62, p);
    const strataAlign = beat(p, 0.12, 0.48, easeInOutPremium);
    const assemble = beat(p, 0.42, 0.64);
    const barrier = beat(p, 0.56, 0.66, easeOutPremium);
    const stable = smoothstep(0.6, 0.7, p);
    const climax = bell(p, 0.73, 0.06);
    const dossier = Dossier.presence(p);
    const gone = beat(exit, 0.1, 0.8);
    const glitchOn = rm ? 0 : 1;
    // contained glitch windows (short, never strobing): stepped hash at 9 Hz, only while unstable
    const tick = Math.floor(t * 9);
    const window = hash1(Math.floor(t * 1.3)) > 0.55 ? 1 : 0;

    /* ── kernel pieces: fractured & jittering → locked ── */
    let ai = 0;
    let si = 0;
    for (let i = 0; i < this.pieces.length; i++) {
      const pc = this.pieces[i];
      const a = easeInOutPremium(clamp(assemble * 1.6 - pc.order * 0.6));
      const jit = (1 - a) * instability * glitchOn * window * 0.07;
      this.v.copy(pc.pos).addScaledVector(pc.off, 1 - a);
      this.v.x += (hash1(tick + i * 13) - 0.5) * jit;
      this.v.y += (hash1(tick * 3 + i * 7) - 0.5) * jit;
      this.e.set(pc.rot.x * (1 - a), pc.rot.y * (1 - a), pc.rot.z * (1 - a));
      this.q.setFromEuler(this.e);
      const s = 1 - gone * 0.15;
      this.sc.set(pc.size.x * s, pc.size.y * s, pc.size.z * s);
      this.m.compose(this.v, this.q, this.sc);
      if (pc.stone) this.stoneMesh.setMatrixAt(si++, this.m);
      else this.alloyMesh.setMatrixAt(ai++, this.m);
    }
    this.alloyMesh.instanceMatrix.needsUpdate = true;
    this.stoneMesh.instanceMatrix.needsUpdate = true;

    /* ── strata: misaligned terraces → aligned ── */
    for (let k = 0; k < STRATA; k++) {
      const a = easeInOutPremium(clamp(strataAlign * 1.5 - (k / STRATA) * 0.5));
      const w = 9.5 - k * 0.7;
      const jit = (1 - a) * instability * glitchOn * window * 0.04;
      this.v.set(this.strataOff[k * 3] * (1 - a) + (hash1(tick + k) - 0.5) * jit, -2.95 + k * 0.2, 0.4 - k * 0.85);
      this.e.set(0, this.strataOff[k * 3 + 1] * (1 - a), this.strataOff[k * 3 + 2] * (1 - a));
      this.q2.setFromEuler(this.e);
      this.sc.set(w, 0.17, 1.6);
      this.m.compose(this.v, this.q2, this.sc);
      this.strataMesh.setMatrixAt(k, this.m);
    }
    this.strataMesh.instanceMatrix.needsUpdate = true;

    const solid = enter * (1 - gone);
    for (const mat of this.mats) mat.opacity = solid;
    this.alloyMesh.visible = this.stoneMesh.visible = this.strataMesh.visible = solid > 0.01;

    /* ── light lines: broken boot lines → continuous; seams light as pieces lock ── */
    this.bootLines.draw = lerp(0.35, 1, strataAlign);
    this.bootLines.opacity = enter * (1 - 0.6 * dossier) * (1 - gone);
    this.bootLines.uniforms.uFlicker.value = 0.5 * instability * glitchOn;
    this.bootLines.uniforms.uIntensity.value = 0.5 + 0.4 * strataAlign;
    this.seams.draw = beat(p, 0.5, 0.68);
    this.seams.opacity = enter * (1 - 0.45 * dossier) * (1 - gone);
    this.seams.uniforms.uIntensity.value = 0.65 + climax * 0.35;
    this.seams.uniforms.uFlow.value = rm ? 0 : 0.08 * (1 - stable);

    /* ── barriers & flare ── */
    this.barriers.mesh.visible = barrier > 0.01;
    const bu = this.barriers.uniforms;
    bu.uOpacity.value = enter * barrier * 0.022 * (1 - 0.4 * dossier) * (1 - gone);
    bu.uScanDir.value.set(0, 1, 0);
    bu.uScanPos.value = lerp(-3, 5, beat(p, 0.58, 0.7));
    bu.uScanAmount.value = envelope(p, 0.58, 0.61, 0.67, 0.7) * 0.06;
    bu.uScanColor.value.set('#bff0ff');
    this.flare.intensity = enter * bell(p, 0.615, 0.012) * (rm ? 0.45 : 0.85);

    /* ── glitch dust: noise falls away as the system stabilises ── */
    this.glitch.jitter = 0.14 * instability * glitchOn * window;
    this.glitch.opacity = enter * lerp(0.75, 0.08, smoothstep(0.35, 0.68, p)) * (1 - gone);
    this.absorbFlow.mix = beat(exit, 0.05, 0.9);
    this.absorbFlow.opacity = smoothstep(0, 0.1, exit) * 0.9;

    /* ── signage ── */
    this.labels[0].set(envelope(p, 0.26, 0.32, 0.5, 0.56), 0);
    const lateE = beat(p, 0.6, 0.64, easeOutPremium);
    const lateD = beat(p, 0.665, 0.69);
    this.labels[1].set(lateE, lateD);
    this.labels[2].set(beat(p, 0.615, 0.635, easeOutPremium), lateD);

    this.dossier.update(p, exit, this.ctx.signaturePosition);

    /* ── camera: low near the strata → slight lift toward the core; motion nearly stops after the climax ── */
    this.shot(p, this.shotOut);
    d.camera.position.copy(this.shotOut.position);
    d.camera.target.copy(this.shotOut.target);
    d.camera.fov = this.shotOut.fov;
    if (rm) d.camera.position.lerp(this.v.set(0.6, 0, 9.2), 0.35);
    d.camera.roll = 0;

    /* ── light: harsh & unstable → locked to the monolith's axes → soft rim, controlled bloom ── */
    const harsh = (hash1(tick * 5) - 0.5) * 0.45 * instability * glitchOn * window;
    d.lighting.keyDirection.copy(this.harshDir).lerp(this.stableDir, stable).normalize();
    d.lighting.keyIntensity = lerp(1.15, 0.95, stable) + harsh;
    d.lighting.rimIntensity = lerp(0.3, 0.75, stable);
    d.lighting.ambientIntensity = lerp(0.18, 0.26, stable);
    d.lighting.pointerInfluence = lerp(0.5, 0.9, stable);

    /* ── fog masks the glitches early, then drops sharply once the core assembles ── */
    d.fog.density = lerp(FOG.F2 * 1.25, FOG.F1 * 0.7, smoothstep(0.52, 0.66, p)) + (1 - enter) * FOG.F2;
    d.fog.curtain = 0;
    d.sky.rays = 0;
    d.sky.intensity = 1;

    d.particles.density = lerp(PARTICLE.P3.density, PARTICLE.P1.density * 0.5, smoothstep(0.3, 0.68, p));
    d.particles.speed = rm ? PARTICLE.P1.speed : lerp(PARTICLE.P3.speed, PARTICLE.P1.speed * 0.5, stable);
    d.particles.focus = lerp(10, 13.8, smoothstep(0.3, 0.7, p));
    d.particles.aperture = 0.5 + (1 - enter) * 0.6;
    d.particles.intensity = lerp(0.75, 0.4, stable) * (1 - 0.3 * dossier);
    d.particles.flow.set(0, 0, 0);

    /* ── signature: SOC-6 hardened kernel monolith at the core; stillness after assembly ── */
    d.signature.soc = 6;
    d.signature.position.copy(CORE);
    d.signature.scale = 0.95;
    d.signature.visibility = lerp(0.3, 1, smoothstep(0.45, 0.62, p));
    d.signature.emission = lerp(EMISSION.G1 * 0.5, EMISSION.G1, stable) + climax * (EMISSION.G2 - EMISSION.G1) * 0.8 - dossier * EMISSION.G1 * 0.2;
    d.signature.absorb = bell(p, 0.6, 0.05) * 0.35;
    d.signature.accentA.copy(this.cCyan);
    d.signature.accentB.copy(this.cSteel);
    d.signature.spin = 0;

    d.post.bloom = GLOW.G1 * 0.8 + climax * (GLOW.G2 - GLOW.G1) * (rm ? 0.6 : 1);
    d.post.vignette = 0.6;
    d.post.exposure = 1;
    d.post.grain = 0.035 + 0.02 * instability * glitchOn;
  }
}

export default () => new MaviraWorld();
