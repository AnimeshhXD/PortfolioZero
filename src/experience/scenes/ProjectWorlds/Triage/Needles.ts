/**
 * Similarity vectors (sentence-transformers metaphor, doc 2 §4 "aligning vectors"): short luminous
 * needles around the pathway that start in scattered orientations and rotate into alignment with the
 * rail's tangent while drawing in toward it. One draw call; orientation is computed on the GPU from
 * a single progress uniform (uAlign), so scrubbing back un-aligns them.
 */
import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, Mesh, ShaderMaterial, Vector3, type Curve } from 'three';
import type { GlobalUniforms } from '../../../shaders/uniforms';
import { EASE_GLSL, FOG, GLOBALS, NOISE } from '../../../shaders/chunks';
import { rng } from '../../../../utils/rng';

export class Needles {
  readonly mesh: Mesh<BufferGeometry, ShaderMaterial>;

  constructor(
    uniforms: GlobalUniforms,
    rail: Curve<Vector3>,
    opts: { count: number; seed: number; length?: number; width?: number; colorA?: string; colorB?: string; t0?: number; t1?: number },
  ) {
    const n = opts.count;
    const r = rng(opts.seed);
    const verts = n * 4;
    const position = new Float32Array(verts * 3);
    const centerB = new Float32Array(verts * 3);
    const dirA = new Float32Array(verts * 3);
    const dirB = new Float32Array(verts * 3);
    const order = new Float32Array(verts);
    const corner = new Float32Array(verts * 2);
    const index: number[] = [];
    const p = new Vector3();
    const tan = new Vector3();
    const da = new Vector3();
    const off = new Vector3();
    const t0 = opts.t0 ?? 0.22;
    const t1 = opts.t1 ?? 0.92;
    for (let i = 0; i < n; i++) {
      const t = t0 + (t1 - t0) * r.next();
      rail.getPoint(t, p);
      rail.getTangent(t, tan).normalize();
      const ang = r.range(0, Math.PI * 2);
      const rad = r.range(0.45, 1.7);
      off.set(Math.cos(ang) * rad, Math.abs(Math.sin(ang)) * rad * 0.9 + 0.1, r.range(-0.4, 0.4));
      // scattered start orientation, never exactly opposite the rail (keeps the rotation well-defined)
      do {
        const [x, y, z] = r.onSphere(1);
        da.set(x, y, z);
      } while (da.dot(tan) < -0.55);
      const o = r.next();
      const cx = p.x + off.x;
      const cy = p.y + off.y;
      const cz = p.z + off.z;
      const bx = p.x + off.x * 0.28;
      const by = p.y + off.y * 0.28 + 0.06;
      const bz = p.z + off.z * 0.28;
      for (let k = 0; k < 4; k++) {
        const v = i * 4 + k;
        position[v * 3] = cx;
        position[v * 3 + 1] = cy;
        position[v * 3 + 2] = cz;
        centerB[v * 3] = bx;
        centerB[v * 3 + 1] = by;
        centerB[v * 3 + 2] = bz;
        dirA[v * 3] = da.x;
        dirA[v * 3 + 1] = da.y;
        dirA[v * 3 + 2] = da.z;
        dirB[v * 3] = tan.x;
        dirB[v * 3 + 1] = tan.y;
        dirB[v * 3 + 2] = tan.z;
        order[v] = o;
        corner[v * 2] = k === 1 || k === 2 ? 1 : 0;
        corner[v * 2 + 1] = k < 2 ? -1 : 1;
      }
      const b = i * 4;
      index.push(b, b + 1, b + 2, b, b + 2, b + 3);
    }
    const geo = new BufferGeometry();
    geo.setAttribute('position', new BufferAttribute(position, 3));
    geo.setAttribute('aCenterB', new BufferAttribute(centerB, 3));
    geo.setAttribute('aDirA', new BufferAttribute(dirA, 3));
    geo.setAttribute('aDirB', new BufferAttribute(dirB, 3));
    geo.setAttribute('aOrder', new BufferAttribute(order, 1));
    geo.setAttribute('aCorner', new BufferAttribute(corner, 2));
    geo.setIndex(index);

    const material = new ShaderMaterial({
      uniforms: {
        ...uniforms,
        uAlign: { value: 0 },
        uStagger: { value: 0.6 },
        uOpacity: { value: 0 },
        uLength: { value: opts.length ?? 0.42 },
        uWidth: { value: opts.width ?? 0.014 },
        uColorA: { value: new Color(opts.colorA ?? '#9fe9d0') },
        uColorB: { value: new Color(opts.colorB ?? '#effff8') },
      },
      vertexShader: /* glsl */ `
        ${GLOBALS}
        ${NOISE}
        ${EASE_GLSL}
        attribute vec3 aCenterB;
        attribute vec3 aDirA;
        attribute vec3 aDirB;
        attribute float aOrder;
        attribute vec2 aCorner;
        uniform float uAlign;
        uniform float uStagger;
        uniform float uLength;
        uniform float uWidth;
        varying float vS;
        varying float vSide;
        varying float vE;
        varying float vDepth;
        void main() {
          float local = clamp(uAlign * (1.0 + uStagger) - aOrder * uStagger, 0.0, 1.0);
          float e = pzEaseInOut(local);
          float rm = 1.0 - uReducedMotion * 0.8;
          vec3 dir = mix(aDirA, aDirB, e);
          // unaligned vectors hesitate (searching); aligned ones are still
          dir += curlish(position * 0.7 + aOrder * 9.0 + uTime * 0.12) * 0.35 * (1.0 - e) * rm;
          dir = normalize(dir + vec3(0.0, 1e-4, 0.0));
          vec3 c = mix(position, aCenterB, e);
          vec3 p = c + dir * (aCorner.x - 0.5) * uLength;
          vec3 toCam = normalize(uCameraPos - p);
          vec3 side = cross(dir, toCam);
          float sl = length(side);
          side = sl > 1e-4 ? side / sl : vec3(0.0, 1.0, 0.0);
          p += side * aCorner.y * uWidth * (0.35 + 0.65 * aCorner.x);
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          vS = aCorner.x;
          vSide = aCorner.y;
          vE = e;
          vDepth = -mv.z;
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        ${GLOBALS}
        ${FOG}
        uniform float uOpacity;
        uniform vec3 uColorA;
        uniform vec3 uColorB;
        varying float vS;
        varying float vSide;
        varying float vE;
        varying float vDepth;
        void main() {
          float head = vS * vS;
          float edge = 1.0 - abs(vSide);
          float a = (0.18 + 0.82 * head) * smoothstep(0.0, 0.7, edge) * uOpacity * pzFogFade(vDepth);
          if (a < 0.002) discard;
          vec3 col = mix(uColorA, uColorB, vE) * (0.7 + head * 0.9);
          gl_FragColor = vec4(col, a);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      fog: false,
    });
    this.mesh = new Mesh(geo, material);
    this.mesh.frustumCulled = false;
    this.mesh.visible = false;
  }

  set align(v: number) {
    this.mesh.material.uniforms.uAlign.value = v;
  }

  set opacity(v: number) {
    this.mesh.material.uniforms.uOpacity.value = v;
    this.mesh.visible = v > 0.002;
  }

  dispose(): void {
    this.mesh.removeFromParent();
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}
