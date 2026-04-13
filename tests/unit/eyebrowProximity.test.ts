import { describe, it, expect } from 'vitest';
import {
  classifyFrame,
  DEFAULT_EYEBROW_THRESHOLD,
  LEFT_EYEBROW_INDICES,
  type Point2D,
} from '../../src/detection/eyebrowProximity';

/**
 * classifyFrame is the pure spec.md §3 rule. These tests pin the contract:
 *   - missing inputs ⇒ not triggered, null distance
 *   - hand far from brows ⇒ not triggered
 *   - hand close to brows ⇒ triggered
 *   - hand at exactly the threshold ⇒ not triggered (strict less-than)
 *   - threshold override works
 *
 * Fixtures are synthetic: we construct the minimum-sized face/hand landmark
 * arrays that satisfy the indices the rule reads. No MediaPipe dependency.
 */

/**
 * Build a synthetic face landmark array large enough to expose every index
 * in LEFT_EYEBROW_INDICES and RIGHT_EYEBROW_INDICES (max index 336). All
 * points default to (0, 0). Bbox width is controlled by two "corner" points
 * at indices 0 (left edge) and 1 (right edge).
 */
function makeFace(opts: {
  /** x coordinate of the left edge of the bbox (index 0). */
  bboxLeft: number;
  /** x coordinate of the right edge of the bbox (index 1). */
  bboxRight: number;
  /** (x, y) for every eyebrow landmark — we cluster them all at one spot
   *  so the test can reason about a single "brow center." */
  browPoint: Point2D;
}): Point2D[] {
  const size = 468;
  const face: Point2D[] = new Array(size).fill(null).map(() => ({ x: 0.5, y: 0.5 }));
  face[0] = { x: opts.bboxLeft, y: 0.5 };
  face[1] = { x: opts.bboxRight, y: 0.5 };
  // Write the brow point to every eyebrow landmark index.
  const browIdx = [...LEFT_EYEBROW_INDICES, 336, 296, 334, 293, 300];
  for (const i of browIdx) {
    face[i] = { ...opts.browPoint };
  }
  return face;
}

/**
 * Build a synthetic hand landmark array with fingertips at given positions.
 * Indices 4 (thumb) and 8 (index) are the ones the rule reads.
 */
function makeHand(thumb: Point2D, indexTip: Point2D): Point2D[] {
  const hand: Point2D[] = new Array(21).fill(null).map(() => ({ x: 0.5, y: 0.5 }));
  hand[4] = thumb;
  hand[8] = indexTip;
  return hand;
}

describe('classifyFrame — missing inputs', () => {
  it('returns not-triggered when no face is present', () => {
    const hand = makeHand({ x: 0.5, y: 0.5 }, { x: 0.5, y: 0.5 });
    const result = classifyFrame(null, [hand]);
    expect(result.triggered).toBe(false);
    expect(result.minDistance).toBeNull();
    expect(result.thresholdUsed).toBe(DEFAULT_EYEBROW_THRESHOLD);
  });

  it('returns not-triggered when the face array is empty', () => {
    const hand = makeHand({ x: 0.5, y: 0.5 }, { x: 0.5, y: 0.5 });
    const result = classifyFrame([], [hand]);
    expect(result.triggered).toBe(false);
    expect(result.minDistance).toBeNull();
  });

  it('returns not-triggered when no hand is present', () => {
    const face = makeFace({
      bboxLeft: 0.3,
      bboxRight: 0.7,
      browPoint: { x: 0.5, y: 0.4 },
    });
    const result = classifyFrame([face], null);
    expect(result.triggered).toBe(false);
    expect(result.minDistance).toBeNull();
  });

  it('returns not-triggered when the hand array is empty', () => {
    const face = makeFace({
      bboxLeft: 0.3,
      bboxRight: 0.7,
      browPoint: { x: 0.5, y: 0.4 },
    });
    const result = classifyFrame([face], []);
    expect(result.triggered).toBe(false);
    expect(result.minDistance).toBeNull();
  });

  it('returns not-triggered when face bbox has zero width (degenerate)', () => {
    // All face landmarks collapsed onto x=0.5 → bbox width is 0.
    const face: Point2D[] = new Array(468)
      .fill(null)
      .map(() => ({ x: 0.5, y: 0.5 }));
    const hand = makeHand({ x: 0.5, y: 0.5 }, { x: 0.5, y: 0.5 });
    const result = classifyFrame([face], [hand]);
    expect(result.triggered).toBe(false);
    expect(result.minDistance).toBeNull();
  });
});

describe('classifyFrame — distance classification', () => {
  // Face is 0.4 wide (bbox x from 0.3 to 0.7), brow centered at (0.5, 0.4).
  // Any fingertip at a raw distance of D from the brow yields normalized
  // distance D / 0.4.
  const face = makeFace({
    bboxLeft: 0.3,
    bboxRight: 0.7,
    browPoint: { x: 0.5, y: 0.4 },
  });

  it('fires when the index fingertip is well inside the threshold', () => {
    // Place the index tip 0.01 away from the brow → normalized = 0.025,
    // which is comfortably below the 0.08 default threshold.
    const hand = makeHand(
      { x: 0.9, y: 0.9 }, // thumb far away
      { x: 0.51, y: 0.4 } // index 0.01 right of brow
    );
    const result = classifyFrame([face], [hand]);
    expect(result.triggered).toBe(true);
    expect(result.minDistance).toBeCloseTo(0.025, 5);
  });

  it('does not fire when both fingertips are far from the face', () => {
    // Both tips at (0.9, 0.9) → raw distance from brow ≈ 0.64,
    // normalized ≈ 1.6 — way above threshold.
    const hand = makeHand({ x: 0.9, y: 0.9 }, { x: 0.9, y: 0.9 });
    const result = classifyFrame([face], [hand]);
    expect(result.triggered).toBe(false);
    expect(result.minDistance).not.toBeNull();
    expect(result.minDistance!).toBeGreaterThan(DEFAULT_EYEBROW_THRESHOLD);
  });

  it('takes the MINIMUM distance across fingertips (thumb close, index far)', () => {
    const hand = makeHand(
      { x: 0.5, y: 0.41 }, // thumb ~0.01 from brow → normalized 0.025
      { x: 0.9, y: 0.9 } // index tip far
    );
    const result = classifyFrame([face], [hand]);
    expect(result.triggered).toBe(true);
    // The minimum should reflect the thumb, not an average.
    expect(result.minDistance!).toBeLessThan(0.05);
  });

  it('does not fire when distance is exactly at the threshold (strict <)', () => {
    // We want a normalized distance of exactly 0.12. Raw distance = 0.12 × 0.4
    // = 0.048 along a single axis. Place the index tip that far from the brow.
    const hand = makeHand(
      { x: 0.9, y: 0.9 },
      { x: 0.5 + 0.048, y: 0.4 }
    );
    const result = classifyFrame([face], [hand]);
    expect(result.minDistance!).toBeCloseTo(0.12, 5);
    expect(result.triggered).toBe(false);
  });

  it('fires just below the threshold', () => {
    const hand = makeHand(
      { x: 0.9, y: 0.9 },
      { x: 0.5 + 0.047, y: 0.4 } // normalized ≈ 0.1175
    );
    const result = classifyFrame([face], [hand]);
    expect(result.minDistance!).toBeLessThan(DEFAULT_EYEBROW_THRESHOLD);
    expect(result.triggered).toBe(true);
  });

  it('respects a custom threshold override', () => {
    // With threshold = 0.2, a fingertip at normalized 0.1 should trigger.
    const hand = makeHand(
      { x: 0.9, y: 0.9 },
      { x: 0.5 + 0.04, y: 0.4 } // normalized = 0.1
    );
    const loose = classifyFrame([face], [hand], { threshold: 0.2 });
    expect(loose.triggered).toBe(true);
    expect(loose.thresholdUsed).toBe(0.2);
    const strict = classifyFrame([face], [hand], { threshold: 0.05 });
    expect(strict.triggered).toBe(false);
    expect(strict.thresholdUsed).toBe(0.05);
  });

  it('considers multiple hands and picks the closest one', () => {
    const hand1 = makeHand({ x: 0.9, y: 0.9 }, { x: 0.9, y: 0.9 });
    const hand2 = makeHand({ x: 0.9, y: 0.9 }, { x: 0.51, y: 0.4 });
    const result = classifyFrame([face], [hand1, hand2]);
    expect(result.triggered).toBe(true);
    expect(result.minDistance!).toBeCloseTo(0.025, 5);
  });
});
