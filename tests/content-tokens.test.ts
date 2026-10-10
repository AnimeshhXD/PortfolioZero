import { describe, expect, it } from 'vitest';
import { projects } from '../src/content/projects';
import { identity } from '../src/content/identity';
import { renderStaticContent } from '../src/content/renderStatic';
import { SCENES } from '../src/experience/scenes/registry';
import { CURTAIN, EMISSION, FOG, GLOW, TRANSITION } from '../src/tokens/tokens';
import { PALETTES } from '../src/tokens/palettes';
import { SOC, socAt } from '../src/experience/systems/SignatureObject/socStates';
import { createDirectives, lerpDirectives } from '../src/experience/directives';

describe('content (doc 9 §9 source of truth)', () => {
  it('has one world per project in film order after identity', () => {
    const worldIds = SCENES.slice(2, -1).map((s) => s.id);
    expect(worldIds).toEqual(projects.map((p) => p.id));
  });

  it('uses only https / mailto / site-relative links', () => {
    const hrefs = [...projects.flatMap((p) => p.links.map((l) => l.href)), ...identity.contacts.map((c) => c.href)];
    for (const h of hrefs) expect(h).toMatch(/^(https:\/\/|mailto:|\/)/);
  });

  it('keeps resume metrics verbatim', () => {
    const all = JSON.stringify(projects);
    for (const m of ['75–85%', '310ms', '120ms', '40ms', '150ms', '99%', '1,000+', '<100ms', '1.0']) expect(all).toContain(m);
  });

  it('never publishes the phone number', () => {
    const page = renderStaticContent();
    expect(page).not.toMatch(/9167|88752/);
    expect(JSON.stringify({ identity, projects })).not.toMatch(/9167|88752/);
  });

  it('renders every project and contact into the static page', () => {
    const page = renderStaticContent();
    for (const p of projects) expect(page).toContain(p.name);
    for (const c of identity.contacts) expect(page).toContain(c.label);
    expect(page).toContain(identity.ending);
  });
});

describe('tokens (doc 7)', () => {
  it('fog, curtain, glow and emission scales are monotonic', () => {
    expect(FOG.F0).toBeLessThan(FOG.F1);
    expect(FOG.F1).toBeLessThan(FOG.F2);
    expect(FOG.F2).toBeLessThan(FOG.F3);
    expect(CURTAIN.F3).toBeLessThanOrEqual(1);
    expect(GLOW.G1).toBeLessThan(GLOW.G2);
    expect(GLOW.G3).toBeLessThan(1.2); // restrained bloom
    expect(EMISSION.G2).toBeLessThan(EMISSION.G3);
  });

  it('every scene has a palette and a valid transition token', () => {
    for (const s of SCENES) {
      expect(PALETTES[s.id as keyof typeof PALETTES]).toBeDefined();
      expect(TRANSITION[s.transitionOut]).toBeDefined();
      for (const h of s.holds) expect(h).toBeGreaterThan(0);
    }
  });
});

describe('signature evolution (doc 14)', () => {
  it('defines exactly SOC-0..SOC-8', () => {
    expect(SOC.length).toBe(9);
  });

  it('channels accumulate: once a channel appears it never disappears', () => {
    for (let k = 0; k < 6; k++) {
      const first = SOC.findIndex((s) => s.channels[k] >= 0.99);
      expect(first).toBeGreaterThan(0);
      for (let i = first; i < SOC.length; i++) expect(SOC[i].channels[k]).toBeGreaterThanOrEqual(0.1);
    }
  });

  it('interpolates fractional states', () => {
    const out = { scale: 0, glass: 0, metal: 0, stone: 0, core: 0, seam: 0, channels: [0, 0, 0, 0, 0, 0], spin: 0, breath: 0 };
    socAt(2.5, out);
    expect(out.scale).toBeCloseTo((SOC[2].scale + SOC[3].scale) / 2);
    socAt(99, out);
    expect(out.scale).toBeCloseTo(SOC[8].scale);
  });

  it('scene canonical SOC states increase through the film', () => {
    for (let i = 1; i < SCENES.length; i++) expect(SCENES[i].soc).toBeGreaterThan(SCENES[i - 1].soc);
  });
});

describe('directives blending', () => {
  it('lerps every channel and supports aliasing', () => {
    const a = createDirectives('lawlens');
    const b = createDirectives('triage');
    a.fog.density = 0;
    b.fog.density = 1;
    a.camera.position.set(0, 0, 0);
    b.camera.position.set(10, 0, 0);
    const out = createDirectives();
    lerpDirectives(out, a, b, 0.25);
    expect(out.fog.density).toBeCloseTo(0.25);
    expect(out.camera.position.x).toBeCloseTo(2.5);
    lerpDirectives(a, a, b, 1);
    expect(a.camera.position.x).toBeCloseTo(10);
  });
});
