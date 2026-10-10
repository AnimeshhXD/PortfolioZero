# PROJECT ZERO — INTERACTION BIBLE (DOCUMENT 4)

> **Status:** Pre-Production (Planning Only) — **No code.**

---

## 0. Document Intent
This document defines how the visitor interacts so the experience feels alive like a film set—
**not** like UI navigation.

Interaction modalities:
- Mouse
- Scroll
- Keyboard
- Hover
- Click
- Touch (mobile)

All rules are cinematic, restrained, and performance-aware.

---

## 1. Absolute Interaction Philosophy
### 1.1 Interaction must feel like cinematography
- Input changes the *lighting, focus, particle field,* and *camera path*.
- Input must not create “app behaviors” (no drag handles, no UI panels).

### 1.2 Never gamify
Forbidden feelings:
- “Try clicking”
- “Earn points”
- game HUD overlays
- exaggerated feedback loops

### 1.3 Silence is interactive
Even when nothing changes visibly, the experience responds through micro shifts:
- slight particle drift
- subtle light temperature variation
- focus breathing

---

## 2. Scroll Interaction (Scene transitions only)
### 2.1 Scroll is a director timeline
- Scroll controls **scene progression** and **camera choreography**.
- Scroll must never translate content upward like typical websites.

### 2.2 Scroll mapping model (conceptual)
- Each scene uses a dedicated scroll “band”
- Within that band:
  - camera position/target changes
  - fog density transitions
  - layer opacity and reveal timing
  - typography emergence timing

### 2.3 Scroll start / stop behavior
- On scroll start: increase intensity slightly (breathing)
- On scroll end: settle camera, hold emotion for readability
- If user scrolls rapidly: the scene still resolves (no skipping of critical emotional beats)

### 2.4 Overscroll and bounce handling (feel)
- No elastic “rubber band.”
- Use damping: fast scroll still results in controlled scene completion.

---

## 3. Mouse Interaction (Soft lighting + particle response)
### 3.1 Primary behavior
Mouse controls **key light angle** and **particle drift field**.

Rules:
- Mouse influence is subtle—premium, not cartoon.
- Movement should feel like light passing across a physical set.

### 3.2 Cursor behavior zones
- Hero typography zone: reduce particle visibility slightly to protect readability.
- World geometry zone: allow particle field to react.

### 3.3 Accessibility under mouse
- Reduced motion mode must disable particle acceleration changes.
- Mouse still affects lighting minimally (if enabled) without motion spikes.

---

## 4. Hover Interaction (Cinematic hover)
Hover must never become UI hover effects.

Allowed hover moments:
- When the user hovers near a “portal” (Resume/GitHub/etc.), the portal glow intensifies slightly and fog thins locally.
- In-world geometry can slightly re-illuminate where the cursor points.

Forbidden hover:
- button hover color changes typical UI
- visible cursor ring effects that look like web UI

---

## 5. Click Interaction (Rare, purposeful)
Clicks only appear in deliberate moments:
- Ending scene actions (Resume, GitHub, LinkedIn, Email)
- Optional world portals (Live demo, GitHub) revealed at project climax

Rules:
- Click triggers a controlled portal reveal.
- After click:
  - camera holds
  - minimal UI
  - new tab opens (or in-scene preview) per content rules

---

## 6. Keyboard Interaction (Accessibility + minimal control)
Keyboard is for accessibility and non-pointer users.

Key behaviors (conceptual):
- Arrow keys / PageUp/PageDown: move between scenes within allowed cinematic bands
- Home/End: jump to beginning/ending holds (with cinematic catch-up)
- Escape: returns to calm state (camera holds)

Keyboard should never bring up menus or UI screens.

---

## 7. Touch Interaction (Mobile)
Mobile must preserve cinematic feeling:
- Scroll is the primary trigger (native scroll mapped to scene progression)
- Mouse lighting replaced by device motion OR a single finger-based light vector

Touch rules:
- Single tap: triggers “portal hover” moment if available
- Long press: disabled by default (unless it maps to a deliberate reveal)

---

## 8. Focus Management (Visual + Accessibility)
Since much of the experience is “visual film,” focus must be handled carefully.

Rules:
- When interactive elements appear, they must be reachable with keyboard focus.
- Focus indicator must not look like typical UI outline (use in-world glow instead).

---

## 9. Reduced Motion Mode
Reduced motion changes interaction intensity:
- Disable particle acceleration and large camera moves
- Keep scene cuts but with calmer camera speed
- Maintain typography emergence (no slide-ins)

---

## 10. Interaction Validation Checklist
For every interaction:
1. Does it increase immersion?
2. Is it subtle and premium?
3. Does it respect readability?
4. Does it respect reduced motion?
5. Does it feel like travel, not navigation?

---

## 11. Next Document
After approval, proceed to:
- **Document 5: MOTION BIBLE**

(Planning only.)

