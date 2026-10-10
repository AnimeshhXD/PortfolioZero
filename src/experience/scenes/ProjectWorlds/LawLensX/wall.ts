/**
 * The output glow wall (doc 2 §3 screenshots stage, doc 13 IMG-01) — no real screenshot exists, so it is
 * painted as in-world signage (Law 32) from resume strings only: the one readable "page of light" the
 * unreadable contract field resolves into. The SSE token stream lands on its left edge.
 */
import { drawRule, drawSignage, type SignageLine } from '../../../systems/ArchitectureViz';
import type { ProjectContent } from '../../../../content/projects';

/** Pull an exact substring out of a resume fact (throws in dev if the content changes under us). */
function phrase(source: string, needle: string): string {
  return source.includes(needle) ? needle : source;
}

export function makeWallPainter(project: ProjectContent): (ctx: CanvasRenderingContext2D, w: number, h: number) => void {
  const hybrid = project.facts.find((f) => f.startsWith('Hybrid')) ?? project.facts[0];
  const sse = project.facts.find((f) => f.includes('Server-Sent Events')) ?? project.facts[0];
  const signal = project.signals[0];
  const lines: SignageLine[] = [
    { text: phrase(sse, 'Real-time Server-Sent Events streaming'), style: 'label', x: 0.075, y: 0.15, size: 0.03, alpha: 0.62 },
    ...(signal
      ? ([
          { text: signal.value, style: 'value', x: 0.07, y: 0.41, size: 0.21, alpha: 0.98 },
          { text: signal.label, style: 'label', x: 0.077, y: 0.6, size: 0.034, alpha: 0.86 },
        ] as SignageLine[])
      : []),
    { text: phrase(hybrid, 'Hybrid analysis'), style: 'label', x: 0.077, y: 0.75, size: 0.028, alpha: 0.7 },
    { text: phrase(hybrid, 'deterministic rules plus LLM contextual reasoning'), style: 'mono', x: 0.075, y: 0.825, size: 0.036, alpha: 0.82 },
  ];

  return (ctx, w, h) => {
    // faint luminous field (the wall itself), brighter toward where the stream lands
    const g = ctx.createRadialGradient(w * 0.18, h * 0.5, h * 0.05, w * 0.4, h * 0.5, w * 0.75);
    g.addColorStop(0, 'rgba(120, 200, 235, 0.30)');
    g.addColorStop(0.55, 'rgba(70, 120, 190, 0.16)');
    g.addColorStop(1, 'rgba(40, 60, 120, 0.06)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    drawRule(ctx, w, h, 0.075, 0.235, 0.52, '#cfe9ff', 0.32);
    drawRule(ctx, w, h, 0.075, 0.69, 0.52, '#cfe9ff', 0.22);
    drawSignage(ctx, w, h, lines);
  };
}
