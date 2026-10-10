import { describe, expect, it } from 'vitest';
import { Color, Vector3 } from 'three';
import { beat, bell, clamp, damp, envelope, lensToFov, remap, smoothstep } from '../src/utils/math';
import { colorTrack, shotTrack, track, vec3Track } from '../src/utils/timeline';
import { easeInOutPremium, easeOutPremium, softEaseIn } from '../src/utils/easing';
import { createRng, rng, seedFrom } from '../src/utils/rng';

describe('math', () => {
  it('clamps, remaps and windows', () => {
    expect(clamp(2)).toBe(1);
    expect(clamp(-1)).toBe(0);
    expect(remap(5, 0, 10, 100, 200)).toBe(150);
    expect(beat(0.1, 0.2, 0.4)).toBe(0);
    expect(beat(0.5, 0.2, 0.4)).toBe(1);
    expect(beat(0.3, 0.2, 0.4)).toBeCloseTo(0.5);
    expect(smoothstep(0, 1, 0.5)).toBeCloseTo(0.5);
  });

  it('envelope rises, holds and falls', () => {
    expect(envelope(0.05, 0.1, 0.2, 0.3, 0.4)).toBe(0);
    expect(envelope(0.25, 0.1, 0.2, 0.3, 0.4)).toBe(1);
    expect(envelope(0.45, 0.1, 0.2, 0.3, 0.4)).toBe(0);
    expect(bell(0.5, 0.5, 0.2)).toBe(1);
    expect(bell(0.8, 0.5, 0.2)).toBe(0);
  });

  it('damp is frame-rate independent', () => {
    let a = 0;
    for (let i = 0; i < 60; i++) a = damp(a, 1, 3, 1 / 60);
    let b = 0;
    for (let i = 0; i < 30; i++) b = damp(b, 1, 3, 1 / 30);
    expect(a).toBeCloseTo(b, 6);
  });

  it('maps focal lengths to the doc 3 lens bands', () => {
    expect(lensToFov(24)).toBeGreaterThan(lensToFov(50));
    expect(lensToFov(50)).toBeCloseTo(26.99, 1);
  });
});

describe('easing tokens', () => {
  it('are monotonic, bounded and never overshoot (no bounce — doc 5 §1)', () => {
    for (const ease of [easeOutPremium, softEaseIn, easeInOutPremium]) {
      expect(ease(0)).toBeCloseTo(0);
      expect(ease(1)).toBeCloseTo(1);
      let prev = -1;
      for (let i = 0; i <= 100; i++) {
        const v = ease(i / 100);
        expect(v).toBeGreaterThanOrEqual(prev - 1e-9);
        expect(v).toBeLessThanOrEqual(1 + 1e-9);
        prev = v;
      }
    }
  });
});

describe('timeline tracks', () => {
  it('scalar track interpolates between keys and clamps outside', () => {
    const t = track([
      { at: 0, value: 0 },
      { at: 0.5, value: 10 },
      { at: 1, value: 0 },
    ]);
    expect(t(-1)).toBe(0);
    expect(t(0.5)).toBe(10);
    expect(t(2)).toBe(0);
    expect(t(0.25)).toBeCloseTo(5);
  });

  it('vector track passes through every key', () => {
    const v = vec3Track([
      { at: 0, value: [0, 0, 10] },
      { at: 0.4, value: [1, 2, 8] },
      { at: 1, value: [0, 0, 6] },
    ]);
    const out = new Vector3();
    expect(v(0.4, out).toArray()).toEqual([1, 2, 8]);
    expect(v(1, out).toArray()).toEqual([0, 0, 6]);
  });

  it('colour track lerps', () => {
    const c = colorTrack([
      { at: 0, value: '#000000' },
      { at: 1, value: '#ffffff' },
    ]);
    const out = new Color();
    expect(c(0, out).r).toBe(0);
    expect(c(1, out).r).toBeCloseTo(1);
  });

  it('shot track resolves lens to fov', () => {
    const s = shotTrack([{ at: 0, position: [0, 0, 10], target: [0, 0, 0], lens: 50 }]);
    const out = { position: new Vector3(), target: new Vector3(), fov: 0, roll: 0 };
    s(0.3, out);
    expect(out.fov).toBeCloseTo(lensToFov(50));
  });

  it('rejects unsorted keys', () => {
    expect(() =>
      track([
        { at: 0.5, value: 0 },
        { at: 0.1, value: 1 },
      ]),
    ).toThrow();
  });
});

describe('seeded rng (doc 9 §7.2 determinism)', () => {
  it('is deterministic per seed', () => {
    const a = createRng(42);
    const b = createRng(42);
    for (let i = 0; i < 20; i++) expect(a()).toBe(b());
    expect(seedFrom('lawlens')).toBe(seedFrom('lawlens'));
    expect(seedFrom('lawlens')).not.toBe(seedFrom('triage'));
  });

  it('samples inside the unit sphere', () => {
    const r = rng(7);
    for (let i = 0; i < 200; i++) {
      const [x, y, z] = r.inSphere(2);
      expect(Math.hypot(x, y, z)).toBeLessThanOrEqual(2 + 1e-9);
    }
  });
});
