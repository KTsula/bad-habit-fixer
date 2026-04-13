# Bad Habit Fixer

A tool that helps users break physical bad habits (eyebrow plucking, nail biting, nose picking, etc.) by watching them through a camera and playing an alert sound the moment the habit is detected.

**Status:** pre-implementation. Product spec and architecture are being defined by the product-architect. No code yet.

---

## Development Workflow

When starting a new project or feature, follow this sequence:

1. **Product Architect** (`product-architect`) — clarify requirements, define the system, produce a spec before any code is written.
2. **Design System agent** (`design-system-architect`) — define or apply design guidelines; ensure UI consistency against `design.md`.
3. **Builder** (`senior-software-engineer`) — implement functionality with production-quality code.
4. **Tester** (`test-verifier`) — run and validate the implementation (unit, integration, and browser-based where relevant).
5. **Reviewer** (`system-level-code-reviewer`) — audit for architectural integrity, duplication, dead code, maintainability.

### Rules

- Do **NOT** skip steps when requirements are unclear — send it back to the Product Architect.
- Always test before finalizing.
- Always maintain consistency with `design.md` (once it exists).
- Prefer full, correct implementations over partial solutions.
- No speculative features — build what the spec asks for, no more.

---

## Agent Reference

| Role | Agent | When to use |
|---|---|---|
| Product Architect | `product-architect` | Vague idea → clarified spec + system design |
| Design System | `design-system-architect` | Define tokens, audit UI consistency, enforce branding |
| Builder | `senior-software-engineer` | Write/modify/refactor production code |
| Tester | `test-verifier` | Write tests, run suites, verify in a browser |
| Reviewer | `system-level-code-reviewer` | Holistic review: architecture, dead code, tech debt |
| Explore | `Explore` | Fast codebase search / "where does X live?" |
| Plan | `Plan` | Step-by-step implementation plan before building |

---

## Product Sketch (to be refined by Product Architect)

**Concept.** User picks a habit (e.g. eyebrow plucking). The app captures training images from the laptop camera — ~200–300 positive (doing the habit) and ~300–400 negative (not doing it) — then trains or fine-tunes a classifier. When the app is running, it watches the camera feed in real time and plays an alert sound when it detects the habit.

**Open questions for the architect:**
- **Model approach:** train a binary image classifier from scratch vs. use a pose/hand-landmark model (e.g. MediaPipe Hands + Face Mesh) and detect "fingertip near eyebrow region" geometrically. The latter may generalize across users with far less data.
- **Platform:** web app vs. desktop (Electron/Tauri). Privacy argument for desktop: camera frames never leave the machine. Web app is faster to ship if we run the model fully in-browser (TensorFlow.js / MediaPipe Web).
- **Scope cut for a quick build:** is user sign-up actually needed for v1, or can we defer accounts until we have a working detector?

**Non-goals (v1):**
- Cloud training / model hosting
- Sharing, social, leaderboards
- Mobile

---

## Repo Layout

_TBD once the architect produces a spec and the Builder scaffolds the project._
