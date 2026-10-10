/**
 * Keyframe tracks — map scene progress (0..1) to values.
 * Mirrors the Cinematic Keyframe Book (doc 15): keys usually sit at 0, .2, .4, .6, .8, 1.
 */
import { Color, type Vector3 } from 'three';
import { easeInOutPremium, type Ease } from './easing';
import { lensToFov, saturate } from './math';

export interface Key<T> {
  at: number;
  value: T;
  /** Easing for the segment that ARRIVES at this key. Default: easeInOutPremium. */
  ease?: Ease;
}

function locate<T>(keys: readonly Key<T>[], p: number): { i: number; t: number } {
  if (p <= keys[0].at) return { i: 0, t: 0 };
  const last = keys.length - 1;
  if (p >= keys[last].at) return { i: last - 1 < 0 ? 0 : last - 1, t: 1 };
  for (let i = 0; i < last; i++) {
    const a = keys[i].at;
    const b = keys[i + 1].at;
    if (p >= a && p <= b) return { i, t: b === a ? 1 : (p - a) / (b - a) };
  }
  return { i: last - 1, t: 1 };
}

function assertSorted<T>(keys: readonly Key<T>[]): void {
  if (keys.length === 0) throw new Error('track: needs at least one key');
  for (let i = 1; i < keys.length; i++) {
    if (keys[i].at < keys[i - 1].at) throw new Error('track: keys must be sorted by `at`');
  }
}

/** Scalar track with per-segment easing. */
export function track(keys: readonly Key<number>[]): (p: number) => number {
  assertSorted(keys);
  if (keys.length === 1) return () => keys[0].value;
  return (p) => {
    const { i, t } = locate(keys, p);
    const ease = keys[i + 1]?.ease ?? easeInOutPremium;
    const a = keys[i].value;
    const b = keys[Math.min(i + 1, keys.length - 1)].value;
    return a + (b - a) * ease(saturate(t));
  };
}

/** Colour track (linear-space lerp, per-segment easing). */
export function colorTrack(keys: readonly Key<string | number>[]): (p: number, out: Color) => Color {
  assertSorted(keys);
  const cols = keys.map((k) => new Color(k.value));
  return (p, out) => {
    if (cols.length === 1) return out.copy(cols[0]);
    const { i, t } = locate(keys, p);
    const ease = keys[i + 1]?.ease ?? easeInOutPremium;
    return out.copy(cols[i]).lerp(cols[Math.min(i + 1, cols.length - 1)], ease(saturate(t)));
  };
}

type V3 = readonly [number, number, number];

function catmull(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const t2 = t * t;
  const t3 = t2 * t;
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}

/**
 * Smooth vector track through keys (uniform Catmull–Rom) — camera paths glide through
 * checkpoints instead of stopping at each one. Segment `ease` still shapes local timing.
 */
export function vec3Track(keys: readonly Key<V3>[]): (p: number, out: Vector3) => Vector3 {
  assertSorted(keys);
  const pts = keys.map((k) => k.value);
  return (p, out) => {
    if (pts.length === 1) return out.set(pts[0][0], pts[0][1], pts[0][2]);
    const { i, t } = locate(keys, p);
    const ease = keys[i + 1]?.ease ?? ((x: number) => x);
    const tt = ease(saturate(t));
    const a = pts[Math.max(i - 1, 0)];
    const b = pts[i];
    const c = pts[Math.min(i + 1, pts.length - 1)];
    const d = pts[Math.min(i + 2, pts.length - 1)];
    return out.set(catmull(a[0], b[0], c[0], d[0], tt), catmull(a[1], b[1], c[1], d[1], tt), catmull(a[2], b[2], c[2], d[2], tt));
  };
}

export interface ShotKey {
  at: number;
  position: V3;
  target: V3;
  /** Focal length (mm) — preferred (doc 3 §2). */
  lens?: number;
  /** Or a vertical fov in degrees. */
  fov?: number;
  /** Roll in radians (rarely used; "no aggressive rotations"). */
  roll?: number;
  ease?: Ease;
}

export interface ShotOut {
  position: Vector3;
  target: Vector3;
  fov: number;
  roll: number;
}

/** A complete camera shot track (doc 15 keyframes → camera directives). */
export function shotTrack(keys: readonly ShotKey[]): (p: number, out: ShotOut) => ShotOut {
  const pos = vec3Track(keys.map((k) => ({ at: k.at, value: k.position, ease: k.ease })));
  const tgt = vec3Track(keys.map((k) => ({ at: k.at, value: k.target, ease: k.ease })));
  const fov = track(keys.map((k) => ({ at: k.at, value: k.fov ?? lensToFov(k.lens ?? 35), ease: k.ease })));
  const roll = track(keys.map((k) => ({ at: k.at, value: k.roll ?? 0, ease: k.ease })));
  return (p, out) => {
    pos(p, out.position);
    tgt(p, out.target);
    out.fov = fov(p);
    out.roll = roll(p);
    return out;
  };
}
