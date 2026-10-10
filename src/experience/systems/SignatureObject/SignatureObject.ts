/**
 * A-01 Signature Core + A-02 Transition Shell (doc 13 §1) — the recurring identity anchor (Law 13–15).
 *
 * Archetype: NEURAL CORE MONOLITH — a faceted spindle lens. The silhouette never changes; material,
 * emission, scale and internal channel complexity evolve through SOC-0…SOC-8 (doc 14).
 * It is also the absorbing lens of every transition: an intake spiral pulls fragments into its core.
 */
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  EdgesGeometry,
  Group,
  IcosahedronGeometry,
  LatheGeometry,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  PointLight,
  Points,
  ShaderMaterial,
  Vector2,
  Vector3,
} from 'three';
import type { SignatureState } from '../../../types/scene';
import type { GlobalUniforms } from '../../shaders/uniforms';
import { EASE_GLSL, FOG, GLOBALS, LIGHT, NOISE, POINTS_FRAG, POINTS_VERT } from '../../shaders/chunks';
import { socAt, type SocParams } from './socStates';
import { ACCENT, DEPTH } from '../../../tokens/tokens';
import { rng } from '../../../utils/rng';
import { damp } from '../../../utils/math';

/** Spindle profile (radius, height) — bottom tip → top tip. Slightly taller crown = recognisable silhouette. */
const PROFILE: ReadonlyArray<[number, number]> = [
  [0.0, -1.55],
  [0.3, -1.12],
  [0.52, -0.52],
  [0.6, -0.04],
  [0.57, 0.44],
  [0.41, 1.04],
  [0.17, 1.52],
  [0.0, 1.74],
];
const FACETS = 8;

type MutableSoc = { -readonly [K in keyof SocParams]: SocParams[K] extends readonly number[] ? number[] : number };

export class SignatureObject {
  readonly group = new Group();
  readonly worldPosition = new Vector3();
  private hull: Mesh<LatheGeometry, ShaderMaterial>;
  private shell: Mesh<LatheGeometry, ShaderMaterial>;
  private core: Mesh<IcosahedronGeometry, ShaderMaterial>;
  private seams: LineSegments<EdgesGeometry, LineBasicMaterial>;
  private intake: Points<BufferGeometry, ShaderMaterial>;
  private light = new PointLight(0xffffff, 0, 14, 2);
  private params: MutableSoc = {
    scale: 1, glass: 0, metal: 0, stone: 1, core: 0, seam: 0, channels: [0, 0, 0, 0, 0, 0], spin: 0, breath: 0,
  };
  private angle = 0;
  private visibility = 1;
  private absorb = 0;
  private tmp = new Color();

  constructor(uniforms: GlobalUniforms, intakeCount: number) {
    this.group.name = 'SignatureObject';
    const points = PROFILE.map(([r, y]) => new Vector2(r, y));
    const hullGeo = new LatheGeometry(points, FACETS);

    const shared = {
      uAccentA: { value: new Color(ACCENT.cyan) },
      uAccentB: { value: new Color(ACCENT.violet) },
      uEmission: { value: 1 },
      uVisibility: { value: 1 },
    };

    this.hull = new Mesh(
      hullGeo,
      new ShaderMaterial({
        uniforms: {
          ...uniforms,
          ...shared,
          uGlass: { value: 0 },
          uMetal: { value: 0 },
          uStone: { value: 1 },
          uCore: { value: 0 },
          uChannels: { value: [0, 0, 0, 0, 0, 0] },
          uSpinAngle: { value: 0 },
          uBreath: { value: 0 },
          uTriG: { value: new Color(ACCENT.emerald) },
          uTriY: { value: new Color(ACCENT.amber) },
          uTriR: { value: new Color(ACCENT.red) },
        },
        vertexShader: /* glsl */ `
          varying vec3 vLocal;
          varying vec3 vWorld;
          varying float vDepth;
          void main() {
            vLocal = position;
            vec4 w = modelMatrix * vec4(position, 1.0);
            vWorld = w.xyz;
            vec4 mv = viewMatrix * w;
            vDepth = -mv.z;
            gl_Position = projectionMatrix * mv;
          }
        `,
        fragmentShader: /* glsl */ `
          ${GLOBALS}
          ${NOISE}
          ${FOG}
          ${LIGHT}
          uniform vec3 uAccentA;
          uniform vec3 uAccentB;
          uniform float uEmission;
          uniform float uVisibility;
          uniform float uGlass;
          uniform float uMetal;
          uniform float uStone;
          uniform float uCore;
          uniform float uChannels[6];
          uniform float uSpinAngle;
          uniform float uBreath;
          uniform vec3 uTriG;
          uniform vec3 uTriY;
          uniform vec3 uTriR;
          varying vec3 vLocal;
          varying vec3 vWorld;
          varying float vDepth;

          float lineAt(float x, float w) { float d = abs(fract(x) - 0.5); return 1.0 - smoothstep(0.0, w, d); }

          vec2 hash2(vec2 p) { p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3))); return fract(sin(p) * 43758.5453); }
          float voronoiEdge(vec2 x) {
            vec2 n = floor(x); vec2 f = fract(x);
            float f1 = 8.0; float f2 = 8.0;
            for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
              vec2 g = vec2(float(i), float(j));
              vec2 o = hash2(n + g);
              float d = length(g + o - f);
              if (d < f1) { f2 = f1; f1 = d; } else if (d < f2) { f2 = d; }
            }
            return 1.0 - smoothstep(0.0, 0.07, f2 - f1);
          }

          void main() {
            vec3 n = normalize(cross(dFdx(vWorld), dFdy(vWorld)));
            vec3 v = normalize(uCameraPos - vWorld);
            if (dot(n, v) < 0.0) n = -n;
            float ndv = clamp(dot(n, v), 0.0, 1.0);
            float fres = pow(1.0 - ndv, 3.0);

            // a01: fixed facet angle (structure) · s01: spun angle (internal light, "very slow")
            float a01 = atan(vLocal.z, vLocal.x) / 6.2831853 + 0.5;
            float s01 = fract(a01 + uSpinAngle / 6.2831853);
            float y = vLocal.y;

            // ── material blend (stone ↔ alloy ↔ energy glass) ──
            float wsum = uGlass + uMetal + uStone + 1e-4;
            float g = uGlass / wsum; float m = uMetal / wsum; float s = uStone / wsum;
            float grain = snoise(vLocal * 9.0) * 0.5 + 0.5;
            vec3 stoneAlb = vec3(0.075, 0.074, 0.078) * (0.8 + grain * 0.35);
            float brushed = snoise(vec3(vLocal.y * 60.0, a01 * 6.0, 0.0)) * 0.5 + 0.5;
            vec3 metalAlb = vec3(0.17, 0.18, 0.2) * (0.85 + brushed * 0.25);
            vec3 glassAlb = vec3(0.02, 0.026, 0.036);
            vec3 albedo = stoneAlb * s + metalAlb * m + glassAlb * g;
            float rough = 0.95 * s + 0.36 * m + 0.08 * g;
            float metal = m;
            vec3 col = pzLight(n, v, albedo, rough, metal);

            // ── inner core glow seen through the glassy volume ──
            float radial = length(vLocal.xz);
            float inner = exp(-radial * radial * 5.0) * (1.0 - smoothstep(0.6, 1.7, abs(y)));
            float breath = 1.0 + sin(uTime * 0.55) * 0.5 * uBreath;
            col += mix(uAccentA, vec3(1.0), 0.25) * inner * uCore * uEmission * breath * (0.15 + g * 1.4);

            // ── internal channels (accumulate across the journey) ──
            float rm = 1.0 - uReducedMotion * 0.7;
            vec3 ch = vec3(0.0);
            // 0 clause segments: horizontal lines broken into clause-length pieces
            float clause = lineAt(y * 4.0, 0.07) * step(0.38, fract(s01 * 3.0 + floor(y * 4.0) * 0.37));
            ch += uAccentA * clause * uChannels[0];
            // 1 triage chambers: three stacked threshold zones pulsing in order (G → Y → R)
            float zG = 1.0 - smoothstep(-0.62, -0.48, y);
            float zR = smoothstep(0.48, 0.62, y);
            float zY = 1.0 - zG - zR;
            float pG = 0.55 + 0.45 * smoothstep(0.2, 1.0, sin(uTime * 0.9 * rm));
            float pY = 0.55 + 0.45 * smoothstep(0.2, 1.0, sin(uTime * 0.9 * rm - 1.2));
            float pR = 0.55 + 0.45 * smoothstep(0.2, 1.0, sin(uTime * 0.9 * rm - 2.4));
            float walls = lineAt((y + 0.55) / 1.1, 0.05) * 1.5;
            vec3 tri = (uTriG * zG * pG + uTriY * zY * pY + uTriR * zR * pR) * inner * 1.6 + uAccentB * walls * 0.4;
            ch += tri * uChannels[1];
            // 2 deterministic rails: facet-aligned verticals + ties + nodes
            float rails = lineAt(a01 * ${FACETS}.0, 0.06);
            float ties = lineAt(y * 4.0 + 0.5, 0.04);
            ch += uAccentB * (rails * 0.7 + ties * 0.35 + rails * ties * 2.0) * uChannels[2];
            // 3 eligibility web: veins
            float web = voronoiEdge(vec2(s01 * 7.0, y * 2.2));
            ch += mix(uAccentA, uAccentB, smoothstep(-1.2, 1.2, y)) * web * uChannels[3];
            // 4 kernel seams: facet edges + boot strata
            float seams = lineAt(a01 * ${FACETS}.0 + 0.5, 0.035) + lineAt(y * 2.0, 0.025) * 0.6;
            ch += uAccentB * seams * uChannels[4] * 0.9;
            // 5 memory ribbon: continuous helical band, flowing
            float u = fract(s01 + y * 0.32 - uTime * 0.035 * rm);
            float ribbon = 1.0 - smoothstep(0.0, 0.12, abs(u - 0.5) - 0.02);
            ch += mix(uAccentA, uAccentB, u) * ribbon * uChannels[5];
            col += ch * uEmission * (0.45 + g * 0.55);

            // ── rim + glass fresnel ──
            col += fres * uRimColor * 0.55;
            col += fres * uAccentA * g * 0.6 * uEmission;

            col = pzFog(col, vDepth);
            float alpha = mix(1.0, 0.5 + fres * 0.5, g) * uVisibility;
            gl_FragColor = vec4(col, alpha);
          }
        `,
        transparent: true,
        depthWrite: true,
        fog: false,
      }),
    );
    this.hull.renderOrder = DEPTH.lens + 2;

    this.core = new Mesh(
      new IcosahedronGeometry(0.2, 3),
      new ShaderMaterial({
        uniforms: { ...uniforms, ...shared, uCore: { value: 0 }, uBreath: { value: 0 } },
        vertexShader: /* glsl */ `
          varying vec3 vN;
          varying vec3 vV;
          varying float vDepth;
          void main() {
            vec4 w = modelMatrix * vec4(position, 1.0);
            vN = normalize(normalMatrix * normal);
            vec4 mv = viewMatrix * w;
            vV = normalize(-mv.xyz);
            vDepth = -mv.z;
            gl_Position = projectionMatrix * mv;
          }
        `,
        fragmentShader: /* glsl */ `
          ${GLOBALS}
          ${FOG}
          uniform vec3 uAccentA;
          uniform vec3 uAccentB;
          uniform float uEmission;
          uniform float uVisibility;
          uniform float uCore;
          uniform float uBreath;
          varying vec3 vN;
          varying vec3 vV;
          varying float vDepth;
          void main() {
            float facing = abs(dot(normalize(vN), normalize(vV)));
            float breath = 1.0 + sin(uTime * 0.55) * 0.6 * uBreath;
            vec3 col = mix(uAccentA, vec3(1.0, 0.98, 0.95), pow(facing, 3.0) * 0.7) * uCore * uEmission * breath * 2.2;
            float a = smoothstep(0.0, 0.7, facing) * uVisibility;
            gl_FragColor = vec4(col * pzFogFade(vDepth), a);
          }
        `,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        fog: false,
      }),
    );
    this.core.renderOrder = DEPTH.lens + 1;

    this.shell = new Mesh(
      hullGeo,
      new ShaderMaterial({
        uniforms: { ...uniforms, ...shared, uShell: { value: 0 } },
        vertexShader: /* glsl */ `
          varying vec3 vWorld;
          varying vec3 vLocal;
          varying float vDepth;
          void main() {
            vLocal = position;
            vec4 w = modelMatrix * vec4(position, 1.0);
            vWorld = w.xyz;
            vec4 mv = viewMatrix * w;
            vDepth = -mv.z;
            gl_Position = projectionMatrix * mv;
          }
        `,
        fragmentShader: /* glsl */ `
          ${GLOBALS}
          ${NOISE}
          ${FOG}
          uniform vec3 uAccentA;
          uniform vec3 uAccentB;
          uniform float uEmission;
          uniform float uVisibility;
          uniform float uShell;
          varying vec3 vWorld;
          varying vec3 vLocal;
          varying float vDepth;
          void main() {
            vec3 n = normalize(cross(dFdx(vWorld), dFdy(vWorld)));
            vec3 v = normalize(uCameraPos - vWorld);
            float fres = pow(1.0 - abs(dot(n, v)), 2.2);
            float shimmer = 0.75 + 0.25 * snoise(vLocal * 3.0 + vec3(0.0, uTime * 0.25, 0.0));
            vec3 col = mix(uAccentA, uAccentB, fres) * fres * shimmer * uShell * (0.6 + uEmission * 0.5);
            gl_FragColor = vec4(col * pzFogFade(vDepth), uVisibility);
          }
        `,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        fog: false,
      }),
    );
    this.shell.scale.setScalar(1.14);
    this.shell.renderOrder = DEPTH.lens + 3;

    this.seams = new LineSegments(
      new EdgesGeometry(hullGeo, 30),
      new LineBasicMaterial({ color: new Color(ACCENT.cyan), transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false }),
    );
    this.seams.scale.setScalar(1.002);
    this.seams.renderOrder = DEPTH.lens + 3;

    // Intake spiral — the "absorbing lens" (doc 14 §1.1).
    const r = rng(0xab50);
    const n = intakeCount;
    const seeds = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      seeds[i * 3] = r.next();
      seeds[i * 3 + 1] = r.next();
      seeds[i * 3 + 2] = r.next();
    }
    const ig = new BufferGeometry();
    ig.setAttribute('position', new BufferAttribute(new Float32Array(n * 3), 3));
    ig.setAttribute('aSeed', new BufferAttribute(seeds, 3));
    this.intake = new Points(
      ig,
      new ShaderMaterial({
        uniforms: { ...uniforms, ...shared, uAbsorb: { value: 0 } },
        vertexShader: /* glsl */ `
          ${GLOBALS}
          ${EASE_GLSL}
          ${POINTS_VERT}
          attribute vec3 aSeed;
          uniform float uAbsorb;
          varying float vA;
          varying float vDepth;
          varying float vT;
          void main() {
            float speed = 0.14 + aSeed.y * 0.12;
            float phase = fract(uTime * speed * (1.0 - uReducedMotion * 0.6) + aSeed.x);
            float r = mix(3.4, 0.08, pow(phase, 1.35));
            float a = aSeed.x * 6.2831853 * 7.0 + phase * 7.5;
            float h = (aSeed.z - 0.5) * 3.0 * (1.0 - phase);
            vec3 p = vec3(cos(a) * r, h, sin(a) * r);
            vec4 mv = modelViewMatrix * vec4(p, 1.0);
            vDepth = -mv.z;
            gl_Position = projectionMatrix * mv;
            vA = uAbsorb * sin(3.14159265 * phase);
            vT = phase;
            gl_PointSize = pzPointSize(0.026 * (0.6 + aSeed.z), vDepth) * step(0.001, uAbsorb);
          }
        `,
        fragmentShader: /* glsl */ `
          ${GLOBALS}
          ${FOG}
          ${POINTS_FRAG}
          uniform vec3 uAccentA;
          uniform vec3 uAccentB;
          uniform float uVisibility;
          varying float vA;
          varying float vDepth;
          varying float vT;
          void main() {
            float a = pzDisc() * vA * uVisibility * pzFogFade(vDepth * 0.6);
            if (a < 0.003) discard;
            gl_FragColor = vec4(mix(uAccentB, uAccentA, vT) * 0.95, a * 0.8);
          }
        `,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        fog: false,
      }),
    );
    this.intake.frustumCulled = false;
    this.intake.renderOrder = DEPTH.lens + 4;

    this.group.add(this.core, this.hull, this.shell, this.seams, this.intake, this.light);
  }

  apply(state: SignatureState, dt: number, reducedMotion: boolean): void {
    socAt(state.soc, this.params);
    const p = this.params;
    this.visibility = damp(this.visibility, state.visibility, 4, dt);
    this.absorb = damp(this.absorb, state.absorb, 3, dt);
    this.group.visible = this.visibility > 0.003;
    this.group.position.copy(state.position);
    this.group.scale.setScalar(p.scale * state.scale);
    this.angle += (p.spin + state.spin) * dt * (reducedMotion ? 0.3 : 1);

    const hu = this.hull.material.uniforms;
    (hu.uAccentA.value as Color).copy(state.accentA);
    (hu.uAccentB.value as Color).copy(state.accentB);
    hu.uEmission.value = state.emission;
    hu.uVisibility.value = this.visibility;
    hu.uGlass.value = p.glass;
    hu.uMetal.value = p.metal;
    hu.uStone.value = p.stone;
    hu.uCore.value = p.core;
    hu.uChannels.value = p.channels;
    hu.uSpinAngle.value = this.angle;
    hu.uBreath.value = p.breath;

    const cu = this.core.material.uniforms;
    cu.uCore.value = p.core * (1 + this.absorb * 0.35);
    cu.uBreath.value = p.breath;
    this.core.rotation.y = this.angle;

    this.shell.material.uniforms.uShell.value = 0.05 + this.absorb * 0.55;
    this.intake.material.uniforms.uAbsorb.value = this.absorb;

    this.seams.material.opacity = Math.min(1, p.seam * this.visibility * (0.6 + state.emission * 0.3));
    this.seams.material.color.copy(this.tmp.copy(state.accentA).lerp(state.accentB, 0.5));

    // The signature is a practical light for the set (doc 1 §4.2 key-light sources).
    this.light.color.copy(state.accentA);
    this.light.intensity = (p.core * state.emission * 6 + this.absorb * 4) * this.visibility;
    this.group.getWorldPosition(this.worldPosition);
  }

  dispose(): void {
    this.hull.geometry.dispose();
    this.hull.material.dispose();
    this.shell.material.dispose();
    this.core.geometry.dispose();
    this.core.material.dispose();
    this.seams.geometry.dispose();
    this.seams.material.dispose();
    this.intake.geometry.dispose();
    this.intake.material.dispose();
  }
}

/**
 * Sample points on the signature hull surface (local space, before SOC scale) — for particles that
 * "organize into the signature silhouette" (doc 6 §2 beat 6) or flow onto its facets.
 */
export function sampleSignatureSurface(count: number, seed: number, scale = 1): Float32Array {
  const r = rng(seed);
  const out = new Float32Array(count * 3);
  // cumulative lateral-area weights per profile segment
  const segs: Array<{ y0: number; y1: number; r0: number; r1: number; w: number }> = [];
  let total = 0;
  for (let i = 0; i < PROFILE.length - 1; i++) {
    const [r0, y0] = PROFILE[i];
    const [r1, y1] = PROFILE[i + 1];
    const w = ((r0 + r1) / 2) * Math.hypot(r1 - r0, y1 - y0);
    segs.push({ y0, y1, r0, r1, w });
    total += w;
  }
  const sector = (Math.PI * 2) / FACETS;
  for (let i = 0; i < count; i++) {
    let pick = r.next() * total;
    let s = segs[0];
    for (const seg of segs) {
      if (pick <= seg.w) {
        s = seg;
        break;
      }
      pick -= seg.w;
    }
    const t = r.next();
    const y = s.y0 + (s.y1 - s.y0) * t;
    const rad = s.r0 + (s.r1 - s.r0) * t;
    const ang = r.next() * Math.PI * 2;
    // flatten onto the facet plane (8-gon cross-section)
    const local = ((ang % sector) + sector) % sector;
    const facetR = (rad * Math.cos(sector / 2)) / Math.cos(local - sector / 2);
    out[i * 3] = Math.cos(ang) * facetR * scale;
    out[i * 3 + 1] = y * scale;
    out[i * 3 + 2] = Math.sin(ang) * facetR * scale;
  }
  return out;
}
