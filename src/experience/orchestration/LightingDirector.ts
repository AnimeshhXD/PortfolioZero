/**
 * LightingDirector — "Lighting is the emotional director" (doc 1 §4).
 * Owns the real lights (for MeshStandard/Physical materials) and mirrors them into global uniforms
 * (for custom shaders). The pointer pivots the key light like a lamp passing over a set (doc 4 §3).
 */
import { Color, DirectionalLight, HemisphereLight, Object3D, Quaternion, Vector3 } from 'three';
import type { LightingState, PointerState } from '../../types/scene';
import type { GlobalUniforms } from '../shaders/uniforms';

const _q = new Quaternion();
const _axisY = new Vector3(0, 1, 0);
const _axisX = new Vector3(1, 0, 0);
const _dir = new Vector3();

export class LightingDirector {
  readonly group = new Object3D();
  private key = new DirectionalLight(0xffffff, 1);
  private rim = new DirectionalLight(0xffffff, 0.5);
  private ambient = new HemisphereLight(0xffffff, 0x000000, 0.2);
  private tmpColor = new Color();

  constructor(private readonly uniforms: GlobalUniforms) {
    this.group.name = 'LightingDirector';
    this.group.add(this.key, this.key.target, this.rim, this.rim.target, this.ambient);
  }

  apply(state: LightingState, pointer: PointerState, anchor: Vector3, reducedMotion: boolean): void {
    // Key direction pivots with the pointer — subtle; reduced motion keeps it minimal.
    const influence = state.pointerInfluence * (reducedMotion ? 0.3 : 1);
    _dir.copy(state.keyDirection).normalize();
    _q.setFromAxisAngle(_axisY, pointer.x * 0.42 * influence);
    _dir.applyQuaternion(_q);
    _q.setFromAxisAngle(_axisX, -pointer.y * 0.22 * influence);
    _dir.applyQuaternion(_q).normalize();

    this.key.position.copy(anchor).addScaledVector(_dir, 30);
    this.key.target.position.copy(anchor);
    this.key.color.copy(state.keyColor);
    this.key.intensity = state.keyIntensity * 2.2;

    this.rim.position.copy(anchor).addScaledVector(state.rimDirection, 30);
    this.rim.target.position.copy(anchor);
    this.rim.color.copy(state.rimColor);
    this.rim.intensity = state.rimIntensity * 2.2;

    this.ambient.color.copy(state.ambientColor);
    this.ambient.groundColor.copy(state.ambientColor).multiplyScalar(0.35);
    this.ambient.intensity = state.ambientIntensity * 3;

    this.uniforms.uKeyDir.value.copy(_dir);
    this.uniforms.uKeyColor.value.copy(state.keyColor).multiplyScalar(state.keyIntensity);
    this.uniforms.uRimDir.value.copy(state.rimDirection).normalize();
    this.uniforms.uRimColor.value.copy(state.rimColor).multiplyScalar(state.rimIntensity);
    this.uniforms.uAmbient.value.copy(this.tmpColor.copy(state.ambientColor).multiplyScalar(state.ambientIntensity));
    this.uniforms.uPointerInfluence.value = influence;
  }
}
