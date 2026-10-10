/**
 * Threshold lights — "triage thresholds become lighting regions" (doc 2 §4, doc 12 §5):
 * three soft volumetric pools (halo + small node core) and three vertical light shafts descending from
 * the dark onto them. Two draw calls total; per-threshold colour, level and position live in uniforms,
 * so the exit can fly the three lights into the signature without touching geometry.
 */
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  CylinderGeometry,
  DoubleSide,
  Mesh,
  ShaderMaterial,
  Vector3,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { GlobalUniforms } from '../../../shaders/uniforms';
import { FOG, GLOBALS } from '../../../shaders/chunks';

export interface ThresholdLightSpec {
  pos: Vector3;
  color: string;
  halo: number;
  core: number;
  /** Shaft height above the pool. */
  shaft: number;
  shaftRadius: number;
}

export class ThresholdLights {
  readonly glows: Mesh<BufferGeometry, ShaderMaterial>;
  readonly shafts: Mesh<BufferGeometry, ShaderMaterial>;
  /** Live positions of the three pools (copy into these; shared with the shader). */
  readonly positions: Vector3[];
  /** Per-threshold glow level (x,y,z = threshold 0,1,2). */
  readonly level: Vector3;
  /** Per-threshold shaft level. */
  readonly shaftLevel: Vector3;
  /** Per-threshold halo size multiplier. */
  readonly haloScale: Vector3;

  constructor(uniforms: GlobalUniforms, specs: readonly ThresholdLightSpec[]) {
    this.positions = specs.map((s) => s.pos.clone());
    this.level = new Vector3(1, 1, 1);
    this.shaftLevel = new Vector3(1, 1, 1);
    this.haloScale = new Vector3(1, 1, 1);
    const colors = specs.map((s) => new Color(s.color));

    /* ── pools: 2 billboards per threshold (halo, core) ── */
    const quads = specs.length * 2;
    const pos = new Float32Array(quads * 4 * 3);
    const sel = new Float32Array(quads * 4 * 3);
    const kind = new Float32Array(quads * 4);
    const size = new Float32Array(quads * 4);
    const idx: number[] = [];
    const corners = [
      [-0.5, -0.5],
      [0.5, -0.5],
      [0.5, 0.5],
      [-0.5, 0.5],
    ];
    let v = 0;
    specs.forEach((s, i) => {
      for (let k = 0; k < 2; k++) {
        const base = v;
        for (const [cx, cy] of corners) {
          pos[v * 3] = cx;
          pos[v * 3 + 1] = cy;
          sel[v * 3 + i] = 1;
          kind[v] = k;
          size[v] = k === 0 ? s.halo : s.core;
          v++;
        }
        idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
      }
    });
    const gGeo = new BufferGeometry();
    gGeo.setAttribute('position', new BufferAttribute(pos, 3));
    gGeo.setAttribute('aSel', new BufferAttribute(sel, 3));
    gGeo.setAttribute('aKind', new BufferAttribute(kind, 1));
    gGeo.setAttribute('aSize', new BufferAttribute(size, 1));
    gGeo.setIndex(idx);

    const shared = {
      uPos: { value: this.positions },
      uColor: { value: colors },
      uLevel: { value: this.level },
    };

    const glowMat = new ShaderMaterial({
      uniforms: { ...uniforms, ...shared, uHaloScale: { value: this.haloScale }, uHaloGain: { value: 0.3 }, uCoreGain: { value: 0.95 } },
      vertexShader: /* glsl */ `
        attribute vec3 aSel;
        attribute float aKind;
        attribute float aSize;
        uniform vec3 uPos[3];
        uniform vec3 uColor[3];
        uniform vec3 uLevel;
        uniform vec3 uHaloScale;
        varying vec2 vUv;
        varying vec3 vColor;
        varying float vLevel;
        varying float vKind;
        varying float vDepth;
        void main() {
          vec3 c = uPos[0] * aSel.x + uPos[1] * aSel.y + uPos[2] * aSel.z;
          float s = aSize * mix(dot(uHaloScale, aSel), 1.0, aKind);
          vec4 mv = modelViewMatrix * vec4(c, 1.0);
          mv.xy += position.xy * s;
          vUv = position.xy + 0.5;
          vColor = uColor[0] * aSel.x + uColor[1] * aSel.y + uColor[2] * aSel.z;
          vLevel = dot(uLevel, aSel);
          vKind = aKind;
          vDepth = -mv.z;
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        ${GLOBALS}
        ${FOG}
        uniform float uHaloGain;
        uniform float uCoreGain;
        varying vec2 vUv;
        varying vec3 vColor;
        varying float vLevel;
        varying float vKind;
        varying float vDepth;
        void main() {
          float d = length(vUv - 0.5) * 2.0;
          float fall = mix(3.4, 10.0, vKind);
          float g = exp(-d * d * fall) * (1.0 - smoothstep(0.82, 1.0, d));
          float gain = mix(uHaloGain, uCoreGain, vKind);
          vec3 col = mix(vColor, vec3(1.0), vKind * 0.4);
          float a = g * vLevel * gain * pzFogFade(vDepth);
          if (a < 0.002) discard;
          gl_FragColor = vec4(col, a);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      fog: false,
    });
    this.glows = new Mesh(gGeo, glowMat);
    this.glows.frustumCulled = false;

    /* ── shafts: open cylinders from the dark down onto each pool ── */
    const sGeos = specs.map((s, i) => {
      const g = new CylinderGeometry(s.shaftRadius * 0.35, s.shaftRadius, s.shaft, 28, 1, true);
      g.translate(s.pos.x, s.pos.y + s.shaft / 2 - 0.4, s.pos.z);
      const count = g.getAttribute('position').count;
      const a = new Float32Array(count * 3);
      const along = new Float32Array(count);
      const p = g.getAttribute('position');
      for (let j = 0; j < count; j++) {
        a[j * 3 + i] = 1;
        along[j] = 1 - (p.getY(j) - (s.pos.y - 0.4)) / s.shaft; // 0 top → 1 bottom
      }
      g.setAttribute('aSel', new BufferAttribute(a, 3));
      g.setAttribute('aAlong', new BufferAttribute(along, 1));
      return g;
    });
    const sMerged = mergeGeometries(sGeos, false);
    sGeos.forEach((g) => g.dispose());
    if (!sMerged) throw new Error('ThresholdLights: merge failed');
    const shaftMat = new ShaderMaterial({
      uniforms: { ...uniforms, uColor: { value: colors }, uShaft: { value: this.shaftLevel } },
      vertexShader: /* glsl */ `
        attribute vec3 aSel;
        attribute float aAlong;
        uniform vec3 uColor[3];
        uniform vec3 uShaft;
        varying vec3 vColor;
        varying float vLevel;
        varying float vAlong;
        varying vec3 vN;
        varying vec3 vV;
        varying float vDepth;
        void main() {
          vColor = uColor[0] * aSel.x + uColor[1] * aSel.y + uColor[2] * aSel.z;
          vLevel = dot(uShaft, aSel);
          vAlong = aAlong;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vN = normalize(normalMatrix * normal);
          vV = normalize(-mv.xyz);
          vDepth = -mv.z;
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        ${GLOBALS}
        ${FOG}
        varying vec3 vColor;
        varying float vLevel;
        varying float vAlong;
        varying vec3 vN;
        varying vec3 vV;
        varying float vDepth;
        void main() {
          float edge = pow(abs(dot(normalize(vN), normalize(vV))), 3.0);
          float along = smoothstep(0.0, 0.85, vAlong) * smoothstep(0.0, 0.85, vAlong) * (1.0 - smoothstep(0.93, 1.0, vAlong));
          float a = edge * along * vLevel * pzFogFade(vDepth * 0.8);
          if (a < 0.002) discard;
          gl_FragColor = vec4(vColor, a);
        }
      `,
      transparent: true,
      depthWrite: false,
      side: DoubleSide,
      blending: AdditiveBlending,
      fog: false,
    });
    this.shafts = new Mesh(sMerged, shaftMat);
    this.shafts.frustumCulled = false;
  }

  /** Hide meshes when nothing is lit (saves the draw). Call after writing levels. */
  commit(): void {
    const l = this.level;
    const s = this.shaftLevel;
    this.glows.visible = l.x + l.y + l.z > 0.004;
    this.shafts.visible = s.x + s.y + s.z > 0.004;
  }

  dispose(): void {
    this.glows.removeFromParent();
    this.shafts.removeFromParent();
    this.glows.geometry.dispose();
    this.glows.material.dispose();
    this.shafts.geometry.dispose();
    this.shafts.material.dispose();
  }
}
