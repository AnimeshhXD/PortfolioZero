/**
 * SCENE 8 — ENDING · THE NEXT CHAPTER
 * (doc 2 §9, doc 3 §4.4 · §7.5 · §9, doc 4 §4–§8, doc 6 §4.7, doc 11 §10, doc 12 §10, doc 13 U-01,
 *  doc 14 SOC-8, doc 15 §9, doc 16 §4 · §5 · §10, doc 17 §8)
 *
 * The film exhales. The completed signature (SOC-8) floats above a near-black polished stone floor that
 * holds its faint reflection; the camera begins a slow circle and pulls back until the sculpture stands
 * alone in negative space. Far behind it, where the stone dissolves into the sky, a soft gleam of first
 * light waits; as the last sentence resolves — "The next chapter is waiting to be built." — like an
 * inscription at the foot of a monument, that gleam draws outward into a single thin line across the
 * horizon (anticipation, doc 2 §9). After a deliberate pause, four understated portals
 * (Resume · GitHub · LinkedIn · Email) resolve beneath it. Then silence holds. There is no exit.
 *
 * Beat map (scene progress; holds @0.62 sentence resolved, @0.96 everything resolved):
 *   entry      world resolves out of the Health Coach dissolve: fog thins, focus blurred → sharp,
 *              the reflection surfaces in the stone
 *   0.00–0.20  the completed sculpture stands; camera begins its slow circle (F0)
 *   0.20–0.32  pull-back continues · minimal motes · light nearly static (F20)
 *   0.32–0.52  the sentence emerges fog → ink with a light pass; the horizon line gathers (F40)
 *   0.52–0.66  sentence fully resolved — resolution; camera nearly still (F60, hold @0.62)
 *   0.68–0.84  after a pause, the portals fade in one by one, in-world, no buttons (F80)
 *   0.84–1.00  everything steady; silence holds (F100, hold @0.96)
 *
 * Camera: orbit angle, distance and height are pure functions of progress (scrubbable); an ultra-slow,
 * bounded time drift keeps the circle alive at rest. Reduced motion → the camera holds the final framing.
 * Portal hover/focus: the world leans in — fog thins, the key and the horizon brighten a touch.
 */
import { Color, Vector3, type Vector2 } from 'three';
import type { SceneContext, SceneFrame } from '../../../types/scene';
import { BaseScene } from '../BaseScene';
import type { TextBlock } from '../../ui/CinematicTextLayer';
import type { Portal } from '../../ui/PortalButtons';
import { identity } from '../../../content/identity';
import { beat, bell, clamp, damp, lensToFov, lerp, saturate, smootherstep, smoothstep } from '../../../utils/math';
import { easeInOutPremium, easeOutPremium } from '../../../utils/easing';
import { ACCENT, CURTAIN, DEPTH, EMISSION, FOG, GLOW, NEUTRAL, PARTICLE, TEMPERATURE } from '../../../tokens/tokens';
import { PALETTES } from '../../../tokens/palettes';
import { SignatureMirror, StoneMirrorFloor } from './MirrorFloor';
import { HorizonLine } from './HorizonLine';

const PAL = PALETTES.ending;

/* ───────── set geometry (world units ≈ metres) ───────── */
const FLOOR_Y = -2.3;
/** The completed sculpture floats a hand's breadth above its own reflection. */
const SIG_POS = new Vector3(0, 0.25, 0);
/** SOC-8 is the hero of the frame (doc 14: "hero center; silhouette unmistakable"). */
const SIG_SCALE = 1.25;

/* ───────── camera: pull back + slow circle (doc 11 §10) ───────── */
const ORBIT_START = -0.66;
const ORBIT_SWING = 0.46;
const ORBIT_CREEP = 0.2;
const NEAR = { dist: 11.8, height: 0.1, aim: 0.42, lens: 50 };
const FAR = { dist: 17.9, height: -0.92, aim: -0.92, lens: 45 };
/** Mean azimuth of the late framing — the horizon line sits directly behind the sculpture from here. */
const LATE_ORBIT = -0.08;

/* ───────── light (doc 12 §10: single stable key, neutral-cool ~4800K, very soft rim) ───────── */
const KEY_DIR = new Vector3(-0.7, 0.62, 0.36);
const RIM_DIR = new Vector3(0.72, 0.3, -0.62);

class EndingScene extends BaseScene {
  private sentence!: TextBlock;
  private portals: Portal[] = [];
  private floor!: StoneMirrorFloor;
  private mirror: SignatureMirror | null = null;
  private horizon!: HorizonLine;

  /** Interaction state (not story state): eased portal hover/focus, last portal activation time. */
  private hover = 0;
  private clickAt = -100;
  private now = 0;

  private camPos = new Vector3();
  private camAim = new Vector3();
  private skyHorizonA = new Color(PAL.skyHorizon);
  /** a quiet neutral lift of the horizon sky as the line gathers (the halo alone carries the blue) */
  private skyHorizonB = new Color(PAL.skyHorizon).lerp(new Color(NEUTRAL.N1), 0.45);
  private poolColor = new Color();
  private white = new Color(TEMPERATURE.cool6500);
  private steel = new Color(ACCENT.steel);

  constructor() {
    super('ending', 'ending');
  }

  protected build(ctx: SceneContext): void {
    const d = this.directives;

    /* ── the ground: polished stone, barely there ── */
    this.floor = this.track(new StoneMirrorFloor(ctx.uniforms, { y: FLOOR_Y, radius: 64, fadeStart: 20, fadeEnd: 52, base: NEUTRAL.N0b }));
    this.floor.mesh.renderOrder = DEPTH.mid + 9;
    (this.floor.uniforms.uCenter.value as Vector2).set(SIG_POS.x, SIG_POS.z);
    // the stone catches the horizon as a cool-neutral sheen (a warm tint muddies to brown at this level)
    (this.floor.uniforms.uSheenColor.value as Color).set(PAL.accentA).lerp(new Color(TEMPERATURE.neutral4800), 0.5);
    this.add(this.floor.mesh);

    /* ── the reflection: the foundation signature re-drawn through a mirror about the floor ── */
    const sig = ctx.world.getObjectByName('SignatureObject');
    if (sig) {
      this.mirror = this.track(new SignatureMirror(sig, FLOOR_Y, DEPTH.mid + 3));
      this.add(this.mirror.group);
    }

    /* ── the next-chapter horizon: one thin line of first light ── */
    this.horizon = this.track(
      new HorizonLine(ctx.uniforms, {
        radius: 92,
        y: FLOOR_Y + 0.08,
        azimuth: Math.PI + LATE_ORBIT,
        arc: 2.9,
        color: TEMPERATURE.neutral4800,
        haloColor: PAL.accentA,
      }),
    );
    this.horizon.mesh.renderOrder = DEPTH.mid + 1;
    // first light: neutral with only a breath of warmth (the halo above stays cool — blue hour)
    (this.horizon.mesh.material.uniforms.uColor.value as Color).lerp(new Color(ACCENT.warmWhite), 0.3);
    this.add(this.horizon.mesh);

    /* ── typography + portals: one inscription at the foot of the monument ──
       Kept in its own out-of-flow column so hidden blocks from neighbouring worlds (which share the
       text slots) can never push the final layout around. */
    const inscription = document.createElement('div');
    inscription.className = 'pz-slot pz-ending-inscription';
    const st = inscription.style;
    st.left = '50%';
    st.bottom = 'max(var(--s6), 10vh)';
    st.transform = 'translateX(-50%)';
    st.width = 'min(92vw, 1100px)';
    st.alignItems = 'center';
    st.gap = 'var(--s4)';
    ctx.text.root.appendChild(inscription);
    this.track({ dispose: () => inscription.remove() });

    this.sentence = this.text({
      text: identity.ending,
      style: 'narrative',
      slot: 'center',
      accent: ACCENT.warmWhite,
      stagger: 0.55,
    });
    inscription.appendChild(this.sentence.el);

    for (const c of identity.contacts) {
      const portal = this.portal({
        label: c.label,
        href: c.href,
        external: c.external,
        slot: 'center',
        group: 'ending-contacts',
        description: c.description,
        accent: PAL.accentA,
      });
      this.portals.push(portal);
      // Activation: the frame dissolves into the signature (doc 16 §5) — a brief absorb pulse.
      const onClick = () => {
        this.clickAt = this.now;
      };
      portal.el.addEventListener('click', onClick);
      this.track({ dispose: () => portal.el.removeEventListener('click', onClick) });
    }
    const row = this.portals[0]?.el.parentElement;
    if (row) inscription.appendChild(row);

    /* ── constant lighting rig (written once; never animated except where noted in update) ── */
    d.lighting.keyColor.set(TEMPERATURE.neutral4800);
    d.lighting.keyDirection.copy(KEY_DIR).normalize();
    d.lighting.rimColor.set(PAL.rim);
    d.lighting.rimDirection.copy(RIM_DIR).normalize();
    d.lighting.ambientColor.set(PAL.ambient);
    d.lighting.ambientIntensity = 0.22;
    d.lighting.pointerInfluence = 0.3;
    d.sky.rays = 0;
    d.sky.top.set(PAL.skyTop);
    d.sky.bottom.set(PAL.skyBottom);
    d.fog.color.set(PAL.fog);
    d.signature.accentA.set(PAL.accentA);
    // controlled inner energy: the warm channel family is tempered toward steel so the lattice glows
    // inside a hardened shell instead of reading as a bright wireframe (doc 14 SOC-8)
    d.signature.accentB.set(PAL.accentB).lerp(this.steel, 0.4);
    d.particles.color.set(PAL.motes);
    d.particles.flow.set(0, 0, 0);
    d.post.exposure = 1;
    d.post.grain = 0.035;
  }

  update(f: SceneFrame): void {
    const p = f.progress;
    const d = this.directives;
    const rm = f.reducedMotion;
    const enter = f.enter;
    const fogged = 1 - enter;
    this.now = f.time;

    /* ── interaction: portal hover / keyboard focus leans the world in (doc 4 §4, doc 16 §4) ── */
    let anyHover = false;
    for (const portal of this.portals) if (portal.hovered) anyHover = true;
    this.hover = damp(this.hover, anyHover ? 1 : 0, 9, f.dt);
    const hv = this.hover * (rm ? 0.5 : 1);
    const since = f.time - this.clickAt;
    const pulse = since >= 0 && since < 1.4 ? bell(since, 0.45, rm ? 0.35 : 0.6) * (rm ? 0.5 : 1) : 0;

    /* ── story curves ── */
    const pull = rm ? 1 : smootherstep(0.02, 0.44, p); // pull-back into negative space
    const words = beat(p, 0.32, 0.52, easeOutPremium); // the sentence
    const dawn = beat(p, 0.34, 0.6, easeOutPremium); // the horizon gathers with it
    const settled = smoothstep(0.0, 0.24, p); // the completed sculpture settles after arrival

    /* ── typography: fog → ink, one light pass; the portals after a deliberate pause ── */
    this.sentence.set(words, 0, beat(p, 0.4, 0.6));
    for (let i = 0; i < this.portals.length; i++) {
      const a = 0.68 + i * 0.022;
      this.portals[i].setPresence(beat(p, a, a + 0.1, easeOutPremium));
    }

    /* ── camera: pull back + slow circle; reduced motion holds the final framing ── */
    let theta: number;
    if (rm) {
      theta = LATE_ORBIT;
    } else {
      theta = ORBIT_START + ORBIT_SWING * easeInOutPremium(saturate(p / 0.42)) + ORBIT_CREEP * p;
      // ultra-slow, bounded drift so the circle never quite stops at rest (≈ ±3°, 160 s period)
      theta += Math.sin(f.time * 0.039) * 0.05;
    }
    const narrow = f.aspect < 0.8 ? 1 : 0;
    const dist = lerp(NEAR.dist, FAR.dist * (1 + narrow * 0.14), pull);
    const height = lerp(NEAR.height, FAR.height + narrow * 0.25, pull);
    const aim = lerp(NEAR.aim, FAR.aim - narrow * 0.35, pull);
    this.camPos.set(Math.sin(theta) * dist + SIG_POS.x, height, Math.cos(theta) * dist + SIG_POS.z);
    this.camAim.set(SIG_POS.x, aim, SIG_POS.z);
    d.camera.position.copy(this.camPos);
    d.camera.target.copy(this.camAim);
    d.camera.fov = lensToFov(lerp(NEAR.lens, FAR.lens, pull) - narrow * 6);
    d.camera.roll = 0;

    /* ── signature: SOC-8, completed; near-static, micro breathing only ── */
    d.signature.soc = 8;
    d.signature.position.copy(SIG_POS);
    d.signature.scale = SIG_SCALE;
    d.signature.visibility = 1;
    d.signature.spin = 0;
    d.signature.absorb = pulse * 0.55;
    d.signature.emission =
      lerp(EMISSION.G1 * 0.72, EMISSION.G1 * 0.52, settled) + fogged * 0.3 + bell(p, 0.5, 0.14) * 0.05 + hv * 0.07 + pulse * 0.3;

    /* ── light: one stable key, very soft rim; only micro breathing ── */
    const breathe = rm ? 0 : Math.sin(f.time * 0.42) * 0.012;
    d.lighting.keyIntensity = 0.8 * (1 + breathe) + hv * 0.06;
    d.lighting.rimIntensity = 0.24 + fogged * 0.2;

    /* ── atmosphere: near-zero fog (clarity); thins further while a portal is held ── */
    d.fog.density = FOG.F1 * 0.36 * (1 - hv * 0.6) + fogged * FOG.F2;
    d.fog.curtain = fogged * CURTAIN.F1;
    d.sky.horizon.lerpColors(this.skyHorizonA, this.skyHorizonB, dawn * 0.8 + hv * 0.2);
    d.sky.intensity = 1;

    /* ── the next-chapter horizon ── */
    // first a soft gleam behind the sculpture; the line draws outward as the sentence lands
    this.horizon.intensity = (0.06 + 0.21 * dawn + hv * 0.05) * smoothstep(0.35, 1, enter);
    this.horizon.spread = beat(p, 0.3, 0.62, easeInOutPremium);

    /* ── the stone + its reflection (the reflection surfaces only once the fog has cleared) ── */
    const surfaced = smoothstep(0.55, 1, enter);
    if (this.mirror) this.mirror.sync(enter > 0.5);
    const fu = this.floor.uniforms;
    fu.uReflect.value = 0.8 * surfaced * (1 - 0.25 * words) + hv * 0.05;
    fu.uPool.value = (0.032 + hv * 0.01 + pulse * 0.02) * (d.signature.emission / EMISSION.G1);
    fu.uSheen.value = 0.015 + dawn * 0.07 + hv * 0.02;
    this.poolColor.copy(d.signature.accentA).lerp(this.white, 0.35);
    (fu.uPoolColor.value as Color).copy(this.poolColor);

    /* ── motes: sparse, slow; recede while the sentence and portals are read ── */
    d.particles.density = lerp(PARTICLE.P1.density * 0.8, PARTICLE.P1.density * 0.42, smoothstep(0.04, 0.3, p));
    d.particles.speed = 0.1;
    d.particles.size = 1;
    d.particles.intensity = (0.68 - 0.14 * words) * (1 + hv * 0.1);
    const focus = this.camPos.distanceTo(SIG_POS);
    d.particles.focus = focus * (1 + fogged * 0.6);
    d.particles.aperture = clamp(0.4 + fogged * 0.7, 0, 1.2);

    /* ── grade: minimal bloom — just alive ── */
    d.post.bloom = GLOW.G1 * 0.72 + fogged * 0.12 + hv * 0.03 + pulse * 0.08;
    d.post.vignette = 0.62;
  }
}

export default () => new EndingScene();
