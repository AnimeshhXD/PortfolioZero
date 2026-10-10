/**
 * InputDirector — pointer/touch → damped light vector (doc 4 §3, §7; doc 16 §2).
 * Mouse influence is film-like: delayed slightly, smooth, never jumpy. No cursor glow.
 */
import type { PointerState } from '../../types/scene';
import { damp } from '../../utils/math';

export class InputDirector {
  readonly pointer: PointerState = { x: 0, y: 0, active: false };
  private target = { x: 0, y: 0 };
  private disposers: Array<() => void> = [];
  /** Keyboard "light anchor" (doc 16 §2 accessibility alternative) — set by focus events. */
  private anchor: { x: number; y: number } | null = null;

  constructor() {
    const onMove = (e: PointerEvent) => {
      this.target.x = (e.clientX / innerWidth) * 2 - 1;
      this.target.y = -((e.clientY / innerHeight) * 2 - 1);
      this.pointer.active = true;
    };
    const onLeave = () => {
      this.pointer.active = false;
    };
    const onTouchEnd = () => {
      this.pointer.active = false;
    };
    const onFocusIn = (e: FocusEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t || !t.getBoundingClientRect) return;
      const r = t.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) return;
      this.anchor = { x: ((r.left + r.width / 2) / innerWidth) * 2 - 1, y: -(((r.top + r.height / 2) / innerHeight) * 2 - 1) };
    };
    const onFocusOut = () => {
      this.anchor = null;
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onMove, { passive: true });
    document.addEventListener('pointerleave', onLeave);
    window.addEventListener('blur', onLeave);
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', onFocusOut);
    this.disposers.push(
      () => window.removeEventListener('pointermove', onMove),
      () => window.removeEventListener('pointerdown', onMove),
      () => document.removeEventListener('pointerleave', onLeave),
      () => window.removeEventListener('blur', onLeave),
      () => window.removeEventListener('touchend', onTouchEnd),
      () => document.removeEventListener('focusin', onFocusIn),
      () => document.removeEventListener('focusout', onFocusOut),
    );
  }

  update(dt: number, reducedMotion: boolean): void {
    const tx = this.anchor ? this.anchor.x : this.pointer.active ? this.target.x : this.target.x * 0.6;
    const ty = this.anchor ? this.anchor.y : this.pointer.active ? this.target.y : this.target.y * 0.6;
    // ~90ms latency feel (doc 16 §2: 50–120ms); slower & smaller under reduced motion.
    const lambda = reducedMotion ? 2.5 : 6;
    this.pointer.x = damp(this.pointer.x, tx, lambda, dt);
    this.pointer.y = damp(this.pointer.y, ty, lambda, dt);
  }

  dispose(): void {
    for (const d of this.disposers) d();
    this.disposers = [];
  }
}
