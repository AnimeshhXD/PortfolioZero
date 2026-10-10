/**
 * AccessibilityDirector — reduced motion, keyboard direction, skip link (doc 4 §6, §8, §9; doc 17 §8).
 * Keyboard never opens menus: it only moves the director timeline between readable holds.
 */
import type { ScrollDirector } from './ScrollDirector';

const STORAGE_KEY = 'pz-motion';

export class AccessibilityDirector {
  private media = matchMedia('(prefers-reduced-motion: reduce)');
  private override: 'reduced' | 'full' | null = null;
  private listeners = new Set<(reduced: boolean) => void>();
  private disposers: Array<() => void> = [];
  /** Called when the visitor asks to skip to the ending (skip link / End). */
  onSkipToEnding: (() => void) | null = null;

  constructor(private readonly scroll: ScrollDirector) {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'reduced' || stored === 'full') this.override = stored;
    } catch {
      this.override = null;
    }
    const params = new URLSearchParams(location.search);
    const forced = params.get('motion');
    if (forced === 'reduced' || forced === 'full') this.override = forced;

    const onMedia = () => this.emit();
    this.media.addEventListener('change', onMedia);
    this.disposers.push(() => this.media.removeEventListener('change', onMedia));

    const onKey = (e: KeyboardEvent) => this.onKey(e);
    window.addEventListener('keydown', onKey);
    this.disposers.push(() => window.removeEventListener('keydown', onKey));
    this.applyClass();
  }

  get reducedMotion(): boolean {
    if (this.override) return this.override === 'reduced';
    return this.media.matches;
  }

  setReducedMotion(reduced: boolean): void {
    this.override = reduced ? 'reduced' : 'full';
    try {
      localStorage.setItem(STORAGE_KEY, this.override);
    } catch {
      /* storage unavailable — preference lasts for this visit only */
    }
    this.emit();
  }

  onChange(cb: (reduced: boolean) => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private emit(): void {
    this.applyClass();
    for (const cb of this.listeners) cb(this.reducedMotion);
  }

  private applyClass(): void {
    document.documentElement.classList.toggle('pz-reduced', this.reducedMotion);
  }

  private onKey(e: KeyboardEvent): void {
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
    const el = e.target as HTMLElement | null;
    if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;
    const reduced = this.reducedMotion;
    switch (e.key) {
      case 'ArrowDown':
      case 'PageDown':
        e.preventDefault();
        this.scroll.step(1, reduced);
        break;
      case 'ArrowUp':
      case 'PageUp':
        e.preventDefault();
        this.scroll.step(-1, reduced);
        break;
      case 'Home':
        e.preventDefault();
        this.scroll.travelTo(0, reduced);
        break;
      case 'End':
        e.preventDefault();
        if (this.onSkipToEnding) this.onSkipToEnding();
        else this.scroll.travelTo(this.scroll.total, reduced);
        break;
      case 'Escape':
        this.scroll.settle();
        break;
      default:
        break;
    }
  }

  dispose(): void {
    for (const d of this.disposers) d();
    this.disposers = [];
  }
}
