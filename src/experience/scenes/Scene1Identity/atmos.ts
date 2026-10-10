/**
 * Scene 1 atmosphere pieces that the toolkit does not provide directly:
 *
 *  - FloorSheen: a polished graphite floor far below the floating frames. It carries the light from the
 *    end of the corridor toward the viewer (a soft reflected streak) and a long reflection of the
 *    signature, so the vanishing point reads as a destination. Edges dissolve into darkness (no plane edge).
 *  - GlassShards: a few foreground glass slivers (doc 11 §3 foreground). Bodies are nearly invisible;
 *    only their edges and a key-light glint catch, the way real glass reads in a dark set.
 *
 * Both are single draw calls, fog-aware, and only animate through uniforms.
 */
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  InstancedMesh,
  Matrix4,
  Mesh,
  PlaneGeometry,
  Quaternion,
  ShaderMaterial,
  Vector3,
} from 'three';
import type { GlobalUniforms } from '../../shaders/uniforms';
import { FOG, GLOBALS, NOISE } from '../../shaders/chunks';
import { rng } from '../../../utils/rng';

export class FloorSheen {
  readonly mesh: Mesh<PlaneGeometry, ShaderMaterial>;

  constructor(uniforms: GlobalUniforms, opts: { y: number; zNear: number; zFar: number; halfWidth: number; signature: Vector3 }) {
    const length = opts.zNear - opts.zFar;
    const geo = new PlaneGeometry(opts.halfWidth * 2, length, 1, 1);
    geo.rotateX(-Math.PI / 2);
    geo.translate(0, opts.y, (opts.zNear + opts.zFar) / 2);
    const material = new ShaderMaterial({
      uniforms: {
        ...uniforms,
        uBase: { value: new Color('#05060b') },
        uGlow: { value: new Color('#3a4192') },
        uSig: { value: opts.signature.clone() },
        uSigAmt: { value: 0 },
        uSheen: { value: 0 },
        uScanZ: { value: 100 },
        uScanAmt: { value: 0 },
        uScanColor: { value: new Color('#8d96ff') },
        uOpacity: { value: 1 },
        uHalfWidth: { value: opts.halfWidth },
      },
      vertexShader: /* glsl */ `
        varying vec3 vWorld;
        varying float vDepth;
        void main() {
          vec4 w = modelMatrix * vec4(position, 1.0);
          vWorld = w.xyz;
          vec4 mv = viewMatrix * w;
          vDepth = -mv.z;
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        ${GLOBALS}
        ${NOISE}
        ${FOG}
        uniform vec3 uBase;
        uniform vec3 uGlow;
        uniform vec3 uSig;
        uniform float uSigAmt;
        uniform float uSheen;
        uniform float uScanZ;
        uniform float uScanAmt;
        uniform vec3 uScanColor;
        uniform float uOpacity;
        uniform float uHalfWidth;
        varying vec3 vWorld;
        varying float vDepth;
        void main() {
          float x = vWorld.x;
          float z = vWorld.z;
          // light from the end of the corridor, reflected along the axis toward the viewer
          float far = smoothstep(12.0, -55.0, z);
          float streak = exp(-pow(x / mix(1.1, 2.6, far), 2.0)) * (0.18 + 0.82 * far * far);
          // brushed graphite: long anisotropic grain along the corridor
          float grain = 0.82 + 0.18 * snoise(vec3(x * 2.4, z * 0.08, 3.1));
          // the signature's long reflection, stretched toward the camera
          vec2 ds = vec2((x - uSig.x) / 0.42, (z - uSig.z - 2.5) / 6.5);
          float sig = exp(-dot(ds, ds)) * uSigAmt;
          float scan = exp(-pow((z - uScanZ) / 2.2, 2.0)) * uScanAmt * exp(-x * x / 5.0);
          vec3 col = uBase + uGlow * (streak * uSheen * grain + sig) + uScanColor * scan * 0.08;
          col = pzFog(col, vDepth);
          // the plane never shows an edge: it dissolves into darkness at the sides and near the lens
          float side = 1.0 - smoothstep(uHalfWidth * 0.45, uHalfWidth, abs(x));
          float a = side * smoothstep(1.5, 5.0, vDepth) * uOpacity;
          if (a < 0.002) discard;
          gl_FragColor = vec4(col, a);
        }
      `,
      transparent: true,
      depthWrite: false,
      fog: false,
    });
    this.mesh = new Mesh(geo, material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = -1;
  }

  get uniforms(): ShaderMaterial['uniforms'] {
    return this.mesh.material.uniforms;
  }

  dispose(): void {
    this.mesh.removeFromParent();
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}

const _m = new Matrix4();
const _p = new Vector3();
const _q = new Quaternion();
const _s = new Vector3();
const _axis = new Vector3();

export class GlassShards {
  readonly mesh: InstancedMesh<BufferGeometry, ShaderMaterial>;

  constructor(uniforms: GlobalUniforms, count: number, seed: number) {
    // one irregular sliver; instances vary by scale and orientation
    const geo = new BufferGeometry();
    geo.setAttribute('position', new BufferAttribute(new Float32Array([-0.22, -1, 0, 0.32, -0.55, 0, 0.02, 1, 0]), 3));
    geo.setAttribute('aBary', new BufferAttribute(new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]), 3));
    const material = new ShaderMaterial({
      uniforms: {
        ...uniforms,
        uColor: { value: new Color('#b9c1ff') },
        uOpacity: { value: 0 },
      },
      vertexShader: /* glsl */ `
        ${GLOBALS}
        attribute vec3 aBary;
        varying vec3 vBary;
        varying float vDepth;
        varying float vFacing;
        varying float vGlint;
        void main() {
          vBary = aBary;
          vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0);
          vec3 n = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * vec3(0.0, 0.0, 1.0));
          vec3 v = normalize(cameraPosition - w.xyz);
          vFacing = abs(dot(n, v));
          vec3 h = normalize(normalize(uKeyDir) + v);
          vGlint = pow(abs(dot(n, h)), 28.0);
          vec4 mv = viewMatrix * w;
          vDepth = -mv.z;
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        ${GLOBALS}
        ${FOG}
        uniform vec3 uColor;
        uniform float uOpacity;
        varying vec3 vBary;
        varying float vDepth;
        varying float vFacing;
        varying float vGlint;
        void main() {
          float e = min(min(vBary.x, vBary.y), vBary.z);
          // foreground glass is never in the focal plane: no crisp outline, the sliver's body fades to
          // nothing at its edges (a defocused shape) and only shows where it catches the key light
          float soft = smoothstep(0.0, 0.3, e);
          float body = 0.015 + 0.08 * pow(1.0 - vFacing, 2.0);
          vec3 col = uColor * body * 4.0 + uKeyColor * vGlint * 0.5;
          float a = (body + vGlint * 0.35) * soft * uOpacity * pzFogFade(vDepth) * smoothstep(0.8, 2.5, vDepth);
          if (a < 0.002) discard;
          gl_FragColor = vec4(col, a);
        }
      `,
      transparent: true,
      depthWrite: false,
      side: DoubleSide,
      blending: AdditiveBlending,
      fog: false,
    });
    this.mesh = new InstancedMesh(geo, material, count);
    this.mesh.frustumCulled = false;

    const r = rng(seed);
    // Right side and low: the left third belongs to the title (doc 11 §3 foreground, sparse).
    const anchors: ReadonlyArray<readonly [number, number, number]> = [
      [2.25, -1.6, 7.4],
      [2.85, 1.55, 4.0],
      [1.8, -2.05, 1.2],
      [3.05, 0.25, -1.8],
      [-2.55, -2.15, 5.0],
      [2.15, 2.25, 9.6],
      [-2.2, -1.75, -0.8],
      [2.6, -0.95, 11.0],
      [-2.95, 2.15, 8.2],
    ];
    for (let i = 0; i < count; i++) {
      const a = anchors[i % anchors.length];
      _p.set(a[0] + r.range(-0.2, 0.2), a[1] + r.range(-0.2, 0.2), a[2]);
      _axis.set(r.range(-1, 1), r.range(-1, 1), r.range(-0.4, 0.4)).normalize();
      _q.setFromAxisAngle(_axis, r.range(0.4, 2.6));
      const k = r.range(0.22, 0.42);
      _s.set(k, k, k);
      _m.compose(_p, _q, _s);
      this.mesh.setMatrixAt(i, _m);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  set opacity(v: number) {
    this.mesh.material.uniforms.uOpacity.value = v;
    this.mesh.visible = v > 0.002;
  }

  dispose(): void {
    this.mesh.removeFromParent();
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
    this.mesh.dispose();
  }
}
