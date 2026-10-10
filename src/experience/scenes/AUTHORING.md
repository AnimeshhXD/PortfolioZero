# PROJECT ZERO — World Authoring Guide

How to build or extend a scene of the PROJECT ZERO film. The design source of truth is
`PROJECT_ZERO_PREPROD/01–17` (read the sections for the scene in full) and the content source of truth is
`src/content/` (résumé-derived). The reference implementation is `scenes/Scene0Boot/index.ts`.

---

## 1. Non-negotiables (doc 1 §9 laws, doc 17 §5 hard rejects)

- It is a film set, not a website. No cards, grids, dashboards, stat walls, skill bars, timelines, badges,
  terminals, typing effects, matrix rain, neon outlines, or UI hover colour swaps.
- **Emotion before information. The title is never shown first.** It resolves only at the climax beat.
- Typography never slides. It emerges fog→ink (`block.set(emerge, dissolve, sweep)`) and dissolves into
  glyph dust (`this.dust(block)`).
- Nothing moves quickly. No bounces, no random spins. Every motion has narrative purpose (Law 39: if an
  animation can be removed without losing emotion, remove it).
- Fog is a boundary, not a flat overlay. Lighting explains emotion. Bloom stays restrained. God rays are rare.
- Particles are volumetric (depth-placed points), never 2D sprites. Every particle field *means* something.
- Accessibility: never rely on colour alone (Triage thresholds need shape and label cues). Honour `frame.reducedMotion`.
- Content: use only strings from `src/content` (`getProject(id)`, `identity`). Never invent metrics, features or links.
- Performance over spectacle. Use `ctx.quality.count(n)` for every particle or instance count. Make no per-frame
  allocations (pre-allocate `Vector3`/`Color`), no per-frame geometry rebuilds, and aim for ≤ ~14 draw calls per world.

## 2. Where a scene lives

Each scene is self-contained in its own folder (e.g. `src/experience/scenes/ProjectWorlds/LawLensX/`). Its
`index.ts` must `export default () => new YourScene()`, and the scene is registered (band, holds, transition, SOC)
in `scenes/registry.ts`. Shared capabilities belong in the foundation (`systems/`, `orchestration/`, `ui/`), not
inside a single scene — keep scene folders free of cross-scene coupling.

## 3. The contract

```ts
class MyWorld extends BaseScene {            // scenes/BaseScene.ts
  constructor() { super('lawlens', 'lawlens'); }   // scene id, palette preset (tokens/palettes.ts)
  protected build(ctx: SceneContext) { … }   // build once: geometry, materials, text, portals (use this.track/add/text/portal/dust)
  update(f: SceneFrame) { … }                // every frame while on stage: animate + write this.directives
}
```

- `BaseScene` disposes everything you create via `this.track(x)`, `this.add(obj)` (scene root), `this.text()`,
  `this.portal()` and `this.dust()`. Text and portals are gated: they cannot show while the scene is off stage.
- `SceneFrame`: `progress` (0..1 in your band), `enter` (0→1 while arriving out of the transition fog, then 1),
  `exit` (0, then →1 while being absorbed by the outgoing transition), `time`, `dt`, `pointer` (damped NDC),
  `velocity`, `reducedMotion`, `tier`, `aspect`.
- **Determinism / scrubbing:** derive state from `progress` (and `enter`/`exit`) every frame. Never accumulate state
  across frames for story beats, because scrolling back must reverse everything. `time` may drive only ambient micro-motion.
  Use `rng(seed)` (utils/rng.ts), never `Math.random()`.

### Directives (write every frame, `this.directives`)

They start from your palette preset and persist between frames, so write every field you animate:

| field | meaning |
|---|---|
| `camera.position/target/fov/roll` | the shot. Use `shotTrack([...])` keyed to doc 15 frames 0/.2/.4/.6/.8/1; fov via `LENS` / `lensToFov(mm)` |
| `sky.top/horizon/bottom/rays/rayColor/rayDirection/intensity` | sky gradient; rays only at discovery/climax |
| `lighting.key*/rim*/ambient*/pointerInfluence` | emotion lighting (doc 12 for your scene) |
| `fog.density/color/curtain` | `FOG.F0..F3` density, `CURTAIN` tokens; density is the scene's emotional meter |
| `signature.soc/position/scale/emission/accentA/accentB/absorb/visibility/spin` | the evolving identity object (doc 14) |
| `particles.density/color/size/speed/focus/aperture/flow/intensity` | ambient motes + DOF focus distance (world units from camera) |
| `post.bloom/exposure/vignette/grain` | `GLOW` tokens for bloom |

### What the orchestrator already does (do NOT duplicate)

Between scenes there is a TX band. The orchestrator spikes fog F2→F3→F1, raises the camera-attached curtain,
pushes the camera into the boundary, pulls the signature onto the optical axis as an absorbing lens, evolves
its SOC from the previous scene's value to yours, focuses DOF on it, streams motes past the camera, and
swaps worlds at peak fog. You only author your world's own exit/entry behaviour using `f.exit` / `f.enter`
(e.g. pages liquefy into particles that flow to `this.ctx.signaturePosition`). Your title should dissolve on
exit through glyph dust absorbed into the signature: `title.set(e, f.exit)` + `dust.update(f.exit, ctx.signaturePosition)`.

## 4. Coordinates & scale

- Your world lives around the origin (worlds are swapped at peak fog, not placed in a line). Y is up and the camera
  typically looks toward −Z. Units ≈ metres. A typical set radius is 6–40 units.
- Fog visibility at density d: ~50% at distance 0.83/d (F1 0.01 → 83u, F2 0.028 → 30u, F3 0.085 → 10u).
- The signature's canonical scale is ~0.6–1.0 × a 3.3-unit-tall spindle. Place it deliberately (doc 11
  "Signature Object" focal point). A camera at ~9–14 units with a 35–50mm lens frames it well.
- Text is a DOM layer on top of the canvas. Composition slots: `center`, `center-left`, `upper-center`,
  `lower-center`, `lower-left`, `lower-right`, `upper-left`, `anchor` (pinned to a 3D point via `block.anchor`).
  Blocks in one slot stack vertically, and space is reserved even while hidden, so layouts never jump.
  The `pz-layer` class layers a block on the slot's optical centre instead of stacking it.

## 5. Beat convention for project worlds (keeps holds aligned: `PROJECT_HOLDS = [0.36, 0.74, 0.93]`)

| progress | beat | doc 15 frame |
|---|---|---|
| 0.00–0.08 | entry settles out of fog (focus blurred → resolves) | F0 |
| 0.08–0.25 | atmosphere / mystery | F20 |
| 0.25–0.42 | conflict (the "felt" problem; sharper contrast, local fog) | F40 (hold @0.36) |
| 0.42–0.56 | transformation | F60 |
| 0.56–0.68 | system stabilises; in-world signage labels (anchor slot, L3) may appear | F80 |
| 0.68–0.76 | **TITLE CLIMAX**: monument resolves with light pass; SOC stage completes; brief bloom G2→G3 | F100 (hold @0.74) |
| 0.76–0.82 | tagline (subtitle) resolves; breathing hold |  |
| 0.82–0.88 | dossier resolves: facts, signals, stack (mono), portals |  |
| 0.88–1.00 | full readable hold; camera near-static (micro orbit) | (hold @0.93) |
| exit | your transition behaviour (doc 2 "Transition Behavior"); text dissolves into the signature |  |

### Standard post-climax layout (consistent across worlds)

Use `ProjectWorlds/shared/Dossier.ts`: it builds this stack, applies the shared beat timing and dissolves it into
the signature on exit (`new Dossier(factory, project, { accent, accentB, lines })` → `dossier.update(p, f.exit, ctx.signaturePosition)`;
`Dossier.presence(p)` gives the 0..1 dossier strength to dim the world behind it).


All of it in slot `center`, created in this order so the stack is balanced and stable:

1. `monument`: `project.monument` (pass `lines` for long names, e.g. `['WORKPLACE', 'OPERATIONS AGENT']`)
2. `subtitle`: `project.tagline`
3. `body` × (2–3, or 1 when `innerWidth < 700`): `project.facts` with `maxWidth: '58ch'`
4. `label`: signals joined, e.g. `75–85% · accuracy on legal risk detection` (skip if none)
5. `mono`: `project.stack.join('  ·  ')`
6. portals: `this.portal({ label, href, slot: 'center', group: 'links', description: '<name> — <label>', accent })`

While the dossier is up, dim and calm the world (lower particle intensity, steadier light) so text reads
(doc 1 §5.5). Pre-climax in-world signage must be sparse (≤ 6 labels), resume vocabulary only (`project.vocabulary`).

## 6. Toolkit (import from `src/experience/systems/...`, `src/utils/...`, `src/tokens/...`)

- `MorphPoints(ctx.uniforms, {start, end, order?, tint?, colorA, colorB, size, stagger, swirl, drift, additive})`
  is a progress-driven point field (fracture→thread, chaos→order, scatter→lattice, shards→ribbon, words→seed).
  `.mix`, `.opacity`, `.jitter`, `.setFadeWindow(a,b)`, `.setEnd(arr)`, `.points`.
- `EnergyLines(ctx.uniforms, {curves, radius, radii, order, tint, colorA, colorB, stagger})` gives merged tubes in one
  draw call. `.draw` (0..1 draw-in), `.opacity`, `.uniforms.uFlow` (pulse speed), `uPulses`, `uPulseAmount`, `uWobble`
  (instability), `uFlicker`, `uIntensity`.
- `Panes(ctx.uniforms, {count, width, height, colorA, colorB, glowColor, opacity, lines, additive})` gives instanced translucent
  sheets (pages, clauses, messages, forms, fragments, shards). `.setInstance(i, x,y,z, rx,ry,rz, sx,sy)`,
  `.glow.setX(i,v)`, `.tint.setX(i,v)`, `.commit()`, uniforms `uScanDir/uScanPos/uScanWidth/uScanAmount/uScanColor`
  (scanning light), `uDrift`, `uFall/uFallRange`, `uLines`, `uDim`, `uOpacity`.
- `HoloPlane(ctx.uniforms, {width, height, imageUrl?, draw?(ctx2d,w,h), tint, holographic})` is the screenshot stage
  (Law 31: massive plane, never a card). With no `project.screenshot`, paint in-world signage with
  `drawSignage(ctx2d, w, h, lines)` and `drawRule(...)` using resume strings only. `.reveal`, `.sweep`, `.opacity`.
- `Glow` (billboard soft light: `.intensity`, `.color`), `GlowField(uniforms, positions, {size,color,colorB,tint})`
  (many lights in one draw: `.setBrightness(i,v)`, `.commit()`, `.intensity`), `LightBeam(uniforms, {length,radius,color})`
  (volumetric shaft: `.aim(target)`, `.intensity`).
- `alloy()`, `stone()`, `seam(color)`: `MeshStandardMaterial` presets lit by the LightingDirector and fogged automatically.
- `sampleSignatureSurface(n, seed, scale)` gives points on the signature hull (for particles that flow onto it).
- Timelines: `shotTrack`, `track`, `colorTrack`, `vec3Track` (utils/timeline.ts). Math: `beat(p,a,b,ease)`,
  `envelope(p,a,b,c,d)`, `bell(p,c,w)`, `smoothstep`, `remap`, `lerp`, `damp` (utils/math.ts). Easing:
  `easeOutPremium` (reveals), `softEaseIn` (camera pushes), `easeInOutPremium`.
- Tokens: `FOG`, `CURTAIN`, `EMISSION`, `GLOW`, `PARTICLE`, `LENS`, `ACCENT`, `NEUTRAL`, `TEMPERATURE`, `PALETTES`.
- Shader chunks (`shaders/chunks.ts`): `GLOBALS`, `NOISE` (snoise, fbm3, curlish, pzHash), `FOG` (pzFog, pzFogFade),
  `LIGHT` (pzLight), `POINTS_VERT/POINTS_FRAG` (bokeh points), `EASE_GLSL`. For custom `ShaderMaterial`s spread
  `...ctx.uniforms` into `uniforms` and set `fog: false`, using the pz fog helpers.

## 7. Verify like a cinematographer

1. `npm run typecheck` must be clean.
2. `npx eslint src/experience/scenes/<SceneDir>` must be clean.
3. `node scripts/shoot.mjs --scenes <id> --at 0,0.2,0.4,0.6,0.74,0.8,0.93 --tier high --out shots/<id>`, then
   **review every frame** (`python scripts/contact-sheet.py sheet.png shots/<id>/*.png` tiles them) against doc 11 (composition), doc 12 (lighting) and doc 15
   (keyframes). Iterate until each frame would pass doc 17's gates.
4. Transitions: `--tx <previousSceneId>:0.6,0.8` (your entry) and `--tx <id>:0.2,0.4` (your exit), plus
   `--motion reduced` and `--mobile` passes. Fix console errors the script prints.

Scene ids: `boot, identity, lawlens, triage, workplace, benefitbridge, mavira, healthcoach, ending`.
