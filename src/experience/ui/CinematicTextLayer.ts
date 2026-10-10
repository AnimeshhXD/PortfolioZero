/**
 * CinematicTextLayer — monumental, architectural typography (doc 1 §6, doc 5 §8, doc 16 §8).
 *
 * Text never slides. It resolves from fog to ink (per-glyph blur → sharp, opacity, a hint of depth
 * scale), receives a light pass (illumination sweeping across the glyphs), and dissolves into ash
 * (handed to GlyphDust, which turns the glyphs into WebGL particles).
 *
 * Per frame a block costs ONE style write: three CSS custom properties (--e, --d, --s); every glyph
 * derives its own state in CSS from its index (--i). See styles/text.css.
 *
 * Visual blocks are aria-hidden: the semantic, screen-reader content lives in <main id="content">.
 */
import { Vector3, type PerspectiveCamera } from 'three';
import { rng } from '../../utils/rng';
import { TYPE } from '../../tokens/tokens';

export type TextStyle = 'monument' | 'title' | 'narrative' | 'subtitle' | 'label' | 'mono' | 'body';
export type TextSlot =
  | 'center'
  | 'center-left'
  | 'upper-center'
  | 'lower-center'
  | 'lower-left'
  | 'lower-right'
  | 'upper-left'
  | 'anchor';

export interface TextBlockOptions {
  /** Single string, or explicit lines (monuments that must break deliberately). */
  text: string | readonly string[];
  style: TextStyle;
  slot?: TextSlot;
  align?: 'left' | 'center' | 'right';
  /** Light-pass / glow accent (any CSS colour). */
  accent?: string;
  /** CSS max-width, e.g. '28ch'. */
  maxWidth?: string;
  /** Monuments: auto-size so the longest line fits the viewport width (default true for monument). */
  fit?: boolean;
  /** Glyph emergence stagger 0..0.9 (default 0.5). */
  stagger?: number;
  className?: string;
  seed?: number;
}

export interface TextBlock {
  readonly el: HTMLElement;
  readonly text: string;
  readonly style: TextStyle;
  /** For slot 'anchor': world position to pin the block to (projected each frame). */
  anchor: Vector3 | null;
  /** Pixel offset applied after projection. */
  anchorOffset: { x: number; y: number };
  /** emerge: fog→ink 0..1 · dissolve: ink→ash 0..1 · sweep: light pass head 0..1 (negative = off). */
  set(emerge: number, dissolve?: number, sweep?: number): void;
  readonly emerge: number;
  readonly dissolve: number;
  /** Glyph spans (excluding spaces) in reading order, with their normalised index. */
  glyphs(): ReadonlyArray<{ el: HTMLElement; char: string; order: number }>;
  dispose(): void;
}

const ACCENT_FALLBACK = '200 214 255';

function cssColorToRgbTriplet(color: string): string {
  const probe = document.createElement('span');
  probe.style.color = color;
  probe.style.display = 'none';
  document.body.appendChild(probe);
  const rgb = getComputedStyle(probe).color;
  probe.remove();
  const m = rgb.match(/(\d+(?:\.\d+)?)[ ,]+(\d+(?:\.\d+)?)[ ,]+(\d+(?:\.\d+)?)/);
  return m ? `${m[1]} ${m[2]} ${m[3]}` : ACCENT_FALLBACK;
}

class Block implements TextBlock {
  readonly el: HTMLElement;
  readonly text: string;
  readonly style: TextStyle;
  anchor: Vector3 | null = null;
  anchorOffset = { x: 0, y: 0 };
  emerge = 0;
  dissolve = 0;
  private glyphList: Array<{ el: HTMLElement; char: string; order: number }> = [];
  private lastKey = '';
  private lines: readonly string[];

  constructor(
    private readonly layer: TextLayer,
    readonly opts: TextBlockOptions,
  ) {
    this.lines = typeof opts.text === 'string' ? [opts.text] : opts.text;
    this.text = this.lines.join(' ');
    this.style = opts.style;
    const el = document.createElement('div');
    el.className = `pz-block pz-${opts.style}${opts.className ? ` ${opts.className}` : ''}`;
    el.dataset.mode = layer.perChar ? 'char' : 'block';
    el.dataset.state = 'off';
    el.style.setProperty('--stg', String(opts.stagger ?? 0.5));
    el.style.setProperty('--accent', cssColorToRgbTriplet(opts.accent ?? 'rgb(200,214,255)'));
    el.style.textAlign = opts.align ?? (opts.slot === 'center-left' || opts.slot === 'lower-left' || opts.slot === 'upper-left' ? 'left' : 'center');
    if (opts.maxWidth) el.style.maxWidth = opts.maxWidth;
    this.el = el;
    this.build(opts.seed ?? this.text.length * 7919);
  }

  private build(seed: number): void {
    const r = rng(seed);
    const total = this.text.replace(/\s/g, '').length;
    let idx = 0;
    this.lines.forEach((line, li) => {
      const lineEl = document.createElement('span');
      lineEl.className = 'pz-line';
      const words = line.split(' ');
      words.forEach((word, wi) => {
        const w = document.createElement('span');
        w.className = 'pz-w';
        for (const ch of word) {
          const c = document.createElement('span');
          c.className = 'pz-c';
          c.textContent = ch;
          const order = total > 1 ? idx / (total - 1) : 0;
          c.style.setProperty('--i', order.toFixed(4));
          c.style.setProperty('--r1', (r.next() * 2 - 1).toFixed(3));
          c.style.setProperty('--r2', (0.4 + r.next() * 0.6).toFixed(3));
          w.appendChild(c);
          this.glyphList.push({ el: c, char: ch, order });
          idx++;
        }
        lineEl.appendChild(w);
        if (wi < words.length - 1) lineEl.appendChild(document.createTextNode(' '));
      });
      this.el.appendChild(lineEl);
      if (li < this.lines.length - 1) this.el.appendChild(document.createElement('br'));
    });
    this.el.setAttribute('aria-hidden', 'true');
  }

  /** Longest line in characters (for monument fitting). */
  get longestLine(): number {
    return this.lines.reduce((m, l) => Math.max(m, l.length), 0);
  }

  set(emerge: number, dissolve = 0, sweep = -1): void {
    const e = Math.min(1, Math.max(0, emerge));
    const d = Math.min(1, Math.max(0, dissolve));
    const s = this.layer.reducedMotion ? -1 : sweep;
    this.emerge = e;
    this.dissolve = d;
    const key = `${e.toFixed(4)}|${d.toFixed(4)}|${s.toFixed(3)}`;
    if (key === this.lastKey) return;
    this.lastKey = key;
    const st = this.el.style;
    st.setProperty('--e', e.toFixed(4));
    st.setProperty('--d', d.toFixed(4));
    st.setProperty('--s', (s < 0 ? -9 : s * 1.3 - 0.15).toFixed(4));
    const state = e <= 0.0005 || d >= 0.9995 ? 'off' : e >= 0.9995 && d <= 0.0005 && (s < 0 || s >= 1) ? 'resolved' : 'live';
    if (this.el.dataset.state !== state) this.el.dataset.state = state;
  }

  glyphs(): ReadonlyArray<{ el: HTMLElement; char: string; order: number }> {
    return this.glyphList;
  }

  dispose(): void {
    this.el.remove();
    this.layer.forget(this);
  }
}

export class TextLayer {
  private slots = new Map<TextSlot, HTMLElement>();
  private blocks = new Set<Block>();
  perChar = true;
  reducedMotion = false;
  private v = new Vector3();

  constructor(
    readonly root: HTMLElement,
    private readonly camera: PerspectiveCamera,
  ) {
    // Not aria-hidden: portals (real links) share these slots. Each decorative block hides itself.
    root.classList.add('pz-text-layer');
    window.addEventListener('resize', () => this.fitAll());
  }

  slot(name: TextSlot): HTMLElement {
    let el = this.slots.get(name);
    if (!el) {
      el = document.createElement('div');
      el.className = `pz-slot pz-slot--${name}`;
      this.root.appendChild(el);
      this.slots.set(name, el);
    }
    return el;
  }

  create(opts: TextBlockOptions): TextBlock {
    const b = new Block(this, opts);
    this.slot(opts.slot ?? 'center').appendChild(b.el);
    this.blocks.add(b);
    if (opts.style === 'monument' && opts.fit !== false) this.fit(b);
    return b;
  }

  /** Strongest emergence of any monument/title currently on screen (protects hero readability). */
  get heroPresence(): number {
    let m = 0;
    for (const b of this.blocks) {
      if (b.style === 'monument' || b.style === 'title' || b.style === 'narrative') m = Math.max(m, b.emerge * (1 - b.dissolve));
    }
    return m;
  }

  /** Project anchored blocks (call once per frame after the camera moved). */
  update(): void {
    const w = innerWidth;
    const h = innerHeight;
    for (const b of this.blocks) {
      if (!b.anchor || b.el.dataset.state === 'off') continue;
      this.v.copy(b.anchor).project(this.camera);
      const behind = this.v.z > 1;
      const x = (this.v.x * 0.5 + 0.5) * w + b.anchorOffset.x;
      const y = (-this.v.y * 0.5 + 0.5) * h + b.anchorOffset.y;
      b.el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -50%)`;
      b.el.style.visibility = behind ? 'hidden' : '';
    }
  }

  setQuality(perChar: boolean): void {
    this.perChar = perChar;
    for (const b of this.blocks) b.el.dataset.mode = perChar ? 'char' : 'block';
  }

  forget(b: Block): void {
    this.blocks.delete(b);
  }

  private fitAll(): void {
    for (const b of this.blocks) if (b.style === 'monument' && b.opts.fit !== false) this.fit(b);
  }

  private fit(b: Block): void {
    // T4 (92–140px) is the monument band; long names step down so they never crop.
    const [min, max] = TYPE.T4;
    const chars = Math.max(1, b.longestLine);
    const byWidth = (innerWidth * 0.84) / (chars * 0.66);
    const size = Math.max(Math.min(max, byWidth), Math.min(min * 0.42, byWidth));
    b.el.style.fontSize = `${size.toFixed(1)}px`;
  }
}
