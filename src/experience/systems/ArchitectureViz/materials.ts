/**
 * Material library (doc 1 §3) for built-in lit geometry (monoliths, frames, rails, kernel pieces).
 * Metal: brushed dark alloy, soft reflections, never chrome. Stone: matte, quiet, weighty.
 * These respond to the LightingDirector's real lights and to scene fog automatically.
 */
import { Color, MeshStandardMaterial } from 'three';

export function alloy(opts: { color?: string; roughness?: number; emissive?: string; emissiveIntensity?: number } = {}): MeshStandardMaterial {
  return new MeshStandardMaterial({
    color: new Color(opts.color ?? '#2a2d34'),
    metalness: 0.82,
    roughness: opts.roughness ?? 0.42,
    emissive: new Color(opts.emissive ?? '#000000'),
    emissiveIntensity: opts.emissiveIntensity ?? 0,
  });
}

export function stone(opts: { color?: string; roughness?: number } = {}): MeshStandardMaterial {
  return new MeshStandardMaterial({
    color: new Color(opts.color ?? '#141518'),
    metalness: 0.0,
    roughness: opts.roughness ?? 0.96,
  });
}

/** Faintly emissive seam material for rails / kernel seams (energy underlayer). */
export function seam(color: string, intensity = 1.2): MeshStandardMaterial {
  return new MeshStandardMaterial({
    color: new Color('#050608'),
    metalness: 0.2,
    roughness: 0.6,
    emissive: new Color(color),
    emissiveIntensity: intensity,
  });
}
