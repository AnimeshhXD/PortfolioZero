/**
 * MinimalOverlay — the only persistent "UI", treated as in-world signage (doc 10 §15):
 *  · a micro motion toggle (reduced-motion control; accessibility, not navigation)
 *  · a breathing scroll cue that appears only once the boot sequence has settled
 * No navbar, no progress bar, no CTA.
 */
import type { AccessibilityDirector } from '../orchestration/AccessibilityDirector';

export interface OverlayState {
  sceneId: string;
  progress: number;
  autoplaying: boolean;
  idleSeconds: number;
}

export class MinimalOverlay {
  private motion: HTMLButtonElement;
  private cue: HTMLElement;
  private cueOn = false;

  constructor(
    root: HTMLElement,
    private readonly a11y: AccessibilityDirector,
  ) {
    root.classList.add('pz-overlay');

    this.motion = document.createElement('button');
    this.motion.type = 'button';
    this.motion.className = 'pz-motion-toggle';
    this.motion.addEventListener('click', () => this.a11y.setReducedMotion(!this.a11y.reducedMotion));
    root.appendChild(this.motion);
    this.renderMotion();
    a11y.onChange(() => this.renderMotion());

    this.cue = document.createElement('div');
    this.cue.className = 'pz-scroll-cue';
    this.cue.setAttribute('aria-hidden', 'true');
    const label = document.createElement('span');
    label.textContent = 'Scroll';
    const line = document.createElement('i');
    this.cue.append(label, line);
    root.appendChild(this.cue);
  }

  private renderMotion(): void {
    const reduced = this.a11y.reducedMotion;
    this.motion.textContent = reduced ? 'Motion · Reduced' : 'Motion · Full';
    this.motion.setAttribute('aria-pressed', String(reduced));
    this.motion.setAttribute('aria-label', reduced ? 'Reduced motion is on. Activate for full motion.' : 'Full motion is on. Activate to reduce motion.');
  }

  update(s: OverlayState): void {
    const show = s.sceneId === 'boot' && s.progress > 0.96 && !s.autoplaying && s.idleSeconds > 1.2;
    if (show !== this.cueOn) {
      this.cueOn = show;
      this.cue.classList.toggle('is-on', show);
    }
  }
}
