/**
 * IMG-01 screenshot stage for Triage (no real capture exists): in-world MEDICAL SIGNAGE showing the
 * triage outcome — three priority rows, each with its shape + word (Law 36: never colour alone),
 * under the resume phrase "recommended actions … risk scores". Drawn once onto a HoloPlane canvas.
 */
import { drawRule, drawSignage, type SignageLine } from '../../../systems/ArchitectureViz';
import type { Threshold, ThresholdShape } from './layout';

/**
 * Resume bullet: "rule-based clinical reasoning engine returning triage level (Red/Yellow/Green),
 * recommended actions, and risk scores" (résumé). content/projects.ts condenses it to
 * "with actions and risk scores"; the board uses the resume's own two nouns.
 */
export const BOARD_HEADING = 'Recommended actions · Risk scores';

function strokeShape(ctx: CanvasRenderingContext2D, shape: ThresholdShape, x: number, y: number, r: number): void {
  ctx.beginPath();
  if (shape === 'circle') {
    ctx.arc(x, y, r, 0, Math.PI * 2);
  } else if (shape === 'triangle') {
    for (let i = 0; i < 3; i++) {
      const a = -Math.PI / 2 + (i / 3) * Math.PI * 2;
      const px = x + Math.cos(a) * r * 1.18;
      const py = y + Math.sin(a) * r * 1.18 + r * 0.16;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  } else {
    const s = r * 0.86;
    ctx.rect(x - s, y - s, s * 2, s * 2);
  }
  ctx.stroke();
}

/** Rows in triage priority order: RED, YELLOW, GREEN. */
export function drawTriageBoard(ctx: CanvasRenderingContext2D, w: number, h: number, thresholds: readonly Threshold[]): void {
  const order: Threshold['word'][] = ['RED', 'YELLOW', 'GREEN'];
  const rows = order.map((word) => thresholds.find((t) => t.word === word)).filter((t): t is Threshold => !!t);

  const lines: SignageLine[] = [{ text: BOARD_HEADING, style: 'label', x: 0.5, y: 0.15, size: 0.052, align: 'center', color: '#d6efe3', alpha: 0.78 }];
  rows.forEach((t, i) => {
    lines.push({ text: t.word, style: 'label', x: 0.445, y: 0.42 + i * 0.19, size: 0.1, align: 'left', color: t.color, alpha: 0.95 });
  });
  drawSignage(ctx, w, h, lines);
  drawRule(ctx, w, h, 0.24, 0.26, 0.76, '#d6efe3', 0.22);

  ctx.save();
  ctx.lineWidth = Math.max(2, h * 0.011);
  ctx.lineJoin = 'miter';
  rows.forEach((t, i) => {
    ctx.strokeStyle = t.color;
    ctx.globalAlpha = 0.95;
    strokeShape(ctx, t.shape, 0.39 * w, (0.42 + i * 0.19) * h, h * 0.05);
  });
  ctx.restore();
  // faint row rules: signage engraving, not a table
  for (let i = 0; i < rows.length - 1; i++) drawRule(ctx, w, h, 0.34, 0.515 + i * 0.19, 0.66, '#d6efe3', 0.08);
}
