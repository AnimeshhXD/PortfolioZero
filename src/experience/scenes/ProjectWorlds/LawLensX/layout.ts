/**
 * LawLens-X set plan — every position the world, the camera and the particles agree on.
 *
 *   camera starts deep behind the page field (+Z) and pushes toward −Z.
 *   CLAUSE  the one red clause (left of the stage, foreground-mid) — the "felt" problem.
 *   STAGE   the centre volume: the signature (SOC-2 rebuild anchor) with five agents around it
 *           in a tribunal horseshoe (pipeline order left → back → right).
 *   WALL    the output glow wall (screenshot stage) right of the stage, where the SSE stream lands.
 *   FRAME   the dim tribunal monolith frame far behind.
 */
import { CatmullRomCurve3, Euler, Quaternion, Vector3, type Matrix4 } from 'three';
import { beat } from '../../../../utils/math';
import { easeInOutPremium } from '../../../../utils/easing';
import type { Rng } from '../../../../utils/rng';

/** Contract page size (A-series ratio, world units). */
export const PAGE_W = 0.5;
export const PAGE_H = 0.707;

export const STAGE = new Vector3(0, -0.25, -4.2);
export const CLAUSE = new Vector3(-3.3, 0.72, 1.8);
export const CLAUSE_SCALE = 1.18;

/**
 * Agent cores in pipeline order (project.vocabulary[0..4]: ClauseParser → RiskAnalyzer → RiskScorer →
 * ScenarioSimulator → NegotiationAdvisor). Horseshoe around the stage; RiskScorer presides at the back.
 */
const RING_R = 4.0;
const RING_DEG = [216, 162, 90, 18, 324];
const RING_Y = [-0.55, 0.2, 0.95, 0.2, -0.55];
export const AGENTS: readonly Vector3[] = RING_DEG.map((deg, i) => {
  const a = (deg * Math.PI) / 180;
  return new Vector3(STAGE.x + Math.cos(a) * RING_R, RING_Y[i], STAGE.z - Math.sin(a) * RING_R);
});

/** Output glow wall — angled toward the stage from the right. */
export const WALL = {
  position: new Vector3(6.6, 1.75, -8.6),
  yaw: -0.56,
  width: 7.2,
  height: 4.05,
};

/** Tribunal monolith frame (far background). */
export const FRAME_Z = -17.5;

/* ───────── red clause pose (progress-driven, deterministic) ───────── */

export interface ClausePose {
  position: Vector3;
  rotation: Euler;
}

const BASE_ROT = new Euler(0.06, 0.2, -0.05);

/** Tilt out of alignment through the conflict beat. `out` is reused (no allocation). */
export function clausePose(p: number, out: ClausePose): ClausePose {
  const t = beat(p, 0.26, 0.42, easeInOutPremium);
  out.position.copy(CLAUSE);
  out.position.z += t * 0.32;
  out.position.y += t * 0.05;
  out.rotation.set(BASE_ROT.x + t * 0.2, BASE_ROT.y + t * 0.62, BASE_ROT.z + t * 0.44);
  return out;
}

/** World matrix of the clause at progress p (build-time sampling). */
export function clauseMatrix(p: number, target: Matrix4): Matrix4 {
  const pose = clausePose(p, { position: new Vector3(), rotation: new Euler() });
  return target.compose(pose.position, new Quaternion().setFromEuler(pose.rotation), new Vector3(CLAUSE_SCALE, CLAUSE_SCALE, CLAUSE_SCALE));
}

/* ───────── neural threads (fracture → pathways) ───────── */

/** Threads from the fractured clause to each agent core and two into the signature. */
export function threadCurves(r: Rng): CatmullRomCurve3[] {
  const ends: Vector3[] = [...AGENTS, STAGE.clone().add(new Vector3(-0.15, 0.55, 0)), STAGE.clone().add(new Vector3(0.12, -0.35, 0))];
  return ends.map((end, i) => {
    const start = CLAUSE.clone().add(new Vector3(r.range(-0.12, 0.12), r.range(-0.18, 0.18), r.range(-0.05, 0.05)));
    const pts: Vector3[] = [];
    const n = 6;
    const lift = r.range(0.35, 1.25) * (i % 2 === 0 ? 1 : -0.6);
    const swing = r.range(0.4, 1.4);
    for (let k = 0; k <= n; k++) {
      const t = k / n;
      const s = Math.sin(Math.PI * t);
      const q = new Vector3().lerpVectors(start, end, t);
      q.y += s * lift + Math.sin(t * 9 + i) * 0.08 * s;
      q.z += s * swing;
      q.x += Math.sin(t * 5.3 + i * 1.7) * 0.18 * s;
      pts.push(q);
    }
    return new CatmullRomCurve3(pts, false, 'centripetal');
  });
}

/* ───────── SSE token stream (pipeline order → output wall) ───────── */

export function wallPoint(u: number, v: number, lift = 0.04, out = new Vector3()): Vector3 {
  // u,v in [-0.5, 0.5] across the wall; lift along the wall normal.
  const c = Math.cos(WALL.yaw);
  const s = Math.sin(WALL.yaw);
  const x = u * WALL.width;
  const y = v * WALL.height;
  out.set(WALL.position.x + x * c + lift * s, WALL.position.y + y, WALL.position.z - x * s + lift * c);
  return out;
}

export function streamCurves(): CatmullRomCurve3[] {
  const offsets = [
    [0, 0],
    [0.09, 0.05],
    [-0.08, -0.06],
  ];
  return offsets.map(([oy, oz], k) => {
    const pts: Vector3[] = [];
    const lead = new Vector3().lerpVectors(CLAUSE, AGENTS[0], 0.62);
    lead.y -= 0.2;
    pts.push(lead);
    for (let i = 0; i < AGENTS.length; i++) {
      pts.push(AGENTS[i].clone());
      if (i < AGENTS.length - 1) {
        const mid = new Vector3().lerpVectors(AGENTS[i], AGENTS[i + 1], 0.5);
        // bow outward from the stage, braid strands apart between agents
        const out = mid.clone().sub(STAGE).setY(0).normalize().multiplyScalar(0.55);
        mid.add(out);
        mid.y += 0.32 + oy * (k + 1);
        mid.z += oz * (k + 1);
        pts.push(mid);
      }
    }
    pts.push(new Vector3(AGENTS[4].x + 1.9, AGENTS[4].y + 0.35 + oy, AGENTS[4].z - 1.1 + oz));
    pts.push(wallPoint(-0.36, -0.06 + oy * 0.4, 0.08));
    pts.push(wallPoint(-0.2, -0.04 + oy * 0.4, 0.02));
    return new CatmullRomCurve3(pts, false, 'centripetal');
  });
}
