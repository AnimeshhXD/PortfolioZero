/**
 * CameraDirector — the camera contract (doc 3): slow, confident, natural deceleration, no bounce.
 * Scenes never move the camera; they write directives.camera and this director glides toward it.
 */
import { PerspectiveCamera, Vector3 } from 'three';
import type { CameraShot } from '../../types/scene';
import { damp } from '../../utils/math';

const _fwd = new Vector3();
const _up = new Vector3();

export class CameraDirector {
  readonly camera: PerspectiveCamera;
  private pos = new Vector3(0, 0, 10);
  private target = new Vector3();
  private fov = 35;
  private roll = 0;
  private snapped = false;

  constructor(aspect: number) {
    this.camera = new PerspectiveCamera(35, aspect, 0.05, 2400);
    this.camera.position.copy(this.pos);
  }

  setAspect(aspect: number): void {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  /** Jump straight to a shot (seek / first frame). */
  snap(shot: CameraShot): void {
    this.pos.copy(shot.position);
    this.target.copy(shot.target);
    this.fov = shot.fov;
    this.roll = shot.roll;
    this.snapped = true;
  }

  apply(shot: CameraShot, dt: number, time: number, reducedMotion: boolean): void {
    if (!this.snapped) this.snap(shot);
    // Natural deceleration; reduced motion settles more calmly.
    const lp = reducedMotion ? 2.6 : 3.6;
    this.pos.set(
      damp(this.pos.x, shot.position.x, lp, dt),
      damp(this.pos.y, shot.position.y, lp, dt),
      damp(this.pos.z, shot.position.z, lp, dt),
    );
    this.target.set(
      damp(this.target.x, shot.target.x, lp, dt),
      damp(this.target.y, shot.target.y, lp, dt),
      damp(this.target.z, shot.target.z, lp, dt),
    );
    this.fov = damp(this.fov, shot.fov, 3, dt);
    this.roll = damp(this.roll, shot.roll, 3, dt);

    // "Living camera": barely perceptible vertical drift + breathing (doc 2 §2 camera feeling).
    const breathe = reducedMotion ? 0 : 1;
    const bx = (Math.sin(time * 0.21) * 0.025 + Math.sin(time * 0.37 + 1.7) * 0.012) * breathe;
    const by = (Math.sin(time * 0.17 + 0.6) * 0.035 + Math.sin(time * 0.29) * 0.01) * breathe;

    const cam = this.camera;
    cam.position.set(this.pos.x + bx, this.pos.y + by, this.pos.z);
    _fwd.subVectors(this.target, this.pos).normalize();
    _up.set(Math.sin(this.roll), Math.cos(this.roll), 0);
    // keep "up" roughly perpendicular to view to avoid flips on near-vertical looks
    if (Math.abs(_fwd.dot(_up)) > 0.98) _up.set(0, 0, 1);
    cam.up.copy(_up);
    cam.lookAt(this.target.x + bx * 0.5, this.target.y + by * 0.5, this.target.z);
    if (Math.abs(cam.fov - this.fov) > 1e-4) {
      cam.fov = this.fov;
      cam.updateProjectionMatrix();
    }
  }

  /** Smoothed (non-breathing) camera position — stable reference for transitions. */
  get restPosition(): Vector3 {
    return this.pos;
  }

  get restTarget(): Vector3 {
    return this.target;
  }
}
