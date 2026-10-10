/**
 * Directive factory + blending. Scenes create their directives from a palette preset and mutate them per frame.
 */
import { Color, Vector3 } from 'three';
import type { SceneDirectives } from '../types/scene';
import { PALETTES, type PresetId } from '../tokens/palettes';
import { EMISSION, FOG, GLOW, PARTICLE } from '../tokens/tokens';
import { lensToFov } from '../utils/math';

export function createDirectives(preset: PresetId = 'boot'): SceneDirectives {
  const d: SceneDirectives = {
    camera: { position: new Vector3(0, 0, 10), target: new Vector3(0, 0, 0), fov: lensToFov(40), roll: 0 },
    sky: {
      top: new Color(),
      horizon: new Color(),
      bottom: new Color(),
      rays: 0,
      rayColor: new Color('#cfd8ff'),
      rayDirection: new Vector3(0.2, 0.7, -1).normalize(),
      intensity: 1,
    },
    lighting: {
      keyColor: new Color(),
      keyIntensity: 1,
      keyDirection: new Vector3(-0.6, 0.8, 0.5).normalize(),
      rimColor: new Color(),
      rimIntensity: 0.6,
      rimDirection: new Vector3(0.7, 0.3, -0.8).normalize(),
      ambientColor: new Color(),
      ambientIntensity: 0.25,
      pointerInfluence: 1,
    },
    fog: { density: FOG.F1, color: new Color(), curtain: 0 },
    signature: {
      soc: 0,
      position: new Vector3(0, 0, 0),
      scale: 1,
      emission: EMISSION.G1,
      accentA: new Color(),
      accentB: new Color(),
      absorb: 0,
      visibility: 1,
      spin: 0,
    },
    particles: {
      density: PARTICLE.P1.density,
      color: new Color(),
      size: 1,
      speed: PARTICLE.P1.speed,
      focus: 10,
      aperture: 0.5,
      flow: new Vector3(),
      intensity: 1,
    },
    post: { bloom: GLOW.G1, exposure: 1, vignette: 0.55, grain: 0.035 },
  };
  applyPalette(d, preset);
  return d;
}

/** Load a palette preset's colours/intensities into directives (doc 7 §8 lighting presets). */
export function applyPalette(d: SceneDirectives, preset: PresetId): SceneDirectives {
  const p = PALETTES[preset];
  d.sky.top.set(p.skyTop);
  d.sky.horizon.set(p.skyHorizon);
  d.sky.bottom.set(p.skyBottom);
  d.fog.color.set(p.fog);
  d.lighting.keyColor.set(p.key);
  d.lighting.keyIntensity = p.keyIntensity;
  d.lighting.rimColor.set(p.rim);
  d.lighting.rimIntensity = p.rimIntensity;
  d.lighting.ambientColor.set(p.ambient);
  d.lighting.ambientIntensity = p.ambientIntensity;
  d.signature.accentA.set(p.accentA);
  d.signature.accentB.set(p.accentB);
  d.particles.color.set(p.motes);
  return d;
}

const lerpN = (a: number, b: number, t: number) => a + (b - a) * t;

/** out = a·(1−t) + b·t for every directive field. `out` may alias `a` or `b`. */
export function lerpDirectives(out: SceneDirectives, a: SceneDirectives, b: SceneDirectives, t: number): SceneDirectives {
  out.camera.position.lerpVectors(a.camera.position, b.camera.position, t);
  out.camera.target.lerpVectors(a.camera.target, b.camera.target, t);
  out.camera.fov = lerpN(a.camera.fov, b.camera.fov, t);
  out.camera.roll = lerpN(a.camera.roll, b.camera.roll, t);

  out.sky.top.lerpColors(a.sky.top, b.sky.top, t);
  out.sky.horizon.lerpColors(a.sky.horizon, b.sky.horizon, t);
  out.sky.bottom.lerpColors(a.sky.bottom, b.sky.bottom, t);
  out.sky.rays = lerpN(a.sky.rays, b.sky.rays, t);
  out.sky.rayColor.lerpColors(a.sky.rayColor, b.sky.rayColor, t);
  out.sky.rayDirection.lerpVectors(a.sky.rayDirection, b.sky.rayDirection, t).normalize();
  out.sky.intensity = lerpN(a.sky.intensity, b.sky.intensity, t);

  const la = a.lighting;
  const lb = b.lighting;
  const lo = out.lighting;
  lo.keyColor.lerpColors(la.keyColor, lb.keyColor, t);
  lo.keyIntensity = lerpN(la.keyIntensity, lb.keyIntensity, t);
  lo.keyDirection.lerpVectors(la.keyDirection, lb.keyDirection, t).normalize();
  lo.rimColor.lerpColors(la.rimColor, lb.rimColor, t);
  lo.rimIntensity = lerpN(la.rimIntensity, lb.rimIntensity, t);
  lo.rimDirection.lerpVectors(la.rimDirection, lb.rimDirection, t).normalize();
  lo.ambientColor.lerpColors(la.ambientColor, lb.ambientColor, t);
  lo.ambientIntensity = lerpN(la.ambientIntensity, lb.ambientIntensity, t);
  lo.pointerInfluence = lerpN(la.pointerInfluence, lb.pointerInfluence, t);

  out.fog.density = lerpN(a.fog.density, b.fog.density, t);
  out.fog.color.lerpColors(a.fog.color, b.fog.color, t);
  out.fog.curtain = lerpN(a.fog.curtain, b.fog.curtain, t);

  const sa = a.signature;
  const sb = b.signature;
  const so = out.signature;
  so.soc = lerpN(sa.soc, sb.soc, t);
  so.position.lerpVectors(sa.position, sb.position, t);
  so.scale = lerpN(sa.scale, sb.scale, t);
  so.emission = lerpN(sa.emission, sb.emission, t);
  so.accentA.lerpColors(sa.accentA, sb.accentA, t);
  so.accentB.lerpColors(sa.accentB, sb.accentB, t);
  so.absorb = lerpN(sa.absorb, sb.absorb, t);
  so.visibility = lerpN(sa.visibility, sb.visibility, t);
  so.spin = lerpN(sa.spin, sb.spin, t);

  const pa = a.particles;
  const pb = b.particles;
  const po = out.particles;
  po.density = lerpN(pa.density, pb.density, t);
  po.color.lerpColors(pa.color, pb.color, t);
  po.size = lerpN(pa.size, pb.size, t);
  po.speed = lerpN(pa.speed, pb.speed, t);
  po.focus = lerpN(pa.focus, pb.focus, t);
  po.aperture = lerpN(pa.aperture, pb.aperture, t);
  po.flow.lerpVectors(pa.flow, pb.flow, t);
  po.intensity = lerpN(pa.intensity, pb.intensity, t);

  out.post.bloom = lerpN(a.post.bloom, b.post.bloom, t);
  out.post.exposure = lerpN(a.post.exposure, b.post.exposure, t);
  out.post.vignette = lerpN(a.post.vignette, b.post.vignette, t);
  out.post.grain = lerpN(a.post.grain, b.post.grain, t);
  return out;
}

export function copyDirectives(out: SceneDirectives, src: SceneDirectives): SceneDirectives {
  return lerpDirectives(out, src, src, 0);
}
