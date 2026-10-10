/**
 * SCENE 1 — IDENTITY TRAVEL  (doc 2 §2, doc 6 §3, doc 11 §3, doc 12 §3, doc 14 SOC-1, doc 15 §2, doc 16 §8/§11)
 *
 * THE CORRIDOR OF RECORDS. A corridor of floating dark-alloy arches recedes into blue-violet fog and
 * narrows into a soft throat; its walls are layered translucent "records", its joints hide network
 * nodes, and far down the centre volume the signature (SOC-1, AWAKEN) waits like a lighthouse.
 * The corridor *reads* the name: as "ANIMESH SHARMA" resolves fog→ink, a band of light travels the
 * arches toward the signature. Each role line that arrives lights the next stretch of the path, until
 * a tiny in-world "Journey" sign appears beneath the signature and the camera glides toward the fog.
 *
 * Not a project world: holds are [0.42, 0.72, 0.9] (title resolved / roles resolved / journey hint).
 *
 * Beat map (scene progress):
 *   0.00–0.15  corridor materialises out of fog, key barely visible, deep focus      (F0  curiosity)
 *   0.15–0.38  ANIMESH SHARMA emerges fog→ink + light pass; the corridor scan travels  (F20 calm authority)
 *   0.38–0.50  breathing hold; rim traces on the right depth wall brighten             (F40 confidence, hold @0.42)
 *   0.50–0.70  three role lines emerge in sequence; each lights the next stretch of nodes (F60 readiness, hold @0.72)
 *   0.76–0.86  "Journey" appears as in-world signage under the signature                (F80 invitation, hold @0.90)
 *   0.86–1.00  camera approaches the fog boundary; frames recede into fog; signature becomes the anchor (F100)
 *   exit       corridor lights dim; title + roles dissolve into glyph dust absorbed by the signature; fog quiets
 *   entry      world resolves out of the boot fog, focus blurred → sharp
 */
import { type Color, Vector3, type InstancedMesh, type MeshStandardMaterial } from 'three';
import type { SceneContext, SceneFrame } from '../../../types/scene';
import { BaseScene } from '../BaseScene';
import type { TextBlock } from '../../ui/CinematicTextLayer';
import type { GlyphDust } from '../../systems/ParticleSystem/GlyphDust';
import { EnergyLines, Glow, GlowField, Panes } from '../../systems/ArchitectureViz';
import { identity } from '../../../content/identity';
import { beat, bell, clamp, lerp, smoothstep } from '../../../utils/math';
import { easeInOutPremium, easeOutPremium } from '../../../utils/easing';
import { colorTrack, shotTrack, track, type ShotOut } from '../../../utils/timeline';
import { CURTAIN, EMISSION, FOG, GLOW, LENS, PARTICLE } from '../../../tokens/tokens';
import { PALETTES } from '../../../tokens/palettes';
import {
  buildFrames,
  corridorFrames,
  nodeLayout,
  recordLayout,
  rimTraceCurves,
  type FrameSpec,
  type NodeLayout,
  type ScanUniforms,
} from './corridor';
import { FloorSheen, GlassShards } from './atmos';

const PAL = PALETTES.identity;
/** Signature deep in the corridor centre volume, at the mouth of the throat (doc 15 F0 "SOC-1 implied"). */
const SIG = new Vector3(0.55, 0.35, -17);
/** Doc 16 §11 / doc 15 F80: the navigation hint is in-world signage, not a navbar. */
const JOURNEY_HINT = 'Journey';

const TITLE_ACCENT = '#a7adff';
const ROLE_ACCENT = '#8d97ff';
const SCAN_COLOR = '#8d96ff';

/** Role line windows (emerge) — sequential, each lights the next third of the corridor. */
const ROLE_WINDOWS: ReadonlyArray<readonly [number, number]> = [
  [0.5, 0.57],
  [0.56, 0.63],
  [0.62, 0.69],
];

/**
 * Light bands that travel the arches (doc 12 §3 "slow key sweep aligned with camera glide",
 * doc 15 F40 "corridor lights gently scan"). z0 → z1 over [a,b].
 */
interface ScanEvent {
  a: number;
  b: number;
  z0: number;
  z1: number;
  amt: number;
}
const SCANS: readonly ScanEvent[] = [
  { a: 0.17, b: 0.46, z0: 13, z1: -46, amt: 1 }, // the corridor reads the name
  { a: 0.5, b: 0.585, z0: 10, z1: -10.6, amt: 0.5 }, // role 1 → first stretch
  { a: 0.56, b: 0.645, z0: -10.6, z1: -30, amt: 0.5 }, // role 2 → second stretch
  { a: 0.62, b: 0.705, z0: -30, z1: -49.8, amt: 0.5 }, // role 3 → into the throat
  { a: 0.76, b: 0.93, z0: 11, z1: SIG.z, amt: 0.7 }, // the way forward → the signature
];

class Scene1Identity extends BaseScene {
  private frames: FrameSpec[] = [];
  private nodesLayout!: NodeLayout;

  private title!: TextBlock;
  private roles: TextBlock[] = [];
  private journey!: TextBlock;
  private titleDust!: GlyphDust;
  private roleDust: GlyphDust[] = [];

  private corridor!: InstancedMesh;
  private scan!: ScanUniforms;
  private recordsL!: Panes;
  private recordsR!: Panes;
  private nodes!: GlowField;
  private traces!: EnergyLines;
  private shards!: GlassShards;
  private floor!: FloorSheen;
  private halo!: Glow;
  private horizon!: Glow;

  /** Shot keyed to doc 15 F0/F20/F40/F60/F80/F100 — on-axis base; composition yaw is applied per aspect. */
  private shot = shotTrack([
    { at: 0.0, position: [1.05, 0.62, 14.2], target: [1.05, 0.02, -22], lens: LENS.wide + 6 },
    { at: 0.2, position: [1.0, 0.5, 12.7], target: [1.0, 0.14, -22], lens: LENS.wide + 7 },
    { at: 0.4, position: [0.96, 0.42, 11.2], target: [0.96, 0.22, -22], lens: LENS.mid - 2 },
    { at: 0.6, position: [0.92, 0.37, 9.8], target: [0.92, 0.26, -22], lens: LENS.mid - 1 },
    { at: 0.8, position: [0.74, 0.35, 8.2], target: [0.74, 0.28, -22], lens: LENS.mid + 1 },
    { at: 1.0, position: [0.58, 0.33, 5.2], target: [0.58, 0.31, -22], lens: LENS.mid + 3 },
  ]);
  private shotOut: ShotOut = { position: new Vector3(), target: new Vector3(), fov: 35, roll: 0 };

  private keyColor = colorTrack([
    { at: 0, value: '#7f7cd6' },
    { at: 0.4, value: PAL.key },
    { at: 0.7, value: '#b2b3ff' },
    { at: 1, value: '#9a9bee' },
  ]);
  private keyIntensity = track([
    { at: 0, value: 0.22 },
    { at: 0.15, value: 0.55 },
    { at: 0.4, value: 0.95 },
    { at: 0.7, value: 0.9 },
    { at: 0.86, value: 0.82 },
    { at: 1, value: 0.62 },
  ]);
  private rimIntensity = track([
    { at: 0, value: 0.25 },
    { at: 0.3, value: 0.5 },
    { at: 0.48, value: 0.85 },
    { at: 0.8, value: 1.0 },
    { at: 1, value: 0.9 },
  ]);
  private fogDensity = track([
    { at: 0, value: FOG.F2 * 1.1 },
    { at: 0.13, value: 0.019 },
    { at: 0.32, value: 0.0165 },
    { at: 0.72, value: 0.0165 },
    { at: 0.88, value: 0.022 },
    { at: 1, value: 0.03 },
  ]);
  private focus = track([
    { at: 0, value: 31 },
    { at: 0.2, value: 24 },
    { at: 0.4, value: 9 },
    { at: 0.72, value: 9 },
    { at: 0.88, value: 19 },
    { at: 1, value: 22 },
  ]);
  private aperture = track([
    { at: 0, value: 0.28 },
    { at: 0.4, value: 0.55 },
    { at: 0.8, value: 0.5 },
    { at: 1, value: 0.45 },
  ]);
  private sigEmission = track([
    { at: 0, value: EMISSION.G1 * 0.35 },
    { at: 0.2, value: EMISSION.G1 * 0.6 },
    { at: 0.4, value: EMISSION.G1 * 0.85 },
    { at: 0.6, value: EMISSION.G1 * 0.95 },
    { at: 0.8, value: EMISSION.G1 * 1.15 },
    { at: 1, value: EMISSION.G1 * 1.45 },
  ]);

  private keyFrom = new Vector3(-0.62, 0.74, 0.1);
  private keyTo = new Vector3(-0.5, 0.8, -0.32);
  private journeyAnchor = new Vector3(SIG.x, SIG.y - 1.95, SIG.z);

  constructor() {
    super('identity', 'identity');
  }

  /** Directive fields that never animate in this world (directives persist between frames). */
  private initDirectives(): void {
    const d = this.directives;
    d.camera.roll = 0;
    d.lighting.rimColor.set(PAL.rim);
    d.lighting.rimDirection.set(0.3, 0.5, -0.81);
    d.lighting.ambientColor.set(PAL.ambient);
    d.sky.rayColor.set('#8a90ff');
    d.sky.rayDirection.set(-0.3, 0.42, -1).normalize();
    d.fog.color.set(PAL.fog);
    d.particles.size = 1;
    d.particles.flow.set(0, 0.015, 0);
    d.particles.color.set(PAL.motes);
    d.post.exposure = 1;
    d.post.grain = 0.035;
    d.signature.accentA.set(PAL.accentA);
    d.signature.accentB.set(PAL.accentB);
    d.signature.spin = 0;
  }

  protected build(ctx: SceneContext): void {
    this.frames = corridorFrames();
    this.initDirectives();

    /* ── typography (doc 11 §3: center-left hero zone; roles below; hint late) ── */
    this.title = this.text({
      text: identity.monument.split(' '),
      style: 'monument',
      slot: 'center-left',
      accent: TITLE_ACCENT,
      stagger: 0.45,
      fit: false,
    });
    // A two-line monument in the left third: monumental, but it leaves the corridor's vanishing point free.
    this.title.el.style.fontSize = 'clamp(54px, 7.4vw, 116px)';
    this.title.el.style.lineHeight = '0.96';
    // Portrait only (0 on landscape): lower the stack so the corridor's vanishing point and the signature
    // own the upper quarter of the frame, clear of the typography.
    this.title.el.style.marginTop = 'max(0px, calc((100vh - 100vw) * 0.34))';
    this.roles = identity.roles.map((role, i) => {
      const b = this.text({ text: role, style: 'subtitle', slot: 'center-left', accent: ROLE_ACCENT, stagger: 0.32 });
      // one calm group under the title (tighter than the slot rhythm), with a breath after the monument
      b.el.style.marginTop = i === 0 ? '6px' : '-15px';
      return b;
    });
    this.journey = this.text({ text: JOURNEY_HINT, style: 'label', slot: 'anchor', accent: ROLE_ACCENT, stagger: 0.3 });
    this.journey.anchor = this.journeyAnchor;

    this.titleDust = this.dust(this.title, { mode: 'absorb', color: TITLE_ACCENT, depth: 6.5 });
    this.roleDust = this.roles.map((b) => this.dust(b, { mode: 'absorb', color: ROLE_ACCENT, depth: 6.5, maxPoints: 900 }));

    /* ── E-01 frames: one instanced draw, lit by the LightingDirector + signature practical ── */
    const built = buildFrames(this.frames);
    this.corridor = built.mesh;
    this.scan = built.scan;
    this.scan.uScanColor.value.set(SCAN_COLOR);
    this.track({
      dispose: () => {
        this.corridor.removeFromParent();
        this.corridor.geometry.dispose();
        (this.corridor.material as MeshStandardMaterial).dispose();
        this.corridor.dispose();
      },
    });
    this.add(this.corridor);

    /* ── wall records: two walls so the left one can calm down behind the typography ── */
    this.recordsL = this.makeRecords(ctx, -1, 0x1d5101);
    this.recordsR = this.makeRecords(ctx, 1, 0x1d5102);

    /* ── hidden network nodes in the joints ── */
    this.nodesLayout = nodeLayout(this.frames);
    this.nodes = this.track(
      new GlowField(ctx.uniforms, this.nodesLayout.positions, { size: 0.26, color: '#c3c8ff', colorB: PAL.accentA, tint: this.nodesLayout.tint }),
    );
    this.add(this.nodes.points);

    /* ── rim traces on the right depth wall (doc 11 §3 / doc 12 §3) ── */
    this.traces = this.track(
      new EnergyLines(ctx.uniforms, {
        curves: rimTraceCurves(this.frames),
        radius: 0.011,
        radii: [1, 0.75],
        order: [0, 0.25],
        tint: [0.2, 0.7],
        colorA: '#8f99ff',
        colorB: PAL.accentB,
        tubularSegments: 220,
        radialSegments: 5,
        stagger: 0.2,
      }),
    );
    const tu = this.traces.uniforms;
    tu.uPulses.value = 4;
    tu.uPulseAmount.value = 0.28;
    tu.uIntensity.value = 0.7;
    this.add(this.traces.mesh);

    /* ── sparse foreground glass shards (doc 11 §3 foreground) ── */
    this.shards = this.track(new GlassShards(ctx.uniforms, Math.max(4, ctx.quality.count(9)), 0x5a4d));
    this.add(this.shards.mesh);

    /* ── polished graphite floor far below the floating frames: carries the light of the corridor's end ── */
    this.floor = this.track(new FloorSheen(ctx.uniforms, { y: -3.3, zNear: 16, zFar: -62, halfWidth: 6, signature: SIG }));
    this.floor.uniforms.uScanColor.value.set(SCAN_COLOR);
    this.add(this.floor.mesh);

    /* ── light volumes: signature halo + the fog boundary glowing at the end of the corridor ── */
    this.halo = this.track(new Glow(ctx.uniforms, { size: 7.5, color: '#4c54c8', intensity: 0.04, falloff: 3.2 }));
    this.halo.mesh.position.copy(SIG);
    this.horizon = this.track(new Glow(ctx.uniforms, { size: 30, color: '#363d8c', intensity: 0.2, falloff: 2.8 }));
    this.horizon.mesh.position.set(0.5, 0.3, -40);
    this.add(this.horizon.mesh, this.halo.mesh);
  }

  private makeRecords(ctx: SceneContext, side: -1 | 1, seed: number): Panes {
    const specs = recordLayout(this.frames, side, seed);
    const panes = this.track(
      new Panes(ctx.uniforms, {
        count: specs.length,
        width: 1,
        height: 1,
        colorA: '#5d66b8',
        colorB: '#8a93e6',
        glowColor: PAL.accentA,
        opacity: 0.07,
        lines: 0.42,
      }),
    );
    specs.forEach((s, i) => {
      panes.setInstance(i, s.x, s.y, s.z, 0, s.ry, s.rz, s.w, s.h);
      panes.tint.setX(i, s.tint);
    });
    panes.commit();
    const u = panes.uniforms;
    u.uDrift.value = 0.02;
    u.uEdge.value = 0.45;
    (u.uScanDir.value as Vector3).set(0, 0, -1);
    (u.uScanColor.value as Color).set(SCAN_COLOR);
    u.uScanWidth.value = 2.6;
    this.add(panes.mesh);
    return panes;
  }

  update(f: SceneFrame): void {
    const p = f.progress;
    const d = this.directives;
    const rm = f.reducedMotion;
    const ex = f.exit;
    const en = f.enter;

    /* ───────── typography: fog → ink (+ light pass) → ash absorbed by the signature ───────── */
    const eTitle = beat(p, 0.15, 0.36, easeOutPremium);
    const sTitle = p < 0.155 ? -1 : beat(p, 0.17, 0.42);
    const dTitle = beat(ex, 0, 0.7);
    this.title.set(eTitle, dTitle, sTitle);
    this.titleDust.update(dTitle, this.ctx.signaturePosition);

    let rolePresence = 0;
    for (let k = 0; k < this.roles.length; k++) {
      const win = ROLE_WINDOWS[Math.min(k, ROLE_WINDOWS.length - 1)];
      const a = win[0];
      const b = win[1];
      const e = beat(p, a, b, easeOutPremium);
      const dk = beat(ex, 0.04 + k * 0.03, 0.74);
      this.roles[k].set(e, dk, p < a ? -1 : beat(p, a + 0.005, b + 0.02));
      this.roleDust[k].update(dk, this.ctx.signaturePosition);
      rolePresence = Math.max(rolePresence, e * (1 - dk));
    }
    // reduced motion: shown right after the roles' hold, without flourish (doc 16 §11)
    const eHint = rm ? beat(p, 0.73, 0.76) : beat(p, 0.76, 0.84, easeOutPremium);
    this.journey.set(eHint, beat(ex, 0, 0.45), -1);
    const textPresence = Math.max(eTitle * (1 - dTitle), rolePresence);

    /* ───────── camera: slow forward glide, slight vertical drift, composition yaw ───────── */
    const camP = rm ? lerp(0.42, p, 0.4) : p;
    this.shot(camP, this.shotOut);
    const portrait = clamp((1.15 - f.aspect) / 0.5);
    const pos = d.camera.position.copy(this.shotOut.position);
    const tgt = d.camera.target.copy(this.shotOut.target);
    pos.x *= 1 - portrait;
    tgt.x = pos.x;
    const depthToTarget = pos.z - tgt.z;
    // Landscape: yaw left so the vanishing point (and the signature) sit right of centre, clear of the
    // centre-left title. Portrait: no yaw; pitch down so the signature rises into the upper third.
    tgt.x -= depthToTarget * 0.125 * (1 - portrait);
    tgt.y -= depthToTarget * 0.235 * portrait;
    d.camera.fov = this.shotOut.fov * lerp(1, 1.32, portrait);

    /* ───────── light: cool blue-violet key from above-left, rim traces the right depth wall ───────── */
    const L = d.lighting;
    this.keyColor(p, L.keyColor);
    L.keyIntensity = this.keyIntensity(p) * lerp(0.35, 1, en) * (1 - 0.6 * ex);
    L.keyDirection.lerpVectors(this.keyFrom, this.keyTo, smoothstep(0, 1, p));
    L.rimIntensity = this.rimIntensity(p) * (1 - 0.5 * ex);
    L.ambientIntensity = lerp(0.24, 0.18, smoothstep(0.3, 0.45, p)) * (1 - 0.4 * ex);
    L.pointerInfluence = 0.7;

    /* ───────── sky: slow gradient, barely visible rays (≤ 0.1) ───────── */
    d.sky.intensity = lerp(0.5, 0.62, smoothstep(0, 0.4, p)) * (1 - 0.25 * ex);
    d.sky.rays = (0.022 + bell(p, 0.34, 0.14) * 0.05 + smoothstep(0.8, 1, p) * 0.025) * (1 - ex);

    /* ───────── fog: the emotional meter — materialise → clear → boundary forms ahead ───────── */
    d.fog.density = this.fogDensity(p);
    d.fog.curtain = lerp(CURTAIN.F0, CURTAIN.F1, smoothstep(0.88, 1, p));

    /* ───────── particles: layered motes; focus pulls signature → title plane → signature ───────── */
    const P = d.particles;
    P.density = lerp(0.2, PARTICLE.P1.density, smoothstep(0, 0.15, p)) + smoothstep(0.74, 0.9, p) * 0.12;
    P.speed = lerp(PARTICLE.P1.speed, PARTICLE.P1.speed * 1.3, bell(p, 0.7, 0.16)) * (rm ? 0.6 : 1);
    P.focus = this.focus(p);
    P.aperture = lerp(1.15, this.aperture(p), en);
    P.intensity = lerp(0.85, 0.68, textPresence);

    /* ───────── post: restrained; a small bloom only for the title light pass and node arrivals ───────── */
    const titlePass = bell(p, 0.3, 0.12);
    d.post.bloom = (GLOW.G1 * 0.7 + titlePass * 0.12 + bell(p, 0.6, 0.1) * 0.05 + smoothstep(0.86, 1, p) * 0.05) * (rm ? 0.8 : 1);
    d.post.vignette = lerp(0.58, 0.66, textPresence);

    /* ───────── signature: SOC-1 implied → subtle emission → optical anchor → SOC-2 prep ───────── */
    const S = d.signature;
    S.soc = 1 + 0.12 * smoothstep(0.9, 1, p);
    S.position.copy(SIG);
    S.scale = lerp(1.2, 1.32, smoothstep(0.5, 0.85, p));
    S.emission = this.sigEmission(p);
    S.visibility = lerp(0.5, 1, smoothstep(0.04, 0.4, p));
    S.absorb = 0.1 * smoothstep(0.9, 1, p);

    /* ───────── corridor scan (light band travelling the arches + records) ───────── */
    let scanZ = 100;
    let scanAmt = 0;
    for (let i = 0; i < SCANS.length; i++) {
      const s = SCANS[i];
      if (p <= s.a || p >= s.b) continue;
      const t = (p - s.a) / (s.b - s.a);
      const amt = s.amt * Math.sin(Math.PI * t);
      if (amt > scanAmt) {
        scanAmt = amt;
        scanZ = lerp(s.z0, s.z1, easeInOutPremium(t));
      }
    }
    scanAmt *= (rm ? 0.55 : 1) * (1 - ex);
    this.scan.uScanZ.value = scanZ;
    this.scan.uScanAmt.value = scanAmt;
    this.scan.uEdgeGlow.value = lerp(0.25, 0.7, smoothstep(0.1, 0.42, p)) * (1 - 0.7 * ex);
    this.scan.uEnvAmt.value = lerp(0.2, 0.62, smoothstep(0.04, 0.4, p)) * (1 + 0.2 * smoothstep(0.8, 1, p)) * (1 - 0.75 * ex);
    this.scan.uLeftDim.value = lerp(1, 0.32, textPresence);

    /* ───────── records: materialise, calm behind the typography, quiet on exit ───────── */
    const recIn = lerp(0.35, 1, smoothstep(0, 0.16, p)) * (1 - 0.75 * ex);
    this.applyRecords(this.recordsL, recIn, lerp(0.9, 0.45, textPresence), scanZ, scanAmt * 0.55);
    this.applyRecords(this.recordsR, recIn * 1.35, lerp(1.1, 0.95, textPresence), scanZ, scanAmt * 0.85);

    /* ───────── nodes: hidden → faint → each role lights the next stretch → the path to the signature ───────── */
    this.updateNodes(p, ex, textPresence, pos.z);

    /* ───────── rim traces: drawn along the right depth wall while the title resolves ───────── */
    this.traces.draw = beat(p, 0.14, 0.46, easeInOutPremium);
    this.traces.opacity = (lerp(0.32, 0.72, smoothstep(0.36, 0.5, p)) + 0.18 * smoothstep(0.76, 0.86, p)) * (1 - ex);
    this.traces.uniforms.uFlow.value = rm ? 0 : 0.055;

    /* ───────── shards, halo, horizon ───────── */
    this.shards.opacity = smoothstep(0.02, 0.16, p) * (1 - ex);
    const fu = this.floor.uniforms;
    fu.uSheen.value = lerp(0.35, 1, smoothstep(0.02, 0.4, p)) * (1 + 0.35 * smoothstep(0.8, 1, p)) * (1 - 0.6 * ex);
    fu.uSigAmt.value = S.visibility * (S.emission / EMISSION.G1) * 0.55 * (1 - 0.7 * ex);
    fu.uScanZ.value = scanZ;
    fu.uScanAmt.value = scanAmt;
    this.halo.intensity = (0.035 + 0.06 * smoothstep(0.3, 0.85, p) + 0.04 * smoothstep(0.88, 1, p)) * (1 - 0.6 * ex);
    this.horizon.intensity = (0.16 + 0.12 * smoothstep(0.1, 0.4, p) + 0.12 * smoothstep(0.8, 1, p)) * (1 - 0.5 * ex);

    // The journey sign hangs just beneath the signature (in-world, projected each frame by the text layer).
    this.journeyAnchor.set(SIG.x, SIG.y - 1.95 * (S.scale / 1.2), SIG.z);
  }

  private applyRecords(panes: Panes, presence: number, dim: number, scanZ: number, scanAmt: number): void {
    const u = panes.uniforms;
    u.uOpacity.value = 0.07 * presence;
    u.uDim.value = dim;
    u.uScanPos.value = -scanZ;
    u.uScanAmount.value = scanAmt;
    panes.mesh.visible = presence > 0.01;
  }

  private updateNodes(p: number, ex: number, textPresence: number, camZ: number): void {
    const n = this.nodesLayout;
    const xyz = n.positions;
    const count = n.depth.length;
    const faint = 0.07 + 0.17 * smoothstep(0.15, 0.36, p);
    const settle = smoothstep(0.7, 0.8, p);
    const r0 = beat(p, ROLE_WINDOWS[0][0], ROLE_WINDOWS[0][1] + 0.02);
    const r1 = beat(p, ROLE_WINDOWS[1][0], ROLE_WINDOWS[1][1] + 0.02);
    const r2 = beat(p, ROLE_WINDOWS[2][0], ROLE_WINDOWS[2][1] + 0.02);
    const path = beat(p, 0.76, 0.93);
    const sigU = (this.frames[0].z - SIG.z) / (this.frames[0].z - this.frames[this.frames.length - 1].z);
    for (let i = 0; i < count; i++) {
      const u = n.depth[i];
      // each role arrival sweeps its own third of the corridor, near → far
      const k = u < 1 / 3 ? 0 : u < 2 / 3 ? 1 : 2;
      const rk = k === 0 ? r0 : k === 1 ? r1 : r2;
      const local = clamp(rk * 1.7 - (u - k / 3) * 3 * 0.7);
      const arrival = local * local * (3 - 2 * local);
      // the moment of arrival is brighter, then settles to a calm "lit path"
      let b = Math.max(faint, 0.18 + arrival * lerp(0.6, 0.38, settle));
      // the way forward: a soft pulse travels the lit path to the signature (journey hint)
      if (u <= sigU + 0.05) b += bell(u, path * sigU, 0.1) * 0.35 * (1 - smoothstep(0.92, 0.95, p));
      if (n.side[i] < 0) b *= lerp(1, 0.5, textPresence);
      // nodes near the lens would bloom into large bokeh discs: they stay hidden until they recede
      b *= smoothstep(4, 12, camZ - xyz[i * 3 + 2]);
      this.nodes.setBrightness(i, b * (1 - ex));
    }
    this.nodes.commit();
    this.nodes.intensity = lerp(0.55, 1, smoothstep(0.05, 0.3, p)) * (1 - ex);
  }
}

export default () => new Scene1Identity();
