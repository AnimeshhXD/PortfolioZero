/** Scalar helpers shared by directors and scenes. All pure. */

export const clamp = (v: number, min = 0, max = 1): number => (v < min ? min : v > max ? max : v);
export const saturate = (v: number): number => clamp(v, 0, 1);
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export const invLerp = (a: number, b: number, v: number): number => (a === b ? 0 : (v - a) / (b - a));

/** Map v from [a,b] to [c,d] (clamped). */
export const remap = (v: number, a: number, b: number, c = 0, d = 1): number => lerp(c, d, saturate(invLerp(a, b, v)));

export const smoothstep = (e0: number, e1: number, x: number): number => {
  const t = saturate(invLerp(e0, e1, x));
  return t * t * (3 - 2 * t);
};

export const smootherstep = (e0: number, e1: number, x: number): number => {
  const t = saturate(invLerp(e0, e1, x));
  return t * t * t * (t * (t * 6 - 15) + 10);
};

/**
 * A "beat" window: 0 before start, 1 after end, eased in between.
 * The primary progress-to-animation primitive for storyboard beats.
 */
export const beat = (p: number, start: number, end: number, ease: (t: number) => number = (t) => t): number =>
  ease(saturate(invLerp(start, end, p)));

/**
 * Rise → hold → fall envelope. 0 outside [a,d], ramps up over [a,b], holds over [b,c], ramps down over [c,d].
 * Typical use: text emergence then dissolution, fog spikes.
 */
export const envelope = (p: number, a: number, b: number, c: number, d: number): number => {
  if (p <= a || p >= d) return 0;
  if (p < b) return smoothstep(a, b, p);
  if (p <= c) return 1;
  return 1 - smoothstep(c, d, p);
};

/** Symmetric bell centred at c with half-width w (smooth, 1 at centre). */
export const bell = (p: number, c: number, w: number): number => {
  const x = saturate(1 - Math.abs(p - c) / w);
  return x * x * (3 - 2 * x);
};

/**
 * Frame-rate independent exponential damping toward a target (film-like inertia).
 * lambda ≈ responsiveness (higher = faster). dt in seconds.
 */
export const damp = (current: number, target: number, lambda: number, dt: number): number =>
  lerp(current, target, 1 - Math.exp(-lambda * dt));

/** Vertical FOV (degrees) for a full-frame lens of focal length mm (24mm sensor height). */
export const lensToFov = (mm: number): number => (2 * Math.atan(12 / mm) * 180) / Math.PI;

export const TAU = Math.PI * 2;

/** Cheap deterministic hash → [0,1). */
export const hash1 = (n: number): number => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
  return x - Math.floor(x);
};
