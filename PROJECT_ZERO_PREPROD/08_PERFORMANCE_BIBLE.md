# PROJECT ZERO — PERFORMANCE BIBLE (DOCUMENT 8)

> **Status:** Pre-Production (Planning Only) — **No code.**

---

## 0. Document Intent
Ensure the experience remains smooth and premium under real hardware.
Performance is part of the cinematography.

This document defines:
- budgets
- constraints
- LOD strategy
- asset loading strategy
- reduced motion and accessibility performance guarantees

---

## 1. Target Frame Performance
### 1.1 FPS target
- **60 FPS minimum** on modern desktops.
- On mobile: maintain smoothness via reduced effects and lower budgets.

### 1.2 Jank prevention
- Avoid heavy synchronous loads during scene transitions.
- Prefetch next world assets.
- Keep main thread time within strict limits (conceptual targets).

---

## 2. Rendering Budgets (Conceptual)
### 2.1 Draw calls budget
- Keep draw calls low by:
  - instancing repeated particles
  - grouping geometry by material
  - reducing unique meshes

### 2.2 Geometry budget
- Limit high-poly objects for background.
- Use simplified forms for distant structures.

### 2.3 Texture budget
- Prefer compressed texture formats.
- Keep texture resolution responsive (desktop vs mobile).

### 2.4 Particle budget
- Use particle counts adaptively by device.
- Foreground particles remain limited and depth-aware.

### 2.5 Post-processing budget
- Bloom and DOF must be controlled.
- Avoid stacking multiple expensive post passes.

---

## 3. LOD Strategy (Level of Detail)
LOD is required because the world is large.

### 3.1 LOD triggers
- camera distance
- device class (desktop/mobile)
- scroll intensity

### 3.2 LOD tiers
- LOD0: hero moment (highest fidelity)
- LOD1: mid world details
- LOD2: distant background silhouettes

### 3.3 Particle LOD
- Far particles reduce alpha updates.
- Near particles keep subtle drift.

---

## 4. Asset Loading Strategy
### 4.1 Preloading approach
- Load Scene 0 assets immediately.
- Preload minimal assets for Scene 1 + first project world.
- Defer heavy screenshot/texture assets until their world is near.

### 4.2 Streaming sequence
During transitions:
- do not load everything at once.
- load only what the next shot needs.

---

## 5. Scene-by-Scene Implementation Rule
Even though implementation happens later:
- Build and profile one scene end-to-end.
- Only then proceed.
- This prevents global performance regressions.

---

## 6. Reduced Motion Mode
Reduced motion must be real and performance-friendly.

### 6.1 Effects disabled/reduced
- disable high-speed particle accelerations
- reduce camera movement amplitude
- reduce blur intensity changes
- keep typography emergence but slow it down if needed

### 6.2 Story integrity
Even with reduced motion:
- titles still emerge properly
- transitions still communicate transformation

---

## 7. Mobile Optimization
Mobile constraints:
- reduce particle counts
- lower post-processing cost
- use adaptive resolution for textures
- ensure touch interactions still feel cinematic

---

## 8. GPU Optimization Principles
- batch meshes where possible
- instance repeated objects (particles)
- avoid per-frame geometry rebuilds
- keep shader complexity minimal

---

## 9. Battery Optimization
- pause or reduce rendering when tab is inactive
- throttle animation when not visible

---

## 10. Accessibility Performance
- ensure reduced motion is honored
- ensure contrast remains readable
- ensure focusable portals do not trigger expensive rerenders

---

## 11. SEO Strategy
Since experience is cinematic:
- maintain minimal semantic content for accessibility
- ensure a lightweight initial payload for indexing

---

## 12. Performance QA Checklist
Before accepting any scene:
- [ ] FPS stable (no long frame spikes)
- [ ] No heavy asset loads during active camera motion
- [ ] Reduced motion mode does not stutter
- [ ] Mobile preview meets minimum smoothness
- [ ] No memory spikes

---

## 13. Next Document
After approval, proceed to:
- **Document 9: IMPLEMENTATION ROADMAP**

(Planning only.)

