import type { CSSProperties } from 'react';
import { copy } from '../copy';

/**
 * Circle state — mirrors design.md §7.1 state table exactly. Drives the
 * component via a single `data-state` attribute rather than a pile of
 * classnames (design.md §11 handoff checklist item 5).
 */
export type CircleState =
  | 'idle'
  | 'triggered'
  | 'paused'
  | 'error'
  | 'calibrating';

interface HeroCircleProps {
  state: CircleState;
  reducedMotion: boolean;
  /**
   * Error sub-kind, when `state === 'error'`. Controls the status label copy.
   * Defaults to the generic "Camera unavailable" string.
   */
  errorKind?: 'unavailable' | 'denied' | 'busy';
}

/**
 * Pick the visible status label that sits outside the circle, per
 * design.md §7.1 state table and §8 microcopy library.
 */
function labelFor(state: CircleState, errorKind?: HeroCircleProps['errorKind']): string {
  switch (state) {
    case 'idle':
      return copy.statusLabel.idle;
    case 'triggered':
      return copy.statusLabel.triggered;
    case 'paused':
      return copy.statusLabel.paused;
    case 'calibrating':
      return copy.statusLabel.calibrating;
    case 'error':
      if (errorKind === 'denied') return copy.statusLabel.cameraDenied;
      if (errorKind === 'busy') return copy.statusLabel.cameraBusy;
      return copy.statusLabel.cameraUnavailable;
  }
}

/**
 * Hero status circle. Pure shape, never contains text — the label lives
 * outside, below. Driven by `data-state`; animation rules from design.md §6
 * live in Tailwind keyframes + here (inline style for the breathing halo).
 *
 * Milestone 1 note: only the `idle`, `paused`, and `error` states are
 * exercised in the current UI. The `triggered` and `calibrating` cases are
 * wired because the state tokens are trivially derivable and it keeps the
 * component honest for Milestone 3.
 */
export function HeroCircle({
  state,
  reducedMotion,
  errorKind,
}: HeroCircleProps): JSX.Element {
  // Diameter: min(35vh, 340px), floor 220px. Implemented with CSS clamp so
  // the browser handles all three bounds in one calculation.
  const sizeStyle: CSSProperties = {
    width: 'clamp(220px, 35vh, 340px)',
    height: 'clamp(220px, 35vh, 340px)',
  };

  // Fill + halo per §7.1 state table.
  // We use data-state on the outer wrapper and child ::before/::after-like
  // divs for halo so a single Tailwind class stack handles it.
  const fill = fillFor(state);
  const haloBg = haloColorFor(state);
  const haloAnimClass = haloAnimFor(state, reducedMotion);
  const coreAnimClass = coreAnimFor(state, reducedMotion);

  const label = labelFor(state, errorKind);

  // When triggered with motion enabled, the halo uses the design-token
  // `shadow-glow` (box-shadow) instead of a flat background fill. Flat
  // colour is kept for the idle pulse where glow would read as decoration
  // (design.md §5 forbids shadow-glow as a resting element).
  const triggeredWithMotion = state === 'triggered' && !reducedMotion;
  const haloShadowClass = triggeredWithMotion ? 'shadow-glow' : '';

  return (
    <div
      // Wrapper is the aria-live region per design.md §9.
      role="status"
      aria-live="polite"
      aria-atomic="true"
      data-state={state}
      className="relative flex flex-col items-center select-none"
    >
      {/* Halo layer — behind the core. Uses absolute positioning so it shares
          the same center but can scale independently for the breathing offset. */}
      <div
        aria-hidden="true"
        className={`absolute top-0 left-1/2 -translate-x-1/2 rounded-full ${haloAnimClass} ${haloShadowClass}`.trim()}
        style={{
          ...sizeStyle,
          backgroundColor: haloBg,
          // Under full motion, the trigger-arc-halo keyframe animates
          // opacity from 0 → 1 → 0. In the idle/paused states we want
          // the halo visible as a static accent-ghost fill, so opacity
          // is left at its default (1). Reduced-motion + triggered
          // suppresses the halo entirely (opacity 0).
          opacity: state === 'triggered' && reducedMotion ? 0 : undefined,
        }}
      />

      {/* Core circle. Pure shape — no children, no text.
          `transition-colors` handles the fill-color fade between any two
          states (including the triggered color flip under reduced motion,
          where we deliberately use color-only motion per design.md §6). */}
      <div
        aria-hidden="true"
        className={`relative rounded-full transition-colors duration-medium ease-calm ${coreAnimClass}`}
        style={{
          ...sizeStyle,
          backgroundColor: fill,
          // Dashed outline for the camera-error state per §7.1.
          outline:
            state === 'error' ? '2px dashed var(--border-strong)' : undefined,
          outlineOffset: state === 'error' ? '-2px' : undefined,
        }}
      />

      {/* Status label — text-hero, sits space-4 below the circle per §7.1. */}
      <div
        className="mt-space-4 text-hero font-medium text-text text-center"
      >
        {label}
      </div>
    </div>
  );
}

/** Map state to fill color. Uses CSS vars so the canvas and React agree. */
function fillFor(state: CircleState): string {
  switch (state) {
    case 'idle':
    case 'calibrating':
      return 'var(--accent-dim)';
    case 'triggered':
      return 'var(--accent)';
    case 'paused':
      return 'var(--border-strong)';
    case 'error':
      return 'var(--circle-error-fill)';
  }
}

/**
 * Map state to halo background. design.md §7.1:
 *   - idle / calibrating → accent-ghost (soft, flat).
 *   - triggered → accent-soft + shadow-glow.
 *   - paused / error → no halo (accent-ghost at full opacity is invisible
 *     against the warm neutrals, but we keep the element mounted so
 *     layout doesn't jump).
 */
function haloColorFor(state: CircleState): string {
  if (state === 'triggered') return 'var(--accent-soft)';
  if (state === 'paused' || state === 'error') return 'transparent';
  return 'var(--accent-ghost)';
}

/**
 * Halo animation class. design.md §6:
 *   - idle (motion) → slow breathing pulse.
 *   - triggered (motion) → one-shot trigger-arc-halo.
 *   - triggered (reduced-motion) → no scale, no opacity pulse; halo stays hidden.
 *   - other states → static.
 */
function haloAnimFor(state: CircleState, reducedMotion: boolean): string {
  if (reducedMotion) return '';
  if (state === 'idle') return 'animate-breathe-halo';
  if (state === 'triggered') return 'animate-trigger-arc-halo';
  return '';
}

/**
 * Core-circle animation class.
 *   - idle (motion) → breathing.
 *   - triggered (motion) → one-shot trigger-arc scale.
 *   - triggered (reduced-motion) → no scale; color-only transition
 *     handled by the transition-colors class on the core.
 */
function coreAnimFor(state: CircleState, reducedMotion: boolean): string {
  if (reducedMotion) return '';
  if (state === 'idle') return 'animate-breathe';
  if (state === 'triggered') return 'animate-trigger-arc';
  return '';
}
