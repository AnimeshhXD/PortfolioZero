/**
 * ScrollDirector — "Scroll is a director timeline" (doc 4 §2).
 *
 * Native scroll over an invisible track drives a timeline measured in vh-units:
 *   [scene 0][tx][scene 1][tx] … [scene N]
 * Content never translates. Progress is damped with a per-segment maximum rate, so fast scrolling
 * still plays every beat (doc 4 §2.3), and jumps longer than a few segments become a fog "cut"
 * with cinematic catch-up (doc 4 §6 Home/End).
 */
import { clamp, damp } from '../../utils/math';

export type SegmentKind = 'scene' | 'tx';

export interface Segment {
  kind: SegmentKind;
  /** Scene index (for tx: the OUTGOING scene). */
  index: number;
  start: number;
  end: number;
}

export interface Located {
  segment: Segment;
  segmentIndex: number;
  /** 0..1 within the segment. */
  local: number;
}

export interface ScrollBandInput {
  band: number;
  holds: readonly number[];
}

/** Max timeline speed (vh-units per second) — the floor on how long a beat can take. */
const MAX_RATE: Record<SegmentKind, number> = { scene: 80, tx: 34 };
/** Distance (units) beyond which a jump becomes a fog cut rather than a long glide. */
const CUT_THRESHOLD = 520;
/** Total cut duration (s): fog up → reposition → fog down (D-cut band). */
const CUT_DURATION = 2.4;

export class ScrollDirector {
  readonly segments: Segment[] = [];
  readonly total: number;
  /** Global hold points (units). */
  readonly holds: number[] = [];
  /** Damped timeline position (units). */
  position = 0;
  /** Raw target from scroll (units). */
  target = 0;
  /** Damped velocity (units/s). */
  velocity = 0;
  /** 0..1 fog envelope while a cut is in progress. */
  cut = 0;

  private vh = innerHeight;
  private cutTimer = -1;
  private cutDestination = 0;
  private cutSnapped = false;
  private autoplay = { active: false, elapsed: 0, delay: 0, duration: 20 };
  private userIntent = false;
  private disposers: Array<() => void> = [];

  constructor(
    bands: readonly ScrollBandInput[],
    readonly txBand: number,
    private readonly track: HTMLElement,
  ) {
    let cursor = 0;
    bands.forEach((b, i) => {
      this.segments.push({ kind: 'scene', index: i, start: cursor, end: cursor + b.band });
      for (const h of b.holds) this.holds.push(cursor + h * b.band);
      cursor += b.band;
      if (i < bands.length - 1) {
        this.segments.push({ kind: 'tx', index: i, start: cursor, end: cursor + txBand });
        cursor += txBand;
      }
    });
    this.total = cursor;
    this.layout();

    const onResize = () => this.onResize();
    const markIntent = () => {
      this.userIntent = true;
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('wheel', markIntent, { passive: true });
    window.addEventListener('touchmove', markIntent, { passive: true });
    this.disposers.push(
      () => window.removeEventListener('resize', onResize),
      () => window.removeEventListener('wheel', markIntent),
      () => window.removeEventListener('touchmove', markIntent),
    );
  }

  /* ───────────── layout ───────────── */

  private layout(): void {
    this.track.style.height = `${(this.total / 100) * this.vh + innerHeight}px`;
  }

  private onResize(): void {
    // Mobile URL-bar resizes change innerHeight by small amounts — ignore those to avoid jumps.
    const coarse = matchMedia('(pointer: coarse)').matches;
    const next = innerHeight;
    if (coarse && Math.abs(next - this.vh) / this.vh < 0.25) return;
    const units = this.target;
    this.vh = next;
    this.layout();
    window.scrollTo({ top: this.unitsToPx(units), behavior: 'instant' });
  }

  unitsToPx(units: number): number {
    return (units / 100) * this.vh;
  }

  pxToUnits(px: number): number {
    return (px / this.vh) * 100;
  }

  /* ───────────── queries ───────────── */

  locate(units: number): Located {
    const u = clamp(units, 0, this.total);
    for (let i = 0; i < this.segments.length; i++) {
      const s = this.segments[i];
      if (u <= s.end || i === this.segments.length - 1) {
        const len = s.end - s.start;
        return { segment: s, segmentIndex: i, local: len > 0 ? clamp((u - s.start) / len) : 0 };
      }
    }
    const last = this.segments[this.segments.length - 1];
    return { segment: last, segmentIndex: this.segments.length - 1, local: 1 };
  }

  sceneStart(index: number): number {
    return this.segments.find((s) => s.kind === 'scene' && s.index === index)?.start ?? 0;
  }

  sceneUnits(index: number, local: number): number {
    const s = this.segments.find((x) => x.kind === 'scene' && x.index === index);
    if (!s) return 0;
    return s.start + clamp(local) * (s.end - s.start);
  }

  /* ───────────── autoplay (Scene 0 first load, doc 6 §2 "~20s or scroll-completed equivalent") ───────────── */

  startAutoplay(duration: number, delay: number): void {
    this.autoplay = { active: true, elapsed: 0, delay, duration };
  }

  stopAutoplay(): void {
    this.autoplay.active = false;
  }

  get autoplaying(): boolean {
    return this.autoplay.active;
  }

  /* ───────────── navigation ───────────── */

  /** Smoothly travel to a unit position (keyboard stepping, skip links). Long jumps become fog cuts. */
  travelTo(units: number, reducedMotion: boolean): void {
    this.stopAutoplay();
    const dest = clamp(units, 0, this.total);
    if (Math.abs(dest - this.position) > CUT_THRESHOLD) {
      this.beginCut(dest);
      return;
    }
    window.scrollTo({ top: this.unitsToPx(dest), behavior: reducedMotion ? 'instant' : 'smooth' });
  }

  /** Next/previous readable hold relative to where the viewer is heading. */
  step(direction: 1 | -1, reducedMotion: boolean): void {
    const from = this.cutTimer >= 0 ? this.cutDestination : this.target;
    const eps = 2;
    const next =
      direction > 0 ? this.holds.find((h) => h > from + eps) : [...this.holds].reverse().find((h) => h < from - eps);
    if (next === undefined) {
      this.travelTo(direction > 0 ? this.total : 0, reducedMotion);
      return;
    }
    this.travelTo(next, reducedMotion);
  }

  /** Debug/seek: jump instantly, no damping. */
  seek(units: number): void {
    this.stopAutoplay();
    this.cutTimer = -1;
    this.cut = 0;
    this.position = this.target = clamp(units, 0, this.total);
    this.velocity = 0;
    window.scrollTo({ top: this.unitsToPx(this.position), behavior: 'instant' });
  }

  /** Esc: settle — cancel cuts/autoplay/smooth scrolls and hold where we are (doc 4 §6). */
  settle(): void {
    this.stopAutoplay();
    if (this.cutTimer >= 0 && !this.cutSnapped) {
      this.cutTimer = -1;
      this.cut = 0;
    }
    window.scrollTo({ top: this.unitsToPx(this.position), behavior: 'instant' });
  }

  private beginCut(dest: number): void {
    this.cutTimer = 0;
    this.cutDestination = dest;
    this.cutSnapped = false;
  }

  /* ───────────── per-frame ───────────── */

  update(dt: number, reducedMotion: boolean): void {
    const scrollUnits = this.pxToUnits(window.scrollY);

    // Autoplay floor: Scene 0 plays itself on first load; the scrollbar follows so input stays consistent.
    if (this.autoplay.active) {
      if (this.userIntent && scrollUnits > this.autoplayFloor() + 4) {
        this.autoplay.active = false;
      } else {
        this.autoplay.elapsed += dt;
        const floor = this.autoplayFloor();
        if (scrollUnits < floor - 1) window.scrollTo({ top: this.unitsToPx(floor), behavior: 'instant' });
        if (this.autoplay.elapsed - this.autoplay.delay >= this.autoplay.duration) this.autoplay.active = false;
      }
    }

    // Fog cut (Home/End / long jumps).
    if (this.cutTimer >= 0) {
      this.cutTimer += dt;
      const half = (reducedMotion ? CUT_DURATION * 0.7 : CUT_DURATION) / 2;
      if (this.cutTimer < half) {
        this.cut = this.cutTimer / half;
      } else {
        if (!this.cutSnapped) {
          this.cutSnapped = true;
          // Land slightly before the destination so the last stretch is played, not skipped.
          const seg = this.locate(this.cutDestination).segment;
          const lead = Math.max(seg.start, this.cutDestination - 60);
          this.position = lead;
          window.scrollTo({ top: this.unitsToPx(this.cutDestination), behavior: 'instant' });
        }
        this.cut = Math.max(0, 1 - (this.cutTimer - half) / half);
        if (this.cutTimer >= half * 2) {
          this.cutTimer = -1;
          this.cut = 0;
        }
      }
    }

    this.target = Math.max(this.pxToUnits(window.scrollY), this.autoplay.active ? this.autoplayFloor() : 0);

    if (this.cutTimer >= 0 && !this.cutSnapped) {
      // Hold position while the fog rises.
      this.velocity = damp(this.velocity, 0, 6, dt);
      return;
    }

    const prev = this.position;
    const kind = this.locate(this.position).segment.kind;
    const maxStep = MAX_RATE[kind] * (reducedMotion ? 0.8 : 1) * dt;
    const desired = damp(this.position, this.target, reducedMotion ? 3.2 : 4.2, dt) - this.position;
    this.position += clamp(desired, -maxStep, maxStep);
    if (Math.abs(this.target - this.position) < 0.01) this.position = this.target;
    this.velocity = damp(this.velocity, dt > 0 ? (this.position - prev) / dt : 0, 5, dt);
  }

  private autoplayFloor(): number {
    const seg = this.segments[0];
    const t = clamp((this.autoplay.elapsed - this.autoplay.delay) / this.autoplay.duration);
    return seg.start + t * (seg.end - seg.start);
  }

  dispose(): void {
    for (const d of this.disposers) d();
    this.disposers = [];
  }
}
