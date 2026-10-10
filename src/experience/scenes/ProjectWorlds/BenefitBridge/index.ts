/**
 * WORLD 5 — BENEFITBRIDGE  (doc 2 §6, doc 11 §7, doc 12 §7, doc 13 E-05, doc 14 SOC-5, doc 15 §6)
 *
 * "Eligibility becomes accessible connections, transforming isolation into matching paths."
 * Arc: isolation → disconnected points → discovery → connection → accessibility.
 *
 *   0.00–0.25 isolation: distant points of light (people) in heavy fog; government forms drift like weighty paper
 *   0.25–0.42 mystery/strain: forms circle without landing; the lattice is only implied
 *   0.42–0.56 discovery: eligibility paths begin to ignite across a woven bridge lattice; fog clears locally
 *   0.56–0.68 connection: user / admin role arcs branch, JWT REST request corridors carry light,
 *             the constellation brightens as it connects; the matching plane resolves (IMG-01)
 *   0.68+     title climax → dossier
 *   exit      (TX-Dissolve) the lattice collapses into a compact glowing heart at the signature; fog becomes passage.
 */
import { CatmullRomCurve3, Color, Vector3 } from 'three';
import type { SceneContext, SceneFrame } from '../../../../types/scene';
import { BaseScene } from '../../BaseScene';
import { Dossier } from '../shared/Dossier';
import { EnergyLines, GlowField, HoloPlane, Panes, drawRule, drawSignage } from '../../../systems/ArchitectureViz';
import { MorphPoints } from '../../../systems/ParticleSystem/MorphPoints';
import { getProject } from '../../../../content/projects';
import { EMISSION, FOG, GLOW, LENS, PARTICLE, TEMPERATURE } from '../../../../tokens/tokens';
import { PALETTES } from '../../../../tokens/palettes';
import { beat, bell, clamp, lerp, smoothstep } from '../../../../utils/math';
import { easeOutPremium } from '../../../../utils/easing';
import { colorTrack, shotTrack, type ShotOut } from '../../../../utils/timeline';
import { rng } from '../../../../utils/rng';

const HEART = new Vector3(0, 1.7, -10);
const EMERALD = PALETTES.benefitbridge.accentA;
const AMBER = PALETTES.benefitbridge.accentB;

class BenefitBridgeWorld extends BaseScene {
  private project = getProject('benefitbridge');
  private dossier!: Dossier;
  private lattice!: EnergyLines;
  private roles!: EnergyLines;
  private corridors!: EnergyLines;
  private people!: GlowField;
  private peoplePos: Float32Array = new Float32Array(0);
  private peopleOrder: Float32Array = new Float32Array(0);
  private forms!: Panes;
  private formSeed: Float32Array = new Float32Array(0);
  private collapse!: MorphPoints;
  private plane!: HoloPlane;

  private shot = shotTrack([
    { at: 0.0, position: [0, 2.2, 18], target: [0, 1.5, -10], lens: LENS.wide + 2 },
    { at: 0.3, position: [0.6, 2.1, 15.5], target: [0.2, 1.5, -10], lens: LENS.wide + 3 },
    { at: 0.55, position: [0.2, 1.9, 12], target: [0, 1.7, -10], lens: LENS.wide + 6 },
    { at: 0.74, position: [0, 1.7, 9.5], target: [0, 1.9, -10], lens: LENS.mid },
    { at: 1.0, position: [-0.6, 1.7, 9], target: [0, 1.9, -10], lens: LENS.mid },
  ]);
  private shotOut: ShotOut = { position: new Vector3(), target: new Vector3(), fov: 35, roll: 0 };
  private key = colorTrack([
    { at: 0, value: '#9fb8a8' },
    { at: 0.42, value: '#c9d6b8' },
    { at: 0.7, value: TEMPERATURE.warm3800 },
    { at: 1, value: TEMPERATURE.warm3800 },
  ]);
  private v = new Vector3();
  private cEmerald = new Color(EMERALD);
  private cAmber = new Color(AMBER);

  constructor() {
    super('benefitbridge', 'benefitbridge');
  }

  protected build(ctx: SceneContext): void {
    const r = rng(0xb1d6e);
    const u = ctx.uniforms;

    /* ── E-05 eligibility matching lattice: a woven bridge, interlaced strands (never a node-link graph) ── */
    const strands: CatmullRomCurve3[] = [];
    const order: number[] = [];
    const tint: number[] = [];
    const N = 26;
    for (let k = 0; k < N; k++) {
      const phi = (k / N) * Math.PI * 2;
      const arch = 3.1 + Math.sin(phi) * 0.7;
      const pts: Vector3[] = [];
      for (let s = 0; s <= 8; s++) {
        const x = -13 + (26 * s) / 8;
        const along = x / 13;
        const y = -1.2 + Math.sin(phi * 2) * 0.35 + arch * (1 - along * along);
        const z = HEART.z + Math.cos(phi + x * 0.38) * 2.1;
        pts.push(new Vector3(x, y, z));
      }
      strands.push(new CatmullRomCurve3(pts));
      order.push(Math.abs(Math.sin(phi * 1.5)) * 0.8 + r.next() * 0.2);
      tint.push(r.next());
    }
    this.lattice = this.track(
      new EnergyLines(u, { curves: strands, radius: 0.017, order, tint, colorA: EMERALD, colorB: AMBER, stagger: 0.7, tubularSegments: 96 }),
    );
    this.lattice.uniforms.uPulses.value = 2;
    this.lattice.uniforms.uPulseAmount.value = 0.35;
    this.add(this.lattice.mesh);

    /* ── role-based paths (user vs admin): two branching arcs from one root ── */
    const root = new Vector3(0, -1.4, -8.5);
    const roleCurves = [
      new CatmullRomCurve3([root, new Vector3(-1.5, 1.2, -9.5), new Vector3(-4.5, 3.8, -11), new Vector3(-7.5, 4.6, -12.5)]),
      new CatmullRomCurve3([root, new Vector3(1.5, 1.2, -9.5), new Vector3(4.5, 3.8, -11), new Vector3(7.5, 4.6, -12.5)]),
    ];
    this.roles = this.track(new EnergyLines(u, { curves: roleCurves, radius: 0.034, order: [0, 0.1], tint: [0, 1], colorA: EMERALD, colorB: AMBER, stagger: 0.1 }));
    this.add(this.roles.mesh);

    /* ── JWT REST APIs: request corridors of light (paired rails carrying requests) ── */
    const corridorCurves: CatmullRomCurve3[] = [];
    for (const cx of [-3.2, 0, 3.2]) {
      for (const side of [-0.28, 0.28]) {
        corridorCurves.push(
          new CatmullRomCurve3([
            new Vector3(cx * 1.4 + side, -2.6, 4),
            new Vector3(cx * 1.2 + side, -1.9, -1.5),
            new Vector3(cx * 0.8 + side, -0.6, -6.5),
            new Vector3(cx * 0.5 + side * 0.6, 0.6, -9.5),
          ]),
        );
      }
    }
    this.corridors = this.track(
      new EnergyLines(u, { curves: corridorCurves, radius: 0.011, order: corridorCurves.map((_, i) => Math.floor(i / 2) / 2), colorA: AMBER, colorB: '#fff0cf', stagger: 0.4 }),
    );
    this.corridors.uniforms.uPulses.value = 4;
    this.add(this.corridors.mesh);

    /* ── people: a distant constellation (metaphor for 1,000+ users — never a counter) ── */
    const np = ctx.quality.count(1000);
    this.peoplePos = new Float32Array(np * 3);
    this.peopleOrder = new Float32Array(np);
    const ptint = new Float32Array(np);
    for (let i = 0; i < np; i++) {
      const x = r.range(-44, 44);
      this.peoplePos[i * 3] = x;
      this.peoplePos[i * 3 + 1] = r.range(-4, 12) + Math.abs(x) * 0.06;
      this.peoplePos[i * 3 + 2] = r.range(-38, -22);
      this.peopleOrder[i] = clamp(Math.abs(x) / 44 * 0.75 + r.next() * 0.25);
      ptint[i] = r.next();
    }
    this.people = this.track(new GlowField(u, this.peoplePos, { size: 0.24, color: '#ffe9c4', colorB: '#c7f5df', tint: ptint }));
    this.add(this.people.points);

    /* ── government forms: weighty paper masses orbiting the lattice through fog ── */
    const nf = ctx.quality.count(64);
    this.forms = this.track(
      new Panes(u, { count: nf, width: 1.05, height: 1.4, colorA: '#d9cbb0', colorB: '#c4d4bc', opacity: 0.17, lines: 0.75 }),
    );
    this.formSeed = new Float32Array(nf * 4);
    for (let i = 0; i < nf; i++) {
      this.formSeed[i * 4] = r.range(0, Math.PI * 2);
      this.formSeed[i * 4 + 1] = r.range(6.5, 11.5);
      this.formSeed[i * 4 + 2] = r.range(-2.5, 5.5);
      this.formSeed[i * 4 + 3] = r.next();
      this.forms.tint.setX(i, r.next());
    }
    this.forms.commit(false, true);
    this.add(this.forms.mesh);

    /* ── exit: the lattice collapses into a compact glowing heart ── */
    const nc = ctx.quality.count(1600);
    const cStart = new Float32Array(nc * 3);
    const cEnd = new Float32Array(nc * 3);
    for (let i = 0; i < nc; i++) {
      const pt = strands[i % N].getPointAt(r.next());
      cStart[i * 3] = pt.x;
      cStart[i * 3 + 1] = pt.y;
      cStart[i * 3 + 2] = pt.z;
      const [x, y, z] = r.inSphere(0.35);
      cEnd[i * 3] = HEART.x + x;
      cEnd[i * 3 + 1] = HEART.y + y * 1.6;
      cEnd[i * 3 + 2] = HEART.z + z;
    }
    this.collapse = this.track(new MorphPoints(u, { start: cStart, end: cEnd, colorA: EMERALD, colorB: AMBER, size: 0.03, stagger: 0.6, swirl: 0.6 }));
    this.collapse.setFadeWindow(0.88, 1);
    this.add(this.collapse.points);

    /* ── IMG-01: the matching seen as an illuminated corridor view (resume phrasing only) ── */
    this.plane = this.track(
      new HoloPlane(u, {
        width: 4.8,
        height: 2.7,
        tint: '#ffe6bd',
        draw: (g, w, h) => {
          drawSignage(g, w, h, [
            { text: 'Eligibility matching', style: 'label', x: 0.07, y: 0.17, size: 0.055, color: '#ffe6bd' },
            { text: 'Multiple welfare schemes', style: 'title', x: 0.07, y: 0.36, size: 0.1 },
            { text: 'scored against user criteria', style: 'value', x: 0.07, y: 0.52, size: 0.085, alpha: 0.85 },
            { text: 'USER  ·  ADMIN', style: 'label', x: 0.07, y: 0.74, size: 0.05, color: '#c7f5df' },
            { text: '1,000+ users connected', style: 'mono', x: 0.07, y: 0.86, size: 0.05, alpha: 0.75 },
          ]);
          drawRule(g, w, h, 0.07, 0.62, 0.9, '#ffe6bd', 0.3);
        },
      }),
    );
    this.plane.mesh.position.set(7.4, 2.4, -6.2);
    this.plane.mesh.rotation.y = -0.5;
    this.add(this.plane.mesh);
    void document.fonts.ready.then(() => this.plane.redraw());

    this.dossier = new Dossier(
      { text: (o) => this.text(o), portal: (o) => this.portal(o), dust: (b, o) => this.dust(b, o) },
      this.project,
      { accent: '#8fe6bf', accentB: '#f2c886' },
    );
  }

  update(f: SceneFrame): void {
    const p = f.progress;
    const d = this.directives;
    const rm = f.reducedMotion;
    const enter = f.enter;
    const exit = f.exit;
    const t = f.time;

    const discover = beat(p, 0.42, 0.62);
    const connect = beat(p, 0.5, 0.7);
    const climax = bell(p, 0.73, 0.06);
    const dossier = Dossier.presence(p);
    const dim = 1 - 0.5 * dossier;
    const gone = beat(exit, 0.05, 0.75);

    /* ── lattice ignites path by path; collapses into the heart on exit ── */
    this.lattice.draw = discover;
    this.lattice.opacity = enter * (0.25 + 0.75 * smoothstep(0.42, 0.56, p)) * (1 - 0.65 * dossier) * (1 - gone);
    this.lattice.uniforms.uIntensity.value = 0.55 + connect * 0.35 - smoothstep(0.7, 0.8, p) * 0.3;
    this.lattice.uniforms.uFlow.value = rm ? 0.03 : 0.12;
    this.roles.draw = beat(p, 0.53, 0.63);
    this.roles.opacity = enter * dim * (1 - gone);
    this.roles.uniforms.uFlow.value = rm ? 0.03 : 0.18;
    this.corridors.draw = beat(p, 0.56, 0.66);
    this.corridors.opacity = enter * 0.5 * (1 - 0.8 * dossier) * (1 - smoothstep(0.7, 0.78, p) * 0.5) * (1 - beat(exit, 0, 0.4));
    this.corridors.uniforms.uFlow.value = rm ? 0.05 : 0.5; // requests travelling the corridor
    this.collapse.mix = beat(exit, 0.05, 0.9);
    this.collapse.opacity = smoothstep(0, 0.1, exit) * 0.9;

    /* ── people: isolated → connected; brighten near the pointer ── */
    const cam = this.ctx.camera;
    const n = this.peopleOrder.length;
    for (let i = 0; i < n; i++) {
      const lit = smoothstep(this.peopleOrder[i] - 0.1, this.peopleOrder[i] + 0.05, connect * 1.15);
      this.v.set(this.peoplePos[i * 3], this.peoplePos[i * 3 + 1], this.peoplePos[i * 3 + 2]).project(cam);
      const dx = this.v.x - f.pointer.x;
      const dy = this.v.y - f.pointer.y;
      const near = f.pointer.active && !rm ? Math.exp(-(dx * dx + dy * dy) * 40) * 0.6 : 0;
      this.people.setBrightness(i, (0.34 + 0.66 * lit + near) * (0.85 + 0.15 * Math.sin(t * 0.4 + i)));
    }
    this.people.commit();
    this.people.intensity = enter * lerp(2.4, 1.1, connect) * (1 - 0.5 * dossier) * (1 - beat(exit, 0.2, 0.8) * 0.7);

    /* ── forms: orbit the lattice like documents; drawn closer as matching succeeds ── */
    const nf = this.formSeed.length / 4;
    const orbit = (rm ? 0.004 : 0.012) * t + p * 0.7;
    const pw = this.ctx.uniforms.uPointerWorld.value;
    for (let i = 0; i < nf; i++) {
      const a = this.formSeed[i * 4] + orbit * (0.6 + this.formSeed[i * 4 + 3] * 0.5);
      const R = this.formSeed[i * 4 + 1] * lerp(1, 0.82, connect);
      let x = HEART.x + Math.cos(a) * R;
      let y = this.formSeed[i * 4 + 2] - 1;
      let z = HEART.z + Math.sin(a) * R * 0.62;
      // pointer attracts forms slightly
      const dx = pw.x - x;
      const dy = pw.y - y;
      const dz = pw.z - z;
      const att = f.pointer.active && !rm ? 0.06 * Math.exp(-(dx * dx + dy * dy + dz * dz) * 0.02) : 0;
      x += dx * att;
      y += dy * att;
      z += dz * att + gone * 6;
      this.forms.setInstance(i, x, y, z, Math.sin(a) * 0.25, -a + Math.PI / 2, Math.cos(a * 1.3) * 0.12, 1, 1);
    }
    this.forms.commit(true, false);
    const fu = this.forms.uniforms;
    fu.uOpacity.value = enter * lerp(0.24, 0.1, connect) * (1 - 0.75 * dossier) * (1 - gone);
    fu.uDrift.value = rm ? 0.03 : 0.12;

    /* ── IMG-01 matching plane: resolves in connection, yields to the title ── */
    this.plane.reveal = beat(p, 0.58, 0.67, easeOutPremium);
    this.plane.sweep = p > 0.6 && p < 0.72 ? beat(p, 0.6, 0.71) : -1;
    this.plane.opacity = enter * (1 - smoothstep(0.67, 0.74, p)) * (1 - exit);

    this.dossier.update(p, exit, this.ctx.signaturePosition);

    /* ── camera: wide establishing → slow pull-in toward the lattice ── */
    this.shot(p, this.shotOut);
    d.camera.position.copy(this.shotOut.position);
    d.camera.target.copy(this.shotOut.target);
    d.camera.fov = this.shotOut.fov;
    if (rm) d.camera.position.lerp(this.v.set(0, 2, 13), 0.35);
    d.camera.roll = 0;

    /* ── light: civic glow grows as paths connect ── */
    this.key(p, d.lighting.keyColor);
    d.lighting.keyIntensity = lerp(0.35, 1.0, connect) * (1 - 0.2 * dossier);
    d.lighting.keyDirection.set(-0.4, 0.75, 0.5).normalize();
    d.lighting.rimIntensity = lerp(0.3, 0.6, connect);
    d.lighting.ambientIntensity = lerp(0.24, 0.34, connect);
    d.lighting.pointerInfluence = 0.8;

    /* ── fog: heavy isolation early → clears with connectivity ── */
    d.fog.density = lerp(FOG.F2 * 1.55, FOG.F1, smoothstep(0.42, 0.68, p)) + (1 - enter) * FOG.F2;
    d.fog.curtain = 0;
    d.sky.rays = bell(p, 0.64, 0.08) * 0.06;
    d.sky.rayColor.set('#ffe2b8');
    d.sky.rayDirection.set(0.1, 0.55, -1).normalize();
    d.sky.intensity = lerp(0.8, 1.05, connect);

    /* ── particles: document dust in fog early, fading as connections succeed ── */
    d.particles.density = lerp(PARTICLE.P2.density, PARTICLE.P1.density * 0.8, connect);
    d.particles.speed = PARTICLE.P2.speed;
    d.particles.focus = lerp(16, 12, smoothstep(0.3, 0.74, p));
    d.particles.aperture = 0.5 + (1 - enter) * 0.6;
    d.particles.intensity = lerp(0.8, 0.45, dossier);
    d.particles.flow.set(0, 0, 0);

    /* ── signature: SOC-5 web heart at the lattice crown ── */
    d.signature.soc = 5;
    d.signature.position.copy(HEART);
    d.signature.scale = 0.9;
    d.signature.visibility = lerp(0.25, 1, smoothstep(0.42, 0.66, p));
    d.signature.emission = lerp(EMISSION.G1 * 0.6, EMISSION.G1 * 1.25, connect) + climax * (EMISSION.G2 - EMISSION.G1) - dossier * EMISSION.G1 * 0.25;
    d.signature.absorb = bell(p, 0.6, 0.08) * 0.35;
    d.signature.accentA.copy(this.cEmerald);
    d.signature.accentB.copy(this.cAmber);
    d.signature.spin = 0;

    d.post.bloom = GLOW.G1 + climax * (GLOW.G2 - GLOW.G1) * (rm ? 0.6 : 1);
    d.post.vignette = 0.55;
    d.post.exposure = 1;
    d.post.grain = 0.035;
  }
}

export default () => new BenefitBridgeWorld();
