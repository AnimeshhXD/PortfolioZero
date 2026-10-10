/**
 * In-world signage painter for HoloPlane canvases (Law 32: "Any UI-like text must be treated as
 * in-world signage"). Uses the project's type system so hologram text matches the DOM layer.
 * Draw ONLY resume-sourced strings.
 */

export interface SignageLine {
  text: string;
  /** label: Inter caps tracking · mono: JetBrains Mono · title: Sora · value: Sora light large */
  style: 'label' | 'mono' | 'title' | 'value';
  /** Normalised position (0..1) of the text anchor. */
  x: number;
  y: number;
  /** Size relative to canvas height (e.g. 0.05). */
  size: number;
  align?: CanvasTextAlign;
  color?: string;
  alpha?: number;
}

const FAMILIES: Record<SignageLine['style'], { family: string; weight: number; tracking: number; upper: boolean }> = {
  label: { family: "'Inter Variable', Inter, system-ui, sans-serif", weight: 500, tracking: 0.26, upper: true },
  mono: { family: "'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace", weight: 400, tracking: 0.02, upper: false },
  title: { family: "'Sora Variable', Sora, system-ui, sans-serif", weight: 600, tracking: -0.01, upper: false },
  value: { family: "'Sora Variable', Sora, system-ui, sans-serif", weight: 300, tracking: -0.02, upper: false },
};

export function drawSignage(ctx: CanvasRenderingContext2D, w: number, h: number, lines: readonly SignageLine[]): void {
  for (const line of lines) {
    const f = FAMILIES[line.style];
    const px = Math.round(line.size * h);
    ctx.save();
    ctx.font = `${f.weight} ${px}px ${f.family}`;
    // letterSpacing is supported in modern Chromium/Safari/Firefox canvases; harmless elsewhere.
    (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = `${(f.tracking * px).toFixed(1)}px`;
    ctx.textAlign = line.align ?? 'left';
    ctx.textBaseline = 'middle';
    ctx.globalAlpha = line.alpha ?? 1;
    ctx.fillStyle = line.color ?? '#e8ebf2';
    ctx.fillText(f.upper ? line.text.toUpperCase() : line.text, line.x * w, line.y * h);
    ctx.restore();
  }
}

/** Thin rule (in-world engraving), normalised coords. */
export function drawRule(ctx: CanvasRenderingContext2D, w: number, h: number, x0: number, y: number, x1: number, color = '#e8ebf2', alpha = 0.25): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1, h * 0.002);
  ctx.beginPath();
  ctx.moveTo(x0 * w, y * h);
  ctx.lineTo(x1 * w, y * h);
  ctx.stroke();
  ctx.restore();
}
