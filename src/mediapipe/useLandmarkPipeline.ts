import { useEffect, useRef, useState } from 'react';
import {
  createLandmarkers,
  disposeLandmarkers,
  type Landmarkers,
} from './landmarkers';
import { classifyFrame } from '../detection/eyebrowProximity';
import { TriggerState } from '../detection/triggerState';
import type { HabitConfig } from '../detection/habits';

/**
 * Loading state for the MediaPipe models. Surfaced so the UI can show
 * "Getting ready…" per design.md §8 microcopy (we don't render it yet at
 * Milestone 2, but the state is exposed for Milestone 3+).
 */
export type PipelineStatus = 'idle' | 'loading' | 'running' | 'failed';

export interface UseLandmarkPipelineArgs {
  /** The <video> element producing frames. May be null until the webcam is ready. */
  videoRef: React.RefObject<HTMLVideoElement>;
  /** The overlay canvas we draw landmarks on. Same size as the video display. */
  canvasRef: React.RefObject<HTMLCanvasElement>;
  /** When true, landmark dots are drawn to the canvas. When false, canvas is
   *  cleared each frame but detection still runs (so a future M3 rule engine
   *  can consume the points without the user seeing dots). */
  drawLandmarks: boolean;
  /** Which habit to detect. Controls which face/hand landmarks are
   *  checked for proximity. */
  habit: HabitConfig;
  /** Kill switch: when true (e.g. webcam not ready, user paused, or tab hidden),
   *  the loop does not run and no models are loaded. */
  enabled: boolean;
  /** Called once per "fire" event from the detection state machine.
   *  Undefined = detection still runs (so landmarks still draw) but no
   *  trigger notification is emitted. Milestone 3 wires this. */
  onTrigger?: () => void;
}

// Target frame budget. spec §9 Milestone 2 says 15+ FPS. We aim for ~20 FPS so
// we don't starve the main thread; if we can't hit it, we drop frames
// gracefully via the minInterval check.
const MIN_FRAME_INTERVAL_MS = 1000 / 30; // allow up to 30 FPS natural cap
const MAX_FRAME_INTERVAL_MS = 1000 / 15; // if slower than 15 FPS, that's ok —
//                                         we just do what we can, no throttling
//                                         penalty.

// Dot style for the overlay. design.md calls out accent-soft for landmark dots.
const DOT_COLOR = '#F2A093'; // accent-soft
const DOT_RADIUS = 1.5;

/**
 * Landmark + detection pipeline. Each frame:
 *   1. pulls the next decoded video frame via `requestVideoFrameCallback`
 *      (with a rAF fallback on Firefox <126),
 *   2. runs HandLandmarker + FaceLandmarker in VIDEO mode,
 *   3. classifies the frame via `classifyFrame` (spec.md §3) and feeds
 *      the result into the `TriggerState` streak/cooldown machine,
 *   4. on a 'fire' verdict, calls the caller's `onTrigger` callback,
 *   5. optionally draws landmark dots to the overlay canvas.
 *
 * Returns the loading status so the UI can render "Getting ready…" once
 * we wire the loading state through (not in M3).
 */
export function useLandmarkPipeline({
  videoRef,
  canvasRef,
  drawLandmarks,
  habit,
  enabled,
  onTrigger,
}: UseLandmarkPipelineArgs): { status: PipelineStatus } {
  const [status, setStatus] = useState<PipelineStatus>('idle');

  // Mutable refs for values that change frequently or need to be read inside
  // the rVFC callback without retriggering the effect.
  const landmarkersRef = useRef<Landmarkers | null>(null);
  const drawLandmarksRef = useRef(drawLandmarks);
  const enabledRef = useRef(enabled);
  const lastFrameRef = useRef(0);
  // Detection state machine — one instance per pipeline lifetime. Fresh
  // per-mount via useRef so pause/resume cycles don't leak cooldown state
  // across sessions (we reset it explicitly below too).
  const triggerStateRef = useRef<TriggerState | null>(null);
  if (triggerStateRef.current === null) {
    triggerStateRef.current = new TriggerState();
  }
  // Habit config is read via ref so switching habits doesn't tear down
  // the landmarkers — only the comparison logic changes.
  const habitRef = useRef(habit);
  // onTrigger is read via ref so a new callback identity from the parent
  // (e.g. closure over fresh state) doesn't retrigger the effect and tear
  // down the landmarkers.
  const onTriggerRef = useRef(onTrigger);

  // Keep refs in sync with the latest prop values. Cheap and avoids
  // re-subscribing the rVFC loop on every toggle.
  useEffect(() => {
    drawLandmarksRef.current = drawLandmarks;
  }, [drawLandmarks]);
  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);
  useEffect(() => {
    habitRef.current = habit;
  }, [habit]);
  useEffect(() => {
    onTriggerRef.current = onTrigger;
  }, [onTrigger]);

  useEffect(() => {
    if (!enabled) {
      setStatus('idle');
      // Clear out any in-flight hit streak / cooldown so a resume starts
      // cleanly. Otherwise a user who paused mid-trigger would find the
      // next hand-near-face frame after resume immediately fires.
      triggerStateRef.current?.reset();
      return;
    }

    let cancelled = false;
    let rvfcHandle: number | null = null;
    setStatus('loading');

    createLandmarkers()
      .then((lm) => {
        if (cancelled) {
          disposeLandmarkers(lm);
          return;
        }
        landmarkersRef.current = lm;
        setStatus('running');
        scheduleNextFrame();
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        // eslint-disable-next-line no-console
        console.error('Failed to load MediaPipe landmarkers', err);
        setStatus('failed');
      });

    function scheduleNextFrame(): void {
      const video = videoRef.current;
      if (!video) return;
      // `requestVideoFrameCallback` fires once per decoded frame — the
      // canonical way to sync ML inference to webcam cadence. Fallback to
      // rAF if the browser is missing it (Firefox < 126-ish); we accept a
      // slightly noisier cadence on those browsers.
      if (typeof video.requestVideoFrameCallback === 'function') {
        rvfcHandle = video.requestVideoFrameCallback(onVideoFrame);
      } else {
        rvfcHandle = requestAnimationFrame(() =>
          onVideoFrame(performance.now(), {
            expectedDisplayTime: performance.now(),
            height: video.videoHeight,
            width: video.videoWidth,
            mediaTime: video.currentTime,
            presentationTime: performance.now(),
            presentedFrames: 0,
            processingDuration: 0,
          } as VideoFrameCallbackMetadata)
        );
      }
    }

    function onVideoFrame(
      _now: DOMHighResTimeStamp,
      metadata: VideoFrameCallbackMetadata
    ): void {
      if (cancelled || !enabledRef.current) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const lm = landmarkersRef.current;

      if (!video || !canvas || !lm || video.readyState < 2) {
        scheduleNextFrame();
        return;
      }

      // Simple frame throttling: if frames arrive faster than our minimum
      // interval we drop the extras. Satisfies spec §9 M2 "target 15+ FPS".
      const now = performance.now();
      const elapsed = now - lastFrameRef.current;
      if (elapsed < MIN_FRAME_INTERVAL_MS) {
        scheduleNextFrame();
        return;
      }
      lastFrameRef.current = now;

      // Size the overlay canvas to the *intrinsic* video dimensions so our
      // draw coordinates (derived from normalized landmarks × videoWidth/Height)
      // are 1:1 with the canvas. CSS then scales it down to the thumbnail
      // 200×150 box — no coordinate-space distortion.
      const vw = video.videoWidth;
      const vh = video.videoHeight;
      if (vw === 0 || vh === 0) {
        scheduleNextFrame();
        return;
      }
      if (canvas.width !== vw) canvas.width = vw;
      if (canvas.height !== vh) canvas.height = vh;

      // MediaPipe's VIDEO running-mode requires a monotonically-increasing
      // timestamp. `metadata.mediaTime` is in seconds; we convert to ms.
      // Fall back to performance.now() if mediaTime isn't present.
      const timestamp = Math.round(
        (metadata.mediaTime ?? now / 1000) * 1000
      );

      let handResult: ReturnType<Landmarkers['hand']['detectForVideo']> | null = null;
      let faceResult: ReturnType<Landmarkers['face']['detectForVideo']> | null = null;
      try {
        handResult = lm.hand.detectForVideo(video, timestamp);
        faceResult = lm.face.detectForVideo(video, timestamp);
      } catch (err) {
        // Inference errors are transient (e.g. seeking the video). Skip the
        // frame, keep the loop alive.
        // eslint-disable-next-line no-console
        console.warn('Landmarker detectForVideo threw', err);
        scheduleNextFrame();
        return;
      }

      // Detection. spec.md §3 — run the pure classifier, feed the result
      // into the stateful streak/cooldown machine, and on 'fire' call out
      // to the consumer's onTrigger (which owns audio + counter + circle
      // state). We pass the landmark arrays through even when they're
      // undefined — classifyFrame handles both cases.
      const h = habitRef.current;
      const result = classifyFrame(
        faceResult?.faceLandmarks,
        handResult?.landmarks,
        {
          threshold: h.threshold,
          targetIndices: h.targetIndices,
          fingertipIndices: h.fingertipIndices,
        }
      );
      const ts = triggerStateRef.current;
      if (ts) {
        const verdict = ts.update(result, now);
        if (verdict === 'fire') {
          try {
            onTriggerRef.current?.();
          } catch (err) {
            // Don't let a consumer error kill the pipeline — log and keep
            // iterating. The alert layer has its own internal guards.
            // eslint-disable-next-line no-console
            console.error('onTrigger callback threw', err);
          }
        }
      }

      // Draw.
      const ctx = canvas.getContext('2d');
      if (ctx && drawLandmarksRef.current) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = DOT_COLOR;

        if (handResult?.landmarks) {
          for (const hand of handResult.landmarks) {
            for (const point of hand) {
              drawDot(ctx, point.x * canvas.width, point.y * canvas.height);
            }
          }
        }
        if (faceResult?.faceLandmarks) {
          for (const face of faceResult.faceLandmarks) {
            for (const point of face) {
              drawDot(ctx, point.x * canvas.width, point.y * canvas.height);
            }
          }
        }
      } else if (ctx) {
        // Canvas is hidden but we cleared last-frame junk anyway.
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }

      // Silence the unused-var warning in case someone deletes the interval
      // check above but keeps this variable.
      void MAX_FRAME_INTERVAL_MS;

      scheduleNextFrame();
    }

    return () => {
      cancelled = true;
      const video = videoRef.current;
      if (video && rvfcHandle !== null) {
        if (typeof video.cancelVideoFrameCallback === 'function') {
          video.cancelVideoFrameCallback(rvfcHandle);
        } else {
          cancelAnimationFrame(rvfcHandle);
        }
      }
      if (landmarkersRef.current) {
        disposeLandmarkers(landmarkersRef.current);
        landmarkersRef.current = null;
      }
    };
    // We intentionally only re-run this effect when `enabled` flips, not on
    // every drawLandmarks toggle — that value is read via a ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  return { status };
}

/** Tiny inline circle draw. Kept local to avoid creating a helpers file for one fn. */
function drawDot(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.beginPath();
  ctx.arc(x, y, DOT_RADIUS, 0, Math.PI * 2);
  ctx.fill();
}
