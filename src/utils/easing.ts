/**
 * Easing tokens (doc 7 §10, doc 5 §2.2): premium deceleration, soft ease-in, no elastic/bounce.
 * Each maps t∈[0,1] → [0,1].
 */

export type Ease = (t: number) => number;

export const linear: Ease = (t) => t;

/** E-easeOutPremium — primary for reveals: natural, long deceleration (quartic out). */
export const easeOutPremium: Ease = (t) => 1 - Math.pow(1 - t, 4);

/** E-softEaseIn — for camera pushes (sine in). */
export const softEaseIn: Ease = (t) => 1 - Math.cos((t * Math.PI) / 2);

/** Symmetric premium in-out (sine) — camera moves between checkpoints. */
export const easeInOutPremium: Ease = (t) => -(Math.cos(Math.PI * t) - 1) / 2;

/** Expo-out — glow settles (micro reveals). */
export const easeOutExpo: Ease = (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));

/** Cubic out — medium transformations. */
export const easeOutCubic: Ease = (t) => 1 - Math.pow(1 - t, 3);

export const EASES = { linear, easeOutPremium, softEaseIn, easeInOutPremium, easeOutExpo, easeOutCubic } as const;
export type EaseName = keyof typeof EASES;
