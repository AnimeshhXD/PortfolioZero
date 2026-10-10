/**
 * FogDirector — "Fog is a narrative boundary, not a background" (doc 1 §3.4, doc 5 §4).
 * Drives THREE.FogExp2 (for built-in materials), the shared fog uniforms (custom shaders),
 * and the camera-attached curtain volume used for scene cuts.
 */
import { Color, FogExp2, type Scene } from 'three';
import type { FogState } from '../../types/scene';
import type { GlobalUniforms } from '../shaders/uniforms';
import type { FogVolume } from '../systems/FogVolume';

export class FogDirector {
  readonly fog = new FogExp2(0x07080c, 0.01);
  private color = new Color();

  constructor(
    scene: Scene,
    private readonly uniforms: GlobalUniforms,
    private readonly volume: FogVolume,
  ) {
    scene.fog = this.fog;
  }

  apply(state: FogState, curtainOverride: number, curtainColor: Color): void {
    this.color.copy(state.color);
    this.fog.color.copy(this.color);
    this.fog.density = state.density;
    this.uniforms.uFogColor.value.copy(this.color);
    this.uniforms.uFogDensity.value = state.density;
    this.volume.set(Math.max(state.curtain, curtainOverride), curtainColor);
  }
}
