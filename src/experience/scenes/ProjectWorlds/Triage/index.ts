/**
 * SCENE 3 — TRIAGE ASSISTANT  (doc 2 §4, doc 6 §4.2, doc 11 §5, doc 12 §5, doc 14 SOC-3, doc 15 §4)
 *
 * "Emergency assessment becomes prioritisation through retrieval + rules."
 * Darkness → heartbeat → instability → reorganisation → stability → urgency clarity.
 *
 * Near-black set, camera low and centred behind a neural pathway. A faint light low in frame beats
 * lub-dub (~60 bpm); a trembling tube network grows out of it. Wrong routes collapse softly into mist,
 * semantic beams (ChromaDB) converge onto the true route, similarity vectors (sentence-transformers)
 * rotate into alignment, and the route locks into calm rails. Crisp rule lines run from the decision
 * node to three distant volumetric thresholds that lock with SHAPE + LABEL cues (GREEN ring, YELLOW
 * triangle, RED square — Law 36). Pulses along the rail keep the execution cadence 120 : 40 : 150.
 * The triage board resolves high in the dark, hands its place to the title, and the dossier settles.
 *
 * Beat map (scene progress):
 *   0.00–0.08 F0  darkness; heartbeat glow; three far lights barely there; entry fog resolves
 *   0.07–0.25 F20 network grows from the heartbeat, unstable (wobble + contained flicker), sparks
 *   0.25–0.42 F40 conflict (hold 0.36): fog thickens, red pressure rises, wrong routes collapse into mist
 *   0.41–0.57 F60 retrieval beams converge, vectors align, the route locks into rails, fog thins
 *   0.55–0.68 F80 rule lines → thresholds lock (shapes + GREEN/YELLOW/RED), cadence + TXT-01 plaque,
 *                 triage board (IMG-01) resolves high in frame
 *   0.68–0.76 F100 board dissolves into the title band; "TRIAGE ASSISTANT" resolves; SOC-3 surge
 *   0.76–0.82 tagline · 0.82–0.92 dossier + portals · 0.88–1.00 readable hold (micro orbit)
 *   exit (TX-CollapsePassage): structure collapses into mist, the three threshold lights travel into
 *        the signature, the title dissolves into glyph dust absorbed by it.
 */
import { AdditiveBlending, Color, Vector3, type Curve } from 'three';
import type { SceneContext, SceneFrame } from '../../../../types/scene';
import { BaseScene } from '../../BaseScene';
import type { TextBlock } from '../../../ui/CinematicTextLayer';
import type { Portal } from '../../../ui/PortalButtons';
import type { GlyphDust } from '../../../systems/ParticleSystem/GlyphDust';
import { MorphPoints } from '../../../systems/ParticleSystem/MorphPoints';
import { EnergyLines, Glow, HoloPlane } from '../../../systems/ArchitectureViz';
import { getProject } from '../../../../content/projects';
import { beat, bell, lerp, smoothstep } from '../../../../utils/math';
import { easeInOutPremium, easeOutPremium } from '../../../../utils/easing';
import { shotTrack, track, type ShotOut } from '../../../../utils/timeline';
import { rng } from '../../../../utils/rng';
import { ACCENT, CURTAIN, EMISSION, FOG, GLOW, PARTICLE } from '../../../../tokens/tokens';
import { PALETTES } from '../../../../tokens/palettes';
import { Conduits, type ConduitSpec } from './Conduits';
import { ThresholdLights } from './ThresholdLights';
import { Needles } from './Needles';
import { drawTriageBoard } from './board';
import {
  BOARD,
  CAMERA_REF,
  HEART,
  SIG_POS,
  THRESHOLDS,
  decisionLines,
  facing,
  mainRoute,
  retrievalBeams,
  shapeOutline,
  sideRails,
  wrongRoutes,
} from './layout';

const PAL = PALETTES.triage;
const PATH = '#a6ffd5';
const PATH_WARM = ACCENT.amber;
const INK_EMERALD = '#9fe9cf';
const DEG = Math.PI / 180;

/** Lub-dub at ~60 bpm, 0..1 (ambient micro-motion only; story state never depends on it). */
function lubDub(time: number): number {
  const ph = time % 1;
  const lub = Math.exp(-(((ph - 0.05) / 0.055) ** 2));
  const dub = 0.62 * Math.exp(-(((ph - 0.31) / 0.06) ** 2));
  return Math.min(1, lub + dub);
}

/** Evenly spread samples along several curves (proportional to count weights) into a flat xyz array. */
function sampleCurves(curves: ReadonlyArray<Curve<Vector3>>, n: number, seed: number, jitter: number): Float32Array {
  const r = rng(seed);
  const out = new Float32Array(n * 3);
  const v = new Vector3();
  for (let i = 0; i < n; i++) {
    const c = curves[i % curves.length];
    c.getPoint(r.next(), v);
    out[i * 3] = v.x + r.range(-jitter, jitter);
    out[i * 3 + 1] = v.y + r.range(-jitter, jitter);
    out[i * 3 + 2] = v.z + r.range(-jitter, jitter);
  }
  return out;
}

class TriageWorld extends BaseScene {
  private readonly project = getProject('triage');

  /* set */
  private heart!: Glow;
  private wrong!: EnergyLines;
  private rail!: Conduits;
  private structure!: Conduits;
  private beams!: EnergyLines;
  private needles!: Needles;
  private lights!: ThresholdLights;
  private sparks!: MorphPoints;
  private sheath!: MorphPoints;
  private collapseDust!: MorphPoints;
  private board!: HoloPlane;

  /* text */
  private title!: TextBlock;
  private titleDust!: GlyphDust;
  private subtitle!: TextBlock;
  private subDust!: GlyphDust;
  private bodies: TextBlock[] = [];
  private signal: TextBlock | null = null;
  private stack!: TextBlock;
  private portals: Portal[] = [];
  private labels: TextBlock[] = [];
  private plaque!: TextBlock;
  private plaqueDust!: GlyphDust;

  /* camera & tracks (doc 15 §4 keyframes: low, centred behind the pathway) */
  private shot = shotTrack([
    { at: 0.0, position: [0, 0.3, 13.6], target: [0, 0.3, -6], lens: 30 },
    { at: 0.2, position: [0, 0.38, 12.8], target: [0, 0.45, -6], lens: 32 },
    { at: 0.36, position: [0.18, 0.5, 11.3], target: [0, 0.32, -3.6], lens: 40 },
    { at: 0.45, position: [0.1, 0.56, 11.5], target: [0, 0.65, -4.8], lens: 37 },
    { at: 0.58, position: [0, 0.86, 12.4], target: [0, 1.75, -9], lens: 33 },
    { at: 0.7, position: [0, 0.95, 12.6], target: [0, 2.1, -9], lens: 32 },
    { at: 0.84, position: [0, 0.95, 12.2], target: [0, 2.1, -9], lens: 33 },
    { at: 1.0, position: [0, 1.0, 11.9], target: [0, 2.1, -9], lens: 33 },
  ]);
  private shotOut: ShotOut = { position: new Vector3(), target: new Vector3(), fov: 35, roll: 0 };
  private restPos = new Vector3(0, 0.75, 12.4);
  private restTarget = new Vector3(0, 1.2, -7.5);
  /** Fog = the uncertainty layer: thickens with instability, thins at lock (doc 12 §5). */
  private fogTrack = track([
    { at: 0, value: 0.016 },
    { at: 0.2, value: 0.019 },
    { at: 0.36, value: FOG.F2 + 0.002 },
    { at: 0.46, value: 0.023 },
    { at: 0.58, value: FOG.F1 + 0.001 },
    { at: 0.76, value: 0.008 },
    { at: 1, value: 0.009 },
  ]);
  /** DOF focus distance follows the one meaning element per beat (doc 3 §3). */
  private focusTrack = track([
    { at: 0, value: 9 },
    { at: 0.2, value: 12 },
    { at: 0.36, value: 12.5 },
    { at: 0.5, value: 15 },
    { at: 0.62, value: 21 },
    { at: 1, value: 20 },
  ]);

  /* scratch (no per-frame allocation) */
  private v = new Vector3();
  private amber = new Color(ACCENT.amber);
  private red = new Color(ACCENT.red);
  private accA = new Color(PAL.accentA);
  private accB = new Color(PAL.accentB);
  private seedTone = new Color('#0e2a22');
  private lv = [0, 0, 0];

  constructor() {
    super('triage', 'triage');
  }

  protected build(ctx: SceneContext): void {
    const q = ctx.quality;
    const main = mainRoute();
    const sides = sideRails();
    const wrongs = wrongRoutes(main);
    const rules = decisionLines();
    const outlines = THRESHOLDS.map((t) => shapeOutline(t));

    /* ── heartbeat source: where the pathway begins ── */
    this.heart = this.track(new Glow(ctx.uniforms, { size: 1.15, color: '#c9ffe4', intensity: 0, falloff: 4.2 }));
    this.heart.mesh.position.copy(HEART);
    this.add(this.heart.mesh);

    /* ── unstable network: wrong routes (collapse into mist) ── */
    this.wrong = this.track(
      new EnergyLines(ctx.uniforms, {
        curves: wrongs.map((w) => w.curve),
        order: wrongs.map((w) => w.order),
        tint: wrongs.map((w) => w.tint),
        radius: 0.016,
        radii: wrongs.map((_, i) => (i >= wrongs.length - 3 ? 1.25 : 0.8 + (i % 3) * 0.2)),
        colorA: PATH,
        colorB: PATH_WARM,
        stagger: 0.6,
        tubularSegments: 72,
      }),
    );
    this.wrong.uniforms.uPulses.value = 2;
    this.wrong.uniforms.uPulseAmount.value = 0.35;
    this.add(this.wrong.mesh);

    /* ── the true route (wobbles until it locks; then carries the execution cadence) ── */
    this.rail = this.track(new Conduits(ctx.uniforms, [{ curve: main, color: PATH, radius: 0.034, order: 0, cadence: 1, segments: 160 }], { stagger: 0 }));
    this.add(this.rail.mesh);

    /* ── locked structure: side rails → crisp rule lines → threshold outlines (one draw, staggered) ── */
    const specs: ConduitSpec[] = [
      ...sides.map((c) => ({ curve: c, color: INK_EMERALD, radius: 0.011, order: 0, cadence: 0.7, segments: 140 })),
      ...rules.map((c, i) => ({ curve: c, color: THRESHOLDS[i].color, radius: 0.016, order: 0.33 + i * 0.05, gradient: 1, segments: 140 })),
      ...outlines.map((c, i) => ({ curve: c, color: THRESHOLDS[i].color, radius: 0.04, order: 0.86 + i * 0.05, closed: true, segments: 120 })),
    ];
    this.structure = this.track(new Conduits(ctx.uniforms, specs, { stagger: 0.9, neutral: '#e4f2ea' }));
    this.add(this.structure.mesh);

    /* ── retrieval: semantic beams converging onto the route ── */
    const beams = retrievalBeams(main);
    this.beams = this.track(
      new EnergyLines(ctx.uniforms, { curves: beams, radius: 0.01, colorA: '#58cfae', colorB: '#dffbef', stagger: 0.55, tubularSegments: 96 }),
    );
    this.beams.uniforms.uPulses.value = 2.5;
    this.beams.uniforms.uPulseAmount.value = 0.9;
    this.add(this.beams.mesh);

    /* ── similarity vectors rotating into alignment ── */
    this.needles = this.track(new Needles(ctx.uniforms, main, { count: q.count(120), seed: 0x5e7, length: 0.44, width: 0.016 }));
    this.add(this.needles.mesh);

    /* ── thresholds: volumetric pools + shafts ── */
    this.lights = this.track(
      new ThresholdLights(
        ctx.uniforms,
        THRESHOLDS.map((t, i) => ({ pos: t.pos, color: t.color, halo: i === 1 ? 5.6 : 4.8, core: i === 1 ? 0.95 : 0.8, shaft: 15, shaftRadius: 1.5 })),
      ),
    );
    this.add(this.lights.shafts, this.lights.glows);

    /* ── P-03 medical pathway micro sparks: live on the wrong routes, scatter into mist on collapse ── */
    {
      const n = q.count(900);
      const r = rng(0x5a2c);
      const start = new Float32Array(n * 3);
      const end = new Float32Array(n * 3);
      const order = new Float32Array(n);
      const tint = new Float32Array(n);
      const v = new Vector3();
      for (let i = 0; i < n; i++) {
        const w = wrongs[i % wrongs.length];
        const t = r.next();
        w.curve.getPoint(t, v);
        start[i * 3] = v.x + r.range(-0.05, 0.05);
        start[i * 3 + 1] = v.y + r.range(-0.05, 0.05);
        start[i * 3 + 2] = v.z + r.range(-0.05, 0.05);
        const [dx, dy, dz] = r.onSphere(r.range(1.0, 3.4));
        end[i * 3] = start[i * 3] + dx;
        end[i * 3 + 1] = start[i * 3 + 1] + Math.abs(dy) * 0.8 + 0.4;
        end[i * 3 + 2] = start[i * 3 + 2] + dz;
        // far end of a retracting line scatters first (matches the EnergyLines retract order)
        order[i] = Math.min(1, Math.max(0, 1 - (t / 1.04 + 0.6 * w.order) / 1.6) * 1.6);
        tint[i] = Math.min(1, w.tint + r.range(-0.1, 0.25));
      }
      this.sparks = this.track(
        new MorphPoints(ctx.uniforms, { start, end, order, tint, colorA: '#c6ffe6', colorB: '#ffd08a', size: 0.034, stagger: 0.8, swirl: 0.5, drift: 0.05 }),
      );
      this.sparks.setFadeWindow(0.25, 0.95);
      this.add(this.sparks.points);
    }

    /* ── medical motes: a loose cloud around the path that settles into a sheath on the locked rail ── */
    {
      const n = q.count(800);
      const r = rng(0x3eab);
      const start = new Float32Array(n * 3);
      const end = new Float32Array(n * 3);
      const v = new Vector3();
      for (let i = 0; i < n; i++) {
        main.getPoint(r.next(), v);
        const [sx, sy, sz] = r.inSphere(2.6);
        start[i * 3] = v.x + sx;
        start[i * 3 + 1] = v.y + Math.abs(sy) * 0.7 + 0.05;
        start[i * 3 + 2] = v.z + sz;
        const [ex, ey, ez] = r.onSphere(r.range(0.05, 0.22));
        end[i * 3] = v.x + ex;
        end[i * 3 + 1] = v.y + ey * 0.6 + 0.04;
        end[i * 3 + 2] = v.z + ez;
      }
      this.sheath = this.track(new MorphPoints(ctx.uniforms, { start, end, colorA: '#bfffe0', colorB: '#effff7', size: 0.022, stagger: 0.7, swirl: 0.7, drift: 0.04 }));
      this.add(this.sheath.points);
    }

    /* ── exit: the remaining structure collapses into mist (TX-CollapsePassage) ── */
    {
      const n = q.count(900);
      const curves: Curve<Vector3>[] = [main, main, main, ...sides, ...rules, ...outlines];
      const start = sampleCurves(curves, n, 0xc011, 0.03);
      const end = new Float32Array(n * 3);
      const r = rng(0xc012);
      for (let i = 0; i < n; i++) {
        const [dx, dy, dz] = r.onSphere(r.range(1.4, 4.2));
        end[i * 3] = start[i * 3] + dx;
        end[i * 3 + 1] = start[i * 3 + 1] + Math.abs(dy) * 0.6 + 0.6;
        end[i * 3 + 2] = start[i * 3 + 2] + dz + 1.2;
      }
      this.collapseDust = this.track(new MorphPoints(ctx.uniforms, { start, end, colorA: '#c8ffe6', colorB: '#ffd9a6', size: 0.03, stagger: 0.7, swirl: 0.9, drift: 0.05 }));
      this.collapseDust.setFadeWindow(0.45, 1.0);
      this.collapseDust.opacity = 0;
      this.add(this.collapseDust.points);
    }

    /* ── IMG-01: triage outcome as in-world medical signage (additive true colour: no opaque card) ── */
    this.board = this.track(
      new HoloPlane(ctx.uniforms, {
        width: BOARD.width,
        height: BOARD.height,
        resolution: 1280,
        holographic: false,
        tint: '#2f6252',
        draw: (c, w, h) => drawTriageBoard(c, w, h, THRESHOLDS),
      }),
    );
    this.board.mesh.material.blending = AdditiveBlending;
    this.board.mesh.material.uniforms.uHolo.value = 0;
    this.board.mesh.position.copy(BOARD.pos);
    this.board.mesh.lookAt(CAMERA_REF);
    this.board.reveal = 0;
    this.add(this.board.mesh);

    /* ── typography ── */
    const p = this.project;
    const narrow = innerWidth < 700;
    const accent = PAL.accentA;
    // standard post-climax layout, all in `center`, created in stack order
    this.title = this.text({ text: narrow ? ['TRIAGE', 'ASSISTANT'] : p.monument, style: 'monument', slot: 'center', accent, stagger: 0.45 });
    this.titleDust = this.dust(this.title, { mode: 'absorb', color: accent, depth: 8 });
    this.subtitle = this.text({ text: p.tagline, style: 'subtitle', slot: 'center', accent: ACCENT.amber, stagger: 0.4 });
    this.subDust = this.dust(this.subtitle, { mode: 'absorb', color: ACCENT.amber, depth: 8, maxPoints: 900 });
    const facts = narrow ? [p.facts[1]] : p.facts;
    this.bodies = facts.map((t) => this.text({ text: t, style: 'body', slot: 'center', maxWidth: '58ch', stagger: 0.3 }));
    if (p.signals.length) {
      this.signal = this.text({ text: p.signals.map((s) => `${s.value} ${s.label}`).join('  ·  '), style: 'label', slot: 'center', accent, stagger: 0.3 });
    }
    this.stack = this.text({ text: p.stack.join('  ·  '), style: 'mono', slot: 'center', stagger: 0.3 });
    this.portals = p.links.map((l) =>
      this.portal({ label: l.label, href: l.href, slot: 'center', group: 'links', description: `${p.name} — ${l.label}`, accent: l.kind === 'live' ? ACCENT.emerald : ACCENT.amber }),
    );

    // in-world L3 signage beside each threshold, wayfinding style "[shape] WORD" (resume vocabulary).
    // Beside, not below: the rule lines arrive from below and must never cross the words.
    this.labels = THRESHOLDS.map((t) => {
      const word = p.vocabulary.find((w) => w === t.word) ?? t.word;
      const b = this.text({ text: word, style: 'label', slot: 'anchor', accent: t.color, stagger: 0.35 });
      const { right } = facing(t.pos);
      b.anchor = t.pos.clone().addScaledVector(right, t.size * (t.shape === 'triangle' ? 0.9 : 1.0) + 0.55);
      const w = b.el.getBoundingClientRect().width || word.length * 11.5;
      b.anchorOffset = { x: w / 2, y: 0 };
      return b;
    });

    // TXT-01 plaque: the execution cadence, beside the rail (resume latency fact, separators only)
    const latency = p.facts.find((f) => f.includes('310ms')) ?? '';
    const cadence = (latency.charAt(0).toLowerCase() + latency.slice(1)).replace(/\.$/, '').replace(/ \+ /g, ' · ');
    const plaqueText = narrow ? cadence.split(/ · (?=context|AI)/).map((s, i, all) => (i < all.length - 1 ? `${s} ·` : s)) : cadence;
    this.plaque = this.text({ text: plaqueText, style: 'mono', slot: 'anchor', accent: INK_EMERALD, stagger: 0.25 });
    this.plaque.anchor = main.getPoint(0.36).add(new Vector3(0, -0.12, 0));
    this.plaque.anchorOffset = { x: 0, y: 30 };
    this.plaqueDust = this.dust(this.plaque, { mode: 'drift', color: INK_EMERALD, depth: 9, maxPoints: 900 });
  }

  update(f: SceneFrame): void {
    const p = f.progress;
    const d = this.directives;
    const rm = f.reducedMotion;
    const enter = f.enter;
    const exit = f.exit;

    /* ── story scalars: everything derives from progress / enter / exit ── */
    const grow = beat(p, 0.07, 0.24, easeOutPremium);
    const unstable = smoothstep(0.1, 0.3, p) * (1 - smoothstep(0.45, 0.56, p));
    const conflict = bell(p, 0.36, 0.13);
    const collapse = beat(p, 0.29, 0.47);
    const retrieve = beat(p, 0.41, 0.53, easeOutPremium);
    const align = beat(p, 0.44, 0.55);
    const lock = beat(p, 0.47, 0.57, easeInOutPremium);
    const struct = beat(p, 0.47, 0.63);
    const thresholds = beat(p, 0.55, 0.63, easeOutPremium);
    const cadence = beat(p, 0.57, 0.64);
    const climax = beat(p, 0.69, 0.77, easeOutPremium);
    const surge = bell(p, 0.735, 0.06);
    const calm = beat(p, 0.8, 0.9);
    const out = beat(exit, 0.0, 0.5);
    const keep = 1 - out;

    // heartbeat (biological rhythm) dominates the dark, then hands over to the system cadence
    const hbAmp = (0.35 + 0.65 * (1 - lock)) * (1 - 0.6 * calm);
    const hb = rm ? 0.4 : lubDub(f.time);
    // pointer near the pathway (lower centre) lets the heartbeat breathe a little more (doc 2 §4 interactive)
    const near = f.pointer.active ? (1 - Math.min(1, Math.abs(f.pointer.x) * 1.4)) * smoothstep(0.3, -0.5, f.pointer.y) : 0;
    const pulse = hb * hbAmp * (1 + 0.5 * near);

    /* ── heartbeat source ── */
    this.heart.intensity = enter * keep * (0.07 + 0.45 * pulse + 0.1 * grow * (1 - lock)) * (1 - 0.6 * calm);
    this.heart.mesh.scale.setScalar(1 + 0.12 * pulse);

    /* ── unstable network ── */
    const wobble = (0.04 + 0.26 * unstable + 0.1 * conflict) * (rm ? 0.5 : 1);
    this.wrong.draw = grow * (1 - collapse);
    this.wrong.opacity = enter * 0.9;
    const wu = this.wrong.uniforms;
    wu.uWobble.value = wobble;
    wu.uFlicker.value = 0.35 * unstable;
    wu.uIntensity.value = (0.45 + 0.55 * pulse + 0.25 * conflict) * (1 - 0.3 * collapse);
    wu.uFlow.value = rm ? 0.05 : 0.35;

    /* ── the true route → locked rail with execution cadence ── */
    this.rail.draw = grow * keep;
    this.rail.opacity = enter * (0.85 + 0.15 * lock);
    const ru = this.rail.uniforms;
    ru.uWobble.value = wobble * (1 - lock);
    ru.uFlicker.value = 0.3 * unstable * (1 - lock);
    ru.uIntensity.value = (0.5 + 0.5 * pulse) * (1 + 0.6 * lock) * (1 - 0.5 * calm);
    ru.uCadence.value = cadence * (1 - 0.3 * calm);
    ru.uCadenceFlow.value = rm ? 0 : 0.11;

    this.structure.draw = struct * keep;
    this.structure.opacity = enter * (1 - 0.55 * calm);
    const su = this.structure.uniforms;
    su.uIntensity.value = 0.85 + 0.35 * surge;
    su.uCadence.value = cadence * (1 - 0.3 * calm);
    su.uCadenceFlow.value = rm ? 0 : 0.11;

    /* ── retrieval beams + similarity vectors ── */
    this.beams.draw = retrieve;
    this.beams.opacity = enter * 0.85 * (1 - beat(p, 0.55, 0.66));
    const bu = this.beams.uniforms;
    bu.uIntensity.value = 0.55;
    bu.uFlow.value = rm ? 0.08 : 0.55;
    this.needles.align = align;
    this.needles.opacity = enter * beat(p, 0.41, 0.47) * (1 - beat(p, 0.55, 0.63)) * 0.95;

    /* ── particles that mean something ── */
    this.sparks.mix = beat(p, 0.28, 0.52);
    this.sparks.opacity = enter * beat(p, 0.09, 0.2) * (1 - beat(p, 0.5, 0.56)) * 0.85;
    this.sparks.jitter = 0.05 * unstable + 0.04 * conflict;
    this.sheath.mix = beat(p, 0.42, 0.6);
    this.sheath.opacity = enter * keep * smoothstep(0.03, 0.16, p) * lerp(0.28, 0.75, smoothstep(0.42, 0.6, p)) * (1 - 0.6 * calm);
    this.collapseDust.mix = beat(exit, 0.0, 0.85);
    this.collapseDust.opacity = smoothstep(0.0, 0.1, exit) * (1 - smoothstep(0.8, 1, exit)) * 0.9;

    /* ── thresholds: distant, faint → red pressure in conflict → locked, balanced ── */
    // distant pin-points in the dark that slowly swell into volumetric regions
    const appear = smoothstep(0.04, 0.6, p);
    const base = enter * lerp(0.3, 1, appear) * (1 - 0.84 * calm);
    const breathe = 1 + 0.35 * pulse * (1 - lock);
    const sig = this.ctx.signaturePosition;
    for (let i = 0; i < 3; i++) {
      let level = base * breathe * (0.8 + 0.2 * thresholds + 0.15 * surge);
      if (i === 2) level += enter * conflict * 0.4; // critical pressure light (precise, rare red emphasis)
      // exit: the three lights travel into the signature (it absorbs them)
      const s = beat(exit, 0.1 + i * 0.08, 0.6 + i * 0.08, easeInOutPremium);
      this.v.lerpVectors(THRESHOLDS[i].pos, sig, s);
      this.lights.positions[i].copy(this.v);
      level *= (1 + 0.7 * bell(s, 0.55, 0.45)) * (1 - smoothstep(0.86, 1, s));
      this.lv[i] = level;
    }
    this.lights.level.set(this.lv[0], this.lv[1], this.lv[2]);
    const swell = lerp(0.3, 1, appear);
    this.lights.haloScale.set(
      swell * lerp(1, 0.16, beat(exit, 0.1, 0.6)),
      swell * lerp(1, 0.16, beat(exit, 0.18, 0.68)),
      swell * lerp(1, 0.16, beat(exit, 0.26, 0.76)) * (1 + 0.12 * conflict),
    );
    const shaft = enter * smoothstep(0.12, 0.6, p) * 0.13 * (1 - 0.8 * calm) * (1 - beat(exit, 0, 0.3)) * (0.8 + 0.2 * thresholds);
    this.lights.shaftLevel.set(shaft, shaft * 1.1, shaft + enter * conflict * 0.07);
    this.lights.commit();

    /* ── IMG-01 board: resolves high in frame, then yields its band to the title ── */
    this.board.reveal = beat(p, 0.6, 0.655, easeOutPremium) * (1 - beat(p, 0.672, 0.7));
    this.board.sweep = -1;
    this.board.opacity = enter * 0.95;

    /* ── typography ── */
    this.title.set(climax, exit, beat(p, 0.72, 0.83));
    this.titleDust.update(exit, this.ctx.signaturePosition);
    this.subtitle.set(beat(p, 0.76, 0.82, easeOutPremium), exit, beat(p, 0.78, 0.86));
    this.subDust.update(exit, this.ctx.signaturePosition);
    for (let i = 0; i < this.bodies.length; i++) this.bodies[i].set(beat(p, 0.82 + i * 0.016, 0.88 + i * 0.016, easeOutPremium), exit);
    this.signal?.set(beat(p, 0.855, 0.9, easeOutPremium), exit);
    this.stack.set(beat(p, 0.865, 0.91, easeOutPremium), exit);
    const presence = beat(p, 0.87, 0.92) * (1 - exit);
    for (const portal of this.portals) portal.setPresence(presence);
    for (let i = 0; i < this.labels.length; i++) {
      this.labels[i].set(beat(p, 0.56 + i * 0.012, 0.625 + i * 0.012, easeOutPremium), Math.max(beat(p, 0.77, 0.815), exit), beat(p, 0.58 + i * 0.012, 0.68));
    }
    const plaqueGone = beat(p, 0.695, 0.725);
    this.plaque.set(beat(p, 0.585, 0.645, easeOutPremium), plaqueGone, beat(p, 0.6, 0.7));
    this.plaqueDust.update(plaqueGone);

    /* ── signature: SOC-3 implied in the dark → threshold core at the climax ── */
    d.signature.soc = 3;
    d.signature.position.copy(SIG_POS);
    d.signature.scale = lerp(0.92, 1.1, climax);
    d.signature.visibility = enter * lerp(0.3, 1, smoothstep(0.44, 0.7, p)) * (1 - 0.45 * calm);
    const absorbIn = bell(exit, 0.62, 0.32);
    d.signature.emission =
      (lerp(EMISSION.G1 * 0.35, EMISSION.G1 * 1.05, smoothstep(0.45, 0.68, p)) + surge * EMISSION.G2 * 0.55) * (1 - 0.35 * calm) + absorbIn * EMISSION.G1;
    d.signature.absorb = surge * 0.25 + absorbIn * 0.85;
    d.signature.spin = 0;
    // green/yellow/red compress into the core and darken toward a mystery seed for the next world (doc 14)
    const seed = smoothstep(0.7, 1, exit) * 0.6;
    d.signature.accentA.copy(this.accA).lerp(this.seedTone, seed);
    d.signature.accentB.copy(this.accB).lerp(this.seedTone, seed);

    /* ── camera ── */
    this.shot(p, this.shotOut);
    d.camera.position.copy(this.shotOut.position);
    d.camera.target.copy(this.shotOut.target);
    if (rm) {
      d.camera.position.lerp(this.restPos, 0.4);
      d.camera.target.lerp(this.restTarget, 0.4);
    }
    const hold = smoothstep(0.86, 0.95, p) * (rm ? 0 : 1);
    d.camera.position.x += Math.sin(f.time * 0.06) * 0.35 * hold;
    d.camera.position.y += Math.sin(f.time * 0.045 + 1.1) * 0.05 * hold;
    let fov = this.shotOut.fov;
    if (f.aspect < 1.3) {
      // portrait: keep all three thresholds (±~15° azimuth) inside the frame
      const need = (2 * Math.atan(Math.tan(17 * DEG) / Math.max(0.3, f.aspect))) / DEG;
      fov = Math.max(fov, Math.min(need, 72));
    }
    d.camera.fov = fov;
    d.camera.roll = 0;

    /* ── fog: the uncertainty layer ── */
    d.fog.density = this.fogTrack(p) + (1 - enter) * FOG.F2;
    d.fog.curtain = CURTAIN.F1 * Math.min(1, conflict + 0.5 * unstable) + (1 - enter) * CURTAIN.F2;

    /* ── sky & light ── */
    d.sky.intensity = lerp(0.6, 1, smoothstep(0.45, 0.72, p)) * (1 - 0.15 * calm);
    d.sky.rays = 0;
    d.lighting.keyIntensity = lerp(0.22, 0.62, smoothstep(0.45, 0.66, p)) + pulse * 0.06;
    d.lighting.rimColor.copy(this.amber).lerp(this.red, conflict * 0.55);
    d.lighting.rimIntensity = lerp(0.28, 0.5, lock) + conflict * 0.2;
    d.lighting.ambientIntensity = lerp(0.12, 0.18, lock);
    d.lighting.pointerInfluence = 0.5;

    /* ── ambient motes: denser around instability, quiet behind the dossier ── */
    d.particles.density = lerp(PARTICLE.P1.density * 0.7, PARTICLE.P2.density, unstable) * (1 - 0.3 * calm);
    d.particles.speed = lerp(PARTICLE.P1.speed * 0.8, PARTICLE.P1.speed * 1.4, conflict);
    d.particles.focus = this.focusTrack(p);
    d.particles.aperture = 0.45 + (1 - enter) * 0.4 + conflict * 0.25 - climax * 0.12;
    d.particles.intensity = 0.8 - 0.35 * calm;
    d.particles.size = 1;

    /* ── post: restrained; brief bloom G2→G3 at the title climax ── */
    d.post.bloom = lerp(GLOW.G1 * 0.85, GLOW.G1, lock) + conflict * 0.05 + surge * (GLOW.G2 - GLOW.G1 + 0.12) - calm * 0.05;
    d.post.exposure = 1;
    d.post.vignette = 0.62;
    d.post.grain = 0.035;
  }
}

export default () => new TriageWorld();
