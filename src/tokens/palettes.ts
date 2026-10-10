/**
 * Lighting & colour presets per world (doc 7 §3.3 + §8, doc 12).
 * Each world starts from its preset and only deviates through tokens.
 */
import { ACCENT, NEUTRAL, TEMPERATURE } from './tokens';

export interface WorldPalette {
  /** Sky gradient (doc 13 S-01). */
  skyTop: string;
  skyHorizon: string;
  skyBottom: string;
  /** Fog colour — should sit close to skyHorizon so objects dissolve into the sky (doc 1 §4.8). */
  fog: string;
  /** Key light (L-key cool / warm). */
  key: string;
  keyIntensity: number;
  /** Rim light (L-rim soft). */
  rim: string;
  rimIntensity: number;
  /** Ambient (L-ambient controlled). */
  ambient: string;
  ambientIntensity: number;
  /** Project accents (doc 1 §5.3). */
  accentA: string;
  accentB: string;
  /** Optional third accent (Triage thresholds etc.). */
  accentC?: string;
  /** Ambient mote tint. */
  motes: string;
}

export type PresetId =
  | 'boot'
  | 'identity'
  | 'lawlens'
  | 'triage'
  | 'workplace'
  | 'benefitbridge'
  | 'mavira'
  | 'healthcoach'
  | 'ending';

export const PALETTES: Record<PresetId, WorldPalette> = {
  boot: {
    skyTop: '#06070b',
    skyHorizon: '#090b12',
    skyBottom: '#040508',
    fog: '#07080c',
    key: TEMPERATURE.cool5400,
    keyIntensity: 0.35,
    rim: '#5b6dff',
    rimIntensity: 0.2,
    ambient: '#0d1020',
    ambientIntensity: 0.15,
    accentA: '#5d8bff',
    accentB: ACCENT.violet,
    motes: '#9fb4ff',
  },
  identity: {
    skyTop: '#07080f',
    skyHorizon: '#141633',
    skyBottom: '#06070b',
    fog: '#0e1024',
    key: '#a9a2ff',
    keyIntensity: 1.1,
    rim: '#6f8bff',
    rimIntensity: 0.9,
    ambient: '#141834',
    ambientIntensity: 0.3,
    accentA: '#7d86ff',
    accentB: ACCENT.violet,
    motes: '#b9c2ff',
  },
  lawlens: {
    skyTop: '#05070e',
    skyHorizon: '#0f1a2c',
    skyBottom: '#07060f',
    fog: '#0b1322',
    key: '#8fe3ff',
    keyIntensity: 1.0,
    rim: ACCENT.violet,
    rimIntensity: 0.8,
    ambient: '#101a2e',
    ambientIntensity: 0.28,
    accentA: ACCENT.cyan,
    accentB: ACCENT.violet,
    accentC: ACCENT.red,
    motes: '#a8dcff',
  },
  triage: {
    skyTop: '#030504',
    skyHorizon: '#0a1410',
    skyBottom: '#050403',
    fog: '#07100d',
    key: '#b8ffd9',
    keyIntensity: 0.55,
    rim: ACCENT.amber,
    rimIntensity: 0.45,
    ambient: '#08120e',
    ambientIntensity: 0.18,
    accentA: ACCENT.emerald,
    accentB: ACCENT.amber,
    accentC: ACCENT.red,
    motes: '#bfffe0',
  },
  workplace: {
    skyTop: '#07061a',
    skyHorizon: '#16123a',
    skyBottom: '#06061a',
    fog: '#100e2a',
    key: '#9d8cff',
    keyIntensity: 1.0,
    rim: ACCENT.electricBlue,
    rimIntensity: 0.9,
    ambient: '#12123a',
    ambientIntensity: 0.3,
    accentA: ACCENT.violet,
    accentB: ACCENT.electricBlue,
    motes: '#c4bcff',
  },
  benefitbridge: {
    skyTop: '#05090a',
    skyHorizon: '#142218',
    skyBottom: '#0b0905',
    fog: '#121c15',
    key: TEMPERATURE.warm3800,
    keyIntensity: 0.9,
    rim: ACCENT.emerald,
    rimIntensity: 0.55,
    ambient: '#18201a',
    ambientIntensity: 0.32,
    accentA: ACCENT.emerald,
    accentB: ACCENT.amber,
    motes: '#ffe9c4',
  },
  mavira: {
    skyTop: '#05070a',
    skyHorizon: '#121a22',
    skyBottom: '#06080a',
    fog: '#0d141b',
    key: '#dfe9f5',
    keyIntensity: 1.0,
    rim: ACCENT.cyan,
    rimIntensity: 0.65,
    ambient: '#101820',
    ambientIntensity: 0.25,
    accentA: ACCENT.steel,
    accentB: ACCENT.cyan,
    motes: '#cfe3ee',
  },
  healthcoach: {
    skyTop: '#070812',
    skyHorizon: '#2a1622',
    skyBottom: '#071219',
    fog: '#1d121b',
    key: TEMPERATURE.warm3500,
    keyIntensity: 0.9,
    rim: ACCENT.rose,
    rimIntensity: 0.6,
    ambient: '#1a1420',
    ambientIntensity: 0.3,
    accentA: ACCENT.rose,
    accentB: ACCENT.deepCyan,
    motes: '#ffd6e2',
  },
  ending: {
    skyTop: '#06070b',
    skyHorizon: '#10121a',
    skyBottom: '#05060a',
    fog: '#0b0c12',
    key: TEMPERATURE.neutral4800,
    keyIntensity: 0.95,
    rim: '#9fb6ff',
    rimIntensity: 0.5,
    ambient: '#11131c',
    ambientIntensity: 0.25,
    accentA: '#9ec3ff',
    accentB: ACCENT.warmWhite,
    motes: '#d9e0ee',
  },
};

export { NEUTRAL };
