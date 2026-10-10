/**
 * SCENE 2 — LAWLENS-X: contracts become intelligence through agents.
 * (doc 2 §3, doc 6 §4.1, doc 11 §4, doc 12 §4, doc 13 E-02/P-02/IMG-01/U-01, doc 14 SOC-2, doc 15 §3, doc 16 §9)
 *
 * A silent volume of thousands of translucent contract pages drifting like restrained snow, a dim tribunal
 * frame behind, a scanning key light passing through. The light finds ONE clause: its line burns red, the
 * sheet tilts out of alignment, cracks run from the clause and it fractures into ink motes that re-form as
 * neural threads. Five agents assemble out of light around the signature in a tribunal horseshoe, the SSE
 * token stream braids through them in pipeline order into a late-forming output wall — and only then
 * LAWLENS-X resolves.
 *
 * Beat map (scene progress → doc 15 frame):
 *   0.00–0.08 entry: settles out of the fog, focus blurred → resolves                         F0
 *   0.08–0.25 mystery: slow push through the page field, the scan sweeps the pages            F20
 *   0.25–0.42 conflict: the scan stops on one clause — red line, tilt, cracks, local red key  F40 (hold .36)
 *   0.42–0.56 transformation: fracture → ink motes → neural threads draw in (cyan→violet)     F60
 *   0.53–0.68 stabilise: five agents assemble in pipeline order (+ L3 labels), token stream,
 *             output glow wall forms late                                                     F80
 *   0.68–0.76 TITLE CLIMAX "LAWLENS-X", SOC-2 completes, bloom G2→G3 brief                    F100 (hold .74)
 *   0.76–0.82 tagline · 0.82–0.88 dossier · 0.88–1.00 readable hold (world dimmed)           (hold .93)
 *   exit      token stream slows to rest, pages liquefy into particles that flow into the signature,
 *             typography dissolves into glyph dust absorbed by it (TX-Absorb → Triage)
 */
import { BoxGeometry, Color, Euler, Matrix4, Mesh, Quaternion, Vector3, type BufferGeometry } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { SceneContext, SceneFrame } from '../../../../types/scene';
import { BaseScene } from '../../BaseScene';
import type { TextBlock } from '../../../ui/CinematicTextLayer';
import type { Portal } from '../../../ui/PortalButtons';
import type { GlyphDust } from '../../../systems/ParticleSystem/GlyphDust';
import { MorphPoints } from '../../../systems/ParticleSystem/MorphPoints';
import { EnergyLines, Glow, GlowField, HoloPlane, LightBeam, alloy, stone } from '../../../systems/ArchitectureViz';
import { sampleSignatureSurface } from '../../../systems/SignatureObject/SignatureObject';
import { SOC } from '../../../systems/SignatureObject/socStates';
import { getProject } from '../../../../content/projects';
import { beat, bell, lerp, smoothstep } from '../../../../utils/math';
import { easeInOutPremium, easeOutPremium } from '../../../../utils/easing';
import { colorTrack, shotTrack, track, type ShotKey, type ShotOut } from '../../../../utils/timeline';
import { rng } from '../../../../utils/rng';
import { ACCENT, CURTAIN, EMISSION, FOG, GLOW, PARTICLE, TEMPERATURE } from '../../../../tokens/tokens';
import { PALETTES } from '../../../../tokens/palettes';
import { PageField } from './PageField';
import { RedClause } from './RedClause';
import { AgentSculptures } from './AgentSculptures';
import { makeWallPainter } from './wall';
import { AGENTS, CLAUSE, CLAUSE_SCALE, FRAME_Z, PAGE_H, PAGE_W, STAGE, WALL, clauseMatrix, clausePose, streamCurves, threadCurves, type ClausePose } from './layout';

const PAL = PALETTES.lawlens;
const CYAN = PAL.accentA;
const VIOLET = PAL.accentB;
const RED = PAL.accentC ?? ACCENT.red;
const PAPER_A = '#86a6cc';
const PAPER_B = '#a3acdf';
const SCAN = '#bfe6ff';

/** Total scroll-driven page fall over the scene (slow snow). */
const FALL = 1.6;
const CLAUSE_ROW = 6;
/** Agents assemble sequentially (pipeline order). */
const AGENT_START = [0.53, 0.552, 0.574, 0.596, 0.618];
const AGENT_DUR = 0.044;
/** Label pixel offsets (RiskScorer presides at the back → label above it). */
const LABEL_DY = [62, 60, -78, 60, 62];

const SHOT: ShotKey[] = [
  { at: 0.0, position: [-1.2, 0.9, 21.5], target: [-1.7, 0.55, 2.0], lens: 28 },
  { at: 0.1, position: [-1.5, 0.85, 19.2], target: [-2.2, 0.6, 2.0], lens: 30 },
  { at: 0.23, position: [-2.0, 0.82, 14.4], target: [-2.9, 0.66, 1.9], lens: 34 },
  { at: 0.36, position: [-2.5, 0.86, 8.4], target: [-3.25, 0.74, 1.95], lens: 46 },
  { at: 0.43, position: [-2.42, 0.9, 7.9], target: [-3.15, 0.7, 1.9], lens: 46 },
  { at: 0.52, position: [-1.7, 1.6, 9.6], target: [-1.2, 0.3, -1.8], lens: 38 },
  { at: 0.6, position: [-0.3, 2.6, 10.8], target: [0.0, 0.3, -4.4], lens: 34 },
  { at: 0.655, position: [1.3, 2.5, 9.8], target: [2.6, 0.7, -5.9], lens: 34 },
  { at: 0.72, position: [0.0, 3.0, 9.8], target: [0.0, 0.5, -4.2], lens: 36 },
  { at: 0.76, position: [0.0, 3.0, 9.85], target: [0.0, 0.55, -4.2], lens: 36 },
  { at: 0.88, position: [0.0, 3.3, 10.6], target: [0.0, 1.35, -4.2], lens: 36 },
  { at: 1.0, position: [0.38, 3.34, 10.68], target: [0.05, 1.4, -4.2], lens: 36 },
];

const _m = new Matrix4();
const _q = new Quaternion();
const _e = new Euler();
const _s = new Vector3();
const _p = new Vector3();

function place(g: BufferGeometry, x: number, y: number, z: number): BufferGeometry {
  g.translate(x, y, z);
  return g;
}

function distToSegment(p: Vector3, a: Vector3, b: Vector3): number {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const abz = b.z - a.z;
  const len2 = abx * abx + aby * aby + abz * abz;
  let t = len2 > 0 ? ((p.x - a.x) * abx + (p.y - a.y) * aby + (p.z - a.z) * abz) / len2 : 0;
  t = Math.max(0, Math.min(1, t));
  const dx = a.x + abx * t - p.x;
  const dy = a.y + aby * t - p.y;
  const dz = a.z + abz * t - p.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

class LawLensX extends BaseScene {
  private readonly project = getProject('lawlens');

  // typography
  private monument!: TextBlock;
  private subtitle!: TextBlock;
  private bodies: TextBlock[] = [];
  private signals: TextBlock | null = null;
  private stackLine!: TextBlock;
  private portals: Portal[] = [];
  private dossierDust: GlyphDust[] = [];
  private monumentDust!: GlyphDust;
  private subtitleDust!: GlyphDust;
  private agentLabels: TextBlock[] = [];
  private labelDust: GlyphDust[] = [];
  private sseLabel: TextBlock | null = null;
  private sseDust: GlyphDust | null = null;

  // set
  private pages!: PageField;
  private clause!: RedClause;
  private ink!: MorphPoints;
  private fracture!: MorphPoints;
  private threads!: EnergyLines;
  private stream!: EnergyLines;
  private agents!: AgentSculptures;
  private cores!: GlowField;
  private wall!: HoloPlane;
  private redGlow!: Glow;
  private volume!: Glow;
  private beam!: LightBeam;
  private liquid!: MorphPoints;
  private liquidHull!: Float32Array;
  private liquidEnd!: Float32Array;
  private lastSig = new Vector3(1e9, 0, 0);
  private buildGen = 0;

  // per-frame scratch (no allocations in update)
  private shot = shotTrack(SHOT);
  private shotOut: ShotOut = { position: new Vector3(), target: new Vector3(), fov: 35, roll: 0 };
  private pose: ClausePose = { position: new Vector3(), rotation: new Euler() };
  private beamTarget = new Vector3();
  private tmpColor = new Color();
  private cRed = new Color(RED);
  private cCyan = new Color(CYAN);
  private cViolet = new Color(VIOLET);
  private cDeepRed = new Color('#7a1f35');
  private cRay = new Color('#9fd2ff');
  private streamPhase = 0;
  private lastTime = -1;

  private fog = track([
    { at: 0, value: FOG.F2 * 0.85 },
    { at: 0.08, value: 0.018 },
    { at: 0.23, value: 0.017 },
    { at: 0.36, value: 0.022 },
    { at: 0.47, value: 0.025 },
    { at: 0.6, value: 0.016 },
    { at: 0.74, value: 0.0125 },
    { at: 1, value: 0.0125 },
  ]);
  private aperture = track([
    { at: 0, value: 1.1 },
    { at: 0.09, value: 0.45 },
    { at: 0.24, value: 0.5 },
    { at: 0.36, value: 0.95 },
    { at: 0.46, value: 0.8 },
    { at: 0.62, value: 0.55 },
    { at: 0.74, value: 0.32 },
    { at: 0.88, value: 0.5 },
    { at: 1, value: 0.5 },
  ]);
  private bloom = track([
    { at: 0, value: GLOW.G1 * 0.8 },
    { at: 0.24, value: GLOW.G1 * 0.85 },
    { at: 0.36, value: 0.42 },
    { at: 0.46, value: GLOW.G2 },
    { at: 0.56, value: 0.4 },
    { at: 0.68, value: 0.44 },
    { at: 0.735, value: 0.8 },
    { at: 0.8, value: 0.36 },
    { at: 0.9, value: 0.3 },
    { at: 1, value: 0.3 },
  ]);
  private keyColor = colorTrack([
    { at: 0, value: '#c7dcff' },
    { at: 0.3, value: TEMPERATURE.cool5400 },
    { at: 0.45, value: '#d9e6ff' },
    { at: 0.62, value: '#a9e4ff' },
    { at: 0.74, value: '#b6d8ff' },
    { at: 1, value: '#c6d6ff' },
  ]);
  private keyI = track([
    { at: 0, value: 0.42 },
    { at: 0.25, value: 0.55 },
    { at: 0.38, value: 0.62 },
    { at: 0.56, value: 0.82 },
    { at: 0.72, value: 1.05 },
    { at: 0.86, value: 0.8 },
    { at: 1, value: 0.8 },
  ]);
  private soc = track([
    { at: 0, value: 2 },
    { at: 0.1, value: 1.62 },
    { at: 0.36, value: 1.74 },
    { at: 0.56, value: 1.88 },
    { at: 0.74, value: 2 },
    { at: 1, value: 2 },
  ]);
  private sigVis = track([
    { at: 0, value: 0.4 },
    { at: 0.12, value: 0.3 },
    { at: 0.36, value: 0.42 },
    { at: 0.56, value: 0.8 },
    { at: 0.7, value: 1 },
    { at: 1, value: 1 },
  ]);
  /** Scan plane coordinate (dir = (1, .22, 0)·p): sweeps in, stops on the clause, then sweeps the stage. */
  private scanPos = track([
    { at: 0, value: -21 },
    { at: 0.05, value: -19 },
    { at: 0.3, value: -3.07 },
    { at: 0.42, value: -2.95 },
    { at: 0.62, value: 2.6 },
    { at: 0.76, value: 9.5 },
    { at: 1, value: 16 },
  ]);
  private scanAmt = track([
    { at: 0, value: 0.35 },
    { at: 0.08, value: 0.62 },
    { at: 0.3, value: 0.95 },
    { at: 0.42, value: 1.0 },
    { at: 0.5, value: 0.55 },
    { at: 0.62, value: 0.75 },
    { at: 0.76, value: 0.45 },
    { at: 0.86, value: 0.15 },
    { at: 1, value: 0.12 },
  ]);
  private pageDim = track([
    { at: 0, value: 1 },
    { at: 0.26, value: 1 },
    { at: 0.36, value: 0.78 },
    { at: 0.5, value: 0.85 },
    { at: 0.66, value: 0.62 },
    { at: 0.76, value: 0.55 },
    { at: 0.86, value: 0.36 },
    { at: 1, value: 0.34 },
  ]);

  constructor() {
    super('lawlens', 'lawlens');
  }

  protected build(ctx: SceneContext): void {
    this.buildText();
    this.buildTribunal();
    this.buildPages(ctx);
    this.buildClause(ctx);
    this.buildAgents(ctx);
    this.buildWall(ctx);
    this.buildLights(ctx);
  }

  /* ───────────────────────────── build ───────────────────────────── */

  private buildText(): void {
    const p = this.project;
    // Standard post-climax stack (slot centre, in order): monument · tagline · facts · signals · stack · portals
    this.monument = this.text({ text: p.monument, style: 'monument', slot: 'center', accent: CYAN, stagger: 0.55 });
    this.subtitle = this.text({ text: p.tagline, style: 'subtitle', slot: 'center', accent: VIOLET, stagger: 0.4 });
    const facts = innerWidth < 700 ? p.facts.slice(0, 1) : p.facts.slice(0, 3);
    this.bodies = facts.map((f) => this.text({ text: f, style: 'body', slot: 'center', maxWidth: '58ch', stagger: 0.3 }));
    if (p.signals.length) {
      this.signals = this.text({
        text: p.signals.map((s) => `${s.value} · ${s.label}`).join('   ·   '),
        style: 'label',
        slot: 'center',
        accent: CYAN,
        stagger: 0.3,
      });
    }
    this.stackLine = this.text({ text: p.stack.join('  ·  '), style: 'mono', slot: 'center', stagger: 0.3 });
    this.portals = p.links.map((l) =>
      this.portal({ label: l.label, href: l.href, slot: 'center', group: 'links', description: `${p.name} — ${l.label}`, accent: CYAN }),
    );

    this.monumentDust = this.dust(this.monument, { mode: 'absorb', color: CYAN, depth: 7.5 });
    this.subtitleDust = this.dust(this.subtitle, { mode: 'absorb', color: VIOLET, depth: 7.5, maxPoints: 900 });
    for (const b of this.bodies) this.dossierDust.push(this.dust(b, { mode: 'absorb', color: '#a8dcff', depth: 7, maxPoints: 700 }));
    if (this.signals) this.dossierDust.push(this.dust(this.signals, { mode: 'absorb', color: CYAN, depth: 7, maxPoints: 400 }));
    this.dossierDust.push(this.dust(this.stackLine, { mode: 'absorb', color: '#a8dcff', depth: 7, maxPoints: 400 }));

    // In-world signage (L3, anchored, resume vocabulary only): the five agents + the SSE stream.
    const agentNames = p.vocabulary.slice(0, 5);
    this.agentLabels = agentNames.map((name, i) => {
      const b = this.text({ text: name, style: 'label', slot: 'anchor', accent: i < 2 ? CYAN : VIOLET, stagger: 0.35 });
      b.anchor = AGENTS[i].clone();
      b.anchorOffset = { x: 0, y: LABEL_DY[i] };
      return b;
    });
    this.labelDust = this.agentLabels.map((b) => this.dust(b, { mode: 'drift', color: '#a8dcff', depth: 9, maxPoints: 260 }));
    if (p.vocabulary.includes('SSE')) {
      this.sseLabel = this.text({ text: 'SSE', style: 'label', slot: 'anchor', accent: CYAN, stagger: 0.3 });
      this.sseLabel.anchor = new Vector3(AGENTS[4].x + 1.7, AGENTS[4].y + 0.6, AGENTS[4].z - 1.0);
      this.sseLabel.anchorOffset = { x: 0, y: -18 };
      this.sseDust = this.dust(this.sseLabel, { mode: 'drift', color: CYAN, depth: 9, maxPoints: 120 });
    }
  }

  /** Legal tribunal monolith frame — dim, monumental, matte stone with an inner alloy frame. */
  private buildTribunal(): void {
    const stoneGeo = mergeGeometries(
      [
        place(new BoxGeometry(1.8, 24, 1.8), -8.3, 0.5, FRAME_Z),
        place(new BoxGeometry(1.8, 24, 1.8), 8.3, 0.5, FRAME_Z),
        place(new BoxGeometry(19, 2.0, 2.2), 0, 7.6, FRAME_Z),
        place(new BoxGeometry(17, 0.8, 5.5), 0, -4.9, FRAME_Z + 1.6),
        place(new BoxGeometry(13, 0.7, 4), 0, -4.2, FRAME_Z + 1.2),
      ],
      false,
    );
    const alloyGeo = mergeGeometries(
      [
        place(new BoxGeometry(0.3, 12.4, 0.3), -6.1, 0.3, FRAME_Z + 1.3),
        place(new BoxGeometry(0.3, 12.4, 0.3), 6.1, 0.3, FRAME_Z + 1.3),
        place(new BoxGeometry(12.5, 0.3, 0.3), 0, 6.35, FRAME_Z + 1.3),
      ],
      false,
    );
    if (!stoneGeo || !alloyGeo) return;
    const stoneMat = this.track(stone({ color: '#1b1f28', roughness: 0.94 }));
    const alloyMat = this.track(alloy({ color: '#2a2f3a', roughness: 0.38 }));
    const s = new Mesh(stoneGeo, stoneMat);
    const a = new Mesh(alloyGeo, alloyMat);
    this.track(stoneGeo);
    this.track(alloyGeo);
    this.add(s, a);
  }

  private buildPages(ctx: SceneContext): void {
    const n = ctx.quality.count(1600);
    const r = rng(0x1a7f1e);
    // lens corridor: pages never park on the camera path
    const corridor: Vector3[] = [];
    for (let k = 0; k <= 60; k++) {
      this.shot(k / 60, this.shotOut);
      corridor.push(this.shotOut.position.clone());
    }
    const climaxCam = new Vector3(0, 3.0, 9.8);
    const toStage = STAGE.clone().sub(climaxCam);
    const stageDist = toStage.length();
    toStage.normalize();
    const toWall = WALL.position.clone().sub(climaxCam);
    const wallDist = toWall.length();
    toWall.normalize();
    const wc = Math.cos(WALL.yaw);
    const ws = Math.sin(WALL.yaw);
    const q = new Vector3();
    const v = new Vector3();
    const blocked = (x: number, y: number, z: number): boolean => {
      q.set(x, y, z);
      for (let k = 0; k < corridor.length - 1; k++) if (distToSegment(q, corridor[k], corridor[k + 1]) < 1.7) return true;
      const ex = x / 5.6;
      const ey = (y - 0.3) / 3.2;
      const ez = (z - STAGE.z - 0.2) / 4.8;
      if (ex * ex + ey * ey + ez * ez < 1) return true;
      const dx = x - WALL.position.x;
      const dz = z - WALL.position.z;
      const u = dx * wc - dz * ws;
      const w = dx * ws + dz * wc;
      if (Math.abs(u) < WALL.width / 2 + 0.9 && Math.abs(y - WALL.position.y) < WALL.height / 2 + 0.9 && w > -1.5 && w < 3.5) return true;
      if (q.distanceTo(CLAUSE) < 0.85) return true;
      v.subVectors(q, climaxCam);
      const d = v.length();
      if (d > 0.01 && d < stageDist + 1.5 && v.dot(toStage) / d > Math.cos(0.33)) return true;
      if (d > 0.01 && d < wallDist && v.dot(toWall) / d > Math.cos(0.24)) return true;
      return false;
    };

    type Page = { x: number; y: number; z: number; rx: number; ry: number; rz: number; s: number; seed: number; fall: number; order: number };
    const list: Page[] = [];
    let tries = 0;
    while (list.length < n && tries < n * 80) {
      tries++;
      const x = r.range(-18, 18);
      const y = r.range(-8, 8.5);
      const z = r.range(-28, 21);
      if (z > 13 && r.next() < 0.5) continue;
      if (Math.abs(x) > 12 && r.next() < 0.3) continue;
      const fall = r.range(0.45, 1.45);
      if (blocked(x, y, z) || blocked(x, y - FALL * 0.36 * fall, z) || blocked(x, y - FALL * 0.62 * fall, z) || blocked(x, y - FALL * 0.85 * fall, z)) continue;
      const dist = Math.hypot(x - STAGE.x, y - STAGE.y, z - STAGE.z);
      list.push({
        x,
        y,
        z,
        rx: r.range(-0.32, 0.32),
        ry: r.range(-0.5, 0.5),
        rz: r.range(-0.22, 0.22),
        s: r.range(0.75, 1.3),
        seed: r.next(),
        fall,
        order: Math.min(1, dist / 30) * 0.9 + r.next() * 0.1,
      });
    }
    // far → near so the unsorted instanced draw blends back-to-front for the main view direction
    list.sort((a, b) => a.z - b.z);
    const count = list.length;
    const matrices = new Float32Array(count * 16);
    const seed = new Float32Array(count);
    const order = new Float32Array(count);
    const fall = new Float32Array(count);
    const liquidStart = new Float32Array(count * 3);
    list.forEach((pg, i) => {
      _q.setFromEuler(_e.set(pg.rx, pg.ry, pg.rz));
      _m.compose(_p.set(pg.x, pg.y, pg.z), _q, _s.set(pg.s, pg.s, 1));
      _m.toArray(matrices, i * 16);
      seed[i] = pg.seed;
      order[i] = pg.order;
      fall[i] = pg.fall;
      // each sheet becomes one mote at its end-of-scene position
      liquidStart[i * 3] = pg.x + r.range(-0.12, 0.12);
      liquidStart[i * 3 + 1] = pg.y - FALL * pg.fall + r.range(-0.15, 0.15);
      liquidStart[i * 3 + 2] = pg.z;
    });

    this.pages = this.track(
      new PageField(ctx.uniforms, { count, matrices, seed, order, fall }, {
        width: PAGE_W,
        height: PAGE_H,
        colorA: PAPER_A,
        colorB: PAPER_B,
        scanColor: SCAN,
        redColor: RED,
        pointerColor: '#cfe9ff',
        opacity: 0.15,
      }),
    );
    this.pages.mesh.renderOrder = 1;
    this.add(this.pages.mesh);

    // exit: sheets liquefy into motes that flow into the signature
    this.liquidHull = sampleSignatureSurface(count, 0x11c, SOC[2].scale * 0.95);
    this.liquidEnd = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      this.liquidEnd[i * 3] = this.liquidHull[i * 3] + STAGE.x;
      this.liquidEnd[i * 3 + 1] = this.liquidHull[i * 3 + 1] + STAGE.y;
      this.liquidEnd[i * 3 + 2] = this.liquidHull[i * 3 + 2] + STAGE.z;
    }
    this.liquid = this.track(
      new MorphPoints(ctx.uniforms, {
        start: liquidStart,
        end: this.liquidEnd.slice(),
        order: order.slice(),
        colorA: '#9cc2ea',
        colorB: CYAN,
        size: 0.034,
        stagger: 0.7,
        swirl: 0.7,
        drift: 0.03,
      }),
    );
    this.liquid.setFadeWindow(0.8, 1.0);
    this.liquid.opacity = 0;
    this.liquid.points.renderOrder = 7;
    this.add(this.liquid.points);
  }

  private buildClause(ctx: SceneContext): void {
    const pu = this.pages.uniforms;
    this.clause = this.track(
      new RedClause(ctx.uniforms, {
        width: PAGE_W,
        height: PAGE_H,
        row: CLAUSE_ROW,
        paperA: PAPER_A,
        paperB: PAPER_B,
        redColor: RED,
        seed: 0xc1a05e,
        scan: { uScanDir: pu.uScanDir, uScanPos: pu.uScanPos, uScanWidth: pu.uScanWidth, uScanAmount: pu.uScanAmount, uScanColor: pu.uScanColor },
      }),
    );
    this.clause.mesh.scale.setScalar(CLAUSE_SCALE);
    this.clause.mesh.renderOrder = 3;
    this.add(this.clause.mesh);

    // conflict: ink motes gather around the wrong clause
    const r = rng(0x14c);
    const nInk = ctx.quality.count(520);
    const inkStart = new Float32Array(nInk * 3);
    const inkEnd = new Float32Array(nInk * 3);
    const inkTint = new Float32Array(nInk);
    for (let i = 0; i < nInk; i++) {
      const [ax, ay, az] = r.onSphere(r.range(1.3, 3.5));
      inkStart[i * 3] = CLAUSE.x + ax;
      inkStart[i * 3 + 1] = CLAUSE.y + ay * 0.8;
      inkStart[i * 3 + 2] = CLAUSE.z + az * 0.6;
      const [bx, by, bz] = r.onSphere(r.range(0.24, 0.62));
      inkEnd[i * 3] = CLAUSE.x + bx;
      inkEnd[i * 3 + 1] = CLAUSE.y + by * 0.85;
      inkEnd[i * 3 + 2] = CLAUSE.z + 0.2 + bz * 0.45;
      inkTint[i] = r.next() < 0.78 ? r.range(0, 0.3) : r.range(0.7, 1);
    }
    this.ink = this.track(
      new MorphPoints(ctx.uniforms, { start: inkStart, end: inkEnd, tint: inkTint, colorA: '#c0485c', colorB: '#7d93d8', size: 0.024, stagger: 0.55, swirl: 0.45, drift: 0.07 }),
    );
    this.ink.opacity = 0;
    this.ink.points.renderOrder = 5;
    this.add(this.ink.points);

    // transformation: the clause fractures into motes that re-form as neural threads (and feed the signature)
    const curves = threadCurves(rng(0x7e4d));
    const nF = ctx.quality.count(1400);
    const local = RedClause.sample(nF, 0xf4c7, PAGE_W, PAGE_H, CLAUSE_ROW);
    const mat = clauseMatrix(0.44, new Matrix4());
    const fStart = new Float32Array(nF * 3);
    const fEnd = new Float32Array(nF * 3);
    const fOrder = new Float32Array(nF);
    const hull = sampleSignatureSurface(nF, 0x5e2, SOC[2].scale * 0.7);
    const tmp = new Vector3();
    for (let i = 0; i < nF; i++) {
      tmp.set(local[i * 3], local[i * 3 + 1], local[i * 3 + 2]).applyMatrix4(mat);
      fStart[i * 3] = tmp.x;
      fStart[i * 3 + 1] = tmp.y;
      fStart[i * 3 + 2] = tmp.z;
      if (i < nF * 0.86) {
        const t = r.next();
        curves[i % curves.length].getPointAt(t, tmp);
        const [jx, jy, jz] = r.inSphere(0.07);
        fEnd[i * 3] = tmp.x + jx;
        fEnd[i * 3 + 1] = tmp.y + jy;
        fEnd[i * 3 + 2] = tmp.z + jz;
        fOrder[i] = t * 0.82 + r.next() * 0.18;
      } else {
        fEnd[i * 3] = STAGE.x + hull[i * 3];
        fEnd[i * 3 + 1] = STAGE.y + hull[i * 3 + 1];
        fEnd[i * 3 + 2] = STAGE.z + hull[i * 3 + 2];
        fOrder[i] = 0.55 + r.next() * 0.45;
      }
    }
    this.fracture = this.track(
      new MorphPoints(ctx.uniforms, { start: fStart, end: fEnd, order: fOrder, colorA: RED, colorB: '#7a1f35', size: 0.026, stagger: 0.62, swirl: 0.75, drift: 0.04 }),
    );
    this.fracture.opacity = 0;
    this.fracture.points.renderOrder = 6;
    this.add(this.fracture.points);

    this.threads = this.track(
      new EnergyLines(ctx.uniforms, {
        curves,
        radius: 0.011,
        radii: curves.map((_, i) => 0.8 + ((i * 0.37) % 0.5)),
        order: curves.map((_, i) => (i * 0.61) % 1),
        tint: curves.map((_, i) => i / Math.max(1, curves.length - 1)),
        colorA: CYAN,
        colorB: VIOLET,
        stagger: 0.45,
        tubularSegments: 96,
      }),
    );
    this.threads.uniforms.uFlow.value = 0.12;
    this.threads.uniforms.uPulses.value = 2;
    this.threads.uniforms.uPulseAmount.value = 0.35;
    this.threads.draw = 0;
    this.threads.mesh.renderOrder = 4;
    this.add(this.threads.mesh);
  }

  private buildAgents(ctx: SceneContext): void {
    this.agents = this.track(new AgentSculptures(ctx.uniforms, AGENTS, new Vector3(0, 2.6, 10), { a: CYAN, b: VIOLET }));
    this.add(this.agents.mesh);

    const corePos = new Float32Array(AGENTS.length * 3);
    AGENTS.forEach((a, i) => a.toArray(corePos, i * 3));
    this.cores = this.track(
      new GlowField(ctx.uniforms, corePos, { size: 0.5, color: CYAN, colorB: VIOLET, tint: new Float32Array([0, 0.25, 0.5, 0.75, 1]) }),
    );
    for (let i = 0; i < AGENTS.length; i++) this.cores.setBrightness(i, 0);
    this.cores.commit();
    this.cores.points.renderOrder = 8;
    this.add(this.cores.points);

    const curves = streamCurves();
    this.stream = this.track(
      new EnergyLines(ctx.uniforms, {
        curves,
        radius: 0.011,
        radii: [1.25, 0.7, 0.7],
        order: [0, 0.12, 0.24],
        tint: [0.15, 0.55, 0.9],
        colorA: CYAN,
        colorB: '#cfe8ff',
        stagger: 0.18,
        tubularSegments: 260,
      }),
    );
    this.stream.uniforms.uPulses.value = 14;
    this.stream.uniforms.uPulseAmount.value = 0.95;
    this.stream.draw = 0;
    this.stream.mesh.renderOrder = 4;
    this.add(this.stream.mesh);
  }

  private buildWall(ctx: SceneContext): void {
    this.wall = this.track(
      new HoloPlane(ctx.uniforms, { width: WALL.width, height: WALL.height, draw: makeWallPainter(this.project), tint: '#bfe9ff', holographic: true, resolution: 1024 }),
    );
    this.wall.mesh.position.copy(WALL.position);
    this.wall.mesh.rotation.y = WALL.yaw;
    this.wall.reveal = 0;
    this.wall.mesh.renderOrder = 2;
    this.add(this.wall.mesh);
    // repaint once the type faces are ready (signage uses the project fonts)
    const gen = this.buildGen;
    void document.fonts?.ready.then(() => {
      if (gen === this.buildGen) this.wall.redraw();
    });
  }

  private buildLights(ctx: SceneContext): void {
    this.redGlow = this.track(new Glow(ctx.uniforms, { size: 3.0, color: RED, intensity: 0, falloff: 3.2 }));
    this.redGlow.mesh.renderOrder = 6;
    this.add(this.redGlow.mesh);

    this.volume = this.track(new Glow(ctx.uniforms, { size: 26, color: '#1f3f7c', intensity: 0.06, falloff: 3.0 }));
    this.volume.mesh.position.set(0, 1.5, FRAME_Z + 2.5);
    this.add(this.volume.mesh);

    this.beam = this.track(new LightBeam(ctx.uniforms, { length: 19, radius: 1.7, color: SCAN, intensity: 0 }));
    this.beam.mesh.renderOrder = 2;
    this.add(this.beam.mesh);
  }

  /* ───────────────────────────── update ───────────────────────────── */

  update(f: SceneFrame): void {
    const p = f.progress;
    const d = this.directives;
    const rm = f.reducedMotion;
    const exit = f.exit;
    const enter = f.enter;
    const dossier = smoothstep(0.8, 0.88, p);
    const climax = bell(p, 0.735, 0.05);

    /* ── camera ── */
    this.shot(p, this.shotOut);
    d.camera.position.copy(this.shotOut.position);
    d.camera.target.copy(this.shotOut.target);
    let fov = this.shotOut.fov;
    if (f.aspect < 1.5) {
      // narrow screens: open the lens so the horseshoe and the wall still read
      const k = Math.pow(1.5 / Math.max(0.3, f.aspect), 0.62);
      fov = (2 * Math.atan(Math.tan((fov * Math.PI) / 360) * k) * 180) / Math.PI;
    }
    d.camera.fov = fov;
    d.camera.roll = 0;
    const focusDist = this.shotOut.position.distanceTo(this.shotOut.target);

    /* ── typography ── */
    this.updateText(p, exit);

    /* ── pages ── */
    const pu = this.pages.uniforms;
    pu.uFall.value = p * FALL;
    pu.uTurn.value = p;
    pu.uDim.value = this.pageDim(p);
    const scan = this.scanPos(p);
    pu.uScanPos.value = scan;
    pu.uScanAmount.value = this.scanAmt(p) * (1 - exit);
    pu.uPointerAmount.value = lerp(0.6, 0.25, dossier);
    const liq = beat(exit, 0.02, 0.85);
    pu.uLiquefy.value = liq;

    /* ── the red clause ── */
    clausePose(p, this.pose);
    this.clause.mesh.position.copy(this.pose.position);
    this.clause.mesh.rotation.copy(this.pose.rotation);
    const cu = this.clause.uniforms;
    const red = smoothstep(0.235, 0.345, p) * (1 - smoothstep(0.5, 0.56, p));
    cu.uRed.value = red;
    cu.uCrack.value = beat(p, 0.3, 0.43, easeInOutPremium);
    cu.uFracture.value = beat(p, 0.42, 0.54, easeInOutPremium);
    cu.uSpread.value = rm ? 0.3 : 0.75;
    cu.uOpacity.value = 1 - smoothstep(0.5, 0.57, p);
    cu.uDim.value = pu.uDim.value as number;
    this.clause.mesh.visible = p < 0.57;
    // its red light falls on the neighbouring sheets (secondary light) and flares at the fracture
    const flare = bell(p, 0.455, 0.05);
    const redLight = Math.max(red, flare * 1.25) * (1 - smoothstep(0.5, 0.58, p));
    pu.uRedPos.value.copy(this.pose.position);
    pu.uRedAmount.value = redLight * 0.85;
    this.redGlow.mesh.position.copy(this.pose.position);
    this.redGlow.mesh.position.z += 0.05;
    this.redGlow.intensity = redLight * (rm ? 0.22 : 0.3);

    /* ── ink motes gather (conflict) → fracture motes become threads (transformation) ── */
    this.ink.mix = beat(p, 0.2, 0.4, easeInOutPremium);
    this.ink.opacity = smoothstep(0.18, 0.27, p) * (1 - smoothstep(0.44, 0.5, p)) * 0.9;

    this.fracture.mix = beat(p, 0.425, 0.6);
    const fracVis = smoothstep(0.425, 0.45, p) * lerp(1, 0.2, smoothstep(0.58, 0.72, p)) * lerp(1, 0.5, dossier) * (1 - exit);
    this.fracture.opacity = fracVis * (rm ? 0.6 : 1);
    const cool = smoothstep(0.46, 0.58, p);
    this.tmpColor.copy(this.cRed).lerp(this.cCyan, cool);
    const fu = this.fracture.uniforms;
    (fu.uColorA.value as Color).copy(this.tmpColor);
    this.tmpColor.copy(this.cDeepRed).lerp(this.cViolet, cool);
    (fu.uColorB.value as Color).copy(this.tmpColor);

    this.threads.draw = beat(p, 0.46, 0.61);
    this.threads.opacity = smoothstep(0.46, 0.48, p) * lerp(1, 0.6, smoothstep(0.7, 0.8, p)) * lerp(1, 0.55, dossier) * (1 - beat(exit, 0, 0.6));
    this.threads.uniforms.uWobble.value = 0.3 * (1 - smoothstep(0.55, 0.66, p));

    /* ── agents assemble in pipeline order ── */
    let presenceSum = 0;
    for (let i = 0; i < AGENTS.length; i++) {
      const pres = beat(p, AGENT_START[i], AGENT_START[i] + AGENT_DUR, easeOutPremium);
      presenceSum += pres;
      this.agents.setPresence(i, pres);
      this.cores.setBrightness(i, pres * (0.75 + climax * 0.25) * lerp(1, 0.6, dossier) * (1 - exit));
    }
    this.agents.commit(lerp(1, 0.6, dossier) * (1 - exit * 0.7));
    this.cores.commit();
    this.cores.intensity = presenceSum > 0.001 ? 1 : 0;

    /* ── SSE token stream: draws through the pipeline into the wall; on exit it slows to rest ── */
    this.stream.draw = beat(p, 0.585, 0.69);
    this.stream.opacity = smoothstep(0.585, 0.6, p) * lerp(1, 0.65, dossier) * (1 - beat(exit, 0.3, 0.9));
    const speed = 0.55 * (1 - beat(exit, 0, 0.55)) * (rm ? 0.4 : 1);
    if (this.lastTime >= 0) this.streamPhase += Math.max(0, f.time - this.lastTime) * speed;
    this.lastTime = f.time;
    // EnergyLines phase = uTime·uFlow → integrate our own phase so slowing never makes the pulses jump
    this.stream.uniforms.uFlow.value = f.time > 0.01 ? this.streamPhase / f.time : 0;
    this.stream.uniforms.uIntensity.value = 1 + climax * 0.25;

    /* ── output glow wall (screenshot stage) forms late ── */
    this.wall.reveal = beat(p, 0.6, 0.7);
    this.wall.sweep = p > 0.64 && p < 0.76 ? beat(p, 0.64, 0.75) : -1;
    this.wall.opacity = lerp(1, 0.08, smoothstep(0.67, 0.74, p)) * (1 - beat(exit, 0, 0.7));

    /* ── scanning key: a searchlight shaft that follows the scan plane ── */
    const scanX = scan / 0.9766 - 0.6 * 0.22;
    this.beamTarget.set(scanX, 0.5, lerp(1.6, -4.5, smoothstep(0.42, 0.66, p)));
    this.beam.mesh.position.set(scanX - 3.2, 12, this.beamTarget.z - 5.5);
    this.beam.aim(this.beamTarget);
    this.beam.intensity = (0.05 + bell(p, 0.34, 0.12) * 0.06) * (1 - dossier * 0.8) * (1 - exit) * smoothstep(0.03, 0.12, p);

    this.volume.intensity = lerp(0.05, 0.13, smoothstep(0.55, 0.74, p)) * lerp(1, 0.7, dossier);

    /* ── exit: pages liquefy into motes that flow into the signature ── */
    this.liquid.mix = liq;
    this.liquid.opacity = smoothstep(0.0, 0.06, exit) * (rm ? 0.6 : 1);
    if (exit > 0.0005 && this.lastSig.distanceToSquared(this.ctx.signaturePosition) > 1e-4) {
      const s = this.ctx.signaturePosition;
      for (let i = 0; i < this.liquidHull.length; i += 3) {
        this.liquidEnd[i] = this.liquidHull[i] + s.x;
        this.liquidEnd[i + 1] = this.liquidHull[i + 1] + s.y;
        this.liquidEnd[i + 2] = this.liquidHull[i + 2] + s.z;
      }
      this.liquid.setEnd(this.liquidEnd);
      this.lastSig.copy(s);
    }

    /* ── lighting: cool scanning key, red as local warm emphasis, cyan/violet alignment at the reveal ── */
    this.keyColor(p, d.lighting.keyColor);
    d.lighting.keyIntensity = this.keyI(p) * lerp(1, 0.85, exit);
    const sweepT = smoothstep(-21, 16, scan);
    d.lighting.keyDirection.set(lerp(-0.75, 0.65, sweepT), 0.85, 0.5);
    d.lighting.rimColor.copy(this.cViolet).lerp(this.cRed, red * 0.35);
    d.lighting.rimIntensity = 0.5 + smoothstep(0.38, 0.5, p) * 0.25 + climax * 0.25 - dossier * 0.15;
    d.lighting.ambientIntensity = lerp(0.2, 0.28, smoothstep(0.55, 0.75, p));
    d.lighting.pointerInfluence = lerp(0.85, 0.5, dossier);

    /* ── fog: the emotional meter (thin veil hides the agents, thins as threads cohere) ── */
    d.fog.density = this.fog(p) + (1 - enter) * FOG.F2 * 0.5;
    d.fog.curtain = CURTAIN.F0 + (1 - enter) * CURTAIN.F1;

    /* ── sky ── */
    d.sky.intensity = lerp(0.72, 1, smoothstep(0.55, 0.74, p));
    d.sky.rays = climax * (rm ? 0.08 : 0.16);
    d.sky.rayColor.copy(this.cRay);
    d.sky.rayDirection.set(0, 0.55, -1).normalize();

    /* ── particles: sparse ink-dust, denser near the failure, calm at the end ── */
    d.particles.density =
      lerp(PARTICLE.P1.density, 0.42, smoothstep(0.24, 0.36, p)) * (1 - smoothstep(0.5, 0.6, p)) +
      smoothstep(0.5, 0.6, p) * lerp(0.36, 0.26, dossier);
    d.particles.speed = lerp(PARTICLE.P1.speed, PARTICLE.P2.speed, smoothstep(0.6, 0.75, p));
    d.particles.focus = focusDist;
    d.particles.aperture = this.aperture(p) + (1 - enter) * 0.6;
    d.particles.intensity = lerp(0.8, 0.5, dossier);
    d.particles.size = 1;
    d.particles.flow.set(0, 0, 0);

    /* ── signature: SOC-2 contract lattice — implied seed → absorbs fragments → stable at the climax ── */
    d.signature.soc = this.soc(p);
    d.signature.position.copy(STAGE);
    d.signature.scale = 1;
    d.signature.visibility = this.sigVis(p);
    const absorbing = bell(p, 0.52, 0.08) * 0.75 + bell(p, 0.63, 0.06) * 0.35;
    d.signature.absorb = absorbing;
    d.signature.emission =
      lerp(EMISSION.G1 * 0.55, EMISSION.G1 * 1.3, smoothstep(0.3, 0.66, p)) +
      absorbing * EMISSION.G1 * 0.6 +
      climax * (EMISSION.G2 - EMISSION.G1) * (rm ? 0.6 : 1) -
      dossier * EMISSION.G1 * 0.25;
    d.signature.accentA.copy(this.cCyan);
    d.signature.accentB.copy(this.cViolet).lerp(this.cRed, bell(p, 0.38, 0.1) * 0.55);
    d.signature.spin = 0;

    /* ── post ── */
    d.post.bloom = this.bloom(p) * (rm ? 0.75 : 1);
    d.post.exposure = 1;
    d.post.vignette = 0.58 + bell(p, 0.36, 0.12) * 0.12;
    d.post.grain = 0.035;
  }

  private updateText(p: number, exit: number): void {
    // climax: the title resolves only after all five agents have rebuilt
    const titleE = beat(p, 0.69, 0.765, easeOutPremium);
    const titleD = beat(exit, 0.08, 0.62);
    this.monument.set(titleE, titleD, beat(p, 0.71, 0.8));
    this.monumentDust.update(titleD, this.ctx.signaturePosition);

    const subE = beat(p, 0.765, 0.815, easeOutPremium);
    const subD = beat(exit, 0.04, 0.5);
    this.subtitle.set(subE, subD, beat(p, 0.78, 0.84));
    this.subtitleDust.update(subD, this.ctx.signaturePosition);

    const dossD = beat(exit, 0, 0.42);
    this.bodies.forEach((b, i) => {
      const a = 0.82 + i * 0.012;
      b.set(beat(p, a, a + 0.035, easeOutPremium), dossD);
    });
    this.signals?.set(beat(p, 0.85, 0.88, easeOutPremium), dossD, beat(p, 0.86, 0.9));
    this.stackLine.set(beat(p, 0.86, 0.89, easeOutPremium), dossD);
    for (const dust of this.dossierDust) dust.update(dossD, this.ctx.signaturePosition);
    const portalP = beat(p, 0.87, 0.9) * (1 - beat(exit, 0, 0.3));
    for (const portal of this.portals) portal.setPresence(portalP);

    // in-world agent signage: appears with each agent, dissolves into drift before the title
    const labelD = beat(p, 0.684, 0.712);
    this.agentLabels.forEach((b, i) => {
      const s = AGENT_START[i] + 0.016;
      b.set(beat(p, s, s + 0.03, easeOutPremium), labelD);
      this.labelDust[i].update(labelD);
    });
    if (this.sseLabel) {
      this.sseLabel.set(beat(p, 0.64, 0.67, easeOutPremium), labelD);
      this.sseDust?.update(labelD);
    }
  }

  override cleanup(): void {
    this.buildGen++;
    super.cleanup();
    this.bodies = [];
    this.portals = [];
    this.dossierDust = [];
    this.agentLabels = [];
    this.labelDust = [];
    this.sseLabel = null;
    this.sseDust = null;
    this.signals = null;
    this.streamPhase = 0;
    this.lastTime = -1;
    this.lastSig.set(1e9, 0, 0);
  }
}

export default () => new LawLensX();
