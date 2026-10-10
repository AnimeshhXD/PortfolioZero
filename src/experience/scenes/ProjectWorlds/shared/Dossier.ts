/**
 * Standard post-climax stack for project worlds (AUTHORING.md §5): monument · tagline · facts · signals ·
 * stack · portals, all in slot `center`, with the shared beat timing (title 0.69–0.765, tagline 0.765–0.815,
 * dossier 0.82–0.9) and exit dissolution into the signature (glyph dust, absorbed).
 */
import type { Vector3 } from 'three';
import type { TextBlock, TextBlockOptions } from '../../../ui/CinematicTextLayer';
import type { Portal, PortalOptions } from '../../../ui/PortalButtons';
import type { GlyphDust, GlyphDustOptions } from '../../../systems/ParticleSystem/GlyphDust';
import type { ProjectContent } from '../../../../content/projects';
import { beat } from '../../../../utils/math';
import { easeOutPremium } from '../../../../utils/easing';

export interface DossierFactory {
  text(o: TextBlockOptions): TextBlock;
  portal(o: PortalOptions): Portal;
  dust(b: TextBlock, o?: GlyphDustOptions): GlyphDust;
}

export interface DossierOptions {
  accent: string;
  accentB: string;
  /** Explicit monument line breaks for long names. */
  lines?: readonly string[];
}

export class Dossier {
  private monument: TextBlock;
  private tagline: TextBlock;
  private facts: TextBlock[];
  private signals: TextBlock | null;
  private stack: TextBlock;
  private portals: Portal[];
  private titleDust: GlyphDust;
  private taglineDust: GlyphDust;
  private restDust: GlyphDust[];

  constructor(f: DossierFactory, project: ProjectContent, o: DossierOptions) {
    const compact = innerWidth < 700 || innerHeight < 640;
    this.monument = f.text({ text: o.lines ?? project.monument, style: 'monument', slot: 'center', accent: o.accent, stagger: 0.55 });
    this.tagline = f.text({ text: project.tagline, style: 'subtitle', slot: 'center', accent: o.accentB, stagger: 0.4 });
    const facts = compact ? project.facts.slice(0, 1) : project.facts.slice(0, 3);
    this.facts = facts.map((t) => f.text({ text: t, style: 'body', slot: 'center', maxWidth: '58ch', stagger: 0.3 }));
    this.signals = project.signals.length
      ? f.text({
          text: project.signals.map((s) => `${s.value} · ${s.label}`).join('    '),
          style: 'label',
          slot: 'center',
          accent: o.accent,
          stagger: 0.35,
        })
      : null;
    this.stack = f.text({ text: project.stack.join('  ·  '), style: 'mono', slot: 'center', stagger: 0.3 });
    this.portals = project.links.map((l) =>
      f.portal({ label: l.label, href: l.href, slot: 'center', group: 'links', description: `${project.name} — ${l.label}`, accent: o.accent }),
    );
    this.titleDust = f.dust(this.monument, { mode: 'absorb', color: o.accent, depth: 7.5 });
    this.taglineDust = f.dust(this.tagline, { mode: 'absorb', color: o.accentB, depth: 7, maxPoints: 700 });
    this.restDust = [...this.facts, ...(this.signals ? [this.signals] : []), this.stack].map((b) =>
      f.dust(b, { mode: 'absorb', color: o.accentB, depth: 7, maxPoints: 500 }),
    );
  }

  /** Strength of the resolved dossier 0..1 (worlds dim/calm behind it). */
  static presence(p: number): number {
    return beat(p, 0.8, 0.88);
  }

  update(p: number, exit: number, target: Vector3): void {
    const titleD = beat(exit, 0.08, 0.62);
    this.monument.set(beat(p, 0.69, 0.765, easeOutPremium), titleD, beat(p, 0.71, 0.8));
    this.titleDust.update(titleD, target);

    const tagD = beat(exit, 0.04, 0.5);
    this.tagline.set(beat(p, 0.765, 0.815, easeOutPremium), tagD, beat(p, 0.78, 0.84));
    this.taglineDust.update(tagD, target);

    const restD = beat(exit, 0, 0.42);
    this.facts.forEach((b, i) => {
      const a = 0.82 + i * 0.012;
      b.set(beat(p, a, a + 0.035, easeOutPremium), restD);
    });
    this.signals?.set(beat(p, 0.85, 0.88, easeOutPremium), restD, beat(p, 0.86, 0.9));
    this.stack.set(beat(p, 0.86, 0.89, easeOutPremium), restD);
    for (const d of this.restDust) d.update(restD, target);
    const portalP = beat(p, 0.87, 0.9) * (1 - beat(exit, 0, 0.3));
    for (const portal of this.portals) portal.setPresence(portalP);
  }
}
