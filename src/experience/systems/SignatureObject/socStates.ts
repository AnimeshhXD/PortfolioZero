/**
 * SOC-0 … SOC-8 property table (doc 14 §2). Implementation contract (doc 14 §5):
 *   archetype  = Neural Core Monolith (faceted spindle lens; silhouette constant across states)
 *   channels   = procedural internal emission patterns that ACCUMULATE as the journey grows
 *                [clause segments, triage chambers, deterministic rails, eligibility web, kernel seams, memory ribbon]
 *   materials  = stone ↔ dark alloy ↔ energy glass blend weights (art bible §3 mapped to one shader)
 */

export interface SocParams {
  /** Canonical scale relative to frame (doc 14 "Scale"). */
  scale: number;
  glass: number;
  metal: number;
  stone: number;
  /** Core emission (×EMISSION token supplied by the scene). */
  core: number;
  /** Facet seam emission. */
  seam: number;
  /** Channel weights: clause, triage, rails, web, kernel, ribbon. */
  channels: readonly [number, number, number, number, number, number];
  /** Internal light rotation speed (rad/s) — "very slow". */
  spin: number;
  /** Breathing pulse depth. */
  breath: number;
}

export const SOC: readonly SocParams[] = [
  // SOC-0 QUIET SEED — near-black stone core, faint internal emission, ultra-slow breathing.
  { scale: 0.42, glass: 0.05, metal: 0.1, stone: 0.9, core: 0.35, seam: 0.0, channels: [0, 0, 0, 0, 0, 0], spin: 0.02, breath: 0.35 },
  // SOC-1 AWAKEN — dark alloy, faint glassy inner volume, cool blue-violet response.
  { scale: 0.62, glass: 0.22, metal: 0.72, stone: 0.2, core: 0.5, seam: 0.12, channels: [0, 0, 0, 0, 0, 0], spin: 0.035, breath: 0.25 },
  // SOC-2 CONTRACT LATTICE — semi-transparent energy shell, clause-like internal segments.
  { scale: 0.74, glass: 0.78, metal: 0.25, stone: 0.0, core: 0.85, seam: 0.3, channels: [1, 0, 0, 0, 0, 0], spin: 0.04, breath: 0.2 },
  // SOC-3 TRIAGE THRESHOLD CORE — three threshold chambers, soft volumetric glow.
  { scale: 0.82, glass: 0.62, metal: 0.3, stone: 0.05, core: 0.95, seam: 0.3, channels: [0.55, 1, 0, 0, 0, 0], spin: 0.04, breath: 0.22 },
  // SOC-4 DETERMINISTIC RAILS NUCLEUS — brushed metal exterior, energy underlayer, aligned rails.
  { scale: 0.88, glass: 0.28, metal: 0.92, stone: 0.05, core: 0.8, seam: 0.5, channels: [0.35, 0.45, 1, 0, 0, 0], spin: 0.03, breath: 0.12 },
  // SOC-5 ELIGIBILITY WEB HEART — stone/paper matte outer, warm inner paths.
  { scale: 0.92, glass: 0.25, metal: 0.35, stone: 0.6, core: 0.9, seam: 0.38, channels: [0.3, 0.35, 0.55, 1, 0, 0], spin: 0.03, breath: 0.18 },
  // SOC-6 HARDENED KERNEL MONOLITH — steel/stone, seams become barrier lines, motion nearly stops.
  { scale: 1.04, glass: 0.12, metal: 0.88, stone: 0.62, core: 0.55, seam: 0.85, channels: [0.2, 0.3, 0.5, 0.55, 1, 0], spin: 0.008, breath: 0.05 },
  // SOC-7 MEMORY COMPRESSION RIBBON — soft energy-liquid blend, continuous ribbon.
  { scale: 0.95, glass: 0.55, metal: 0.42, stone: 0.2, core: 0.95, seam: 0.5, channels: [0.2, 0.28, 0.4, 0.5, 0.6, 1], spin: 0.025, breath: 0.15 },
  // SOC-8 COMPLETED IDENTITY SCULPTURE — hardened outer + controlled inner energy, near-static.
  { scale: 1.0, glass: 0.38, metal: 0.72, stone: 0.38, core: 0.78, seam: 0.62, channels: [0.14, 0.22, 0.16, 0.3, 0.26, 0.62], spin: 0.012, breath: 0.08 },
];

/** Interpolated params for a fractional SOC value. */
export function socAt(soc: number, out: { -readonly [K in keyof SocParams]: SocParams[K] extends readonly number[] ? number[] : number }): void {
  const s = Math.min(SOC.length - 1, Math.max(0, soc));
  const i = Math.min(SOC.length - 2, Math.floor(s));
  const t = s - i;
  const a = SOC[i];
  const b = SOC[i + 1];
  const l = (x: number, y: number) => x + (y - x) * t;
  out.scale = l(a.scale, b.scale);
  out.glass = l(a.glass, b.glass);
  out.metal = l(a.metal, b.metal);
  out.stone = l(a.stone, b.stone);
  out.core = l(a.core, b.core);
  out.seam = l(a.seam, b.seam);
  for (let k = 0; k < 6; k++) out.channels[k] = l(a.channels[k], b.channels[k]);
  out.spin = l(a.spin, b.spin);
  out.breath = l(a.breath, b.breath);
}
