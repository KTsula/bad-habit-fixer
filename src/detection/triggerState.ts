/**
 * Trigger state machine.
 *
 * Takes a stream of per-frame detection results (from `classifyFrame`) and
 * decides when to fire an alert. Enforces two rules from spec.md §3:
 *
 *   - Require MIN_HITS consecutive positive frames before firing, so
 *     single-frame blips don't trip the alarm.
 *   - After firing, enforce a COOLDOWN_MS window where no further fire
 *     events can happen — prevents machine-gunning during a sustained
 *     trigger.
 *
 * Pure / framework-free: no timers, no React, no global clocks. The caller
 * passes `now` (a monotonic millisecond timestamp) on every update. Tests
 * drive this deterministically by passing synthetic values.
 */

import type { DetectionResult } from './eyebrowProximity';

/** Default: 3 consecutive positive frames before firing (~100-200ms
 *  at 15-30 FPS). Biased toward recall per user preference. */
export const DEFAULT_MIN_HITS = 3;

/** Default: 2 second cooldown per spec §3 ("start cooldown timer (2s) to
 *  avoid machine-gunning the user"). */
export const DEFAULT_COOLDOWN_MS = 2000;

export interface TriggerStateOpts {
  minHits?: number;
  cooldownMs?: number;
}

/** What happened this tick.
 *  - `idle`     — nothing notable; either the frame was a miss or hit
 *                 count is still climbing.
 *  - `fire`     — the MIN_HITS threshold just crossed; caller should play
 *                 the alert, bump the counter, flip the circle.
 *  - `cooldown` — a positive frame arrived inside the cooldown window;
 *                 suppressed on purpose. Useful for tests and for debug
 *                 overlays if we ever add one. */
export type TriggerUpdateResult = 'idle' | 'fire' | 'cooldown';

/**
 * Stateful update loop. Deliberately a plain class so it's easy to
 * instantiate fresh per-mount in React and reset in tests.
 */
export class TriggerState {
  private consecutiveHits = 0;
  /** Timestamp of the last fire, or -Infinity if we've never fired. Used
   *  to compute cooldown expiration. */
  private lastFireAt = -Infinity;
  private readonly minHits: number;
  private readonly cooldownMs: number;

  constructor(opts: TriggerStateOpts = {}) {
    this.minHits = opts.minHits ?? DEFAULT_MIN_HITS;
    this.cooldownMs = opts.cooldownMs ?? DEFAULT_COOLDOWN_MS;
  }

  /**
   * Feed one frame's detection result and a monotonic timestamp (ms).
   * Returns what this tick should do.
   */
  update(frame: DetectionResult, now: number): TriggerUpdateResult {
    const inCooldown = now - this.lastFireAt < this.cooldownMs;

    if (!frame.triggered) {
      // Miss: reset the streak so brief gaps break the run.
      this.consecutiveHits = 0;
      return 'idle';
    }

    // Hit path. If we're still cooling down from the previous fire, hold
    // the counter at zero so we don't re-fire the instant cooldown ends
    // mid-sustained-contact. This is the spec's explicit anti-machine-gun
    // posture.
    if (inCooldown) {
      this.consecutiveHits = 0;
      return 'cooldown';
    }

    this.consecutiveHits += 1;
    if (this.consecutiveHits >= this.minHits) {
      this.lastFireAt = now;
      // Reset the streak so the NEXT fire (after cooldown) requires a
      // fresh 4 consecutive hits, not just 1.
      this.consecutiveHits = 0;
      return 'fire';
    }
    return 'idle';
  }

  /** Reset everything — used on unmount / pause-resume / test teardown. */
  reset(): void {
    this.consecutiveHits = 0;
    this.lastFireAt = -Infinity;
  }

  // --- Readonly accessors for tests / debug overlays. ---

  get currentHits(): number {
    return this.consecutiveHits;
  }

  /** How much of the cooldown remains at `now`, clamped to [0, cooldownMs].
   *  0 means we're free to fire again. */
  cooldownRemaining(now: number): number {
    const elapsed = now - this.lastFireAt;
    if (elapsed >= this.cooldownMs) return 0;
    if (elapsed < 0) return this.cooldownMs;
    return this.cooldownMs - elapsed;
  }
}
