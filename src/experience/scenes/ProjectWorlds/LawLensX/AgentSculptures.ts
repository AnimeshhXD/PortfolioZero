/**
 * Five agent entities — visual actors, not UI icons (doc 2 §3 shape language, doc 11 §4).
 * Thin dark-alloy sculptures with an energy edge, each a distinct silhouette that suggests its role:
 *
 *   ClauseParser        a page skeleton: ragged ruled slats on a spine (the clause lines, parsed)
 *   RiskAnalyzer        a gyroscopic lens: crossed rings around an axis (examined from every angle)
 *   RiskScorer          a balance: post, beam and two pans (the tribunal's weighing — presides at the back)
 *   ScenarioSimulator   nested open orbits (possible futures, played forward)
 *   NegotiationAdvisor  two arcs turned toward each other, bridged (two parties, one advice)
 *
 * All five are merged into ONE mesh (one draw call). Each assembles bottom-up out of light
 * (uPresence[i]) with a resolving edge — the agents are rebuilt in real time.
 */
import {
  BufferAttribute,
  Color,
  CylinderGeometry,
  BoxGeometry,
  Matrix4,
  Mesh,
  ShaderMaterial,
  TorusGeometry,
  Euler,
  Quaternion,
  Vector3,
  type BufferGeometry,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { GlobalUniforms } from '../../../shaders/uniforms';
import { FOG, GLOBALS, LIGHT } from '../../../shaders/chunks';

const _m = new Matrix4();
const _q = new Quaternion();
const _e = new Euler();
const _s = new Vector3(1, 1, 1);
const _p = new Vector3();

function place(g: BufferGeometry, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0): BufferGeometry {
  _q.setFromEuler(_e.set(rx, ry, rz));
  _m.compose(_p.set(x, y, z), _q, _s);
  g.applyMatrix4(_m);
  return g;
}

const T = 0.014; // tube radius

function clauseParser(): BufferGeometry[] {
  const parts: BufferGeometry[] = [place(new CylinderGeometry(T, T, 1.18, 6), -0.34, 0, 0)];
  const lens = [0.62, 0.48, 0.66, 0.38, 0.58, 0.52, 0.3];
  lens.forEach((L, i) => parts.push(place(new BoxGeometry(L, 0.024, 0.03), -0.34 + 0.04 + L / 2, -0.46 + i * 0.152, 0)));
  return parts;
}

function riskAnalyzer(): BufferGeometry[] {
  return [
    place(new TorusGeometry(0.44, T, 6, 72), 0, 0, 0, 0, 0.95, 0),
    place(new TorusGeometry(0.44, T, 6, 72), 0, 0, 0, 1.25, 0, 0.3),
    place(new TorusGeometry(0.2, T * 0.9, 6, 48), 0, 0, 0, 0.3, -0.7, 0),
    place(new CylinderGeometry(T * 0.6, T * 0.6, 1.22, 6), 0, 0, 0),
  ];
}

function riskScorer(): BufferGeometry[] {
  // fulcrum at the origin (the core); post runs down to a ring base
  const parts: BufferGeometry[] = [
    place(new CylinderGeometry(T * 1.1, T * 1.1, 1.16, 6), 0, -0.5, 0),
    place(new CylinderGeometry(T * 0.9, T * 0.9, 1.18, 6), 0, 0.02, 0, 0, 0, Math.PI / 2),
    place(new TorusGeometry(0.24, T, 6, 56), 0, -1.08, 0, Math.PI / 2, 0, 0),
  ];
  for (const sx of [-1, 1]) {
    parts.push(place(new CylinderGeometry(T * 0.35, T * 0.35, 0.36, 4), sx * 0.57, -0.16, 0));
    parts.push(place(new TorusGeometry(0.15, T * 0.9, 6, 40), sx * 0.57, -0.34, 0, Math.PI / 2, 0, 0));
  }
  return parts;
}

function scenarioSimulator(): BufferGeometry[] {
  return [
    place(new TorusGeometry(0.2, T * 0.9, 6, 48, 4.6), 0, 0, 0, 1.3, 0.2, 0.4),
    place(new TorusGeometry(0.33, T, 6, 64, 4.4), 0, 0, 0, 0.45, 0.1, 1.9),
    place(new TorusGeometry(0.47, T, 6, 80, 4.2), 0, 0, 0, -0.2, 1.05, -0.6),
  ];
}

function negotiationAdvisor(): BufferGeometry[] {
  const arc = 2.3;
  return [
    place(new TorusGeometry(0.46, T, 6, 64, arc), 0.24, 0, 0, 0, 0.35, Math.PI - arc / 2),
    place(new TorusGeometry(0.46, T, 6, 64, arc), -0.24, 0, 0, 0, -0.35, -arc / 2),
    place(new CylinderGeometry(T * 0.55, T * 0.55, 0.3, 5), 0, 0, 0, 0, 0, Math.PI / 2),
  ];
}

const BUILDERS = [clauseParser, riskAnalyzer, riskScorer, scenarioSimulator, negotiationAdvisor];

export class AgentSculptures {
  readonly mesh: Mesh<BufferGeometry, ShaderMaterial>;
  private readonly presence: number[];

  /** positions: core of each agent (world). facing: world point each agent turns toward. */
  constructor(uniforms: GlobalUniforms, positions: readonly Vector3[], facing: Vector3, colors: { a: string; b: string }) {
    const geos: BufferGeometry[] = [];
    positions.forEach((pos, i) => {
      const parts = BUILDERS[i]();
      // normalised height within the agent (bottom-up assembly)
      let minY = Infinity;
      let maxY = -Infinity;
      for (const g of parts) {
        g.computeBoundingBox();
        minY = Math.min(minY, g.boundingBox!.min.y);
        maxY = Math.max(maxY, g.boundingBox!.max.y);
      }
      const yaw = Math.atan2(facing.x - pos.x, facing.z - pos.z);
      for (const g of parts) {
        const p = g.getAttribute('position');
        const h = new Float32Array(p.count);
        for (let k = 0; k < p.count; k++) h[k] = (p.getY(k) - minY) / Math.max(1e-3, maxY - minY);
        g.setAttribute('aH', new BufferAttribute(h, 1));
        g.setAttribute('aAgent', new BufferAttribute(new Float32Array(p.count).fill(i), 1));
        place(g, pos.x, pos.y, pos.z, 0, yaw, 0);
        geos.push(g);
      }
    });
    const merged = mergeGeometries(geos, false);
    geos.forEach((g) => g.dispose());
    if (!merged) throw new Error('AgentSculptures: merge failed');

    this.presence = [0, 0, 0, 0, 0];
    const material = new ShaderMaterial({
      uniforms: {
        ...uniforms,
        uPresence: { value: this.presence },
        uColorA: { value: new Color(colors.a) },
        uColorB: { value: new Color(colors.b) },
        uGlow: { value: 1 },
      },
      vertexShader: /* glsl */ `
        ${GLOBALS}
        attribute float aAgent;
        attribute float aH;
        uniform float uPresence[5];
        varying float vPres;
        varying float vH;
        varying float vAgent;
        varying vec3 vN;
        varying vec3 vWorld;
        varying float vDepth;
        void main() {
          int idx = int(aAgent + 0.5);
          vPres = uPresence[idx];
          vH = aH;
          vAgent = aAgent;
          vec4 w = modelMatrix * vec4(position, 1.0);
          vWorld = w.xyz;
          vN = normalize(mat3(modelMatrix) * normal);
          vec4 mv = viewMatrix * w;
          vDepth = -mv.z;
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        ${GLOBALS}
        ${FOG}
        ${LIGHT}
        uniform vec3 uColorA;
        uniform vec3 uColorB;
        uniform float uGlow;
        varying float vPres;
        varying float vH;
        varying float vAgent;
        varying vec3 vN;
        varying vec3 vWorld;
        varying float vDepth;
        void main() {
          float reveal = vPres * 1.3 - 0.15;
          if (vPres < 0.002 || vH > reveal) discard;
          float front = (1.0 - smoothstep(0.0, 0.09, reveal - vH)) * (1.0 - step(0.999, vPres));
          vec3 n = normalize(vN);
          vec3 v = normalize(uCameraPos - vWorld);
          vec3 accent = mix(uColorA, uColorB, vAgent / 4.0);
          vec3 lit = pzLight(n, v, vec3(0.13, 0.14, 0.17), 0.36, 0.85);
          float fres = pow(1.0 - max(dot(n, v), 0.0), 2.2);
          vec3 col = lit + accent * (0.16 + fres * 0.8) * uGlow + accent * front * 2.6;
          col = pzFog(col, vDepth);
          gl_FragColor = vec4(col, 1.0);
        }
      `,
      fog: false,
    });
    this.mesh = new Mesh(merged, material);
    this.mesh.frustumCulled = false;
  }

  setPresence(i: number, v: number): void {
    this.presence[i] = v;
  }

  /** Call once per frame after setPresence writes. */
  commit(glow: number): void {
    const u = this.mesh.material.uniforms;
    u.uGlow.value = glow;
    let any = 0;
    for (let i = 0; i < 5; i++) any = Math.max(any, this.presence[i]);
    this.mesh.visible = any > 0.002;
  }

  dispose(): void {
    this.mesh.removeFromParent();
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}
