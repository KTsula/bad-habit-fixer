import { forwardRef } from 'react';
import { copy } from '../copy';

interface WebcamThumbnailProps {
  /** Ref attached to the `<video>` element; the webcam hook writes its
   *  MediaStream onto this element via `srcObject`. */
  videoRef: React.RefObject<HTMLVideoElement>;
  /** When true, render the "Camera unavailable" flat state instead of video. */
  unavailable: boolean;
  /** When true, the overlay canvas is visible (design.md §7.2 toggle). */
  showLandmarks: boolean;
  /** Toggle handler wired to the show-landmarks control. */
  onToggleLandmarks: () => void;
}

/**
 * Small, secondary webcam thumbnail in the top-right corner.
 *
 * design.md §7.2:
 * - 200×150 (4:3), top-right, inset space-5 from edges.
 * - radius-md frame, 1px border-subtle, surface-sunken bg.
 * - Mirrored video (scaleX(-1)).
 * - Landmark overlay canvas absolutely positioned on top.
 * - Single-icon toggle button bottom-right inside the frame.
 *
 * The canvas ref is forwarded so `App` can draw landmarks on it from the
 * MediaPipe pipeline.
 */
export const WebcamThumbnail = forwardRef<HTMLCanvasElement, WebcamThumbnailProps>(
  function WebcamThumbnail(
    { videoRef, unavailable, showLandmarks, onToggleLandmarks },
    canvasRef
  ): JSX.Element {
    return (
      <div
        className={[
          'fixed top-space-5 right-space-5 z-10',
          'w-[200px] h-[150px]',
          'rounded-md overflow-hidden',
          'border border-border-subtle bg-surface-sunken',
        ].join(' ')}
      >
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          style={{
            transform: 'scaleX(-1)',
            display: unavailable ? 'none' : 'block',
          }}
          playsInline
          muted
        />

        {/* Landmark overlay canvas — mirrored to match video. */}
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{
            transform: 'scaleX(-1)',
            display: showLandmarks && !unavailable ? 'block' : 'none',
          }}
        />

        {/* Unavailable fallback: flat surface-sunken with centered text-caption. */}
        {unavailable && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-caption text-text-muted">
              {copy.statusLabel.cameraUnavailable}
            </span>
          </div>
        )}

        {/* Landmark toggle button. 24px square, bottom-right. radius-sm.
            Icon: dotted-grid glyph per §7.2. Using a minimal inline SVG to
            avoid pulling in an icon library for a single glyph at M2. */}
        <button
          type="button"
          onClick={onToggleLandmarks}
          aria-label={copy.button.toggleLandmarks}
          aria-pressed={showLandmarks}
          className={[
            'absolute bottom-space-1 right-space-1',
            'w-6 h-6 inline-flex items-center justify-center',
            'rounded-sm',
            'bg-surface/70 text-text-muted hover:text-text',
            'transition-colors duration-short ease-calm',
          ].join(' ')}
        >
          <DottedGridIcon active={showLandmarks} />
        </button>
      </div>
    );
  }
);

/**
 * 3×3 dotted-grid glyph. Stroke icon at 16px inside a 24px hit target.
 * Not from a library — one SVG, ~20 bytes of markup. design.md §10 allows
 * builder to pick Lucide or Heroicons; for a single glyph we inline it to
 * avoid the dep.
 */
function DottedGridIcon({ active }: { active: boolean }): JSX.Element {
  const dots: Array<[number, number]> = [
    [4, 4],
    [8, 4],
    [12, 4],
    [4, 8],
    [8, 8],
    [12, 8],
    [4, 12],
    [8, 12],
    [12, 12],
  ];
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill={active ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1"
      aria-hidden="true"
    >
      {dots.map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="1" />
      ))}
    </svg>
  );
}
