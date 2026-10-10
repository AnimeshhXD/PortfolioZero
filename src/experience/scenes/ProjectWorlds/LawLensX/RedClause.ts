/**
 * The red clause — the single outlier page (doc 11 §4 primary focal point, doc 13 P-02).
 *
 * It is pre-fractured into shards (impact fan + concentric ring, like a pane under stress) but looks
 * exactly like every other page until the light finds it. Then:
 *   uRed      one ruled clause line burns red and its halo spills onto the sheet
 *   uCrack    hairline cracks propagate outward from the clause (constant pixel width via fwidth)
 *   uFracture shards let go — rotating apart on their own axes, fracture faces catching the rim light
 * Wrongness is carried by shape and motion (tilt out of alignment, cracks, separation), not colour alone.
 */
import { BufferAttribute, BufferGeometry, Color, DoubleSide, Mesh, NormalBlending, ShaderMaterial, Vector2 } from 'three';
import type { GlobalUniforms } from '../../../shaders/uniforms';
import { FOG, GLOBALS } from '../../../shaders/chunks';
import { PAPER_GLSL } from './paper';
import { rng } from '../../../../utils/rng';

export interface RedClauseOptions {
  width: number;
  height: number;
  /** Clause row (0 = top ruled row of 17). */
  row: number;
  paperA: string;
  paperB: string;
  redColor: string;
  seed: number;
  /** Shared scan uniforms (same {value} objects as the page field so the sweep is continuous). */
  scan: { uScanDir: { value: unknown }; uScanPos: { value: unknown }; uScanWidth: { value: unknown }; uScanAmount: { value: unknown }; uScanColor: { value: unknown } };
}

export class RedClause {
  readonly mesh: Mesh<BufferGeometry, ShaderMaterial>;
  /** Local-space crack origin (on the clause line). */
  readonly origin: Vector2;

  constructor(uniforms: GlobalUniforms, opts: RedClauseOptions) {
    const W = opts.width;
    const H = opts.height;
    const r = rng(opts.seed);
    const rowCenterV = 1 - (opts.row + 0.5) / 17;
    const origin = new Vector2(-0.06 * W, (rowCenterV - 0.5) * H);
    this.origin = origin;

    // perimeter: 4 corners + irregular edge points, sorted by angle around the crack origin
    const perim: Vector2[] = [new Vector2(-W / 2, -H / 2), new Vector2(W / 2, -H / 2), new Vector2(W / 2, H / 2), new Vector2(-W / 2, H / 2)];
    const extra = 11;
    for (let i = 0; i < extra; i++) {
      const t = r.next() * (2 * W + 2 * H);
      if (t < W) perim.push(new Vector2(-W / 2 + t, -H / 2));
      else if (t < W + H) perim.push(new Vector2(W / 2, -H / 2 + (t - W)));
      else if (t < 2 * W + H) perim.push(new Vector2(W / 2 - (t - W - H), H / 2));
      else perim.push(new Vector2(-W / 2, H / 2 - (t - 2 * W - H)));
    }
    perim.sort((a, b) => Math.atan2(a.y - origin.y, a.x - origin.x) - Math.atan2(b.y - origin.y, b.x - origin.x));
    const ring = perim.map((pt) => new Vector2().lerpVectors(origin, pt, r.range(0.3, 0.56)));

    const pos: number[] = [];
    const uv: number[] = [];
    const bary: number[] = [];
    const mask: number[] = [];
    const center: number[] = [];
    const axis: number[] = [];
    const info: number[] = [];
    const maxR = Math.max(...perim.map((pt) => pt.distanceTo(origin)));

    const pushTri = (a: Vector2, b: Vector2, c: Vector2, m: [number, number, number], cen: Vector2, ax: [number, number, number], dist: number, rnd: number) => {
      const verts = [a, b, c];
      const bs = [
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1],
      ];
      for (let k = 0; k < 3; k++) {
        const v = verts[k];
        pos.push(v.x, v.y, 0);
        uv.push(v.x / W + 0.5, v.y / H + 0.5);
        bary.push(bs[k][0], bs[k][1], bs[k][2]);
        mask.push(m[0], m[1], m[2]);
        center.push(cen.x, cen.y, 0);
        axis.push(ax[0], ax[1], ax[2]);
        info.push(dist, rnd);
      }
    };
    const randAxis = (): [number, number, number] => {
      const [x, y, z] = r.onSphere(1);
      return [x, y, z];
    };

    const n = perim.length;
    for (let i = 0; i < n; i++) {
      const P0 = perim[i];
      const P1 = perim[(i + 1) % n];
      const A0 = ring[i];
      const A1 = ring[(i + 1) % n];
      // inner shard (origin, A0, A1): all three edges are cracks
      const cIn = new Vector2().add(origin).add(A0).add(A1).multiplyScalar(1 / 3);
      pushTri(origin, A0, A1, [1, 1, 1], cIn, randAxis(), cIn.distanceTo(origin) / maxR, r.next());
      // outer shard quad (A0, P0, P1, A1) → two triangles; page boundary and diagonal are not cracks
      const cOut = new Vector2().add(A0).add(P0).add(P1).add(A1).multiplyScalar(0.25);
      const ax = randAxis();
      const dist = cOut.distanceTo(origin) / maxR;
      const rnd = r.next();
      pushTri(A0, P0, P1, [0, 0, 1], cOut, ax, dist, rnd);
      pushTri(A0, P1, A1, [1, 1, 0], cOut, ax, dist, rnd);
    }

    const geo = new BufferGeometry();
    geo.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3));
    geo.setAttribute('uv', new BufferAttribute(new Float32Array(uv), 2));
    geo.setAttribute('aBary', new BufferAttribute(new Float32Array(bary), 3));
    geo.setAttribute('aMask', new BufferAttribute(new Float32Array(mask), 3));
    geo.setAttribute('aCenter', new BufferAttribute(new Float32Array(center), 3));
    geo.setAttribute('aAxis', new BufferAttribute(new Float32Array(axis), 3));
    geo.setAttribute('aInfo', new BufferAttribute(new Float32Array(info), 2));

    const material = new ShaderMaterial({
      uniforms: {
        ...uniforms,
        ...opts.scan,
        uPaperA: { value: new Color(opts.paperA) },
        uPaperB: { value: new Color(opts.paperB) },
        uRedColor: { value: new Color(opts.redColor) },
        uRow: { value: opts.row },
        uSeed: { value: 0.37 },
        uOrigin: { value: origin.clone() },
        uMaxR: { value: maxR },
        uRed: { value: 0 },
        uCrack: { value: 0 },
        uFracture: { value: 0 },
        uSpread: { value: 0.75 },
        uOpacity: { value: 1 },
        uPaperOpacity: { value: 0.2 },
        uDim: { value: 1 },
      },
      vertexShader: /* glsl */ `
        ${GLOBALS}
        attribute vec3 aBary;
        attribute vec3 aMask;
        attribute vec3 aCenter;
        attribute vec3 aAxis;
        attribute vec2 aInfo;
        uniform float uFracture;
        uniform float uSpread;
        uniform vec2 uOrigin;
        varying vec2 vUv;
        varying vec3 vBary;
        varying vec3 vMask;
        varying vec2 vLocal;
        varying vec3 vWorld;
        varying float vDepth;
        varying float vFacing;
        varying float vShard;
        vec3 pzRot(vec3 v, vec3 k, float a) {
          float c = cos(a);
          float s = sin(a);
          return v * c + cross(k, v) * s + k * dot(k, v) * (1.0 - c);
        }
        void main() {
          vUv = uv;
          vBary = aBary;
          vMask = aMask;
          vLocal = position.xy;
          // shards near the crack origin let go first
          float k = clamp(uFracture * 1.55 - aInfo.x * 0.55, 0.0, 1.0);
          k = k * k * (3.0 - 2.0 * k);
          vShard = k;
          float rm = 1.0 - uReducedMotion * 0.7;
          vec3 ax = normalize(aAxis);
          float ang = k * (0.5 + aInfo.y * 1.5) * rm;
          vec3 q = pzRot(position - aCenter, ax, ang);
          vec3 dir = normalize(vec3(aCenter.xy - uOrigin, 0.0) + vec3(0.0, 0.0, 1e-3));
          vec3 p = aCenter + q + (dir * (0.3 + aInfo.x * 0.9) + vec3(0.0, -0.15, (aInfo.y - 0.25) * 0.8)) * k * uSpread * rm;
          vec4 w = modelMatrix * vec4(p, 1.0);
          vWorld = w.xyz;
          vec3 nrm = normalize(mat3(modelMatrix) * pzRot(vec3(0.0, 0.0, 1.0), ax, ang));
          vec4 mv = viewMatrix * w;
          vDepth = -mv.z;
          vFacing = abs(dot(normalize(cameraPosition - w.xyz), nrm));
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        ${GLOBALS}
        ${FOG}
        ${PAPER_GLSL}
        uniform vec3 uPaperA;
        uniform vec3 uPaperB;
        uniform vec3 uRedColor;
        uniform float uRow;
        uniform float uSeed;
        uniform vec2 uOrigin;
        uniform float uMaxR;
        uniform float uRed;
        uniform float uCrack;
        uniform float uOpacity;
        uniform float uPaperOpacity;
        uniform float uDim;
        uniform vec3 uScanDir;
        uniform float uScanPos;
        uniform float uScanWidth;
        uniform float uScanAmount;
        uniform vec3 uScanColor;
        varying vec2 vUv;
        varying vec3 vBary;
        varying vec3 vMask;
        varying vec2 vLocal;
        varying vec3 vWorld;
        varying float vDepth;
        varying float vFacing;
        varying float vShard;
        void main() {
          float coc = clamp(uAperture * abs(vDepth - uFocus) / max(vDepth, 0.5), 0.0, 1.0) * 0.4;
          vec3 pp = pzPaper(vUv, uSeed, coc);
          float lines = pp.x;
          float rim = pp.y;
          float body = pp.z;
          vec3 base = mix(uPaperA, uPaperB, uSeed);
          vec3 col = base * (0.22 + lines * 0.42 + rim * 0.36) * uDim;
          float a = uPaperOpacity * body * (0.45 + lines * 0.38 + rim * 0.4) * mix(0.4, 1.0, vFacing);
          float sd = (dot(vWorld, normalize(uScanDir)) - uScanPos) / max(uScanWidth, 1e-3);
          float scan = exp(-sd * sd) * uScanAmount;
          col += uScanColor * scan * (0.5 + lines * 1.3 + rim * 0.8);
          a += scan * 0.2 * body;

          // the clause: one ruled line burns red, its halo spills across the sheet
          float fy = (1.0 - vUv.y) * PZ_ROWS;
          float band = 1.0 - smoothstep(0.1, 0.32, abs(fract(fy) - 0.5));
          float onRow = 1.0 - step(0.5, abs(floor(fy) - uRow));
          float clause = band * onRow * smoothstep(0.1, 0.13, vUv.x) * (1.0 - smoothstep(0.8, 0.83, vUv.x));
          float halo = exp(-pow((fy - (uRow + 0.5)) / 1.8, 2.0)) * body;
          col += uRedColor * (clause * 3.4 + halo * 0.55) * uRed;
          a = max(a, clause * uRed * 0.95 * body);
          a += halo * uRed * 0.16;

          // hairline cracks propagating from the clause
          vec3 b = vBary + (1.0 - vMask) * 10.0;
          float d = min(min(b.x, b.y), b.z);
          float fw = max(fwidth(d), 1e-4);
          float crackLine = 1.0 - smoothstep(fw * 0.6, fw * 2.6, d);
          float reach = 1.0 - smoothstep(uCrack * uMaxR * 1.05 - 0.04, uCrack * uMaxR * 1.05, length(vLocal - uOrigin));
          float crack = crackLine * reach * step(0.001, uCrack);
          col += uRedColor * crack * 2.0 * (1.0 - vShard * 0.5);
          col += uRimColor * crack * vShard * 1.4;
          a = max(a, crack * 0.85 * body);
          // separated shards: fracture faces catch the rim light
          col += uRimColor * vShard * (1.0 - vFacing) * 0.7;

          col = mix(col, uFogColor, pzFogFactor(vDepth) * 0.8);
          a *= uOpacity * (1.0 - smoothstep(0.35, 1.0, vShard));
          if (a < 0.002) discard;
          gl_FragColor = vec4(col, a);
        }
      `,
      transparent: true,
      depthWrite: false,
      side: DoubleSide,
      blending: NormalBlending,
      fog: false,
    });
    this.mesh = new Mesh(geo, material);
    this.mesh.frustumCulled = false;
  }

  get uniforms(): ShaderMaterial['uniforms'] {
    return this.mesh.material.uniforms;
  }

  /** Sample points on the sheet (local space, z=0) for the fracture motes. Biased toward the clause line. */
  static sample(count: number, seed: number, width: number, height: number, row: number): Float32Array {
    const r = rng(seed);
    const out = new Float32Array(count * 3);
    const rowY = (0.5 - (row + 0.5) / 17) * height;
    for (let i = 0; i < count; i++) {
      const nearClause = r.next() < 0.35;
      out[i * 3] = r.range(-0.46, 0.46) * width;
      out[i * 3 + 1] = nearClause ? rowY + r.gauss() * 0.025 : r.range(-0.47, 0.47) * height;
      out[i * 3 + 2] = r.range(-0.01, 0.01);
    }
    return out;
  }

  dispose(): void {
    this.mesh.removeFromParent();
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}
