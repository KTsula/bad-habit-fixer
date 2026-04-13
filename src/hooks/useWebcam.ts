import { useEffect, useRef, useState } from 'react';

/**
 * Webcam lifecycle states surfaced to consumers.
 *
 * - `idle`        — not yet requested; initial state.
 * - `requesting`  — getUserMedia in flight, permission prompt may be visible.
 * - `ready`       — stream attached, <video> is playing.
 * - `denied`      — user (or policy) refused camera permission.
 * - `busy`        — another app holds the device (NotReadableError / busy).
 * - `unavailable` — API missing, no camera present, or generic hardware fault.
 */
export type WebcamStatus =
  | 'idle'
  | 'requesting'
  | 'ready'
  | 'denied'
  | 'busy'
  | 'unavailable';

export interface UseWebcamResult {
  videoRef: React.RefObject<HTMLVideoElement>;
  status: WebcamStatus;
  /** Raw MediaStream, or null if not yet ready. Exposed so MediaPipe and
   *  the canvas-sync logic can read intrinsic video dimensions. */
  stream: MediaStream | null;
  /** Re-trigger getUserMedia after a denied / busy error. */
  retry: () => void;
}

/**
 * Classify a DOMException from getUserMedia into one of our error states.
 * Spec reference: spec.md §8 risk 5 (camera denied / busy).
 */
function classifyError(
  err: unknown
): Exclude<WebcamStatus, 'idle' | 'requesting' | 'ready'> {
  if (err instanceof DOMException) {
    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
      return 'denied';
    }
    if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
      return 'busy';
    }
  }
  return 'unavailable';
}

/**
 * Request and attach a webcam MediaStream to a <video> element.
 *
 * The consumer owns the `<video>` element via `videoRef` — this hook writes
 * `srcObject` on it whenever the stream resolves, and clears it on unmount.
 */
export function useWebcam(): UseWebcamResult {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [status, setStatus] = useState<WebcamStatus>('idle');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [retryTick, setRetryTick] = useState(0);

  useEffect(() => {
    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices ||
      typeof navigator.mediaDevices.getUserMedia !== 'function'
    ) {
      setStatus('unavailable');
      return;
    }

    let cancelled = false;
    let acquiredStream: MediaStream | null = null;

    setStatus('requesting');

    navigator.mediaDevices
      .getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
        audio: false,
      })
      .then((s) => {
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        acquiredStream = s;
        const videoEl = videoRef.current;
        if (videoEl) {
          videoEl.srcObject = s;
          videoEl.muted = true;
          videoEl.playsInline = true;
          const p = videoEl.play();
          if (p && typeof p.catch === 'function') {
            p.catch((err: unknown) => {
              if (err instanceof DOMException && err.name === 'AbortError') return;
              // eslint-disable-next-line no-console
              console.warn('video.play() failed', err);
            });
          }
        }
        setStream(s);
        setStatus('ready');
      })
      .catch((err) => {
        if (cancelled) return;
        setStatus(classifyError(err));
      });

    return () => {
      cancelled = true;
      if (acquiredStream) {
        acquiredStream.getTracks().forEach((t) => t.stop());
      }
      const videoEl = videoRef.current;
      if (videoEl) {
        videoEl.srcObject = null;
      }
      setStream(null);
    };
  }, [retryTick]);

  return {
    videoRef,
    status,
    stream,
    retry: () => setRetryTick((t) => t + 1),
  };
}
