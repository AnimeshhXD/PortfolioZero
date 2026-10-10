/**
 * WORLD 4 — WORKPLACE OPERATIONS AGENT  (doc 2 §5, doc 11 §6, doc 12 §6, doc 14 SOC-4, doc 15 §5)
 *
 * "AI organises chaos into deterministic outcomes across email, Slack and calendar."
 * Arc: chaos → collision → ordering → alignment → deterministic confidence.
 *
 *   0.00–0.08 entry: message fragments already drifting in violet fog (focus resolves)
 *   0.08–0.25 chaos: email / Slack / calendar fragments drift, protocol beams point every way
 *   0.25–0.42 collision: streams crowd the collision zone, fog rises, some fragments disintegrate
 *   0.42–0.56 ordering: three channels (deterministic rails) resolve; the grading nucleus forms
 *   0.56–0.68 alignment: fragments lock onto the rails, partial-credit light fills them, WebSocket twin
 *             beams and output threads synchronise, the nucleus rings lock; signage EMAIL / SLACK / CALENDAR
 *   0.68+     title climax → dossier (shared Dossier helper)
 *   exit      (TX-Absorb) the nucleus compresses the streams into the signature; the world disassembles
 *             into structured fragments that become the fog curtain.
 */
import {
  BoxGeometry,
  CatmullRomCurve3,
  Color,
  InstancedMesh,
  Matrix4,
  Mesh,
  Quaternion,
  TorusGeometry,
  TubeGeometry,
  Vector3,
  Euler,
  type MeshStandardMaterial,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { SceneContext, SceneFrame } from '../../../../types/scene';
import { BaseScene } from '../../BaseScene';
import { Dossier } from '../shared/Dossier';
import { EnergyLines, LightBeam, Panes, alloy, seam } from '../../../systems/ArchitectureViz';
import { MorphPoints } from '../../../systems/ParticleSystem/MorphPoints';
import type { TextBlock } from '../../../ui/CinematicTextLayer';
import { getProject } from '../../../../content/projects';
import { EMISSION, FOG, GLOW, LENS, PARTICLE } from '../../../../tokens/tokens';
import { PALETTES } from '../../../../tokens/palettes';
import { beat, bell, clamp, envelope, lerp, smoothstep } from '../../../../utils/math';
import { easeInOutPremium, easeOutPremium } from '../../../../utils/easing';
import { shotTrack, type ShotOut } from '../../../../utils/timeline';
import { rng } from '../../../../utils/rng';

const NUCLEUS = new Vector3(0, 0, 0);
const VIOLET = PALETTES.workplace.accentA;
const BLUE = PALETTES.workplace.accentB;
const CHANNEL_Y = [1.55, 0, -1.55] as const;
/** Easy · Medium · Hard — constraint (tie) spacing tightens with difficulty (doc 2 §5). */
const TIE_SPACING = [0.95, 0.6, 0.36] as const;
const CHANNEL_NAMES = ['EMAIL', 'SLACK', 'CALENDAR'] as const;

function channelCurve(i: number): CatmullRomCurve3 {
  const y = CHANNEL_Y[i];
  return new CatmullRomCurve3([
    new Vector3(-18, y * 1.7, -9),
    new Vector3(-11, y * 1.35, -5),
    new Vector3(-5.5, y * 0.95, -2),
    new Vector3(-2.2, y * 0.42, -0.4),
    new Vector3(-0.95, y * 0.12, 0),
  ]);
}

function outputCurve(i: number, spread = 1): CatmullRomCurve3 {
  const y = CHANNEL_Y[i] * spread;
  return new CatmullRomCurve3([
    new Vector3(0.95, y * 0.12, 0),
    new Vector3(4.5, y * 0.75, -1.4),
    new Vector3(10, y * 1.15, -4.2),
    new Vector3(18, y * 1.45, -8),
  ]);
}

class WorkplaceOpsWorld extends BaseScene {
  private project = getProject('workplace');
  private dossier!: Dossier;
  private panes!: Panes;
  private chaos: Float32Array = new Float32Array(0);
  private chaosRot: Float32Array = new Float32Array(0);
  private ordered: Float32Array = new Float32Array(0);
  private orderedYaw: Float32Array = new Float32Array(0);
  private paneOrder: Float32Array = new Float32Array(0);
  private debris!: MorphPoints;
  private streams!: MorphPoints;
  private compress!: MorphPoints;
  private credit!: EnergyLines;
  private outputs!: EnergyLines;
  private twin!: EnergyLines;
  private railMats: MeshStandardMaterial[] = [];
  private railMeshes: Array<Mesh | InstancedMesh> = [];
  private rings: Mesh[] = [];
  private ringMats: MeshStandardMaterial[] = [];
  private ringFrom: Quaternion[] = [];
  private ringTo = new Quaternion();
  private beams: LightBeam[] = [];
  private beamFrom: Vector3[] = [];
  private labels: TextBlock[] = [];

  private shot = shotTrack([
    { at: 0.0, position: [0, 1.4, 16], target: [0, 0.2, -2], lens: LENS.wide + 6 },
    { at: 0.2, position: [-1.2, 1.6, 14.5], target: [-1, 0.2, -2], lens: LENS.wide + 8 },
    { at: 0.4, position: [-1.6, 1.0, 12.4], target: [-1.6, 0, -1.4], lens: LENS.mid },
    { at: 0.6, position: [0, 1.3, 11.6], target: [0, 0.1, 0], lens: LENS.mid + 3 },
    { at: 0.76, position: [0, 1.0, 10.8], target: [0, 0.35, 0], lens: LENS.mid + 5 },
    { at: 1.0, position: [0.6, 1.1, 10.4], target: [0, 0.35, 0], lens: LENS.mid + 5 },
  ]);
  private shotOut: ShotOut = { position: new Vector3(), target: new Vector3(), fov: 35, roll: 0 };
  private v = new Vector3();
  private v2 = new Vector3();
  private q = new Quaternion();
  private m = new Matrix4();
  private keyAligned = new Vector3(-0.45, 0.8, 0.4).normalize();
  private cViolet = new Color(VIOLET);
  private cBlue = new Color(BLUE);

  constructor() {
    super('workplace', 'workplace');
  }

  protected build(ctx: SceneContext): void {
    const r = rng(0x0b5a);
    const u = ctx.uniforms;
    const channels = [0, 1, 2].map((i) => channelCurve(i));

    /* ── deterministic rails (E-03): each channel is a track of two alloy rails + constraint ties ── */
    const railMat = this.track(alloy({ roughness: 0.38 }));
    railMat.transparent = true;
    const tieMat = this.track(alloy({ color: '#30343c', roughness: 0.5 }));
    tieMat.transparent = true;
    this.railMats.push(railMat, tieMat);
    const railGeos: TubeGeometry[] = [];
    const tiePoints: Vector3[] = [];
    channels.forEach((c, i) => {
      for (const off of [-0.17, 0.17]) {
        const pts = c.getPoints(24).map((p) => p.clone().setY(p.y + off));
        railGeos.push(new TubeGeometry(new CatmullRomCurve3(pts), 96, 0.03, 6, false));
      }
      const len = c.getLength();
      const n = Math.floor((len * 0.92) / TIE_SPACING[i]);
      for (let k = 0; k < n; k++) tiePoints.push(c.getPointAt(0.04 + (k / n) * 0.92));
    });
    const railGeo = mergeGeometries(railGeos, false);
    railGeos.forEach((g) => g.dispose());
    if (railGeo) {
      const rails = new Mesh(railGeo, railMat);
      this.track({ dispose: () => railGeo.dispose() });
      this.railMeshes.push(rails);
      this.add(rails);
    }
    const tieGeo = this.track(new BoxGeometry(0.05, 0.38, 0.05));
    const ties = new InstancedMesh(tieGeo, tieMat, tiePoints.length);
    tiePoints.forEach((p, k) => {
      this.m.makeTranslation(p.x, p.y, p.z);
      ties.setMatrixAt(k, this.m);
    });
    ties.instanceMatrix.needsUpdate = true;
    this.track({ dispose: () => ties.dispose() });
    this.railMeshes.push(ties);
    this.add(ties);

    /* ── partial-credit light along each channel (dense reward shaping — light, not charts) ── */
    this.credit = this.track(
      new EnergyLines(u, { curves: channels, radius: 0.02, order: [0, 0.5, 1], tint: [0, 0.5, 1], colorA: VIOLET, colorB: BLUE, stagger: 0.35, tubularSegments: 96 }),
    );
    this.credit.uniforms.uPulses.value = 6;
    this.add(this.credit.mesh);

    /* ── outputs: synchronised threads + WebSocket twin beams ── */
    this.outputs = this.track(
      new EnergyLines(u, { curves: [0, 1, 2].map((i) => outputCurve(i)), radius: 0.016, order: [0, 0.5, 1], colorA: VIOLET, colorB: BLUE, stagger: 0.2 }),
    );
    this.add(this.outputs.mesh);
    const twinCurves = [-0.09, 0.09].map(
      (dy) =>
        new CatmullRomCurve3([
          new Vector3(0.6, dy, 0.35),
          new Vector3(4, dy + 0.25, 1.2),
          new Vector3(9, dy + 0.6, 1.6),
          new Vector3(16, dy + 1.0, 1.0),
        ]),
    );
    this.twin = this.track(new EnergyLines(u, { curves: twinCurves, radius: 0.012, order: [0, 0], colorA: '#bcd0ff', colorB: '#bcd0ff', stagger: 0 }));
    this.twin.uniforms.uPulses.value = 5;
    this.add(this.twin.mesh);

    /* ── grading nucleus: three rings that lock from misaligned to one deterministic plane ── */
    const ringMats = [this.track(seam(VIOLET, 0.55)), this.track(seam(BLUE, 0.9)), this.track(seam(VIOLET, 0.4))];
    this.ringMats = ringMats;
    [1.15, 1.38, 1.62].forEach((radius, i) => {
      const geo = this.track(new TorusGeometry(radius, i === 1 ? 0.014 : 0.024, 8, 120));
      const ring = new Mesh(geo, ringMats[i]);
      ring.position.copy(NUCLEUS);
      this.rings.push(ring);
      this.ringFrom.push(new Quaternion().setFromEuler(new Euler(0.95 - i * 0.55, 0.4 + i * 0.7, 0.25 * (i - 1))));
      this.add(ring);
    });
    this.ringTo.identity();

    /* ── message fragments (email · Slack · calendar) — layered rectangles, never UI cards ── */
    const count = ctx.quality.count(230);
    this.panes = this.track(
      new Panes(u, { count, width: 0.86, height: 0.52, colorA: '#b7a8ff', colorB: '#9db8ff', glowColor: '#e6e0ff', opacity: 0.2, lines: 0.55 }),
    );
    this.chaos = new Float32Array(count * 3);
    this.chaosRot = new Float32Array(count * 3);
    this.ordered = new Float32Array(count * 3);
    this.orderedYaw = new Float32Array(count);
    this.paneOrder = new Float32Array(count);
    const perFamily = Math.ceil(count / 3);
    const tangent = new Vector3();
    for (let i = 0; i < count; i++) {
      const fam = i % 3;
      const k = Math.floor(i / 3);
      this.chaos[i * 3] = r.range(-11, 11);
      this.chaos[i * 3 + 1] = r.range(-4.6, 4.6);
      this.chaos[i * 3 + 2] = r.range(-17, 1.5);
      this.chaosRot[i * 3] = r.range(-0.7, 0.7);
      this.chaosRot[i * 3 + 1] = r.range(-1, 1);
      this.chaosRot[i * 3 + 2] = r.range(-0.6, 0.6);
      const t = 0.06 + (k / perFamily) * 0.86;
      const c = channels[fam];
      const pt = c.getPointAt(t);
      c.getTangentAt(t, tangent);
      this.ordered[i * 3] = pt.x;
      this.ordered[i * 3 + 1] = pt.y + 0.02;
      this.ordered[i * 3 + 2] = pt.z + 0.08;
      this.orderedYaw[i] = Math.atan2(-tangent.z, tangent.x) * 0.6;
      this.paneOrder[i] = clamp(t * 0.8 + fam * 0.08 + r.range(-0.05, 0.05));
      this.panes.tint.setX(i, fam / 2);
    }
    this.panes.commit(false, true);
    this.add(this.panes.mesh);

    /* ── collision debris: fragments disintegrating in the collision zone ── */
    const nd = ctx.quality.count(900);
    const dStart = new Float32Array(nd * 3);
    const dEnd = new Float32Array(nd * 3);
    for (let i = 0; i < nd; i++) {
      const [x, y, z] = r.inSphere(1.4);
      dStart[i * 3] = -3 + x;
      dStart[i * 3 + 1] = y;
      dStart[i * 3 + 2] = -2 + z;
      const [ex, ey, ez] = r.onSphere(r.range(4, 9));
      dEnd[i * 3] = -3 + ex;
      dEnd[i * 3 + 1] = ey * 0.6;
      dEnd[i * 3 + 2] = -2 + ez * 0.7;
    }
    this.debris = this.track(new MorphPoints(u, { start: dStart, end: dEnd, colorA: '#c9bdff', colorB: BLUE, size: 0.03, stagger: 0.5, swirl: 0.9 }));
    this.add(this.debris.points);

    /* ── streams: message particles that order themselves onto the channels and outputs ── */
    const ns = ctx.quality.count(1700);
    const sStart = new Float32Array(ns * 3);
    const sEnd = new Float32Array(ns * 3);
    const outs = [0, 1, 2].map((i) => outputCurve(i));
    for (let i = 0; i < ns; i++) {
      sStart[i * 3] = r.range(-12, 12);
      sStart[i * 3 + 1] = r.range(-5, 5);
      sStart[i * 3 + 2] = r.range(-11, 3);
      const fam = i % 3;
      const onOut = r.next() < 0.35;
      const p = (onOut ? outs[fam] : channels[fam]).getPointAt(r.next());
      sEnd[i * 3] = p.x + r.range(-0.05, 0.05);
      sEnd[i * 3 + 1] = p.y + r.range(-0.12, 0.12);
      sEnd[i * 3 + 2] = p.z + r.range(-0.05, 0.05);
    }
    this.streams = this.track(new MorphPoints(u, { start: sStart, end: sEnd, colorA: VIOLET, colorB: BLUE, size: 0.026, stagger: 0.6, swirl: 0.7, drift: 0.04 }));
    this.add(this.streams.points);
    // exit: the nucleus compresses every stream into the signature (SOC-4)
    const cEnd = new Float32Array(ns * 3);
    for (let i = 0; i < ns; i++) {
      cEnd[i * 3] = NUCLEUS.x + r.range(-0.1, 0.1);
      cEnd[i * 3 + 1] = NUCLEUS.y + r.range(-0.3, 0.3);
      cEnd[i * 3 + 2] = NUCLEUS.z + r.range(-0.1, 0.1);
    }
    this.compress = this.track(new MorphPoints(u, { start: sEnd.slice(), end: cEnd, colorA: '#d8d0ff', colorB: BLUE, size: 0.028, stagger: 0.5, swirl: 0.5 }));
    this.compress.setFadeWindow(0.85, 1);
    this.add(this.compress.points);

    /* ── protocol beams: inconsistent during chaos, parallel at resolution ── */
    [
      [-6, 8, -6],
      [0.5, 9, -7.5],
      [6.5, 8, -5.5],
    ].forEach(([x, y, z], i) => {
      const b = this.track(new LightBeam(u, { length: 16, radius: 0.85, color: i === 1 ? '#b9adff' : '#9fb4ff', intensity: 0.02 }));
      b.mesh.position.set(x, y, z);
      this.beams.push(b);
      this.beamFrom.push(new Vector3(x + [5, -7, -2][i], y - 10, z + [7, 3, 8][i]));
      this.add(b.mesh);
    });

    /* ── distant metallic frame architecture ── */
    const frameMat = this.track(alloy({ color: '#1d1f26', roughness: 0.55 }));
    const pillarGeo = this.track(new BoxGeometry(1.2, 26, 1.2));
    const lintelGeo = this.track(new BoxGeometry(31, 1.0, 1.2));
    for (const x of [-14.5, 14.5]) {
      const pillar = new Mesh(pillarGeo, frameMat);
      pillar.position.set(x, 1, -28);
      this.add(pillar);
    }
    const lintel = new Mesh(lintelGeo, frameMat);
    lintel.position.set(0, 12.5, -28);
    this.add(lintel);

    /* ── in-world signage: channel names at the mouth of each track ── */
    CHANNEL_NAMES.forEach((name, i) => {
      const b = this.text({ text: name, style: 'label', slot: 'anchor', accent: i === 2 ? BLUE : VIOLET, stagger: 0.3 });
      b.anchor = channels[i].getPointAt(0.32).clone().add(new Vector3(0, 0.55, 0));
      this.labels.push(b);
    });

    this.dossier = new Dossier(
      { text: (o) => this.text(o), portal: (o) => this.portal(o), dust: (b, o) => this.dust(b, o) },
      this.project,
      { accent: '#b9a8ff', accentB: '#9fb9ff', lines: ['WORKPLACE', 'OPERATIONS AGENT'] },
    );
  }

  update(f: SceneFrame): void {
    const p = f.progress;
    const d = this.directives;
    const rm = f.reducedMotion;
    const enter = f.enter;
    const exit = f.exit;
    const t = f.time;

    const collide = beat(p, 0.16, 0.36, easeInOutPremium);
    const conflict = envelope(p, 0.22, 0.32, 0.4, 0.5);
    const order = beat(p, 0.42, 0.56);
    const align = beat(p, 0.48, 0.66);
    const lock = beat(p, 0.56, 0.68, easeOutPremium);
    const climax = bell(p, 0.73, 0.06);
    const dossier = Dossier.presence(p);
    const dim = 1 - 0.55 * dossier;

    /* ── fragments: chaos → collision → ordered on the rails → disassembled on exit ── */
    const n = this.paneOrder.length;
    const drift = rm ? 0.25 : 1;
    for (let i = 0; i < n; i++) {
      const o = this.paneOrder[i];
      const a = easeInOutPremium(clamp((align * 1.6 - o * 0.6) / 1.0));
      const cx = this.chaos[i * 3];
      const cy = this.chaos[i * 3 + 1];
      const cz = this.chaos[i * 3 + 2];
      // collision: crowd toward the collision zone
      const pull = collide * 0.42 * (1 - a);
      let x = lerp(cx, -3, pull) + Math.sin(t * 0.21 + i) * 0.18 * drift * (1 - a);
      let y = lerp(cy, 0, pull) + Math.cos(t * 0.17 + i * 1.3) * 0.12 * drift * (1 - a);
      let z = lerp(cz, -2, pull);
      x = lerp(x, this.ordered[i * 3], a);
      y = lerp(y, this.ordered[i * 3 + 1], a);
      z = lerp(z, this.ordered[i * 3 + 2], a);
      // exit: structured fragments stream toward the camera and become the fog curtain
      const ex = beat(exit, o * 0.3, 0.6 + o * 0.3);
      z += ex * 9;
      y += ex * (y >= 0 ? 1.4 : -1.4);
      const rx = this.chaosRot[i * 3] * (1 - a);
      const ry = lerp(this.chaosRot[i * 3 + 1], this.orderedYaw[i], a);
      const rz = this.chaosRot[i * 3 + 2] * (1 - a) + conflict * 0.15 * Math.sin(i);
      // some fragments disintegrate in the collision (partially, then reform)
      const breaks = i % 7 === 0 ? envelope(p, 0.3, 0.36, 0.44, 0.52) : 0;
      const sc = lerp(1, 0.42, a) * (1 - breaks * 0.85) * (1 - ex * 0.4);
      this.panes.setInstance(i, x, y, z, rx, ry, rz, sc, sc);
      this.panes.glow.setX(i, i % 11 === 0 ? bell(p, 0.33, 0.05) * 0.6 : lock * bell(o, align, 0.12) * 0.25);
    }
    this.panes.commit();
    const pu = this.panes.uniforms;
    pu.uDrift.value = rm ? 0.04 : 0.18 * (1 - align);
    pu.uOpacity.value = enter * lerp(0.15, 0.07, smoothstep(0.6, 0.72, p)) * lerp(1, 0.5, dossier) * (1 - exit * 0.5);
    pu.uLines.value = lerp(0.6, 0.3, align);
    pu.uDim.value = dim;

    this.debris.mix = beat(p, 0.28, 0.48);
    this.debris.opacity = envelope(p, 0.26, 0.31, 0.4, 0.52) * 0.8 * enter;

    this.streams.mix = beat(p, 0.44, 0.64);
    this.streams.opacity = enter * smoothstep(0.36, 0.46, p) * lerp(1, 0.5, smoothstep(0.66, 0.74, p)) * dim * (1 - beat(exit, 0, 0.15));
    this.compress.mix = beat(exit, 0.05, 0.9);
    this.compress.opacity = smoothstep(0, 0.12, exit) * 0.9;

    /* ── rails, credit light, outputs, twin beams ── */
    const railVis = enter * smoothstep(0.4, 0.52, p) * (1 - beat(exit, 0.15, 0.7));
    for (const mat of this.railMats) mat.opacity = railVis;
    for (const mesh of this.railMeshes) mesh.visible = railVis > 0.01;
    this.credit.draw = beat(p, 0.54, 0.68);
    this.credit.opacity = railVis * lerp(1, 0.45, dossier);
    this.credit.uniforms.uFlow.value = rm ? 0.05 : 0.22 + lock * 0.18;
    this.credit.uniforms.uIntensity.value = 0.7 + climax * 0.4;
    this.outputs.draw = beat(p, 0.6, 0.7);
    this.outputs.opacity = enter * (1 - beat(exit, 0, 0.5)) * lerp(1, 0.6, dossier);
    this.outputs.uniforms.uFlow.value = rm ? 0.05 : 0.3;
    this.twin.draw = beat(p, 0.62, 0.7);
    this.twin.opacity = enter * 0.85 * (1 - beat(exit, 0, 0.4)) * lerp(1, 0.6, dossier);
    this.twin.uniforms.uFlow.value = rm ? 0.05 : 0.45; // synchronised pulses on both beams

    /* ── nucleus: forms during ordering, rings lock into one deterministic plane ── */
    const form = beat(p, 0.42, 0.55, easeOutPremium);
    this.rings.forEach((ring, i) => {
      this.q.copy(this.ringFrom[i]).slerp(this.ringTo, lock);
      ring.quaternion.copy(this.q);
      const s = lerp(0.3, 1, form) * (1 - beat(exit, 0.1, 0.8) * 0.9);
      ring.scale.setScalar(s);
      ring.visible = form > 0.01 && s > 0.02;
      this.ringMats[i].emissiveIntensity = [0.55, 0.9, 0.4][i] * (0.6 + lock * 0.6) * (1 - (f.aspect < 0.8 ? 0.8 : 0.55) * dossier);
    });

    /* ── protocol beams: every direction during chaos → parallel at resolution; pointer nudges them ── */
    const beamAlign = beat(p, 0.5, 0.68);
    this.beams.forEach((b, i) => {
      const base = b.mesh.position;
      this.v.copy(this.beamFrom[i]);
      this.v.x += Math.sin(t * 0.13 + i * 2) * 1.5 * (1 - beamAlign) * drift;
      this.v2.set(base.x + 2.5, base.y - 10, base.z + 1.5);
      this.v.lerp(this.v2, beamAlign);
      this.v.x += f.pointer.x * 0.9 * (1 - beamAlign * 0.6);
      this.v.y += f.pointer.y * 0.5;
      b.aim(this.v);
      b.intensity = enter * (0.012 + 0.01 * conflict + 0.016 * beamAlign) * dim * (1 - exit);
    });

    /* ── signage ── */
    const labelE = beat(p, 0.52, 0.58, easeOutPremium);
    const labelD = beat(p, 0.65, 0.69);
    this.labels.forEach((b) => b.set(labelE, labelD));

    this.dossier.update(p, exit, this.ctx.signaturePosition);

    /* ── camera ── */
    this.shot(p, this.shotOut);
    d.camera.position.copy(this.shotOut.position);
    d.camera.target.copy(this.shotOut.target);
    d.camera.fov = this.shotOut.fov;
    if (rm) d.camera.position.lerp(this.v.set(0, 1.2, 12), 0.35);
    d.camera.roll = 0;

    /* ── lighting: inconsistent during chaos, aligned and steady at resolution ── */
    this.v.set(Math.sin(t * 0.3) * 0.8, 0.55 + Math.sin(t * 0.19) * 0.2, Math.cos(t * 0.23) * 0.7).normalize();
    if (rm) this.v.copy(this.keyAligned);
    d.lighting.keyDirection.copy(this.v).lerp(this.keyAligned, beamAlign).normalize();
    d.lighting.keyIntensity = lerp(0.75, 1.05, beamAlign) * (1 - 0.25 * dossier);
    d.lighting.rimIntensity = lerp(0.6, 0.95, lock);
    d.lighting.pointerInfluence = lerp(1, 0.6, dossier);

    /* ── fog: rises with collision, clears when organised ── */
    d.fog.density = lerp(FOG.F2 * 0.85, FOG.F2 * 1.35, conflict) * (1 - order * 0.55) + FOG.F1 * 0.4 + (1 - enter) * FOG.F2;
    d.fog.curtain = 0;
    d.sky.rays = climax * 0.12;
    d.sky.intensity = 1;

    /* ── particles ── */
    d.particles.density = lerp(PARTICLE.P2.density, PARTICLE.P3.density, conflict) * (1 - 0.5 * order) + 0.08;
    d.particles.speed = rm ? PARTICLE.P1.speed : lerp(PARTICLE.P2.speed, PARTICLE.P3.speed, conflict);
    d.particles.focus = lerp(13, 11, smoothstep(0.3, 0.6, p));
    d.particles.aperture = 0.45 + (1 - enter) * 0.6 + conflict * 0.15;
    d.particles.intensity = lerp(0.8, 0.45, dossier);
    d.particles.flow.set(0, 0, 0);

    /* ── signature: the nucleus core (SOC-4 rails lock internally) ── */
    d.signature.soc = 4;
    d.signature.position.copy(NUCLEUS);
    d.signature.scale = 0.78;
    d.signature.visibility = lerp(0.3, 1, smoothstep(0.4, 0.58, p));
    d.signature.emission = lerp(EMISSION.G1 * 0.7, EMISSION.G1 * 1.2, lock) + climax * (EMISSION.G2 - EMISSION.G1) - dossier * EMISSION.G1 * 0.2;
    d.signature.absorb = bell(p, 0.6, 0.06) * 0.4;
    d.signature.accentA.copy(this.cViolet);
    d.signature.accentB.copy(this.cBlue);
    d.signature.spin = 0;

    d.post.bloom = GLOW.G1 + climax * (GLOW.G2 - GLOW.G1) * (rm ? 0.6 : 1);
    d.post.vignette = 0.58 + conflict * 0.08;
    d.post.exposure = 1;
    d.post.grain = 0.035;
  }
}

export default () => new WorkplaceOpsWorld();
