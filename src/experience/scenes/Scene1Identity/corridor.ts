/**
 * Scene 1 set construction — the CORRIDOR OF RECORDS (doc 2 §2, doc 13 E-01).
 *
 * A corridor of floating architectural frames (brushed dark-alloy struts + chamfered arches) recedes
 * along −Z and narrows into a gentle throat where the signature floats. Between the frames, layered
 * translucent "record" leaves form the walls; hidden network nodes sit in the frame joints.
 *
 * Everything here is built once (pure layout + one-time geometry). No per-frame work.
 */
import {
  BoxGeometry,
  CatmullRomCurve3,
  Color,
  InstancedMesh,
  Matrix4,
  type MeshStandardMaterial,
  Quaternion,
  Vector3,
  type Curve,
} from 'three';
import { alloy } from '../../systems/ArchitectureViz';
import { lerp, smoothstep } from '../../../utils/math';
import { rng } from '../../../utils/rng';

export interface FrameSpec {
  /** Frame plane depth. */
  z: number;
  /** Half width (inner post centre line). */
  hw: number;
  /** Post foot / arch crown heights. */
  yb: number;
  yt: number;
  /** Chamfer size of the arch shoulders. */
  c: number;
  /** 0 (nearest) … 1 (deepest). */
  u: number;
}

export const FRAME_COUNT = 15;
export const FRAME_SPACING = 4.2;
export const FRAME_Z0 = 9;

/** The corridor narrows into a soft throat beyond the signature (doc 2 §2 "throat-like" transition volume). */
export function corridorFrames(): FrameSpec[] {
  const out: FrameSpec[] = [];
  for (let i = 0; i < FRAME_COUNT; i++) {
    const u = i / (FRAME_COUNT - 1);
    const throat = smoothstep(0.38, 1, u);
    out.push({
      z: FRAME_Z0 - i * FRAME_SPACING,
      hw: lerp(3.35, 2.3, throat),
      yb: lerp(-2.65, -1.95, throat),
      yt: lerp(2.95, 2.25, throat),
      c: lerp(0.9, 0.62, throat),
      u,
    });
  }
  return out;
}

/* ───────────── E-01 frames: every strut of every arch in ONE instanced draw ───────────── */

const _m = new Matrix4();
const _p = new Vector3();
const _q = new Quaternion();
const _s = new Vector3();
const _zAxis = new Vector3(0, 0, 1);

interface Beam {
  ax: number;
  ay: number;
  bx: number;
  by: number;
  z: number;
  /** In-plane thickness and depth along Z. */
  t: number;
  d: number;
}

function archBeams(f: FrameSpec, inset: number, dz: number, t: number, d: number, out: Beam[]): void {
  const hw = f.hw + inset;
  const yt = f.yt + inset;
  const yb = f.yb - inset * 0.4;
  const c = f.c;
  const z = f.z + dz;
  out.push({ ax: -hw, ay: yb, bx: -hw, by: yt - c, z, t, d }); // left post
  out.push({ ax: hw, ay: yb, bx: hw, by: yt - c, z, t, d }); // right post
  out.push({ ax: -hw, ay: yt - c, bx: -hw + c, by: yt, z, t, d }); // left shoulder
  out.push({ ax: hw, ay: yt - c, bx: hw - c, by: yt, z, t, d }); // right shoulder
  out.push({ ax: -hw + c, ay: yt, bx: hw - c, by: yt, z, t, d }); // crown lintel
}

/** Uniforms injected into the alloy shader: a soft light band that travels down the corridor. */
export interface ScanUniforms {
  uScanZ: { value: number };
  uScanAmt: { value: number };
  uScanWidth: { value: number };
  uScanColor: { value: Color };
  /** Very faint emissive edge so struts never read as pure black cut-outs. */
  uEdgeGlow: { value: number };
  /** Fake environment: the luminous end of the corridor reflected by the brushed alloy. */
  uEnvColor: { value: Color };
  uEnvAmt: { value: number };
  /** 0..1 multiplier for everything on the left wall (calm behind the centre-left typography). */
  uLeftDim: { value: number };
}

export function buildFrames(frames: readonly FrameSpec[]): { mesh: InstancedMesh<BoxGeometry, MeshStandardMaterial>; scan: ScanUniforms } {
  const beams: Beam[] = [];
  for (const f of frames) {
    archBeams(f, 0, 0, 0.085, 0.3, beams); // primary arch: fin-like strut (thin face, deep side)
    archBeams(f, 0.16, -0.62, 0.035, 0.08, beams); // echo arch behind it: lighter, slightly larger
  }
  const geo = new BoxGeometry(1, 1, 1);
  const material = alloy({ color: '#2b2e3a', roughness: 0.38 });
  material.metalness = 0.68;
  const scan: ScanUniforms = {
    uScanZ: { value: 100 },
    uScanAmt: { value: 0 },
    uScanWidth: { value: 2.4 },
    uScanColor: { value: new Color('#8d96ff') },
    uEdgeGlow: { value: 0.0 },
    uEnvColor: { value: new Color('#4d5488') },
    uEnvAmt: { value: 0 },
    uLeftDim: { value: 1 },
  };
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, scan);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vPzWorld;\nvarying vec3 vPzNormal;')
      .replace(
        '#include <project_vertex>',
        `#include <project_vertex>
        vec4 pzW = vec4(transformed, 1.0);
        vec3 pzN = objectNormal;
        #ifdef USE_INSTANCING
          pzW = instanceMatrix * pzW;
          pzN = mat3(instanceMatrix) * pzN;
        #endif
        vPzWorld = (modelMatrix * pzW).xyz;
        vPzNormal = normalize(mat3(modelMatrix) * pzN);`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec3 vPzWorld;
        varying vec3 vPzNormal;
        uniform float uScanZ;
        uniform float uScanAmt;
        uniform float uScanWidth;
        uniform vec3 uScanColor;
        uniform float uEdgeGlow;
        uniform vec3 uEnvColor;
        uniform float uEnvAmt;
        uniform float uLeftDim;`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        {
          float leftK = mix(uLeftDim, 1.0, smoothstep(-1.5, 0.5, vPzWorld.x));
          float band = exp(-pow((vPzWorld.z - uScanZ) / max(uScanWidth, 0.001), 2.0));
          // the travelling light favours faces turned toward the corridor axis (inner faces + fronts)
          float facing = 0.35 + 0.65 * clamp(abs(vPzNormal.x) + max(vPzNormal.z, 0.0), 0.0, 1.0);
          float inner = clamp(abs(vPzNormal.x), 0.0, 1.0);
          totalEmissiveRadiance += uScanColor * (band * uScanAmt * facing * 0.9 + uEdgeGlow * inner * 0.022) * leftK;
          // brushed alloy picks up the light at the end of the corridor at grazing angles (inner faces,
          // soffits), so struts read as metal converging on the vanishing point, never as flat cut-outs
          vec3 pzV = normalize(cameraPosition - vPzWorld);
          vec3 pzR = reflect(-pzV, normalize(vPzNormal));
          float toFar = max(-pzR.z, 0.0);
          float env = pow(toFar, 7.0) * (0.55 + 0.45 * smoothstep(5.0, -45.0, vPzWorld.z));
          totalEmissiveRadiance += uEnvColor * env * uEnvAmt * leftK;
        }`,
      );
  };
  material.customProgramCacheKey = () => 'pz-identity-corridor-alloy';

  const mesh = new InstancedMesh(geo, material, beams.length);
  beams.forEach((b, i) => {
    const dx = b.bx - b.ax;
    const dy = b.by - b.ay;
    const len = Math.hypot(dx, dy);
    _p.set((b.ax + b.bx) / 2, (b.ay + b.by) / 2, b.z);
    _q.setFromAxisAngle(_zAxis, Math.atan2(dy, dx));
    // overlap the joints by one thickness so shoulders meet posts without gaps
    _s.set(len + b.t, b.t, b.d);
    _m.compose(_p, _q, _s);
    mesh.setMatrixAt(i, _m);
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.computeBoundingSphere();
  return { mesh, scan };
}

/* ───────────── wall "records": layered translucent leaves between frames ───────────── */

export interface RecordSpec {
  x: number;
  y: number;
  z: number;
  ry: number;
  rz: number;
  w: number;
  h: number;
  tint: number;
}

/** side = −1 (left wall) or +1 (right wall). */
export function recordLayout(frames: readonly FrameSpec[], side: -1 | 1, seed: number): RecordSpec[] {
  const r = rng(seed);
  const out: RecordSpec[] = [];
  // the first two bays stay open: records begin where the camera can read them as walls, not blinds
  for (let i = 2; i < frames.length - 1; i++) {
    const a = frames[i];
    const b = frames[i + 1];
    const zc = (a.z + b.z) / 2;
    const hw = (a.hw + b.hw) / 2;
    const yb = (a.yb + b.yb) / 2;
    const yt = (a.yt + b.yt) / 2;
    const span = a.z - b.z;
    const ry = side < 0 ? Math.PI / 2 : -Math.PI / 2;
    // inner leaf pair (just outside the posts): lower record + upper record, offset like stacked files
    const lowH = r.range(1.2, 1.7);
    out.push({
      x: side * (hw + 0.2),
      y: yb + 0.35 + lowH / 2,
      z: zc + r.range(-0.4, 0.4),
      ry,
      rz: r.range(-0.012, 0.012),
      w: span * r.range(0.62, 0.86),
      h: lowH,
      tint: r.next(),
    });
    const upH = r.range(1.3, 1.9);
    out.push({
      x: side * (hw + 0.32),
      y: yt - 0.95 - upH / 2 + r.range(0, 0.25),
      z: zc + r.range(-0.6, 0.6),
      ry,
      rz: r.range(-0.012, 0.012),
      w: span * r.range(0.55, 0.8),
      h: upH,
      tint: r.next(),
    });
    // outer leaf (deeper layer): large, faint — gives the wall depth without becoming a surface
    out.push({
      x: side * (hw + 0.7),
      y: (yb + yt) / 2 + r.range(-0.3, 0.3),
      z: zc + r.range(-0.8, 0.8),
      ry,
      rz: 0,
      w: span * r.range(0.8, 1.05),
      h: (yt - yb) * r.range(0.62, 0.82),
      tint: r.next(),
    });
  }
  return out;
}

/* ───────────── hidden network nodes (frame joints) ───────────── */

export interface NodeLayout {
  positions: Float32Array;
  /** 0..1 depth along the corridor per node. */
  depth: Float32Array;
  /** −1 left, +1 right. */
  side: Float32Array;
  tint: Float32Array;
}

export function nodeLayout(frames: readonly FrameSpec[]): NodeLayout {
  const pts: number[] = [];
  const depth: number[] = [];
  const side: number[] = [];
  const tint: number[] = [];
  frames.forEach((f, i) => {
    const joints: Array<[number, number, number]> = [
      [-f.hw, f.yt - f.c, -1],
      [f.hw, f.yt - f.c, 1],
      [-f.hw + f.c, f.yt, -1],
      [f.hw - f.c, f.yt, 1],
    ];
    // feet only on alternate frames: sparse, never a string of lights
    if (i % 4 === 1) {
      joints.push([f.hw, f.yb, 1]);
      joints.push([-f.hw, f.yb, -1]);
    }
    for (const [x, y, s] of joints) {
      pts.push(x, y, f.z + 0.24);
      depth.push(f.u);
      side.push(s);
      tint.push(s > 0 ? 0.25 : 0.6);
    }
  });
  return {
    positions: new Float32Array(pts),
    depth: new Float32Array(depth),
    side: new Float32Array(side),
    tint: new Float32Array(tint),
  };
}

/* ───────────── rim traces on the right depth wall ───────────── */

export function rimTraceCurves(all: readonly FrameSpec[]): Curve<Vector3>[] {
  const frames = all.slice(2);
  const upper = frames.map((f) => new Vector3(f.hw + 0.06, f.yt - f.c, f.z));
  const lower = frames.map((f) => new Vector3(f.hw + 0.06, f.yb, f.z));
  return [new CatmullRomCurve3(upper, false, 'centripetal'), new CatmullRomCurve3(lower, false, 'centripetal')];
}
