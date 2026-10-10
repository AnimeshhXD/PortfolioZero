# PROJECT ZERO — ASSET PRODUCTION BIBLE (DOCUMENT 13)

> **Status:** Pre-Production (Planning Only) — **No code.**

---

## 0. Document Intent
This is the master inventory of every visual asset the implementation team must create or collect.

Assets must not be invented during implementation.

For each asset define:
- Asset Name
- Purpose
- Geometry Type
- Material
- Shader Type (conceptual)
- Animation
- Reuse Opportunities
- Level of Detail
- Performance Cost
- Scene Usage

> Shader Type is conceptual until implementation picks exact pipelines.

---

## 1. Signature Object Assets (Global)
### A-01: Signature Core (Base)
- **Purpose:** Recurring identity object; transitions anchor.
- **Geometry Type:** monolithic + internal seams (single mesh or grouped)
- **Material:** signature evolving material (conceptually glass→metal→stone)
- **Shader Type:** emission/energy-capable physically-based shader
- **Animation:** subtle internal growth + absorption response
- **Reuse Opportunities:** all scenes (signature evolution)
- **LOD:** 0–2 (high/medium/low)
- **Performance Cost:** medium (one primary object)
- **Scene Usage:** all transitions, ending final form

### A-02: Signature Transition Shell
- **Purpose:** helps signature absorb/rebuild fragments
- **Geometry Type:** thin outer shell/volume
- **Material:** transparent energy glass
- **Shader Type:** refraction + emission
- **Animation:** emission ramp during transitions
- **Reuse Opportunities:** all transitions
- **LOD:** 0–1
- **Performance Cost:** low-medium
- **Scene Usage:** between projects and ending

---

## 2. Core Environment Geometry Assets
### E-01: Floating Architectural Frame Module
- Purpose: corridor/set structure for identity.
- Geometry: modular struts/arches planes
- Material: dark metal alloy (brushed)
- Shader: PBR + subtle anisotropic highlights
- Animation: slight breathing micro movement
- Reuse: Identity + all worlds as meta-structure
- LOD: 2
- Performance: low-medium
- Scenes: 1 (Identity) + occasional framing backgrounds

### E-02: Neural Lattice Module
- Purpose: contract intelligence / AI pathway visuals
- Geometry: tubular lattice segments
- Material: energy emission (cyan/violet variants)
- Shader: energy ribbon with soft falloff
- Animation: draw-in and pulse with constraints
- Reuse: LawLens-X, Triage, Personal Health Coach
- LOD: 2
- Perf: medium (path count controlled)
- Scenes: 2, 3, 7

### E-03: Deterministic Rails Module
- Purpose: workplace ordering constraints metaphor
- Geometry: rails + nodes intersections
- Material: metal frame + subtle emission
- Shader: line/ribbon energy + PBR
- Animation: align progression (misaligned→aligned)
- Reuse: Workplace world
- LOD: 2
- Perf: medium
- Scenes: 4

### E-04: Hardened Kernel Core Pieces
- Purpose: Mavira OS core assembly
- Geometry: fractured pieces that assemble into monolith
- Material: dark metal + stone seams
- Shader: PBR + minimal emission seams
- Animation: assembly morph (piece movement and lock)
- Reuse: Mavira OS only
- LOD: 3
- Perf: medium
- Scenes: 6

### E-05: Eligibility Matching Lattice
- Purpose: BenefitBridge connecting paths web
- Geometry: interwoven strands lattice
- Material: stone/paper hybrid matte + warm emission
- Shader: matte with selective emissive paths
- Animation: gradual path illumination
- Reuse: BenefitBridge only
- LOD: 2
- Perf: medium-low (paths controlled)
- Scenes: 5

---

## 3. Particle & Volumetrics Assets
### P-01: Ambient Micro-Mote Particle Cloud
- Purpose: baseline atmosphere depth
- Geometry: point sprites/instanced particles
- Material: emission dust (very low)
- Shader: volumetric-ish point shading with soft edges
- Animation: slow drift / orbit
- Reuse: all scenes
- LOD: 2-3 (reduced counts)
- Perf: low
- Scenes: all

### P-02: Contract Clause Fragment Particle Pack
- Purpose: clause fracture into particles
- Geometry: small shards/particles
- Material: translucent paper/ink
- Shader: soft scattering + emission on impact
- Animation: fracture burst (rare, short)
- Reuse: LawLens-X only
- LOD: 1
- Perf: medium (burst controlled)
- Scenes: 2

### P-03: Medical Neural Pathway Micro Sparks
- Purpose: triage system uncertainty and collapse
- Geometry: tiny energy sparks
- Material: threshold glow (green/yellow/red)
- Shader: additive/subtractive controlled emission
- Animation: wobble/lock (unstable→stable)
- Reuse: Triage Assistant only
- LOD: 1-2
- Perf: low-medium
- Scenes: 3

### P-04: Glitch Dust (Contained)
- Purpose: Mavira OS early instability
- Geometry: motes with jitter
- Material: neutral glitch haze
- Shader: noise-based distortion (subtle)
- Animation: short jitter windows
- Reuse: Mavira OS only
- LOD: 1
- Perf: low-medium
- Scenes: 6

---

## 4. Fog & Sky Assets
### F-01: Volumetric Fog Volume System
- Purpose: narrative boundary and scene cut
- Geometry: volume shells
- Material: fog scattering
- Shader: density-based scattering
- Animation: density changes per token
- Reuse: all transitions
- LOD: 2
- Perf: medium (fog tuning)
- Scenes: all

### S-01: Sky Gradient Layer
- Purpose: background depth and color grading
- Geometry: sky plane/volume gradient
- Material: gradient emission
- Shader: gradient LUT
- Animation: slow drift
- Reuse: all scenes
- LOD: low
- Perf: low
- Scenes: all

---

## 5. Typography Plane Assets
### T-01: Floating Typography Plane (In-world)
- Purpose: monumental text physically present
- Geometry: text mesh / plane with depth
- Material: emissive ink with controlled bloom
- Shader: distance field / SDF text shading
- Animation: fog emergence + light pass
- Reuse: Title reveals + signature sentence in ending
- LOD: 2
- Perf: low-medium
- Scenes: 0,1,2,3,4,5,6,7,8

---

## 6. Portal / Action Assets
### U-01: Portal Frame (Cinematic Doorway)
- Purpose: Live Demo / GitHub reveal moments and ending actions labels
- Geometry: metallic frame + inner glow
- Material: metal alloy + energy interior
- Shader: emission + soft bloom
- Animation: glow intensifies on hover; dissolves after click
- Reuse: LawLens-X (GitHub portal), ending actions
- LOD: 1
- Perf: low
- Scenes: project climax moments and ending

---

## 7. Screenshots & Code Excerpts Assets
### IMG-01: Project Hero Screenshot Plane
- Purpose: massive screenshot moments (1–2 per world)
- Geometry: planar mesh with perspective
- Material: image texture on plane
- Shader: subtle reflective overlay (very restrained)
- Animation: slight parallax shift with camera
- Reuse: all project worlds
- LOD: 2 (full vs compressed)
- Perf: medium (texture size)
- Scenes: 2..7

### TXT-01: Code Excerpt Plaque (Monospace)
- Purpose: technical credibility without becoming UI
- Geometry: small in-world plaque / slab
- Material: stone/metal slate
- Shader: ink emissive
- Animation: ink resolves progressively
- Reuse: select projects based on storyboard
- LOD: 1
- Perf: low
- Scenes: TBD per storyboard (later decide exact scenes)

---

## 8. Asset Validation Rules
- No additional asset types during implementation.
- If something doesn’t match a defined purpose, it must be redesigned to fit a listed asset class.

---

## 9. Open TODOs for Content Assets (must be resolved before implementation)
- Determine exact screenshot assets per repo.
- Choose exact snippet texts from README (source-of-truth).
- Resolve TODO links mentioned in resume for LawLens-X repo and other missing live URLs.

---

## 10. Next Document
After approval, proceed to:
- **Document 14: SIGNATURE OBJECT EVOLUTION GUIDE**

(Planning only.)

