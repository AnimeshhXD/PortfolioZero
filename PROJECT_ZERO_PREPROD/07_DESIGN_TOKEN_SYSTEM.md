# PROJECT ZERO — DESIGN TOKEN SYSTEM (DOCUMENT 7)

> **Status:** Pre-Production (Planning Only) — **No code.**

---

## 0. Document Intent
Standardize everything: spacing, color, opacity, blur, glow, motion, fog density, typography scales.

Tokens ensure consistency and prevent “creative drift.”

---

## 1. Spacing Scale
Use a consistent spacing scale (conceptual units for layout):
- S0 = 0
- S1 = 8
- S2 = 16
- S3 = 24
- S4 = 32
- S5 = 48
- S6 = 64
- S7 = 96
- S8 = 128
- S9 = 192

Cinematic UI overlays should mostly use S6–S8 equivalents for whitespace.

---

## 2. Typography Tokens
### 2.1 Font roles
- **Type/Primary**: cinematic display
- **Type/Secondary**: supporting text
- **Type/Mono**: in-world technical excerpt

### 2.2 Scale ratios
Define L sizes as conceptual:
- T1 (micro labels): 12–14
- T2 (subtitles): 16–22
- T3 (scene titles): 48–80
- T4 (monument titles): 92–140

### 2.3 Spacing typography tokens
- Tracking: tight for titles, wider for calm subtitles
- Line height: stable across scenes

---

## 3. Color Tokens
### 3.1 Neutral stage tokens
- N0: near-black graphite
- N1: smoke gray
- N2: slate gray

### 3.2 Accent family tokens (global)
- A-Cyan, A-Violet, A-Emerald, A-Amber, A-Rose

### 3.3 Project accent assignments
- LawLens-X: Cyan + Violet
- Triage Assistant: Emerald + Amber + Red threshold
- Workplace Agent: Violet + Electric Blue
- BenefitBridge: Emerald + Amber civic glow
- Mavira OS: Steel + Cyan
- Personal Health Coach: Rose + Deep Cyan

### 3.4 Forbidden combinations tokens
Define globally as disallowed:
- Neon green + magenta simultaneously
- High-saturation full-screen fills

---

## 4. Opacity Tokens
Use consistent opacities for cinematic layering:
- O0 = 0
- O10 = 0.1
- O25 = 0.25
- O40 = 0.4
- O60 = 0.6
- O75 = 0.75
- O90 = 0.9
- O100 = 1

Text emergence must move through blur + fog + opacity tokens, not opacity alone.

---

## 5. Blur Tokens
Blur amounts (conceptual):
- B0 = none
- B1 = light diffusion
- B2 = readability at distance
- B3 = mystery-heavy

Typography transitions use B2 → B0 at reveal.

---

## 6. Glow / Emission Tokens
- G0 = no emission
- G1 = low bloom emission
- G2 = reveal emission
- G3 = climax emission (rare)

Signature object uses higher G levels during transition absorption.

---

## 7. Fog Density Tokens
Fog boundary tokens:
- F0 = clear
- F1 = whisper veil
- F2 = boundary haze
- F3 = heavy dissolve

Transitions must move fog density F2→F3→F1 for absorption/rebuild.

---

## 8. Lighting Tokens
Lighting behavior tokens:
- L-key cool
- L-key warm
- L-rim soft
- L-ambient controlled

Each project maps to a lighting preset:
- Identity preset
- LawLens-X preset
- etc.

---

## 9. Particle Tokens
- P1 calm motes
- P2 mystery density
- P3 conflict density
- P4 reveal convergence speed

Reduced motion disables P3–P4 dynamic speed changes.

---

## 10. Animation Tokens
Define easing + duration tokens:
- D-micro: 0.4–0.9s
- D-medium: 1.0–2.2s
- D-cut: 2.2–4.0s
- D-hold: 2.0–6.0s

Easing tokens:
- E-easeOutPremium
- E-softEaseIn

---

## 11. Elevation / Depth Tokens
Even though this is not traditional UI, depth needs standard anchors:
- Z-front (foreground particles)
- Z-mid (world architecture)
- Z-hero (typography layer)
- Z-back (sky)

---

## 12. Transition Tokens
Define a small set of transition types:
- TX-Absorb
- TX-Dissolve
- TX-CollapsePassage

Every scene transition must be one of these.

---

## 13. Validation Checklist (Tokens)
- Are there any “freeform” colors/blur/durations? If yes, replace with tokens.
- Do tokens preserve emotion identity across projects?

---

## 14. Next Document
After approval, proceed to:
- **Document 8: PERFORMANCE BIBLE**

(Planning only.)

