import { describe, it, expect } from 'vitest';
import {
  TriggerState,
  DEFAULT_MIN_HITS,
  DEFAULT_COOLDOWN_MS,
} from '../../src/detection/triggerState';
import type { DetectionResult } from '../../src/detection/eyebrowProximity';

/**
 * TriggerState owns the consecutive-hits streak and the post-fire cooldown.
 * Tests drive it deterministically with synthetic DetectionResult frames
 * and explicit `now` timestamps — no timers, no real-world clock.
 */

function hit(): DetectionResult {
  return { triggered: true, minDistance: 0.04, thresholdUsed: 0.12 };
}

function miss(): DetectionResult {
  return { triggered: false, minDistance: 0.2, thresholdUsed: 0.12 };
}

describe('TriggerState — consecutive hits', () => {
  it('does not fire until MIN_HITS hits have accumulated', () => {
    const ts = new TriggerState();
    expect(DEFAULT_MIN_HITS).toBe(3);
    let now = 1000;
    expect(ts.update(hit(), now++)).toBe('idle'); // 1
    expect(ts.update(hit(), now++)).toBe('idle'); // 2
    expect(ts.update(hit(), now++)).toBe('fire'); // 3 → fire
  });

  it('resets the streak on a miss', () => {
    const ts = new TriggerState();
    let now = 1000;
    ts.update(hit(), now++);
    ts.update(hit(), now++);
    expect(ts.currentHits).toBe(2);
    ts.update(miss(), now++);
    expect(ts.currentHits).toBe(0);
    // Now we need 3 more hits, not 1 more.
    expect(ts.update(hit(), now++)).toBe('idle'); // 1
    expect(ts.update(hit(), now++)).toBe('idle'); // 2
    expect(ts.update(hit(), now++)).toBe('fire'); // 3
  });

  it('respects a custom minHits', () => {
    const ts = new TriggerState({ minHits: 2 });
    let now = 1000;
    expect(ts.update(hit(), now++)).toBe('idle');
    expect(ts.update(hit(), now++)).toBe('fire');
  });
});

describe('TriggerState — cooldown', () => {
  it('suppresses subsequent fires during the cooldown window', () => {
    const ts = new TriggerState();
    let now = 1000;
    // First fire.
    for (let i = 0; i < DEFAULT_MIN_HITS; i++) {
      ts.update(hit(), now++);
    }
    // Sanity: the 4th update above returned 'fire'; we're now inside cooldown.
    // Further hits should report 'cooldown' and not accumulate toward a
    // second fire.
    expect(ts.update(hit(), now++)).toBe('cooldown');
    expect(ts.update(hit(), now++)).toBe('cooldown');
    expect(ts.update(hit(), now++)).toBe('cooldown');
    expect(ts.update(hit(), now++)).toBe('cooldown');
    // Even after many cooldown-blocked hits, we still should not have
    // secretly incremented an internal counter that would fire once the
    // cooldown ends.
    expect(ts.currentHits).toBe(0);
  });

  it('misses during cooldown are still reported as idle', () => {
    const ts = new TriggerState();
    let now = 1000;
    for (let i = 0; i < DEFAULT_MIN_HITS; i++) {
      ts.update(hit(), now++);
    }
    expect(ts.update(miss(), now++)).toBe('idle');
  });

  it('allows a fresh fire after the cooldown elapses', () => {
    const ts = new TriggerState();
    let now = 1000;
    for (let i = 0; i < DEFAULT_MIN_HITS; i++) {
      ts.update(hit(), now++);
    }
    // Jump past the cooldown.
    now += DEFAULT_COOLDOWN_MS + 1;
    // Need a full fresh streak; the first hit after cooldown does NOT
    // re-fire immediately.
    expect(ts.update(hit(), now++)).toBe('idle');
    expect(ts.update(hit(), now++)).toBe('idle');
    expect(ts.update(hit(), now++)).toBe('fire');
  });

  it('cooldownRemaining decreases monotonically and clamps to 0', () => {
    const ts = new TriggerState();
    let now = 1000;
    for (let i = 0; i < DEFAULT_MIN_HITS; i++) {
      ts.update(hit(), now++);
    }
    const fireAt = now - 1;
    // Immediately after fire, cooldown ≈ DEFAULT_COOLDOWN_MS.
    expect(ts.cooldownRemaining(fireAt)).toBe(DEFAULT_COOLDOWN_MS);
    // Halfway through.
    expect(ts.cooldownRemaining(fireAt + DEFAULT_COOLDOWN_MS / 2)).toBe(
      DEFAULT_COOLDOWN_MS / 2
    );
    // After the window.
    expect(ts.cooldownRemaining(fireAt + DEFAULT_COOLDOWN_MS)).toBe(0);
    expect(ts.cooldownRemaining(fireAt + DEFAULT_COOLDOWN_MS + 5000)).toBe(0);
  });

  it('respects a custom cooldownMs', () => {
    const ts = new TriggerState({ cooldownMs: 500 });
    let now = 1000;
    for (let i = 0; i < DEFAULT_MIN_HITS; i++) {
      ts.update(hit(), now++);
    }
    // Still in cooldown.
    expect(ts.update(hit(), now + 100)).toBe('cooldown');
    // Past cooldown — requires a fresh streak to re-fire.
    now += 600;
    expect(ts.update(hit(), now++)).toBe('idle');
    expect(ts.update(hit(), now++)).toBe('idle');
    expect(ts.update(hit(), now++)).toBe('fire');
  });
});

describe('TriggerState — reset()', () => {
  it('clears streak and cooldown', () => {
    const ts = new TriggerState();
    let now = 1000;
    for (let i = 0; i < DEFAULT_MIN_HITS; i++) {
      ts.update(hit(), now++);
    }
    // Post-fire, we're in cooldown.
    expect(ts.cooldownRemaining(now)).toBeGreaterThan(0);
    ts.reset();
    expect(ts.currentHits).toBe(0);
    // After reset, lastFireAt = -Infinity → cooldownRemaining is 0 for
    // any finite `now`. Immediate re-fire is allowed (once a fresh
    // streak has accumulated).
    expect(ts.cooldownRemaining(now)).toBe(0);
    // After reset + a fresh streak at the same `now`, we should fire
    // once the MIN_HITS threshold is crossed again.
    expect(ts.update(hit(), now++)).toBe('idle');
    expect(ts.update(hit(), now++)).toBe('idle');
    expect(ts.update(hit(), now++)).toBe('fire');
  });
});
