/**
 * U-01 Portal Frame — cinematic doorways (doc 13 §6, doc 16 §4–5, §10).
 * Real <a> elements (keyboard reachable, Enter/Space activation) styled as in-world signage:
 * no big buttons, no UI hover colour swaps — glow intensifies, the frame resolves, fog thins.
 * A portal is inert (unfocusable) until its scene brings it on stage.
 */
import type { TextLayer, TextSlot } from './CinematicTextLayer';

export interface PortalOptions {
  label: string;
  href: string;
  /** Opens in a new tab (default true for http links). */
  external?: boolean;
  slot?: TextSlot;
  /** Portals sharing a group key in the same slot sit on one row. */
  group?: string;
  /** Accessible description, e.g. "LawLens-X source repository on GitHub". */
  description?: string;
  /** Glow accent (any CSS colour). */
  accent?: string;
}

export interface Portal {
  readonly el: HTMLAnchorElement;
  /** 0..1 — fades the portal in (in-world style) and makes it focusable above 0.5. */
  setPresence(v: number): void;
  readonly hovered: boolean;
  dispose(): void;
}

class PortalImpl implements Portal {
  readonly el: HTMLAnchorElement;
  private hover = false;
  private presence = -1;

  constructor(opts: PortalOptions) {
    const a = document.createElement('a');
    a.className = 'pz-portal';
    a.href = opts.href;
    const external = opts.external ?? /^https?:/.test(opts.href);
    if (external) {
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
    }
    a.setAttribute('aria-label', opts.description ?? opts.label);
    if (opts.accent) a.style.setProperty('--portal-accent', opts.accent);
    const frame = document.createElement('span');
    frame.className = 'pz-portal__frame';
    frame.setAttribute('aria-hidden', 'true');
    const label = document.createElement('span');
    label.className = 'pz-portal__label';
    label.textContent = opts.label;
    a.append(frame, label);
    const on = () => {
      this.hover = true;
    };
    const off = () => {
      this.hover = false;
    };
    a.addEventListener('pointerenter', on);
    a.addEventListener('pointerleave', off);
    a.addEventListener('focus', on);
    a.addEventListener('blur', off);
    a.addEventListener('click', () => {
      a.classList.remove('is-activated');
      void a.offsetWidth;
      a.classList.add('is-activated');
      window.setTimeout(() => a.classList.remove('is-activated'), 700);
    });
    this.el = a;
    this.setPresence(0);
  }

  get hovered(): boolean {
    return this.hover;
  }

  setPresence(v: number): void {
    const p = Math.round(Math.min(1, Math.max(0, v)) * 1000) / 1000;
    if (p === this.presence) return;
    this.presence = p;
    this.el.style.setProperty('--p', String(p));
    const live = p > 0.5;
    if (live) {
      this.el.removeAttribute('inert');
      this.el.removeAttribute('tabindex');
    } else {
      this.el.setAttribute('inert', '');
      this.el.setAttribute('tabindex', '-1');
      if (document.activeElement === this.el) this.el.blur();
    }
    this.el.dataset.state = p <= 0.001 ? 'off' : live ? 'live' : 'resolving';
  }

  dispose(): void {
    const row = this.el.parentElement;
    this.el.remove();
    if (row && row.classList.contains('pz-portal-row') && row.childElementCount === 0) row.remove();
  }
}

export class PortalLayer {
  private rows = new Map<string, HTMLElement>();

  constructor(
    private readonly root: HTMLElement,
    private readonly text: TextLayer,
  ) {
    root.classList.add('pz-portal-layer');
  }

  create(opts: PortalOptions): Portal {
    const p = new PortalImpl(opts);
    const slotName = opts.slot ?? 'lower-center';
    const key = `${slotName}::${opts.group ?? '_'}`;
    let row = this.rows.get(key);
    if (!row || !row.isConnected) {
      row = document.createElement('div');
      row.className = 'pz-portal-row';
      // Portals live in the same slot stacks as text so they align with the dossier (doc 14 §3 optical axis).
      const host = this.text.slot(slotName);
      host.appendChild(row);
      this.rows.set(key, row);
    }
    row.appendChild(p.el);
    return p;
  }

  /** The layer root (focus management). */
  get element(): HTMLElement {
    return this.root;
  }
}
