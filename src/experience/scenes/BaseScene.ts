/**
 * BaseScene — lifecycle plumbing for the scene contract so worlds only author the film.
 *
 *  - prepareAssets() is idempotent and calls your build(ctx) once.
 *  - Everything created through this.track()/text()/portal()/dust()/add() is disposed in cleanup().
 *  - Text blocks and portals are GATED: while the scene is not on stage their set()/setPresence()
 *    calls are forced to 0, so nothing can leak on screen during the other world's half of a transition.
 */
import { Group, type Object3D } from 'three';
import type { CinematicScene, SceneContext, SceneDirectives, SceneFrame, SceneId } from '../../types/scene';
import type { TextBlock, TextBlockOptions } from '../ui/CinematicTextLayer';
import type { Portal, PortalOptions } from '../ui/PortalButtons';
import type { GlyphDust, GlyphDustOptions } from '../systems/ParticleSystem/GlyphDust';
import { createDirectives } from '../directives';
import type { PresetId } from '../../tokens/palettes';

interface Disposable {
  dispose(): void;
}

export abstract class BaseScene implements CinematicScene {
  readonly root = new Group();
  readonly directives: SceneDirectives;
  protected ctx!: SceneContext;
  protected onStage = false;
  private prepared = false;
  private preparing: Promise<void> | null = null;
  private disposables: Disposable[] = [];
  private gatedTexts: GatedText[] = [];
  private gatedPortals: GatedPortal[] = [];
  private dusts: GlyphDust[] = [];

  constructor(
    readonly id: SceneId,
    readonly preset: PresetId,
  ) {
    this.directives = createDirectives(preset);
    this.root.name = `Scene:${id}`;
    this.root.visible = false;
  }

  /** Build geometry, materials, text, portals. Called once per prepare cycle. */
  protected abstract build(ctx: SceneContext): void | Promise<void>;

  /** Animate and write this.directives for the current frame. */
  abstract update(frame: SceneFrame): void;

  prepareAssets(ctx: SceneContext): Promise<void> {
    if (this.prepared) return Promise.resolve();
    if (this.preparing) return this.preparing;
    this.ctx = ctx;
    this.preparing = Promise.resolve(this.build(ctx)).then(() => {
      this.prepared = true;
      this.preparing = null;
    });
    return this.preparing;
  }

  enter(): void {
    this.onStage = true;
    this.root.visible = true;
    this.setDomStage(true);
  }

  exit(): void {
    this.onStage = false;
    this.root.visible = false;
    for (const t of this.gatedTexts) t.inner.set(0, 0, -1);
    for (const p of this.gatedPortals) p.inner.setPresence(0);
    for (const d of this.dusts) d.update(0);
    this.setDomStage(false);
  }

  /**
   * Off-stage scenes take NO layout space: text slots are shared by every loaded scene, so hidden blocks of
   * a preloaded neighbour must not push this scene's stack around (display:none via [data-stage='off']).
   */
  private setDomStage(live: boolean): void {
    for (const t of this.gatedTexts) stage(t.inner.el, live);
    for (const p of this.gatedPortals) {
      stage(p.inner.el, live);
      if (p.inner.el.parentElement?.classList.contains('pz-portal-row')) stage(p.inner.el.parentElement, live);
    }
  }

  cleanup(): void {
    this.exit();
    for (const d of this.dusts) d.dispose();
    for (const t of this.gatedTexts) t.inner.dispose();
    for (const p of this.gatedPortals) p.inner.dispose();
    for (const d of this.disposables) d.dispose();
    this.dusts = [];
    this.gatedTexts = [];
    this.gatedPortals = [];
    this.disposables = [];
    this.root.clear();
    this.prepared = false;
  }

  /* ───────── helpers for build() ───────── */

  /** Register anything with dispose() for cleanup. Returns it for chaining. */
  protected track<T extends Disposable>(d: T): T {
    this.disposables.push(d);
    return d;
  }

  /** Add objects to this scene's root. */
  protected add(...objs: Object3D[]): void {
    this.root.add(...objs);
  }

  protected text(opts: TextBlockOptions): TextBlock {
    const g = new GatedText(this.ctx.text.create(opts), () => this.onStage);
    stage(g.inner.el, this.onStage);
    this.gatedTexts.push(g);
    return g;
  }

  protected portal(opts: PortalOptions): Portal {
    // Rows are namespaced per scene so two worlds using group 'links' never share a row element.
    const g = new GatedPortal(this.ctx.portals.create({ ...opts, group: `${this.id}:${opts.group ?? '_'}` }), () => this.onStage);
    stage(g.inner.el, this.onStage);
    const row = g.inner.el.parentElement;
    if (row?.classList.contains('pz-portal-row')) stage(row, this.onStage);
    this.gatedPortals.push(g);
    return g;
  }

  protected dust(block: TextBlock, opts?: GlyphDustOptions): GlyphDust {
    const inner = block instanceof GatedText ? block.inner : block;
    const d = this.ctx.glyphDust.create(inner, opts);
    const gated: GlyphDust = {
      update: (v, target) => d.update(this.onStage ? v : 0, target),
      dispose: () => d.dispose(),
    };
    this.dusts.push(gated);
    return gated;
  }
}

function stage(el: HTMLElement, live: boolean): void {
  if (live) el.removeAttribute('data-stage');
  else el.setAttribute('data-stage', 'off');
}

class GatedText implements TextBlock {
  constructor(
    readonly inner: TextBlock,
    private readonly live: () => boolean,
  ) {}
  get el() {
    return this.inner.el;
  }
  get text() {
    return this.inner.text;
  }
  get style() {
    return this.inner.style;
  }
  get anchor() {
    return this.inner.anchor;
  }
  set anchor(v) {
    this.inner.anchor = v;
  }
  get anchorOffset() {
    return this.inner.anchorOffset;
  }
  set anchorOffset(v) {
    this.inner.anchorOffset = v;
  }
  get emerge() {
    return this.inner.emerge;
  }
  get dissolve() {
    return this.inner.dissolve;
  }
  set(emerge: number, dissolve?: number, sweep?: number): void {
    if (this.live()) this.inner.set(emerge, dissolve, sweep);
    else this.inner.set(0, 0, -1);
  }
  glyphs() {
    return this.inner.glyphs();
  }
  dispose(): void {
    this.inner.dispose();
  }
}

class GatedPortal implements Portal {
  constructor(
    readonly inner: Portal,
    private readonly live: () => boolean,
  ) {}
  get el() {
    return this.inner.el;
  }
  get hovered() {
    return this.inner.hovered;
  }
  setPresence(v: number): void {
    this.inner.setPresence(this.live() ? v : 0);
  }
  dispose(): void {
    this.inner.dispose();
  }
}
