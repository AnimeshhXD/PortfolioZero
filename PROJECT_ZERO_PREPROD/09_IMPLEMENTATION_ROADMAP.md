# PROJECT ZERO — IMPLEMENTATION ROADMAP (DOCUMENT 9)

> **Status:** Pre-Production (Planning Only) — **No code.**

---

## 0. Document Intent
This document defines the implementation plan and internal architecture.

Per directive:
- Implementation is forbidden until ALL production documents are complete and reviewed.
- This doc itself does not create code.

---

## 1. Pre-Implementation Acceptance Criteria
Before any implementation begins:
- Documents 1–9 exist (including this one)
- Signature object archetype is chosen and locked
- Scene 0 storyboard + motion beats are fully locked
- Performance budgets accepted
- Reduced motion rules accepted
- Asset pipeline defined and asset sources confirmed

If any missing: stop and request the specific missing inputs.

---

## 2. Folder Architecture (Implementation later)
Planned structure:
- src/
  - experience/
    - scenes/
      - Scene0Boot/
      - Scene1Identity/
      - ProjectWorlds/
      - Ending/
    - orchestration/
      - ScrollDirector/
      - CameraDirector/
      - LightingDirector/
      - FogDirector/
    - systems/
      - ParticleSystem/
      - SignatureObject/
      - ArchitectureViz/
      - PortalSystem/
    - ui/
      - CinematicTextLayer/
      - MinimalOverlay/
      - PortalButtons/
  - assets/
    - textures/
    - screenshots/
    - audio/
    - fonts/
  - utils/
  - types/

Public static assets:
- public/ (for fonts, baseline textures)

---

## 3. Scene Architecture
### 3.1 Scene contract
Each scene must implement conceptually:
- prepareAssets()
- enter(params)
- update(progress, inputState)
- exit()
- cleanup()

### 3.2 Scene 0 only phase rule
When starting, implement Scene 0 only:
- ensure no other scenes compile into the runtime flow
- navigation and project worlds remain disabled

---

## 4. Component Hierarchy (Technical)
Even though this is planning:
- ExperienceRoot
  - RendererStage (WebGL canvas)
  - CameraDirector
  - WorldDirector
    - SignatureObject
    - Particles
    - Fog
    - Lighting
  - TextDirector
  - InputDirector
    - MouseLighting
    - ScrollSceneProgress
  - AccessibilityDirector (reduced motion, contrast)

---

## 5. Asset Pipeline
### 5.1 Asset types
- textures (background gradients optional)
- model geometry (signature object, scene monoliths)
- screenshots (project hero planes, later)
- fonts
- audio ambience (optional)

### 5.2 Loading policy
- Use staged loading per scene.
- Prefetch minimal next-scene assets.
- Defer project screenshot assets until their world is close.

---

## 6. Animation Pipeline
### 6.1 Timing source
- ScrollDirector controls a normalized progress per scene.
- MotionDirector reads progress and sets:
  - camera checkpoints
  - fog density
  - typography resolution states
  - particle parameters

### 6.2 DOM transitions (rule)
If DOM transitions exist later:
- GSAP used only for DOM layer transitions.
- 3D transitions remain in the render layer.

### 6.3 UI motion (rule)
- Framer Motion only for small UI elements.

---

## 7. State Management Strategy
### 7.1 Scene state
- currentScene
- sceneProgress
- reducedMotion preference
- input state (mouse vector)

### 7.2 Determinism
- Avoid non-deterministic randomness unless seeded.
- For cinematic consistency, use fixed seeds for particles.

---

## 8. Three.js Architecture (implementation later)
### 8.1 Render layers
- geometry layer
- particle layer
- fog layer
- postprocessing (optional and controlled)

### 8.2 Post-processing rules
- Bloom minimal and controlled.
- DOF only if performance allows.

---

## 9. Content Loading Strategy
### 9.1 Source of truth
- Resume PDF and README/repo content.
- No fabrication.

### 9.2 Content schema
For each project world:
- title
- emotion arc
- key metrics (only from sources)
- screenshot references
- demo links and repo links

---

## 10. Testing Strategy
### 10.1 Automated checks
- TypeScript compile
- linting
- unit tests for directors (where possible)

### 10.2 Visual regression (manual)
- Record baseline clips per scene.
- Compare with expected shot composition.

---

## 11. Deployment Strategy
- Vercel recommended.
- Ensure assets are statically hosted.

---

## 12. Optimization Checklist
Before merge:
- confirm reduced motion mode
- verify particle budgets
- verify no memory leaks (dispose geometries/materials)
- confirm no heavy postprocessing stacks

---

## 13. Milestone Roadmap
### Milestone 1 — Scene 0 (Boot Sequence)
- Implement signature object seed behavior
- Implement two-sentence emergence dissolving into particles
- Implement camera hold/push rules
- Implement reduced motion variant

### Milestone 2 — Scene 1 (Identity)
- implement corridor and typography emergence

### Milestone 3 — One Project World
- implement LawLens-X world emotionally

### Milestone 4 — Remaining Project Worlds
- replicate world grammar and swap palettes/materials

### Milestone 5 — Ending
- signature completion + minimal actions

---

## 14. Developer Checklist (No surprises)
- [ ] No code is introduced beyond approved scenes
- [ ] All visuals match docs 1–8
- [ ] Reduced motion is respected
- [ ] Performance budgets maintained
- [ ] No missing external asset references

---

## 15. Next Step
Implementation is allowed only after:
- Document 9 finalized
- Internal review: Documents 1–9 accepted

---

