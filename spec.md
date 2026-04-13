# Bad Habit Fixer — Product Spec v1

**Status:** Draft for review
**Date:** 2026-04-11
**Author:** product-architect

---

## 1. Problem & User

People develop unconscious physical habits — eyebrow plucking, nail biting, skin picking, nose picking, hair twisting — that they genuinely want to stop but don't notice themselves doing, especially while focused on other tasks like coding. Willpower fails because the behavior is below conscious awareness. A real-time feedback loop — a simple sound played the instant the hand approaches the trigger zone — interrupts the habit before it completes and gradually retrains the subconscious to avoid it. The v1 user is a single person (initially the builder) who sits at a laptop for long focused-work sessions and wants a lightweight tool they can leave running in a browser tab.

---

## 2. v1 Scope

### In scope
- A single-page web app that runs entirely in the browser.
- Pick one habit type from a small preset list (starting with eyebrow/face-touching; more added as detection rules are written).
- Grant camera access; app shows a live webcam preview with landmark overlays.
- A one-time, optional **calibration step** (a few seconds of "sit normally, look at the screen") to set per-user baseline distances.
- Live monitoring: when the habit is detected, play an alert sound.
- A simple status UI: "Monitoring" / "Paused" / "Habit detected!" plus a session counter (how many times triggered this session).
- Pause/resume button.
- Volume and sensitivity sliders.
- All processing is 100% client-side. No frames, landmarks, or training data ever leave the device. This is stated prominently in the UI.

### Out of scope for v1 (explicit)
- **User accounts, sign-up, login.** The app is single-user, client-side. Settings live in `localStorage`. Revisit only if we need cross-device sync.
- **Capturing 200–400 training images and training a classifier.** See Section 3 — we are not doing this in v1.
- **Cloud anything.** No backend, no database, no API, no analytics, no telemetry.
- **Mobile / tablet support.** Desktop browser only.
- **Multiple simultaneous habits.** One habit at a time per session.
- **History, charts, streaks, gamification.** Session counter is the only metric.
- **Adding custom habits via UI.** Supported habits are hard-coded rules in v1.
- **Notifications outside the tab** (browser Notification API, system tray, etc.).
- **Desktop (Electron/Tauri) packaging.** See Section 4.

### Success criteria (measurable)
1. From a cold open, a user can go from landing page to "monitoring active" in under 60 seconds.
2. On a typical laptop (integrated webcam, M1/mid-range Intel), the live detection loop runs at 15 FPS or better without fan spin-up.
3. For the builder's own eyebrow-plucking habit, detection precision and recall on a manually labeled 5-minute session clip are both >= 80%.
4. Alert sound fires within 300ms of the hand entering the trigger zone.
5. The user (the builder) actually leaves the app running during a real work session and reports the alert changed their behavior at least once.

---

## 3. Model Approach — Decision

### Recommendation: **Option B — Pose/landmark-based geometric detection.**

Use **MediaPipe Tasks for Web** (the current supported successor to the older `@mediapipe/hands` / `@mediapipe/face_mesh` packages) to get real-time hand and face landmarks directly in the browser, then apply a **simple geometric rule** per habit:

> "If any fingertip landmark is within a distance threshold of a target face landmark region for M consecutive frames, fire the alert."

For eyebrow plucking specifically: trigger if an index-finger or thumb tip is within a calibrated radius of the left or right eyebrow landmark cluster, sustained for ~200ms (roughly 3–5 frames at 15–30 FPS).

### Why B beats A for this use case

| Dimension | A (train a classifier) | B (landmarks + heuristic) | Winner |
|---|---|---|---|
| **Time to first working demo** | Days. Requires capture UI, labeling flow, training loop, hyperparameter fiddling, debugging why the model overfit to your t-shirt. | Hours. MediaPipe gives you landmarks in ~20 lines of code; the rule is a distance check. | **B** |
| **Data required** | 500–700 labeled images per user per habit. | Zero, or a 5-second calibration. | **B** |
| **Generalization** | A model trained on 300 photos of *you* in *your office* in *your hoodie* will silently break the moment lighting changes, you grow a beard, or you lean differently. Classic small-dataset overfitting. | Landmarks are robust to lighting, clothing, background, facial hair. The geometry is the geometry. | **B** |
| **Browser inference cost** | A fine-tuned MobileNet in TFJS runs fine but you're also doing webcam capture + UI. | MediaPipe is heavily optimized for real-time browser use; runs comfortably at 30 FPS on a laptop. | **B** |
| **Debuggability** | "Why did the model fire?" → opaque. | "Why did the rule fire?" → print the distance, see the overlay. You can literally watch it work. | **B** |
| **Per-habit extensibility** | Every new habit = new dataset + new training run. | Every new habit = a new rule function (~30 lines). | **B** |
| **Accuracy ceiling** | Higher in theory, if you nail the dataset. | Plateau exists — very subtle or very fast motions may slip through. | A (theoretical) |
| **User effort to onboard** | Capture hundreds of images of yourself pretending to pluck. Awkward and long. | Click "allow camera," done. | **B** |

The user said "I don't wanna spend weeks building this." Option A *is* the weeks. Option B is the weekend.

### The one real trade-off, named explicitly
Option B only works for habits where **hand proximity to a face region** is a sufficient signal. That covers the entire stated habit list (eyebrow plucking, nail biting, nose picking, hair twisting, lip biting, skin picking on the face). It does **not** cover habits where the hand never reaches the face, or where distinguishing "scratching nose casually" from "picking nose" requires fine-grained motion analysis. If v1 ships and the user wants, say, knuckle cracking or leg bouncing, that's when we revisit whether to add a trained classifier as an optional second path. v1 does not need to solve that.

### Concrete detection heuristic (eyebrow plucking, as the first habit)

```
1. Every frame, run MediaPipe HandLandmarker + FaceLandmarker on the webcam image.
2. If no hand OR no face detected → state = idle, continue.
3. Compute normalized distance between each fingertip landmark
   (thumb tip = 4, index tip = 8) and the nearest eyebrow landmark cluster
   (left brow ~ indices 70/63/105/66/107, right brow ~ 336/296/334/293/300).
   Normalize distance by face bounding box width so it's scale-invariant.
4. If normalized distance < THRESHOLD (default 0.08, tunable via sensitivity slider):
       increment consecutive_hit_frames
   else:
       consecutive_hit_frames = 0
5. If consecutive_hit_frames >= MIN_HITS (default 4):
       fire alert, state = triggered
       start cooldown timer (2s) to avoid machine-gunning the user
```

Calibration step (optional, ~5 seconds): have the user sit normally with hands on keyboard, record the min distance observed, and set `THRESHOLD = observed_min * 0.6` to avoid false positives from typing.

---

## 4. Platform — Decision

### Recommendation: **Web app. Ship it as a static site.**

**Why web over desktop:**
- **Speed.** No packaging, no code-signing, no auto-updater, no install flow. `npm create vite` → `npm run dev` → you have a URL. Hours saved.
- **Privacy is already solved.** MediaPipe Tasks for Web runs WASM/WebGL entirely in the browser process. The webcam stream goes `MediaDevices.getUserMedia` → `<video>` → MediaPipe → landmarks → rule check. **No frame ever leaves the browser.** There is no server to send it to, because there is no server. This is as private as the desktop option for all practical purposes.
- **Zero friction to try.** The user opens a URL. Done. If this lives on a personal domain or GitHub Pages, the user can open it on any laptop.
- **Tab-open constraint is acceptable for v1.** The user explicitly framed it as "while the tab/app is open." We don't need background execution.

**What the web version gives up (and why it's fine for v1):**
- No background monitoring when tab is closed → v1 assumes the tab is open during focused-work sessions. Fine.
- Can't intercept system-level events or play sound from a minimized tab reliably → we just need the tab visible or at least in the foreground tab group. Fine.
- Browser must re-grant camera permission per origin → one click, once. Fine.

**When to revisit desktop:** if the user later wants *always-on* monitoring across all apps, or wants to monitor without a visible tab, then a Tauri wrapper becomes worth the effort. Tauri (not Electron) would be the pick — smaller bundle, Rust-backed, faster. But not for v1.

### Privacy statement to put in the UI (verbatim-ish)

> "Everything runs on your computer. Your camera feed is processed locally by your browser and never sent anywhere. There is no server, no account, no upload. Close the tab and it's gone."

---

## 5. System Architecture

It's a single-page static web app with no backend. One process, one tab.

```
+-----------------------------------------------------------------+
|                         Browser Tab                             |
|                                                                 |
|   +----------+     +------------------+     +---------------+   |
|   | Webcam   |---->| <video> element  |---->| Frame Grabber |   |
|   | (user)   |     | (hidden/visible) |     | (requestVideo |   |
|   +----------+     +------------------+     |  FrameCallback|   |
|                                              +-------+-------+  |
|                                                      |          |
|                                                      v          |
|                                         +--------------------+  |
|                                         |  MediaPipe Tasks   |  |
|                                         |  - HandLandmarker  |  |
|                                         |  - FaceLandmarker  |  |
|                                         |  (WASM + WebGL)    |  |
|                                         +----------+---------+  |
|                                                    |            |
|                                          landmarks v            |
|                                         +--------------------+  |
|                                         |  Habit Rule Engine |  |
|                                         |  (pure functions,  |  |
|                                         |   one per habit)   |  |
|                                         +----------+---------+  |
|                                                    |            |
|                              trigger events        v            |
|                           +-------------------------------+     |
|                           |  App State (Zustand/signals)  |     |
|                           |  - monitoring / paused        |     |
|                           |  - session counter            |     |
|                           |  - threshold / sensitivity    |     |
|                           +---------------+---------------+     |
|                                           |                     |
|                 +-------------------------+----------+          |
|                 |                                    |          |
|                 v                                    v          |
|       +------------------+               +--------------------+ |
|       |  UI (React)      |               |  Alert Player      | |
|       |  - status panel  |               |  (HTMLAudioElement | |
|       |  - overlay canvas|               |   / Web Audio API) | |
|       |  - settings      |               +--------------------+ |
|       +------------------+                                      |
|                                                                 |
|   localStorage: user settings (sensitivity, habit, volume,      |
|                 calibration values). No images. No frames.      |
+-----------------------------------------------------------------+
```

### Data flow
1. `getUserMedia` → `MediaStream` → `<video>` element.
2. Each video frame (throttled to ~30 FPS target) is pulled via `requestVideoFrameCallback` and passed to MediaPipe.
3. MediaPipe returns hand and face landmarks (arrays of normalized {x,y,z} points). Nothing is serialized or persisted.
4. Rule engine receives the landmark arrays and the current habit config, returns `{ triggered: boolean, distance: number, debug: ... }`.
5. If `triggered` and not in cooldown, `Alert Player` plays the sound and the session counter in state increments.
6. UI re-renders the status panel and the overlay canvas (drawing landmarks on top of the video for debuggability — toggleable).

### What is stored where
- **`localStorage`:** chosen habit, sensitivity value, volume, calibration threshold, session counter (optional, reset on close).
- **Memory only:** video frames, landmarks, detection history.
- **Nothing ever sent anywhere.** No server, no fetch calls to third parties, no analytics.

---

## 6. User Flows

### Flow A — First-time user (onboarding)

1. User opens the URL.
2. Landing view: big title, one-sentence pitch, privacy statement, and a "Start" button.
3. Click Start → browser prompts for camera permission. User grants.
4. Habit picker appears: a short list (v1: "Face touching / eyebrow plucking"). User selects one.
5. Optional 5-second calibration screen: "Sit normally. Keep your hands on the keyboard." A countdown runs; the app records minimum fingertip-to-face distances and stores the calibrated threshold in `localStorage`.
6. Transition to the main monitoring screen. Monitoring starts automatically. Done in under a minute.

### Flow B — Returning user
1. Open URL. Settings are in `localStorage`, so: camera permission is already granted (same origin), habit is pre-selected, calibration is loaded.
2. One click on a prominent "Start monitoring" button — or auto-start if the user enabled that in settings.
3. Straight into monitoring.

### Flow C — Live monitoring (the 99% state)
1. Main screen shows:
   - Live webcam preview (with optional landmark overlay toggle for debug).
   - Large status indicator: a calm circle that's green when idle, briefly flashes red when triggered.
   - Session counter: "Caught 3 times this session."
   - Pause button, sensitivity slider, volume slider.
2. User works normally in other tabs/windows.
3. User unconsciously raises hand toward face.
4. Landmarks enter the trigger zone for ~200ms.
5. Alert sound plays. Status flashes red. Counter increments.
6. 2-second cooldown before another alert can fire.

### Flow D — Pause / resume
1. User clicks Pause. Detection loop stops sending frames to MediaPipe (or just skips rule evaluation). Camera LED stays on but nothing is analyzed.
2. Click Resume to continue.

### Flow E — Change sensitivity / recalibrate
1. Settings panel, accessible from main screen.
2. Slider adjusts threshold multiplier live (user can see false-positive rate change in real time by just moving their hand around).
3. "Recalibrate" button re-runs the 5-second calibration.

---

## 7. Tech Stack

Boring, fast, no surprises.

| Layer | Choice | Reasoning |
|---|---|---|
| **Build tool** | **Vite** | Instant dev server, zero-config, beats CRA/Next for a pure static SPA. |
| **Framework** | **React + TypeScript** | User almost certainly already knows it; the ecosystem for this is deep; MediaPipe has known React integration patterns. |
| **ML runtime** | **`@mediapipe/tasks-vision`** (MediaPipe Tasks for Web) | Current supported MediaPipe API for browser. Bundles HandLandmarker and FaceLandmarker. WASM + WebGL backed. |
| **State** | **Zustand** (or React `useState` if you prefer zero deps) | Tiny, no boilerplate, perfect for a handful of global flags. |
| **Styling** | **Tailwind CSS** | Fast to iterate, no CSS file sprawl. If the design agent picks something else later, that's their call. |
| **Audio** | **Native `HTMLAudioElement`** with a preloaded short WAV/OGG | No Web Audio API complexity needed. Preload so first-fire latency is <50ms. |
| **Persistence** | **`localStorage`** | Settings only. No IndexedDB needed since we don't store images. |
| **Deployment** | **GitHub Pages / Netlify / Vercel static hosting** | Pick whichever the user already has set up. It's a static bundle. |
| **Package manager** | Whatever is already installed | Don't re-litigate this. |

### Explicitly NOT in the stack (and why)
- **TensorFlow.js** — not needed; MediaPipe handles everything.
- **A backend (Node/Python/anything)** — nothing to serve. It's a static bundle.
- **A database** — nothing to persist beyond a dozen bytes of settings.
- **Next.js / Remix / SvelteKit** — SSR, routing, and SSG are all overkill for a single screen.
- **Redux / MobX** — Zustand is already overkill; useState is probably enough.
- **A component library (MUI, Chakra)** — the entire UI is ~5 controls; a library adds more weight than it saves.

---

## 8. Open Questions / Risks

### Risks
1. **False positives during typing.** Fingers come close to the face region in wide-angle webcam views more often than you'd think when leaning forward. Mitigation: calibration step sets a user-specific baseline; sensitivity slider lets the user dial it in.
2. **False positives when resting chin on hand / adjusting glasses / scratching.** The heuristic can't distinguish these from plucking. Mitigation: require the hand to enter a more specific sub-region (eyebrow area, not the whole face), and/or require sustained contact for longer than a typical scratch. Accept that v1 will miss some nuance.
3. **Alert habituation.** If the sound is annoying, the user disables it. If it's too subtle, they tune it out. Mitigation: offer 2–3 alert sounds and let the user pick. Non-jarring but distinct.
4. **Model load time / cold start.** MediaPipe Tasks bundles are a few MB. First-load latency on slow connections could feel sluggish. Mitigation: show a loading state with a progress indicator; cache aggressively via service worker later.
5. **Camera permission revoked / camera busy.** Another app using the webcam (Zoom, etc.) will break detection. Mitigation: detect the error, show a clear "camera unavailable" state, offer retry.
6. **Battery / thermals on continuous use.** Running inference 30 FPS for hours drains laptops. Mitigation: throttle to 15 FPS by default; pause automatically when tab is backgrounded via `Page Visibility API`.
7. **The user leaves the tab and forgets.** The tool only works when the tab is foregrounded. There's no system-level hook. If this becomes the dominant failure mode, revisit desktop packaging.

### Open questions I'm flagging but not blocking on
1. **Which habits ship in v1 beyond eyebrow plucking?** Recommend v1 ships with just one (face/eyebrow region touching) and proves the detection loop works end-to-end before generalizing. Adding "nail biting" means detecting fingertips near mouth, which is a trivial rule extension — but each new habit adds test surface.
2. **Alert sound choice.** Recommend starting with a soft chime, a short "nope" tone, and a gentle bell. Three options. User picks in settings. Design agent can iterate.
3. **Session counter persistence.** Reset every session, or keep a running total? Recommend reset-on-close for v1 to stay minimal. No dashboard.
4. **Does the user want a landmark overlay visible by default or only in a debug toggle?** Recommend hidden by default (cleaner UI) with a "show landmarks" toggle in settings for debugging and calibration.

### Things I am NOT asking about because I've made the call
- Accounts? No.
- Backend? No.
- Training a model? No.
- Desktop app? No, not for v1.
- Mobile? No.

---

## 9. Milestones

Rough phases, no time estimates. Each milestone is independently demoable.

### Milestone 0 — Project scaffold
- Vite + React + TypeScript + Tailwind project initialized.
- Deployable static build (even if it's just "Hello").
- `design.md` stub exists so the design-system-architect can fill it in parallel.

### Milestone 1 — Webcam preview
- Request camera permission.
- Render live video in a `<video>` element on the main screen.
- Pause/resume button works.
- Privacy statement visible.

### Milestone 2 — Landmarks rendering
- MediaPipe HandLandmarker and FaceLandmarker loaded and running on the video stream.
- Landmarks drawn as dots on an overlay `<canvas>` synced to the video.
- Running at 15+ FPS without stutter.

### Milestone 3 — Detection rule + alert
- Eyebrow-region proximity rule implemented.
- Alert sound fires on detection with cooldown.
- Session counter increments.
- Hardcoded threshold — not yet user-tunable.

### Milestone 4 — Calibration + settings
- 5-second calibration flow.
- Sensitivity slider.
- Volume slider.
- Settings persist in `localStorage`.
- Alert sound picker (3 presets).

### Milestone 5 — Onboarding polish
- Landing screen with privacy statement and Start button.
- Habit picker (even if only one option in v1).
- First-run vs. returning-user flows differ.
- Meet the "under 60 seconds to monitoring" success criterion.

### Milestone 6 — Real use + tuning
- User runs it during an actual work session.
- Measure precision/recall on a labeled clip.
- Tune default thresholds based on real data.
- Ship.

### Post-v1 (deferred, do not build speculatively)
- Additional habits (nail biting = fingertip-near-mouth rule).
- Page Visibility API auto-pause.
- Service worker for offline load.
- History / charts.
- Tauri wrapper for always-on monitoring.
- Optional classifier fallback for habits landmarks can't detect.

---

## 10. Design Direction (notes for design-system-architect)

Not a full design brief — just a direction to start from. The design agent owns `design.md`.

- **One screen.** Everything the user needs is on one calm screen. No navigation, no tabs, no modals other than first-run onboarding.
- **Calm palette.** This tool fires alerts when the user is already mildly frustrated with themselves. The UI should *not* add visual noise. Soft neutral background, one accent color for the status indicator, one accent for buttons.
- **The status indicator is the hero.** A large circle or shape, center-screen, that is visibly "resting" in its idle state and briefly pulses/flashes when a detection fires. The user should be able to glance at the edge of their monitor and know the tool is alive.
- **Webcam preview is secondary.** Small, top-right or bottom-right corner, 160–240px wide. It's a reassurance, not the main content. Landmark overlay toggle is in settings.
- **Settings are collapsed by default.** A gear icon. The main screen is just: status + counter + pause button.
- **Typography: one family, maybe two weights.** Inter, Geist, or system-ui. Not decorative.
- **No dark/light toggle in v1.** Pick one (recommend dark, since this is a focus tool that runs alongside code editors) and ship it. Design agent can revisit.
- **Microcopy is gentle, not scolding.** "Caught one" rather than "Bad!" The tool is a coach, not a drill sergeant.

---

## 11. Handoff

Next agents in the pipeline:

1. **design-system-architect** — read this spec and produce `design.md`: color tokens, spacing scale, typography, the status-indicator component spec, and the onboarding flow visuals. Section 10 is your starting point.
2. **senior-software-engineer** — once `design.md` exists, scaffold the project per Section 7 and implement Milestones 0–2 first. Do not build ahead of the spec. If a requirement is ambiguous, send it back to me.
3. **test-verifier** — browser-based testing will be important here since the whole app lives in the DOM + WebGL + camera APIs. Plan for manual verification loops early; automated tests for the rule engine (pure functions, easy) and smoke tests for the UI.

**Things the spec deliberately leaves to the builder's judgment:**
- Exact file/folder layout.
- Whether to use Zustand or plain `useState`.
- Frame-throttling strategy details.
- Error-boundary and loading-state placement.

**Things the spec does NOT leave to the builder's judgment:**
- The decision to use MediaPipe landmarks (not a trained classifier).
- The decision to ship as a browser web app (not Electron/Tauri).
- The decision to skip accounts, backend, and databases.
- The "nothing leaves the device" privacy guarantee.
