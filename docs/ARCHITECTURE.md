# PROJECT ZERO — Architecture & Design Decisions

Design source of truth: the pre-production bibles in [`PROJECT_ZERO_PREPROD/`](../PROJECT_ZERO_PREPROD) (documents 01–17).
Content source of truth: the résumé ([`public/Animesh_Sharma_Resume.pdf`](../public/Animesh_Sharma_Resume.pdf)), encoded in [`src/content/`](../src/content).

---

## 1. Locked decisions (doc 9 §1 · doc 17 §9 pre-implementation gates)

| Gate | Decision |
|---|---|
| Signature archetype | **Neural Core Monolith.** A faceted spindle/lens monolith (8 facets, tapered at both ends) with an emissive inner core, an outer transition shell (A-02) and procedural internal channels. The silhouette never changes. SOC-0…SOC-8 change material, emission, scale and channel complexity. The channels accumulate as the journey grows: clause segments → threshold chambers → rails → web veins → kernel seams → ribbon. |
| Scene 0 beats | As in doc 6 §2 and doc 15 §1. |
| Performance budgets | 60 fps on desktop. Adaptive quality has three tiers (DPR, particle counts, bloom, fog planes) and steps down automatically. Rendering pauses while the tab is hidden. |
| Reduced motion | Follows `prefers-reduced-motion`, plus an understated in-world toggle. It removes camera amplitude, particle acceleration, light sweeps and parallax speed-ups, while every story beat stays. |
| Asset sources | Everything is procedural. Fonts are self-hosted (Sora, Inter, JetBrains Mono via `@fontsource`). The project "screenshot stage" planes are in-world hologram signage built from résumé facts, with an optional `screenshot` slot for real captures. |
| Content links | Résumé links plus public repository metadata: the LawLens-X repository, the Triage Assistant live demo and the BenefitBridge live demo. No phone number is rendered on the site. |

## 2. Stack

- Vite + TypeScript (strict) + three.js (vanilla, with imperative "directors" per doc 9 §4). No UI framework is needed, because all motion is derived from scroll/time progress.
- Post-processing: Render → restrained UnrealBloom (glow tokens) → Output (ACES) → grade pass (vignette, film grain, lifted blacks).
- Typography is a DOM `CinematicTextLayer`: real text that stays crisp at monument sizes, is accessible and indexable, and emerges through blur, opacity and a light pass.
- When text dissolves, `GlyphDust` rasterises the glyphs into WebGL particles that drift into the signature object.

## 3. Architecture (doc 9 §2 folder structure)

```
src/
  main.ts                     capability check → ExperienceRoot (lazy) | static fallback
  content/                    identity.ts, projects.ts, renderStatic.ts (résumé-derived, build-time SEO page)
  tokens/                     spacing · opacity · blur · glow · fog · particles · durations · easing · colour · palettes (doc 7)
  types/                      scene contract, directives
  utils/                      math, easing, seeded rng, keyframe timelines, lens → fov
  experience/
    ExperienceRoot.ts         render loop, scene streaming, transitions (TX-Absorb / TX-Dissolve / TX-CollapsePassage)
    RendererStage.ts          renderer, colour pipeline, DPR policy
    orchestration/            Scroll · Camera · Lighting · Fog · Input · Accessibility · Quality directors
    systems/                  AmbientMotes · MorphPoints · GlyphDust · SignatureObject · Sky · FogVolume ·
                              ArchitectureViz (EnergyLines, Panes, HoloPlane, Glow, LightBeam, materials) · PostFX
    scenes/                   Scene0Boot · Scene1Identity · ProjectWorlds/{LawLensX, Triage, WorkplaceOps,
                              BenefitBridge, MaviraOS, HealthCoach, shared/Dossier} · Ending
    ui/                       CinematicTextLayer · PortalButtons · MinimalOverlay
```

**Scene contract** (doc 9 §3.1): `prepareAssets() · enter() · update(frame) · exit() · cleanup()`.
Each scene writes *directives* every frame: camera shot, sky, lighting preset, fog token, signature state, particles and bloom. The orchestrator blends them and applies them through the directors.

**Timeline**: `[S0][TX][S1][TX][S2] … [S8]`. Every scene and every transition owns a scroll band. Inside a TX band the orchestrator:
- spikes fog F2 → F3 → F1 and raises the camera-attached fog curtain;
- pushes the camera into the boundary;
- pulls the signature object onto the optical axis as an absorbing lens and evolves its SOC state;
- swaps worlds at peak fog.

Scroll is damped with a per-segment maximum rate, so fast scrolling still plays every beat (doc 4 §2.3). Long jumps (Home/End) become a fog cut with cinematic catch-up.

## 4. Scenes

| # | Scene | Band | SOC | Transition out |
|---|---|---|---|---|
| 0 | Boot: "Every system begins with a single decision." (auto-plays ~20 s on first load) | 200vh | 0→1 | Absorb |
| 1 | Identity: corridor of architectural frames, ANIMESH SHARMA, three role lines, *Journey* | 280vh | 1 | Dissolve |
| 2 | LawLens-X: contract pages → red clause → fracture → five agents → output wall → title | 400vh | 2 | Absorb |
| 3 | Triage Assistant: heartbeat → unstable pathway → retrieval lock → G/Y/R thresholds (shape cues) → title | 400vh | 3 | Collapse |
| 4 | Workplace Operations Agent: message chaos → collision → three deterministic channels → grading nucleus → title | 400vh | 4 | Absorb |
| 5 | BenefitBridge: isolated lights → forms in fog → woven lattice ignites → role arcs & request corridors → title | 400vh | 5 | Dissolve |
| 6 | Mavira OS: contained glitch → boot strata align → kernel frame assembles → AppArmor barriers → Fail2Ban flare → title | 400vh | 6 | Absorb |
| 7 | Personal Health Coach: memory shards → curved folds → continuous warm ribbon → title | 400vh | 7 | Dissolve |
| 8 | Ending: completed signature → "The next chapter is waiting to be built." → Résumé · GitHub · LinkedIn · Email | 320vh | 8 | — |

Every world follows Laws 27–30, revealing information in this order: emotion → system metaphor (in-world signage) → **title climax** → tagline → sourced facts and stack → links.

## 5. Interaction & accessibility

- Mouse and touch move a damped light vector (key-light angle, particle drift bias). There is no cursor glow.
- ↑ ↓ / PgUp / PgDn step between readable holds, Home/End cut through fog with catch-up, and Esc settles the camera.
- A semantic `<main>` holds all content and links. It is injected at build time for SEO and screen readers. The canvas and decorative text are `aria-hidden`.
- Portals are real `<a>` elements that stay inert until their scene is on stage, with an in-world glow focus ring. A skip link and End both land focus on the contact portals.
- Triage thresholds carry shape and label cues as well as colour.
- Without WebGL (or with `?static`), the semantic page is shown as a quiet film still.

## 6. Verification

- `tsc --noEmit`, ESLint, and Vitest unit tests covering scroll mapping, damping, keyframe tracks, easing, tokens, content accuracy, signature evolution and directive blending.
- `scripts/smoke.mjs` runs end-to-end checks against the production build in headless Edge/Chrome.
- `scripts/shoot.mjs` seeks any scene or transition through the `?debug` API and captures keyframes (doc 15) for review against the bibles. `scripts/contact-sheet.py` tiles them.

## 7. Roadmap

- Real project screenshots: add them to `public/assets/screenshots/` and set `screenshot` in `src/content/projects.ts`.
- Optional ambient audio (doc 2 lists it as optional).
- Deployment to Vercel (`vercel.json` included).
