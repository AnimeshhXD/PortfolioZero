import { beforeEach, describe, expect, it } from 'vitest';
import { fakeTrack, scrollState } from './setup-dom-stubs';
import { ScrollDirector } from '../src/experience/orchestration/ScrollDirector';
import { SCENES, TX_BAND } from '../src/experience/scenes/registry';

const bands = SCENES.map((s) => ({ band: s.band, holds: s.holds }));

describe('ScrollDirector timeline', () => {
  beforeEach(() => {
    scrollState.y = 0;
    scrollState.calls.length = 0;
  });

  it('lays out scenes and transition bands back to back', () => {
    const sd = new ScrollDirector(bands, TX_BAND, fakeTrack());
    const expectedTotal = SCENES.reduce((a, s) => a + s.band, 0) + TX_BAND * (SCENES.length - 1);
    expect(sd.total).toBe(expectedTotal);
    expect(sd.segments.length).toBe(SCENES.length * 2 - 1);
    sd.segments.forEach((seg, i) => {
      expect(seg.kind).toBe(i % 2 === 0 ? 'scene' : 'tx');
      if (i > 0) expect(seg.start).toBe(sd.segments[i - 1].end);
    });
  });

  it('locates scene and transition progress', () => {
    const sd = new ScrollDirector(bands, TX_BAND, fakeTrack());
    const s0 = sd.segments[0];
    expect(sd.locate(s0.start + (s0.end - s0.start) / 2)).toMatchObject({ segmentIndex: 0, local: 0.5 });
    const tx = sd.segments[1];
    const mid = sd.locate((tx.start + tx.end) / 2);
    expect(mid.segment.kind).toBe('tx');
    expect(mid.local).toBeCloseTo(0.5);
    expect(sd.locate(-50).local).toBe(0);
    expect(sd.locate(sd.total + 50).local).toBe(1);
  });

  it('maps scene-local progress to units and back', () => {
    const sd = new ScrollDirector(bands, TX_BAND, fakeTrack());
    for (let i = 0; i < SCENES.length; i++) {
      const u = sd.sceneUnits(i, 0.37);
      const loc = sd.locate(u);
      expect(loc.segment.kind).toBe('scene');
      expect(loc.segment.index).toBe(i);
      expect(loc.local).toBeCloseTo(0.37, 5);
    }
  });

  it('collects every scene hold in ascending order', () => {
    const sd = new ScrollDirector(bands, TX_BAND, fakeTrack());
    const count = SCENES.reduce((a, s) => a + s.holds.length, 0);
    expect(sd.holds.length).toBe(count);
    for (let i = 1; i < sd.holds.length; i++) expect(sd.holds[i]).toBeGreaterThan(sd.holds[i - 1]);
  });

  it('damps toward the scroll target without exceeding the per-segment max rate', () => {
    const sd = new ScrollDirector(bands, TX_BAND, fakeTrack());
    scrollState.y = sd.unitsToPx(150);
    let maxStep = 0;
    let prev = sd.position;
    for (let f = 0; f < 600; f++) {
      sd.update(1 / 60, false);
      maxStep = Math.max(maxStep, sd.position - prev);
      prev = sd.position;
    }
    expect(sd.position).toBeCloseTo(150, 1);
    // 80 units/s scene cap at 60fps
    expect(maxStep).toBeLessThanOrEqual(80 / 60 + 1e-6);
  });

  it('fast scrolling still plays every beat (minimum traversal time)', () => {
    const sd = new ScrollDirector(bands, TX_BAND, fakeTrack());
    const lawlens = sd.segments.find((s) => s.kind === 'scene' && s.index === 2)!;
    sd.seek(lawlens.start);
    scrollState.y = sd.unitsToPx(lawlens.end);
    let t = 0;
    while (sd.position < lawlens.end - 0.5 && t < 60) {
      sd.update(1 / 60, false);
      t += 1 / 60;
    }
    // a 400vh world can never be skipped in under 5 seconds
    expect(t).toBeGreaterThan(5);
  });

  it('turns long jumps into a fog cut that lands before the destination', () => {
    const sd = new ScrollDirector(bands, TX_BAND, fakeTrack());
    sd.seek(10);
    const dest = sd.sceneUnits(SCENES.length - 1, 0.96);
    sd.travelTo(dest, false);
    let peak = 0;
    for (let f = 0; f < 60 * 3; f++) {
      sd.update(1 / 60, false);
      peak = Math.max(peak, sd.cut);
    }
    expect(peak).toBeGreaterThan(0.95);
    expect(sd.cut).toBe(0);
    expect(sd.locate(sd.position).segment.index).toBe(SCENES.length - 1);
  });

  it('autoplay advances scene 0 and keeps the scrollbar in sync', () => {
    const sd = new ScrollDirector(bands, TX_BAND, fakeTrack());
    sd.startAutoplay(10, 0);
    for (let f = 0; f < 60 * 5; f++) sd.update(1 / 60, false);
    const loc = sd.locate(sd.position);
    expect(loc.segment.index).toBe(0);
    expect(loc.local).toBeGreaterThan(0.3);
    expect(scrollState.y).toBeGreaterThan(0);
  });

  it('steps between holds with the keyboard', () => {
    const sd = new ScrollDirector(bands, TX_BAND, fakeTrack());
    sd.seek(0);
    sd.step(1, true);
    expect(sd.pxToUnits(scrollState.y)).toBeCloseTo(sd.holds[0], 5);
    sd.update(1 / 60, true);
    sd.step(1, true);
    expect(sd.pxToUnits(scrollState.y)).toBeCloseTo(sd.holds[1], 5);
  });
});
