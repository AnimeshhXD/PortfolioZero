/**
 * Global uniforms shared BY REFERENCE across every custom ShaderMaterial.
 * Spread them into a material: `uniforms: { ...ctx.uniforms, uMine: { value: 0 } }`
 * (spreading copies the {value} wrapper references, so updates propagate).
 */
import { Color, Vector2, Vector3 } from 'three';

export interface GlobalUniforms {
  [name: string]: { value: unknown };
  uTime: { value: number };
  uFogColor: { value: Color };
  uFogDensity: { value: number };
  /** Damped pointer, NDC. */
  uPointer: { value: Vector2 };
  /** World point under the pointer at the focus distance (light anchor). */
  uPointerWorld: { value: Vector3 };
  /** 0..1 how much the pointer is allowed to influence (reduced motion lowers it). */
  uPointerInfluence: { value: number };
  uFocus: { value: number };
  uAperture: { value: number };
  uPixelRatio: { value: number };
  uViewportHeight: { value: number };
  uKeyDir: { value: Vector3 };
  uKeyColor: { value: Color };
  uRimDir: { value: Vector3 };
  uRimColor: { value: Color };
  uAmbient: { value: Color };
  uCameraPos: { value: Vector3 };
  uReducedMotion: { value: number };
}

export function createGlobalUniforms(): GlobalUniforms {
  return {
    uTime: { value: 0 },
    uFogColor: { value: new Color('#07080c') },
    uFogDensity: { value: 0.01 },
    uPointer: { value: new Vector2() },
    uPointerWorld: { value: new Vector3() },
    uPointerInfluence: { value: 1 },
    uFocus: { value: 10 },
    uAperture: { value: 0.5 },
    uPixelRatio: { value: 1 },
    uViewportHeight: { value: 900 },
    uKeyDir: { value: new Vector3(-0.6, 0.8, 0.5).normalize() },
    uKeyColor: { value: new Color(1, 1, 1) },
    uRimDir: { value: new Vector3(0.7, 0.3, -0.8).normalize() },
    uRimColor: { value: new Color(0.5, 0.5, 1) },
    uAmbient: { value: new Color(0.05, 0.05, 0.08) },
    uCameraPos: { value: new Vector3() },
    uReducedMotion: { value: 0 },
  };
}
