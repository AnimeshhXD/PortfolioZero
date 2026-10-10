# PROJECT ZERO — MICRO-INTERACTION CATALOG (DOCUMENT 16)

> **Status:** Pre-Production (Planning Only) — **No code.**

---

## 0. Document Intent
Document every interaction with timing/ease/animation response.

Interactions to cover:
- Hover
- Click
- Scroll
- Cursor movement
- Scene entry
- Scene exit
- Typography reveal
- Portal activation
- Project reveal
- Transition trigger
- Navigation appearance

Each interaction specifies:
- Duration
- Ease
- Animation
- Sound (optional)
- Visual response
- Accessibility alternative
- Reduced motion behavior

---

## 1. Global Rules (Interaction Consistency)
- No gamification.
- No UI bounce.
- No aggressive hover states.
- Interactions alter lighting/focus/particles/camera, not menus.

Timing tokens reference conceptual ranges:
- T_MICRO, T_MED, T_SLOW
- E0 deceleration default

---

## 2. Cursor Movement (Mouse)
### Duration
Continuous; responsiveness within ~50–120ms latency feel.

### Ease
E0 (smooth deceleration), damped.

### Animation
- Key light angle subtly pivots.
- Particle field drift direction slightly biases toward cursor.
- Reflection highlights shift across rare reflective surfaces.

### Sound (optional)
- none

### Visual response
- micro illumination “breath” (no cursor glow)

### Accessibility alternative
- keyboard focus moves a “light anchor” to approximate mouse influence.

### Reduced motion behavior
- disable particle bias shift; keep lighting shift minimal or off.

---

## 3. Scroll Interaction (Scene transitions)
### Duration
Varies by scene; scroll band drives scene progress.

### Ease
Damped smoothing: fast scroll still resolves to the intended scene cut.

### Animation
- camera position/target interpolates per scroll progress
- fog density ramps with scene progression
- layer parallax differences increase near transition boundary

### Sound (optional)
- none or near-silent ambience only

### Visual response
- world changes feel like travel; nothing slides like a webpage

### Accessibility alternative
- provide keyboard scene stepping (PageUp/PageDown) that triggers the same scene director progress.

### Reduced motion behavior
- camera travel distance is reduced; layer intensity ramps are softened.

---

## 4. Hover (In-world Portal & Geometry)
### Duration
100–250ms for hover response.

### Ease
E0.

### Animation
- portal frame glow intensifies slightly
- local fog thins around portal
- optional: a subtle focus pull toward portal

### Sound (optional)
- minimal soft “air” tone

### Visual response
- portal becomes more luminous but remains understated

### Accessibility alternative
- keyboard focus on portal triggers same glow response.

### Reduced motion behavior
- hover glow is minimal; no focus pull.

---

## 5. Click (Portal Activation)
### Duration
- hover state settles: 150–300ms
- click effect dissolve: 300–700ms

### Ease
E0 then gentle settle.

### Animation
- portal frame dissolves into signature object absorption
- camera holds after click
- new tab opens / or portal content appears (implementation later)

### Sound (optional)
- very soft clickless confirmation

### Visual response
- immediate cinematic confirmation without UI bounce

### Accessibility alternative
- Enter/Space activates portal.

### Reduced motion behavior
- dissolve is shorter and less intense.

---

## 6. Scene Entry (General)
### Duration
- resolve: T_MED feel
- settle: T_SLOW feel

### Ease
E0.

### Animation
- focus resolves from blurred atmosphere to stable clarity
- particles drift into their layer positions
- typography, if present, emerges from fog/light pass

### Sound (optional)
- none

### Visual response
- the world feels like it is already alive before text appears

### Accessibility alternative
- on keyboard scene step, perform same settle but skip motion-only flourishes.

### Reduced motion behavior
- minimal camera movement; particle intensity reduced.

---

## 7. Scene Exit (General)
### Duration
T_MED–T_SLOW feel.

### Ease
E0.

### Animation
- mid layer fades into fog with blur increase
- foreground parallax increases slightly faster
- signature object absorbs fragments

### Sound (optional)
- subtle low whoosh (optional, restrained)

### Visual response
- transition feels like traveling through medium

### Accessibility alternative
- keyboard scene step mirrors same fog absorption cues.

### Reduced motion behavior
- keep fog absorption; remove foreground parallax speedup.

---

## 8. Typography Reveal (Global Rule)
### Duration
- emergence: T_MED feel
- hold: T_SLOW (breathing)

### Ease
E0.

### Animation
- letters emerge from fog (blur to sharp convergence)
- light pass travels across glyphs
- opacity resolves; no slide-in

### Sound (optional)
- none

### Visual response
- typography feels physically present

### Accessibility alternative
- provide static text fallback after scene settle for reduced motion.

### Reduced motion behavior
- eliminate light sweep; use gentle blur-to-sharp only.

---

## 9. Project Reveal (Title Climax)
### Duration
- climax resolve: T_MED
- post-climax hold: 1–2 seconds feel

### Ease
E0.

### Animation
- title resolves only after emotional system is stable
- signature object completes project SOC stage

### Sound (optional)
- subtle resonant tone

### Visual response
- title appears as “climax,” not “label”

### Accessibility alternative
- ensure system state cues exist before title (e.g., tri-color lock) that keyboard users also experience.

### Reduced motion behavior
- title reveal still occurs, but with reduced bloom intensity.

---

## 10. Portal Activation (Ending actions)
### Duration
- reveal: T_MED
- hover/click as above

### Ease
E0.

### Animation
- action labels fade in subtly (in-world style)
- no large buttons

### Sound (optional)
- none

### Visual response
- understated action affordances

### Accessibility alternative
- keyboard focus list in tab order

### Reduced motion behavior
- immediate fade without extra animation.

---

## 11. Navigation Appearance (Scene 1)
### Duration
- appears after role lines settle: T_MICRO–T_MED

### Ease
E0.

### Animation
- “JOURNEY” hint appears as in-world signage (not a navbar)

### Sound (optional)
- none

### Visual response
- minimal hint only

### Accessibility alternative
- accessible label with keyboard focusable anchor.

### Reduced motion behavior
- show navigation hint immediately after typography resolves (no flourish).

---

## 12. Validation Checklist (Micro-interactions)
- Are interactions subtle and cinematic?
- Do they alter lighting/focus/particles rather than UI?
- Do they include reduced motion behavior?
- Do they preserve accessibility without relying on color alone?

---

## 13. Next Document
After this is approved, proceed to:
- **Document 17: Implementation Validation Checklist**

(Planning only.)

