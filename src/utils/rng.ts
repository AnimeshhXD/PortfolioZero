/**
 * Seeded randomness (doc 9 §7.2: "For cinematic consistency, use fixed seeds").
 * Never use Math.random() for anything visible.
 */

/** mulberry32 — small, fast, deterministic PRNG. Returns a function producing [0,1). */
export function createRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface Rng {
  next(): number;
  range(min: number, max: number): number;
  int(min: number, maxExclusive: number): number;
  sign(): number;
  pick<T>(arr: readonly T[]): T;
  /** Uniform point inside a unit sphere, scaled. */
  inSphere(radius?: number): [number, number, number];
  /** Uniform point on a unit sphere surface, scaled. */
  onSphere(radius?: number): [number, number, number];
  /** Approximate gaussian (mean 0, sd 1). */
  gauss(): number;
}

export function rng(seed: number): Rng {
  const next = createRng(seed);
  const api: Rng = {
    next,
    range: (min, max) => min + (max - min) * next(),
    int: (min, max) => Math.floor(min + (max - min) * next()),
    sign: () => (next() < 0.5 ? -1 : 1),
    pick: (arr) => arr[Math.floor(next() * arr.length) % arr.length],
    inSphere: (radius = 1) => {
      for (;;) {
        const x = next() * 2 - 1;
        const y = next() * 2 - 1;
        const z = next() * 2 - 1;
        if (x * x + y * y + z * z <= 1) return [x * radius, y * radius, z * radius];
      }
    },
    onSphere: (radius = 1) => {
      const u = next() * 2 - 1;
      const th = next() * Math.PI * 2;
      const s = Math.sqrt(1 - u * u);
      return [s * Math.cos(th) * radius, u * radius, s * Math.sin(th) * radius];
    },
    gauss: () => {
      let u = 0;
      let v = 0;
      while (u === 0) u = next();
      while (v === 0) v = next();
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    },
  };
  return api;
}

/** Stable seed from a string (scene ids etc.). */
export function seedFrom(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
