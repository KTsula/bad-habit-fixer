# Bad Habit Fixer — Design System v1

**Status:** Locked for Milestone 0 handoff
**Date:** 2026-04-11
**Author:** design-system-architect
**Consumer:** senior-software-engineer (Milestones 0–6)
**Theme:** Dark mode only. No light toggle in v1.

This document is the single source of truth for colors, type, spacing, motion, and microcopy in the Bad Habit Fixer app. If something isn't in here, either ask before inventing it or pick the most conservative option that aligns with the principles in Section 1.

---

## 1. Design Principles

Five non-negotiables. Everything downstream must pass these.

1. **Calm over correct.** This tool fires alerts when the user is already mildly annoyed at themselves. The UI's job is to acknowledge, not amplify. If a choice between "technically more informative" and "softer" comes up, pick softer.
2. **One screen, breathing room.** The entire monitoring experience lives on one screen. No tabs, no navigation, no carousels. Negative space is a feature, not wasted pixels.
3. **The circle is the hero. Everything else recedes.** Type, controls, counter — all secondary to the status circle. If a new element competes with the circle for attention, it's wrong.
4. **Gentle microcopy, no scolding.** "Caught one" not "Bad!". Second person, present tense, warm. Never exclamation points in the triggered state. The tool is a coach.
5. **Recall-biased UI patterns.** Because detection over-fires by design, every trigger must feel survivable at 20–30 per hour. No red flashes, no jarring sounds-from-the-DOM, no motion that grabs focus away from the user's actual work.

---

## 2. Color Tokens

Dark mode. Neutrals are warm-tinted (slight rose undertone) so the accent feels native rather than grafted on.

### Base palette

| Token | Hex | Usage |
|---|---|---|
| `surface` | `#14110F` | Primary app background. Warm near-black, not pure `#000`. |
| `surface-elevated` | `#1E1A18` | Settings panel, onboarding card, any raised surface. |
| `surface-sunken` | `#0E0C0B` | Webcam preview frame background, subtle inset wells. |
| `border-subtle` | `#2A2522` | 1px dividers, card borders, input outlines at rest. |
| `border-strong` | `#3B3330` | Focused input outlines, active slider track edges. |
| `text` | `#F2EDE9` | Primary text. Warm off-white. ~15.8:1 on `surface` (AAA). |
| `text-muted` | `#A39891` | Secondary text, session counter, hints. ~6.4:1 on `surface` (AA). |
| `text-faint` | `#6B625D` | Placeholder, disabled labels. ~3.3:1 — large-text only or non-essential. |

### Accent — the pink-red

The user's brief: "pink-reddish color indicated a bad habit that's fixable." Not `#ff0000` (danger). Not `#ff80ab` (playful). A warm coral-rose that reads as *recognition*, not *alarm*.

| Token | Hex | Usage |
|---|---|---|
| `accent` | `#E87566` | **The canonical pink-red.** Hero circle in its triggered state. Primary button fill. Has a coral warmth; avoids the clinical red and the candy pink. |
| `accent-strong` | `#D65A4A` | Hover / active / pressed state for accent surfaces. Button press, slider thumb drag. |
| `accent-soft` | `#F2A093` | Focus ring (on dark surface), subtle accent backgrounds, the "afterglow" tail of a trigger animation. |
| `accent-dim` | `#5A2E28` | Idle hero circle fill — a deep, oxidized rose. Reads as "alive, paying attention," not "alarming." ~1.8:1 on surface, which is intentional — it should feel quiet. |
| `accent-ghost` | `#E8756614` | `accent` at 8% alpha. Inner glow / soft halo under the circle at rest. |

**Contrast check:**
- `text` (`#F2EDE9`) on `surface` (`#14110F`): 15.8:1 — AAA
- `text-muted` (`#A39891`) on `surface`: 6.4:1 — AA normal, AAA large
- `surface` (`#14110F`) on `accent` (`#E87566`): 7.9:1 — AAA for button text
- `text` on `accent`: 2.0:1 — **do not place body text on accent fill**; use `surface` for button labels

### Semantic circle-state tokens

Separate from raw palette so motion specs can reference state, not hex.

| Token | Maps to | When |
|---|---|---|
| `circle-idle` | `accent-dim` fill, `accent-ghost` halo | Monitoring active, no recent trigger |
| `circle-triggered` | `accent` fill, `accent-soft` halo | A detection just fired (within animation window) |
| `circle-paused` | `border-strong` fill, no halo | User clicked Pause |
| `circle-error` | `#4A3330` fill, dashed `border-strong` outline | Camera denied, busy, or lost |
| `circle-calibrating` | `accent-dim` with slow opacity pulse | 5s calibration flow |

---

## 3. Typography

One family. Two weights. That's it.

### Family

```
Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif
```

Inter is the primary. Falls back cleanly on every target OS. Ship Inter variable woff2 self-hosted — do not pull from Google Fonts (network request + privacy posture in Section 11 of spec).

### Weights

- **400** (Regular) — all body, labels, counter, microcopy
- **500** (Medium) — the status label under the hero circle, button labels, onboarding headline

No bold, no light, no italic.

### Scale

| Token | Size | Line-height | Weight | Use |
|---|---|---|---|---|
| `text-display` | `3.5rem` (56px) | `1.1` | 500 | Onboarding headline ("Bad Habit Fixer") only. |
| `text-hero` | `1.75rem` (28px) | `1.2` | 500 | Status label under hero circle ("Watching", "Caught one", "Paused"). |
| `text-body` | `1rem` (16px) | `1.5` | 400 | Body text, privacy statement, settings labels. |
| `text-label` | `0.875rem` (14px) | `1.4` | 400 | Session counter, slider labels, button text. |
| `text-caption` | `0.75rem` (12px) | `1.4` | 400 | "Local only • no upload" footer, tooltip text. |

### Rules

- Letter-spacing: default except `text-hero` and `text-display` get `-0.01em` (tightens slightly at large sizes).
- Never center body paragraphs. Center display/hero text only.
- Never uppercase. No `text-transform`.

---

## 4. Spacing Scale

4px base. 6 steps. Reference by token, never inline.

| Token | Value | Typical use |
|---|---|---|
| `space-1` | `0.25rem` (4px) | Icon-to-label gap, fine-grained nudges. |
| `space-2` | `0.5rem` (8px) | Inside button padding Y, tight stack. |
| `space-3` | `1rem` (16px) | Standard element gap, button padding X. |
| `space-4` | `1.5rem` (24px) | Section gap inside a card. |
| `space-5` | `2.5rem` (40px) | Between major blocks (circle ↔ counter ↔ controls). |
| `space-6` | `4rem` (64px) | Viewport edge padding on desktop, space around the hero circle. |

No arbitrary values. If something needs `12px`, it's either `space-2` or `space-3` — pick the closer one.

---

## 5. Radii, Borders, Shadows

This is a flat UI. Shadows are suggestion, not structure.

### Radii

| Token | Value | Use |
|---|---|---|
| `radius-sm` | `0.375rem` (6px) | Slider thumbs, checkbox-like affordances. |
| `radius-md` | `0.75rem` (12px) | Buttons, input fields, webcam preview frame. |
| `radius-lg` | `1.25rem` (20px) | Settings panel, onboarding card, any elevated surface. |
| `radius-full` | `9999px` | Hero circle. Only the hero circle. |

### Borders

- Default: `1px solid border-subtle`
- Focused: `1px solid border-strong` + 2px offset `accent-soft` focus ring (see §9)
- Never double borders. Never dashed (except `circle-error`).

### Shadows

Exactly two. No more.

| Token | Value | Use |
|---|---|---|
| `shadow-soft` | `0 1px 2px rgba(0,0,0,0.3), 0 8px 24px rgba(0,0,0,0.2)` | Settings panel, onboarding card. Barely perceptible — just enough to separate from surface. |
| `shadow-glow` | `0 0 64px 8px rgba(232,117,102,0.18)` | Hero circle halo in triggered state only. **Never as a resting decoration.** |

---

## 6. Motion

This is where the recall-biased trigger pattern lives or dies. Read twice.

### Motion philosophy

**The circle breathes. It does not flinch.** When a trigger fires, the circle acknowledges the moment the way a meditation bell acknowledges a thought — it swells warm, holds, and releases. It never shocks. A user who sees 30 of these in an hour should feel noticed, not scolded.

Easing globally: `cubic-bezier(0.22, 0.61, 0.36, 1)` (an ease-out with a gentle decay). Call this `ease-calm` in the token set. Never use linear. Never use `ease-in-out` on color transitions — it feels mechanical.

### Duration scale

| Token | Value | Use |
|---|---|---|
| `duration-instant` | `80ms` | Focus rings, hover tints. |
| `duration-short` | `200ms` | Button presses, slider thumb tracking. |
| `duration-medium` | `450ms` | Circle state transitions (idle → triggered color shift start). |
| `duration-long` | `900ms` | Trigger release (triggered → idle fade back). |
| `duration-breath` | `3200ms` | One full idle breathing cycle. |

### Idle animation (hero circle)

**A slow breathing pulse.** Scale oscillates between `1.0` and `1.025` over `duration-breath` using `ease-calm` in both directions. The halo (`accent-ghost` at 8% alpha) scales between `1.0` and `1.04` slightly offset from the core. Total amplitude is almost imperceptible — this is "I'm alive" signaling, not decoration. Opacity stays flat.

Rationale for pulse over fully still: a still circle looks broken or paused. A motion-rich circle looks busy. 2.5% scale drift at 3.2s period is the minimum that reads as "alive" without pulling the eye.

### Triggered animation

The sequence, in order:

1. **`0ms → 450ms`** (`duration-medium`, `ease-calm`): fill color transitions from `accent-dim` to `accent`. Scale swells from `1.0` to `1.06`. The `shadow-glow` halo fades in from 0 to full.
2. **`450ms → 750ms`**: hold. Full accent color, full glow. This is the "I see you" beat.
3. **`750ms → 1650ms`** (`duration-long`, `ease-calm`): fill fades back from `accent` through `accent-soft` to `accent-dim`. Scale releases from `1.06` to `1.0`. Halo fades back to `accent-ghost`.
4. **`1650ms → cooldown end (2000ms total per spec §3)`**: back to idle breathing. Counter increments at step 1 (not at step 4) so the number reflects immediately.

No shake. No flash. No overshoot. No bounce easing. The status label text cross-fades (`duration-short`) from "Watching" to "Caught one" at step 1 and back at step 3.

### Triggered → triggered rapid-fire

If a new trigger fires while the previous animation is mid-release, cancel the release and restart from step 1 at the current scale — do not reset to `1.0` first. This prevents stutter when the user is actively in a trigger cluster.

### Reduced motion (`prefers-reduced-motion: reduce`)

- Idle breathing: **off**. Circle is static.
- Triggered animation: **color only.** Fill transitions `accent-dim` → `accent` → `accent-dim` over `900ms` total, ease-calm. No scale. No glow. No halo movement.
- Button hover: immediate color change, no transition.
- Status label: instant swap, no cross-fade.

The sound still fires. The counter still increments. The visual is just quieter.

---

## 7. Component Specs

Specs, not code. Hand to the builder.

### 7.1 Hero status circle

The main event. Everything else serves this.

**Size.** Diameter = `min(35vh, 340px)`. Floors at `220px` on short viewports. Centered horizontally, positioned so its center is at roughly 42% of viewport height (slightly above optical center — leaves room for the status label and counter below, and for the webcam preview and controls to breathe above the fold).

**Anatomy.**
```
       [ halo (radial, accent-ghost) ]
           [ circle (fill varies) ]
                    ·
          [ text-hero status label ]
               [ text-label counter ]
```

Nothing inside the circle. No icon, no number, no letter. It is pure shape. The label lives outside, centered, `space-4` below the circle.

**States.**

| State | Fill | Halo | Label | Notes |
|---|---|---|---|---|
| Idle | `circle-idle` (`accent-dim`) | `accent-ghost`, slow breath | "Watching" | The 99% state. |
| Triggered | `circle-triggered` (`accent`) | `shadow-glow` on | "Caught one" | See §6 animation. |
| Paused | `circle-paused` (`border-strong`) | none | "Paused" | No breathing. Fully still. |
| Error (no camera) | `circle-error` fill | dashed 2px `border-strong` outline | "Camera unavailable" | See microcopy §8. |
| Calibrating | `circle-idle` | slow opacity pulse 0.6 ↔ 1.0 over 2s | "Calibrating…" | During 5s calibration. |

**Transitions between states** use `duration-medium` with `ease-calm` on color and `duration-long` on scale. Idle → paused is a color shift only; no scale change.

**No text inside the circle ever.** This is load-bearing. The circle is a color, not a readout.

---

### 7.2 Webcam preview thumbnail

Small. Secondary. Reassurance only.

- **Position:** top-right corner of the viewport, inset by `space-5` (40px) from top and right edges.
- **Size:** `200px` wide, `150px` tall (4:3 aspect). Hard-coded — does not scale with viewport.
- **Frame:** `radius-md` (12px), `1px solid border-subtle`, background `surface-sunken`.
- **Content:** mirrored video feed (CSS `transform: scaleX(-1)`) so the user sees themselves as in a mirror. Landmark overlay canvas sits on top of the video, same size, absolutely positioned.
- **Landmark overlay toggle:** a single-icon button (`radius-sm`, 24px square) in the bottom-right corner of the preview frame. Icon: a small dotted-grid glyph. Toggles landmark canvas visibility. Default: off.
- **No title, no label, no close button.** The preview is always visible while monitoring (including paused). If the camera is lost, replace the video area with a flat `surface-sunken` fill and a centered `text-caption` reading "Camera unavailable."

---

### 7.3 Session counter

- **Position:** centered below the status label, `space-3` (16px) gap.
- **Typography:** `text-label` (14px, 400), color `text-muted`.
- **Microcopy:** see §8. Singular vs. plural handled.
- **Zero state:** "No catches yet" — not "0 catches". Humans read zero as failure; phrase it as a beginning.

---

### 7.4 Pause / resume button

One variant. Primary-accent style.

- **Size:** height `44px`, horizontal padding `space-4` (24px).
- **Radius:** `radius-md` (12px).
- **Typography:** `text-label` (14px, 500 weight).
- **States:**

| State | Background | Text | Border |
|---|---|---|---|
| Default | `accent` | `surface` (`#14110F`) | none |
| Hover | `accent-strong` | `surface` | none |
| Active (pressed) | `accent-strong`, scale `0.98` | `surface` | none |
| Focus | `accent`, + focus ring (see §9) | `surface` | none |
| Disabled | `border-subtle` | `text-faint` | none |

- **Label toggle:** "Pause" when monitoring, "Resume" when paused. Instant swap, no transition on the label text itself (button color can transition `duration-short`).
- **Position:** centered below the session counter, `space-5` (40px) gap. It's the only button on the main screen.
- **No secondary "stop" or "exit" button.** Closing the tab is stopping.

---

### 7.5 Sensitivity + volume sliders

**Use a styled native `<input type="range">`.** Rationale: accessibility comes free, keyboard support is automatic, and the visual doesn't need to do anything fancy. Custom sliders are more failure surface than this UI justifies.

- **Track:** height `4px`, background `border-subtle`, `radius-full`. Filled portion (from left to thumb): `accent` at 60% opacity.
- **Thumb:** `16px` diameter, `radius-full`, background `text`, `1px solid border-strong`. On hover, grows to `18px` (`duration-short`). On active drag, background becomes `accent`.
- **Width:** full width of the settings panel content area.
- **Label above:** `text-label` color `text-muted`. Example: "Sensitivity" / "Volume".
- **Value readout:** right-aligned `text-caption` color `text-faint`. "Low / Medium / High" for sensitivity (not numbers). "0 – 100" for volume.
- **Focus:** default focus ring (§9) on the thumb.

Sliders live in the settings panel only — **not** on the main screen. The main screen is circle + counter + pause.

---

### 7.6 Settings panel

**Pattern:** slide-in drawer from the right edge.

- **Trigger:** a gear icon button, `32px` square, `text-muted` color, positioned bottom-right corner of the viewport (`space-5` inset). Hover → `text`. Focus → focus ring.
- **Drawer width:** `360px` on desktop. Full height. Background `surface-elevated`, `shadow-soft`, `radius-lg` on the left edge only (top-left and bottom-left corners).
- **Open animation:** slide from `translateX(100%)` to `0`, `duration-medium`, `ease-calm`. Backdrop (a `rgba(0,0,0,0.4)` scrim over the main screen) fades in over same duration.
- **Close:** click outside, press Escape, or click the X in the drawer's top-right. Reverse animation.
- **Contents, top to bottom:**
  1. Header: "Settings" (`text-hero`, `space-4` margin).
  2. Sensitivity slider block.
  3. Volume slider block.
  4. Alert sound picker (radio list, 3 options, per spec §8 open question 2).
  5. "Show landmarks" toggle (a native checkbox, styled to match).
  6. "Recalibrate" button — secondary style: `surface-sunken` background, `border-subtle` border, `text` color. Same size as pause button.
  7. Footer: `text-caption` reading the privacy reminder (see §8 microcopy).
- **Padding:** `space-5` on all edges, `space-4` between blocks.

**Under reduced motion:** drawer appears instantly. Scrim fades in `duration-instant`.

---

### 7.7 Onboarding / privacy statement

One-time screen on first load. Becomes a thin "Start monitoring" screen on returning visits (per spec §6 Flow B).

**Layout (first-time, centered card on `surface`):**

```
                    ┌─────────────────────────────┐
                    │                             │
                    │    Bad Habit Fixer          │  text-display, 500
                    │                             │
                    │    A quiet coach for the    │  text-body, text-muted,
                    │    habits you want to drop. │  2-line max
                    │                             │
                    │    ┌───────────────────┐    │
                    │    │  Everything runs  │    │  privacy card
                    │    │  on your computer.│    │  text-body, text
                    │    │  Your camera feed │    │  surface-elevated bg
                    │    │  never leaves the │    │  radius-lg, shadow-soft
                    │    │  browser.         │    │  padding: space-5
                    │    │                   │    │
                    │    │  No server. No    │    │
                    │    │  account. No      │    │
                    │    │  upload.          │    │
                    │    └───────────────────┘    │
                    │                             │
                    │       [ Start button ]      │  same style as pause
                    │                             │
                    │       Local only · no upload│  text-caption, text-faint
                    │                             │
                    └─────────────────────────────┘
```

- **Card max-width:** `520px`. Centered horizontally and vertically.
- **Vertical rhythm:** `space-5` between headline, subtitle, privacy card, button, footer caption.
- **Start button:** same primary button as Pause. Label: "Grant camera access".
- **No illustrations. No logo. No animation on load** (fade-in at `duration-medium` is okay, nothing else).

**Returning user:** same layout, minus the privacy card, and the button reads "Start monitoring".

---

## 8. Microcopy Library

Every string in the app. If a string isn't on this list, it shouldn't exist yet.

### Status label (under hero circle)

| State | Copy |
|---|---|
| Monitoring, idle | `Watching` |
| Monitoring, just triggered | `Caught one` |
| Paused | `Paused` |
| Calibrating | `Calibrating…` |
| Camera unavailable | `Camera unavailable` |
| Camera busy (another app) | `Camera is in use elsewhere` |
| Camera denied by user | `Camera access needed` |
| Loading MediaPipe | `Getting ready…` |

Never use exclamation points. Never "Error." Never "Bad!" or "Stop!" or "Oops."

### Session counter

Singular/plural matters. Voice: factual, low-key.

| Condition | Copy |
|---|---|
| 0 | `No catches yet` |
| 1 | `Caught once this session` |
| 2+ | `Caught {n} times this session` |

Do not use the word "total." Do not use "bad habits." Do not celebrate low numbers or warn about high ones.

### Buttons

| Button | Copy |
|---|---|
| Pause monitoring | `Pause` |
| Resume monitoring | `Resume` |
| Open settings | (icon only, `aria-label="Open settings"`) |
| Close settings | (icon only, `aria-label="Close settings"`) |
| Start (first-run) | `Grant camera access` |
| Start (returning) | `Start monitoring` |
| Recalibrate | `Recalibrate` |
| Retry camera | `Try again` |
| Toggle landmarks | (icon only, `aria-label="Toggle landmark overlay"`) |

### Onboarding

| Slot | Copy |
|---|---|
| Headline | `Bad Habit Fixer` |
| Subtitle | `A quiet coach for the habits you want to drop.` |
| Privacy card | `Everything runs on your computer. Your camera feed is processed locally and never leaves the browser. No server. No account. No upload.` |
| Footer caption | `Local only · no upload` |

### Error / empty states

| Scenario | Copy |
|---|---|
| Camera denied | `Camera access needed. You can grant it in your browser's site settings, then try again.` |
| Camera busy | `Another app is using your camera. Close it and try again.` |
| MediaPipe failed to load | `Couldn't load the detector. Check your connection and reload.` |
| Browser unsupported | `This browser can't run the detector. Try Chrome, Edge, or Safari.` |

Lead with the situation, then the fix. Never blame the user. Never say "please" (it's filler).

### Settings labels

| Label | Copy |
|---|---|
| Sensitivity section | `Sensitivity` |
| Sensitivity hint | `Higher = more catches, more false alarms.` |
| Volume section | `Alert volume` |
| Alert sound section | `Alert sound` |
| Sound option 1 | `Soft chime` |
| Sound option 2 | `Gentle bell` |
| Sound option 3 | `Low tone` |
| Landmark toggle | `Show face & hand landmarks` |
| Recalibrate hint | `Sit normally for 5 seconds while we measure.` |
| Privacy footer | `Nothing leaves your browser.` |

### Accessibility announcements (`aria-live`)

These are spoken by screen readers. Terser than visible copy.

| Event | Announcement |
|---|---|
| Trigger fires | `Caught` (single word — do not re-announce counter) |
| Paused | `Monitoring paused` |
| Resumed | `Monitoring resumed` |
| Calibration started | `Calibrating, sit normally` |
| Calibration done | `Ready` |
| Camera lost | `Camera unavailable` |

---

## 9. Accessibility

Non-negotiable floor: WCAG 2.1 AA. Aim higher where cheap.

### Contrast

All verified against `surface` (`#14110F`):

- `text` `#F2EDE9` → 15.8:1 — AAA
- `text-muted` `#A39891` → 6.4:1 — AA normal / AAA large
- `text-faint` `#6B625D` → 3.3:1 — **large text only or non-essential**. Do not use for anything a user must read (errors, button labels).
- `accent` `#E87566` → 5.9:1 — AA large. Do not place `text-body` on `accent`; use `surface` as the button label color (7.9:1).
- `surface` on `accent` → 7.9:1 — AAA. This is how primary button labels pass.

**Rule:** if you think you need a color outside this set, stop and ask.

### Focus ring

Single, consistent, always visible on `:focus-visible`.

- `2px solid accent-soft` (`#F2A093`)
- `2px` offset (`outline-offset: 2px`)
- `radius` matches the element it rings
- Never disable focus outlines globally. Never use `outline: none` without replacing it.

### Reduced motion

Already specified in §6. Summary: idle breathing off, trigger animation color-only, transitions shortened or removed. Sound and counter behavior unchanged.

### Screen reader / keyboard

- **Hero circle** is a `<div role="status" aria-live="polite" aria-atomic="true">`. Its text content is the current status label. When state changes to triggered, the label momentarily becomes "Caught" (per §8 announcements) then returns to "Watching." `aria-live="polite"` prevents interrupting the user mid-sentence if they're using a screen reader.
- **Counter** has `aria-live="off"` — do not announce every increment, the circle already announces. The counter is visual reinforcement for sighted users.
- **Pause button** is a real `<button>`. Space and Enter activate. Focus ring visible.
- **Settings gear** is a real `<button aria-label="Open settings" aria-expanded={open}>`. Drawer is `role="dialog" aria-modal="true"` with a labelled heading. Escape closes. Focus is trapped while open and returns to the gear on close.
- **Sliders** are native `<input type="range">`, labelled via `<label>` — arrow keys work automatically.
- **Tab order** on main screen: pause button → gear icon → (if drawer open) drawer contents in DOM order → close. Webcam preview and hero circle are not in the tab order — they are not interactive.
- **First-run** focus goes to the Start button on mount.

### Target sizes

All interactive elements meet `44×44px` minimum (WCAG 2.5.5 AAA). Sliders are the exception per the native `<input>` (which is navigable by keyboard anyway), but the slider thumb visual is `16px` with a `44px` high transparent hit area via generous vertical padding on the input wrapper.

---

## 10. Out of Scope — Design System v1

Explicitly **not** in this document. Do not build these, do not invent tokens for them, do not "design defensively" for them.

- Light mode. No toggle. No light-mode tokens. If/when v2 needs this, revisit.
- Multi-page layout tokens (grid templates for multiple routes). There is one screen.
- A full icon set. Only three icons are needed: gear, X (close), and the dotted-grid landmark toggle. Use Lucide or Heroicons stroke icons at 24px — builder's choice between those two libraries.
- Toast / notification component. No transient surfaces other than the hero circle itself.
- Modal dialogs (other than onboarding card and the single settings drawer).
- Form validation styles. There are no forms.
- Table, chart, dashboard, or data-viz tokens. There is no data to visualize beyond the counter.
- Responsive breakpoints for mobile. Desktop-only per spec §2.
- Animation library tokens beyond what's in §6. No spring configs, no parallax, no hero transitions.
- Branding assets: logo, favicon, wordmark. Builder can ship a text-only favicon for v1.
- Multiple themes, multiple accents, user color customization.
- Empty-state illustrations.
- Loading skeletons (the one loading state — "Getting ready…" — is a text label, not a shimmer).

If the builder feels the pull to add any of these, push back and cite this section.

---

## 11. Handoff Checklist for the Builder

Before writing Tailwind config or CSS variables, confirm:

- [ ] All color tokens in §2 are declared as CSS custom properties on `:root`, not inlined.
- [ ] Inter is self-hosted (woff2), not pulled from Google Fonts.
- [ ] `prefers-reduced-motion` media query is wired from day one, not added later.
- [ ] Focus rings are visible on every interactive element before any feature work ships.
- [ ] The hero circle is built as a single element whose state is driven by a data attribute (`data-state="idle|triggered|paused|error|calibrating"`) — not by toggling 5 classnames. This keeps §6 animation specs honest.
- [ ] Microcopy from §8 lives in one constants file, not scattered across components.
- [ ] The `aria-live` region on the hero circle is tested with VoiceOver/NVDA before Milestone 3 ships.

Questions about any of this → back to design-system-architect before implementing.
