/**
 * Triage set layout (doc 11 §5 ASCII stack): thresholds high/far → pathway centre → beams → fog → title.
 *
 *   camera: low, centred BEHIND the pathway, looking down −Z (doc 11 §5 camera framing)
 *   HEART : where the pathway begins (lower-centre of frame) — the visual heartbeat source
 *   NODE  : rail terminus / decision node, directly under the signature (the triage engine)
 *   THRESHOLDS: three distant volumetric bays on an arc (GREEN ring · YELLOW triangle · RED square)
 *
 * Everything here is built once (no per-frame geometry). Units ≈ metres.
 */
import { CatmullRomCurve3, CurvePath, LineCurve3, Vector3, type Curve } from 'three';
import { ACCENT } from '../../../../tokens/tokens';
import { rng } from '../../../../utils/rng';

export const HEART = new Vector3(0, -0.55, 7.6);
export const NODE = new Vector3(0, -0.42, -7.6);
export const SIG_POS = new Vector3(0, 2.3, -7.6);
/** Camera reference used to orient shapes/signage toward the lens (the F80 shot). */
export const CAMERA_REF = new Vector3(0, 0.95, 12.6);

export type ThresholdShape = 'circle' | 'triangle' | 'square';

export interface Threshold {
  /** Resume vocabulary word (RED / YELLOW / GREEN). */
  word: 'GREEN' | 'YELLOW' | 'RED';
  pos: Vector3;
  color: string;
  shape: ThresholdShape;
  /** Outline size (circumradius-ish, world units). */
  size: number;
}

/** Left → right: GREEN (ring) · YELLOW (triangle) · RED (square). Shape + label, never colour alone (Law 36). */
export const THRESHOLDS: readonly Threshold[] = [
  { word: 'GREEN', pos: new Vector3(-8.2, 0.7, -22), color: ACCENT.emerald, shape: 'circle', size: 1.45 },
  { word: 'YELLOW', pos: new Vector3(0, 0.7, -26), color: ACCENT.amber, shape: 'triangle', size: 1.85 },
  { word: 'RED', pos: new Vector3(8.2, 0.7, -22), color: ACCENT.red, shape: 'square', size: 1.35 },
];

/** The correct route: heart → decision node. Gentle S, so when wobble dies it reads as a calm rail. */
export function mainRoute(): CatmullRomCurve3 {
  return new CatmullRomCurve3(
    [HEART.clone(), new Vector3(0.46, -0.5, 3.9), new Vector3(-0.34, -0.46, 0.1), new Vector3(0.2, -0.44, -3.9), NODE.clone()],
    false,
    'centripetal',
  );
}

/** Two thin side rails that appear when the route locks ("correct route locks into smooth rails"). */
export function sideRails(): CatmullRomCurve3[] {
  const off = 0.2;
  const make = (s: number) =>
    new CatmullRomCurve3(
      [
        new Vector3(HEART.x + s * off * 0.6, HEART.y - 0.02, HEART.z - 0.8),
        new Vector3(0.46 + s * off, -0.52, 3.9),
        new Vector3(-0.34 + s * off, -0.48, 0.1),
        new Vector3(0.2 + s * off, -0.46, -3.9),
        new Vector3(NODE.x + s * off * 0.6, NODE.y - 0.02, NODE.z + 0.2),
      ],
      false,
      'centripetal',
    );
  return [make(-1), make(1)];
}

export interface WrongRoute {
  curve: CatmullRomCurve3;
  /** Collapse order 0..1 (high = retracts first). */
  order: number;
  /** 0 = pale emerald … 1 = amber. */
  tint: number;
}

/**
 * Incorrect routes: branches that wander off the true path into the dark, plus three "near misses"
 * that reach toward a threshold and stop short — guesses that collapse.
 */
export function wrongRoutes(main: Curve<Vector3>, seed = 0x7a1a6e): WrongRoute[] {
  const r = rng(seed);
  const out: WrongRoute[] = [];
  const n = 12;
  for (let i = 0; i < n; i++) {
    const t0 = i < 4 ? r.range(0.0, 0.05) : r.range(0.08, 0.6);
    const start = main.getPoint(t0);
    const pts = [start];
    const side = i % 2 === 0 ? 1 : -1;
    let x = start.x;
    let y = start.y;
    let z = start.z;
    const steps = r.int(3, 6);
    let lateral = side * r.range(0.6, 2.1);
    for (let s = 0; s < steps; s++) {
      z -= r.range(1.5, 3.2);
      if (s === 2 && r.next() < 0.35) lateral *= -0.6; // some routes double back — wrongness
      x += lateral * r.range(0.45, 1.25) + r.range(-0.45, 0.45);
      y += r.range(-0.2, 0.75);
      pts.push(new Vector3(x, y, z));
    }
    out.push({ curve: new CatmullRomCurve3(pts, false, 'centripetal'), order: r.range(0.0, 1.0), tint: r.range(0, 0.55) });
  }
  // near misses: reach for a threshold and stop 45–65% of the way
  THRESHOLDS.forEach((th, k) => {
    const start = main.getPoint(0.18 + k * 0.12);
    const reach = 0.45 + r.next() * 0.2;
    const end = new Vector3().lerpVectors(start, th.pos, reach);
    const mid1 = new Vector3().lerpVectors(start, end, 0.35).add(new Vector3(r.range(-1.4, 1.4), r.range(0.3, 1.1), 0));
    const mid2 = new Vector3().lerpVectors(start, end, 0.7).add(new Vector3(r.range(-1.2, 1.2), r.range(0.4, 1.6), 0));
    out.push({
      curve: new CatmullRomCurve3([start, mid1, mid2, end], false, 'centripetal'),
      order: 0.15 + k * 0.08,
      tint: k === 0 ? 0 : 1,
    });
  });
  return out;
}

/** Semantic retrieval beams (ChromaDB metaphor): from a high arc in the dark down onto the rail. */
export function retrievalBeams(main: Curve<Vector3>, seed = 0xc4d8): CatmullRomCurve3[] {
  const r = rng(seed);
  const out: CatmullRomCurve3[] = [];
  const n = 7;
  for (let i = 0; i < n; i++) {
    const a = ((i / (n - 1)) * 2 - 1) * 1.15 + r.range(-0.08, 0.08);
    const R = r.range(6.0, 8.5);
    const src = new Vector3(Math.sin(a) * R, r.range(3.6, 5.6), -4.0 - Math.cos(a) * R * 0.6);
    const tgt = main.getPoint(0.3 + (i / (n - 1)) * 0.55 + r.range(-0.03, 0.03));
    const c1 = new Vector3().lerpVectors(src, tgt, 0.38).add(new Vector3(0, 0.9, 0));
    const c2 = new Vector3().lerpVectors(src, tgt, 0.78).add(new Vector3(0, 0.35, 0));
    out.push(new CatmullRomCurve3([src, c1, c2, tgt], false, 'centripetal'));
  }
  return out;
}

/** Crisp rule lines (rule-based clinical reasoning): node → each threshold, straight segments only. */
export function decisionLines(): CurvePath<Vector3>[] {
  return THRESHOLDS.map((th) => {
    const path = new CurvePath<Vector3>();
    const a = NODE.clone();
    const b = new Vector3(0, NODE.y, NODE.z - 2.4);
    const c = new Vector3(th.pos.x, NODE.y, th.pos.z + 4.2);
    const d = new Vector3(th.pos.x, NODE.y, th.pos.z);
    const e = new Vector3(th.pos.x, th.pos.y - th.size * (th.shape === 'triangle' ? 0.5 : 1.0), th.pos.z);
    path.add(new LineCurve3(a, b));
    if (Math.abs(th.pos.x) > 0.01) {
      path.add(new LineCurve3(b, c));
      path.add(new LineCurve3(c, d));
    } else {
      path.add(new LineCurve3(b, d));
    }
    path.add(new LineCurve3(d, e));
    return path;
  });
}

/** Orthonormal right/up for a plane at `center` facing CAMERA_REF. */
export function facing(center: Vector3): { right: Vector3; up: Vector3 } {
  const toCam = new Vector3().subVectors(CAMERA_REF, center).normalize();
  const right = new Vector3(0, 1, 0).cross(toCam).normalize();
  const up = new Vector3().crossVectors(toCam, right).normalize();
  return { right, up };
}

/** Closed outline (ring / triangle / square) around a threshold light, facing the lens. */
export function shapeOutline(th: Threshold): Curve<Vector3> {
  const { right, up } = facing(th.pos);
  const at = (x: number, y: number) => th.pos.clone().addScaledVector(right, x).addScaledVector(up, y);
  if (th.shape === 'circle') {
    const pts: Vector3[] = [];
    const seg = 48;
    for (let i = 0; i < seg; i++) {
      const a = Math.PI / 2 + (i / seg) * Math.PI * 2;
      pts.push(at(Math.cos(a) * th.size, Math.sin(a) * th.size));
    }
    return new CatmullRomCurve3(pts, true, 'centripetal');
  }
  const corners: Vector3[] = [];
  if (th.shape === 'triangle') {
    for (let i = 0; i < 3; i++) {
      const a = Math.PI / 2 + (i / 3) * Math.PI * 2;
      corners.push(at(Math.cos(a) * th.size, Math.sin(a) * th.size));
    }
  } else {
    const s = th.size;
    corners.push(at(-s, s), at(-s, -s), at(s, -s), at(s, s));
  }
  const path = new CurvePath<Vector3>();
  for (let i = 0; i < corners.length; i++) path.add(new LineCurve3(corners[i], corners[(i + 1) % corners.length]));
  return path;
}

/** Where the in-world signage board hangs (high, far: the band the title later inherits). */
export const BOARD = { pos: new Vector3(0, 11.2, -34), width: 24, height: 9.6 };
