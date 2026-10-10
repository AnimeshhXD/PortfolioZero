/**
 * Ending set pieces (doc 2 §9, doc 1 §3.3 "Stone — use: ending closure"):
 *
 *  - StoneMirrorFloor: a near-black polished stone ground that is barely there. It exists as three
 *    quiet things only: a soft pool of the sculpture's own light beneath it, a grazing sheen that
 *    catches the horizon, and a glossy ghost of the completed signature (Fresnel-weighted, fading
 *    with distance from its footprint). Its far edge dissolves into the sky so there is no horizon seam.
 *
 *  - SignatureMirror: the reflection itself. It re-draws the foundation signature's own meshes
 *    (shared geometry + shared materials, so every uniform — SOC, spin, breathing — is identical)
 *    through a mirror matrix about the floor plane, *underneath* the semi-opaque floor. No second
 *    signature, no extra lights, no render target. Nothing here is disposed except our own wrappers.
 */
import {
  CircleGeometry,
  Color,
  Group,
  LineSegments,
  Matrix4,
  Mesh,
  ShaderMaterial,
  Vector2,
  type Object3D,
} from 'three';
import type { GlobalUniforms } from '../../shaders/uniforms';
import { FOG, GLOBALS, NOISE } from '../../shaders/chunks';
import { ACCENT } from '../../../tokens/tokens';

export interface StoneMirrorFloorOptions {
  y: number;
  radius: number;
  /** Radii over which the stone dissolves into the sky. */
  fadeStart: number;
  fadeEnd: number;
  base: string;
}

export class StoneMirrorFloor {
  readonly mesh: Mesh<CircleGeometry, ShaderMaterial>;

  constructor(uniforms: GlobalUniforms, opts: StoneMirrorFloorOptions) {
    const geo = new CircleGeometry(opts.radius, 96);
    geo.rotateX(-Math.PI / 2);
    const material = new ShaderMaterial({
      uniforms: {
        ...uniforms,
        uBase: { value: new Color(opts.base) },
        uPoolColor: { value: new Color(ACCENT.coolWhite) },
        uPool: { value: 0.05 },
        uSheenColor: { value: new Color(ACCENT.coolWhite) },
        uSheen: { value: 0.05 },
        uReflect: { value: 0.4 },
        uCenter: { value: new Vector2(0, 0) },
        uFadeStart: { value: opts.fadeStart },
        uFadeEnd: { value: opts.fadeEnd },
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
        uniform vec3 uPoolColor;
        uniform float uPool;
        uniform vec3 uSheenColor;
        uniform float uSheen;
        uniform float uReflect;
        uniform vec2 uCenter;
        uniform float uFadeStart;
        uniform float uFadeEnd;
        varying vec3 vWorld;
        varying float vDepth;
        void main() {
          vec2 rel = vWorld.xz - uCenter;
          float r = length(rel);
          vec3 v = normalize(uCameraPos - vWorld);
          float ndv = clamp(v.y, 0.0, 1.0);
          float fres = pow(1.0 - ndv, 5.0);

          // matte, weighty stone: broad quiet tonal variation only (never sand-texture randomness)
          float n = snoise(vec3(vWorld.xz * 0.11, 3.7)) * 0.5 + 0.5;
          vec3 col = uBase * (0.82 + n * 0.3);
          col += uAmbient * 0.18;

          // the completed sculpture is the set's practical light: a soft pool beneath it
          float pool = exp(-r * r / 5.0) + exp(-r * r / 28.0) * 0.2;
          col += uPoolColor * pool * uPool;

          // grazing sheen: the far stone catches the horizon line
          col += uSheenColor * fres * uSheen * smoothstep(4.0, 26.0, r);

          col = pzFog(col, vDepth);

          // dissolve into the sky — no visible floor edge
          float fade = 1.0 - smoothstep(uFadeStart, uFadeEnd, r);
          // glossy reflection: Fresnel-weighted, softly lost with distance from the footprint
          float refl = uReflect * mix(0.35, 1.0, fres) * exp(-r * r / 36.0);
          float a = fade * (1.0 - refl);
          if (a < 0.004) discard;
          gl_FragColor = vec4(col, a);
        }
      `,
      transparent: true,
      // depth-writing so ambient motes below the floor plane stay hidden under the stone
      depthWrite: true,
      fog: false,
    });
    this.mesh = new Mesh(geo, material);
    this.mesh.position.y = opts.y;
    this.mesh.frustumCulled = false;
    this.mesh.name = 'Ending:StoneFloor';
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

/**
 * Re-draws the signature's meshes mirrored about y = floorY (see file header).
 * Render order places every mirrored piece BEFORE the floor so the stone veils them.
 */
export class SignatureMirror {
  readonly group = new Group();
  private pairs: Array<{ src: Object3D; dst: Object3D }> = [];
  private reflect = new Matrix4();
  private enabled = true;

  constructor(
    private readonly source: Object3D,
    floorY: number,
    renderOrderBase: number,
  ) {
    this.group.name = 'Ending:SignatureMirror';
    // Reflection about the horizontal plane y = floorY: (x, y, z) → (x, 2·floorY − y, z).
    this.reflect.set(1, 0, 0, 0, 0, -1, 0, 2 * floorY, 0, 0, 1, 0, 0, 0, 0, 1);
    // Only surfaces are reflected (intake points and the practical light are not).
    const drawn = source.children.filter((c) => c instanceof Mesh || c instanceof LineSegments);
    const minOrder = drawn.reduce((m, c) => Math.min(m, c.renderOrder), Infinity);
    for (const child of drawn) {
      const dst: Mesh | LineSegments =
        child instanceof LineSegments ? new LineSegments(child.geometry, child.material) : new Mesh((child as Mesh).geometry, (child as Mesh).material);
      dst.matrixAutoUpdate = false;
      dst.frustumCulled = false;
      dst.renderOrder = renderOrderBase + (child.renderOrder - minOrder);
      // Exact, lag-free: the source's world matrix is current by the time anything is drawn.
      const src = child;
      dst.onBeforeRender = () => {
        dst.matrixWorld.multiplyMatrices(this.reflect, src.matrixWorld);
      };
      this.pairs.push({ src, dst });
      this.group.add(dst);
    }
  }

  /** Show/hide the reflection (follows the real signature's own visibility). */
  sync(on: boolean): void {
    this.enabled = on;
    const live = on && this.source.visible;
    for (const p of this.pairs) p.dst.visible = live && p.src.visible;
  }

  get active(): boolean {
    return this.enabled;
  }

  dispose(): void {
    // Geometry/materials belong to the foundation signature — only drop our wrappers.
    this.group.removeFromParent();
    this.group.clear();
    this.pairs = [];
  }
}
