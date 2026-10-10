/**
 * PROJECT ZERO — Design Token System (doc 7).
 * Every colour, blur, glow, fog density, duration and easing in the experience must come from here.
 * "Are there any freeform colors/blur/durations? If yes, replace with tokens." (doc 7 §13)
 */

/* ───────────── §1 Spacing (px) ───────────── */
export const SPACE = { S0: 0, S1: 8, S2: 16, S3: 24, S4: 32, S5: 48, S6: 64, S7: 96, S8: 128, S9: 192 } as const;

/* ───────────── §2 Typography scale (px ranges → CSS clamp) ───────────── */
export const TYPE = {
  T1: [12, 14],
  T2: [16, 22],
  T3: [48, 80],
  T4: [92, 140],
} as const;

/* ───────────── §3 Colour ───────────── */
export const NEUTRAL = {
  N0: '#07080c',
  N0b: '#0a0b10',
  N1: '#1b1c22',
  N2: '#2a2c35',
  /** Ink — typography is never pure white on pure black (doc 1 §5.7). */
  ink: '#e8ebf2',
  inkSoft: '#aeb4c2',
  inkDim: '#6d7385',
} as const;

/** Global accent families (doc 1 §5.2). Hex values are sRGB. */
export const ACCENT = {
  cyan: '#46cbe0',
  deepCyan: '#1d7f9e',
  deepBlue: '#1f3c8a',
  violet: '#8a6cff',
  orchid: '#b48cff',
  electricBlue: '#4c7dff',
  emerald: '#2fcf98',
  amber: '#f0ad4c',
  red: '#ee5148',
  rose: '#f08aa6',
  steel: '#9aa6b8',
  warmWhite: '#ffe3c6',
  coolWhite: '#d6e2ff',
} as const;

export type AccentName = keyof typeof ACCENT;

/* ───────────── §4 Opacity ───────────── */
export const OPACITY = { O0: 0, O10: 0.1, O25: 0.25, O40: 0.4, O60: 0.6, O75: 0.75, O90: 0.9, O100: 1 } as const;

/* ───────────── §5 Blur (DOM px) ───────────── */
export const BLUR = { B0: 0, B1: 2, B2: 8, B3: 18 } as const;

/* ───────────── §6 Glow / emission ───────────── */
/** Bloom strength per glow level. */
export const GLOW = { G0: 0, G1: 0.32, G2: 0.62, G3: 0.95 } as const;
/** Emissive multipliers for materials per glow level (HDR, >1 feeds bloom). */
export const EMISSION = { G0: 0, G1: 0.6, G2: 1.25, G3: 2.2 } as const;

/* ───────────── §7 Fog density (FogExp2 density in world units ≈ metres) ───────────── */
export const FOG = { F0: 0.0, F1: 0.01, F2: 0.028, F3: 0.085 } as const;
/** Fog curtain (camera-attached volume planes) opacity per fog token. */
export const CURTAIN = { F0: 0, F1: 0.04, F2: 0.22, F3: 0.96 } as const;

/* ───────────── §9 Particles ───────────── */
export const PARTICLE = {
  /** density = fraction of the mote pool visible; speed = drift units/s */
  P1: { density: 0.32, speed: 0.22 },
  P2: { density: 0.55, speed: 0.15 },
  P3: { density: 0.85, speed: 0.38 },
  P4: { density: 0.7, speed: 0.6 },
} as const;

/* ───────────── §10 Animation ───────────── */
/** Duration bands in seconds (doc 5 §2.1). */
export const DURATION = {
  micro: [0.4, 0.9],
  medium: [1.0, 2.2],
  cut: [2.2, 4.0],
  hold: [2.0, 6.0],
} as const;

/** CSS easing equivalents (E-easeOutPremium / E-softEaseIn). */
export const EASE_CSS = {
  easeOutPremium: 'cubic-bezier(0.16, 1, 0.3, 1)',
  softEaseIn: 'cubic-bezier(0.45, 0, 0.75, 0.3)',
} as const;

/* ───────────── §11 Depth anchors (render order) ───────────── */
export const DEPTH = { back: -100, mid: 0, hero: 10, front: 20, curtain: 30, lens: 50 } as const;

/* ───────────── §12 Transitions ───────────── */
export type TransitionKind = 'absorb' | 'dissolve' | 'collapse';
export const TRANSITION = {
  absorb: { signaturePull: 1.0, curtain: 0.9, passage: 0.25, bloom: GLOW.G2 },
  dissolve: { signaturePull: 0.35, curtain: 1.0, passage: 0.15, bloom: GLOW.G1 },
  collapse: { signaturePull: 0.6, curtain: 0.75, passage: 1.0, bloom: GLOW.G1 },
} as const satisfies Record<TransitionKind, { signaturePull: number; curtain: number; passage: number; bloom: number }>;

/* ───────────── Lens bands (doc 3 §2.1) ───────────── */
export const LENS = {
  wide: 24,
  mid: 35,
  hero: 50,
  close: 85,
} as const;

/** Colour temperatures (doc 12 §1) mapped to sRGB tints. */
export const TEMPERATURE = {
  cool6500: '#dfe8ff',
  cool5400: '#e7edff',
  neutral4800: '#f4f1ec',
  warm3800: '#ffd9b0',
  warm3500: '#ffd0a0',
} as const;
