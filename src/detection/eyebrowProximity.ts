/**
 * Eyebrow-proximity detection rule.
 *
 * Pure, framework-free implementation of the heuristic from spec.md §3:
 *
 *   1. Given one frame's HandLandmarker + FaceLandmarker output.
 *   2. No hand or no face → not triggered.
 *   3. For each hand: thumb tip (index 4) and index fingertip (index 8).
 *   4. Face bbox width = (max face landmark x − min face landmark x).
 *   5. Eyebrow clusters:
 *        left  = {70, 63, 105, 66, 107}
 *        right = {336, 296, 334, 293, 300}
 *   6. For each (fingertip × eyebrow landmark): 2D euclidean distance,
 *      divided by face bbox width → scale-invariant.
 *   7. `triggered` when the minimum distance < THRESHOLD.
 *
 * This file knows NOTHING about consecutive frames, cooldown, or alerts.
 * That is `triggerState.ts`'s job. Keeping the classifier stateless makes
 * it trivially unit-testable with hand-rolled landmark fixtures.
 */

/** The minimal landmark shape we rely on. Structurally compatible with
 *  MediaPipe's NormalizedLandmark, but we accept any {x, y} pair so tests
 *  can construct fixtures without pulling in the full type. */
export interface Point2D {
  x: number;
  y: number;
}

/** Fingertip indices on MediaPipe HandLandmarker's 21-point skeleton.
 *  Spec §3: thumb tip = 4, index fingertip = 8. */
export const FINGERTIP_INDICES = [4, 8] as const;

/** Eyebrow landmark clusters on MediaPipe FaceLandmarker's 468-point mesh.
 *  Spec §3 lists these explicitly — do not edit without re-reading the spec. */
export const LEFT_EYEBROW_INDICES = [70, 63, 105, 66, 107] as const;
export const RIGHT_EYEBROW_INDICES = [336, 296, 334, 293, 300] as const;

/** Default threshold: 0.12 of face bbox width. Biased toward recall —
 *  fires more readily, user tunes down with a sensitivity slider later. */
export const DEFAULT_EYEBROW_THRESHOLD = 0.12;

export interface ClassifyFrameOpts {
  /** Override the default threshold. */
  threshold?: number;
  /** Face landmark indices to check proximity against. Defaults to eyebrow
   *  clusters if omitted. */
  targetIndices?: readonly number[];
  /** Hand landmark indices to use as fingertips. Defaults to thumb + index
   *  (indices 4, 8) if omitted. */
  fingertipIndices?: readonly number[];
}

export interface DetectionResult {
  /** True iff minimum normalized fingertip-to-eyebrow distance < threshold
   *  AND both hand and face landmarks were present. */
  triggered: boolean;
  /** The minimum normalized distance found this frame, or `null` if we
   *  couldn't compute one (no hand, no face, or degenerate bbox). */
  minDistance: number | null;
  /** The threshold actually used (echoed back so callers and tests don't
   *  have to know the default). */
  thresholdUsed: number;
}

/**
 * Classify a single frame's landmarks. Pure — no side effects, no React,
 * no mutation of inputs. Safe to call from any context.
 *
 * Accepts `null` / `undefined` landmark arrays for the empty-frame case
 * (MediaPipe returns an empty `faceLandmarks: []` when no face is found,
 * which we also treat as "no face").
 */
export function classifyFrame(
  faceLandmarks: Point2D[][] | null | undefined,
  handLandmarks: Point2D[][] | null | undefined,
  opts: ClassifyFrameOpts = {}
): DetectionResult {
  const threshold = opts.threshold ?? DEFAULT_EYEBROW_THRESHOLD;

  // Step 2: no hand OR no face → not triggered.
  const face = faceLandmarks && faceLandmarks.length > 0 ? faceLandmarks[0] : null;
  const hands = handLandmarks ?? [];
  if (!face || face.length === 0 || hands.length === 0) {
    return { triggered: false, minDistance: null, thresholdUsed: threshold };
  }

  // Step 4: face bbox width from min/max x over all face landmarks.
  // Degenerate faces (all landmarks stacked at the same x) would divide by
  // zero — return null distance and not-triggered in that case.
  let minX = Infinity;
  let maxX = -Infinity;
  for (const p of face) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
  }
  const bboxWidth = maxX - minX;
  if (!isFinite(bboxWidth) || bboxWidth <= 0) {
    return { triggered: false, minDistance: null, thresholdUsed: threshold };
  }

  // Step 5: gather target face landmarks. Configurable — defaults to
  // eyebrow clusters, but callers can pass any set of face mesh indices
  // (e.g. nose, forehead) for other habits.
  const targetIdx = opts.targetIndices ?? [
    ...LEFT_EYEBROW_INDICES,
    ...RIGHT_EYEBROW_INDICES,
  ];
  const targetPoints: Point2D[] = [];
  for (const i of targetIdx) {
    const p = face[i];
    if (p) targetPoints.push(p);
  }
  if (targetPoints.length === 0) {
    return { triggered: false, minDistance: null, thresholdUsed: threshold };
  }

  // Step 6: for each (fingertip, target) pair, compute normalized distance.
  // We only ever care about the minimum — a single close fingertip fires
  // the rule regardless of how far the others are.
  const tips = opts.fingertipIndices ?? FINGERTIP_INDICES;
  let minNormalizedDist = Infinity;
  for (const hand of hands) {
    for (const tipIndex of tips) {
      const tip = hand[tipIndex];
      if (!tip) continue;
      for (const brow of targetPoints) {
        const dx = tip.x - brow.x;
        const dy = tip.y - brow.y;
        const d = Math.sqrt(dx * dx + dy * dy) / bboxWidth;
        if (d < minNormalizedDist) minNormalizedDist = d;
      }
    }
  }

  // Guard: if we somehow never entered the loop (shouldn't happen given
  // the checks above, but TS can't prove it), fall through to null.
  if (!isFinite(minNormalizedDist)) {
    return { triggered: false, minDistance: null, thresholdUsed: threshold };
  }

  return {
    triggered: minNormalizedDist < threshold,
    minDistance: minNormalizedDist,
    thresholdUsed: threshold,
  };
}
