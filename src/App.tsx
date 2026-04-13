import { useRef, useState, useMemo, useCallback, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { HeroCircle, type CircleState } from './components/HeroCircle';
import { PauseButton } from './components/PauseButton';
import { SessionCounter } from './components/SessionCounter';
import { WebcamThumbnail } from './components/WebcamThumbnail';
import { SettingsPanel } from './components/SettingsPanel';
import { useWebcam } from './hooks/useWebcam';
import { useReducedMotion } from './hooks/useReducedMotion';
import { useLandmarkPipeline } from './mediapipe/useLandmarkPipeline';
import { primeAlertPlayer, playAlert, setAlertSound } from './audio/alertPlayer';
import { copy } from './copy';
import { HABITS, loadHabitId, saveHabitId, type HabitId } from './detection/habits';
import { loadSoundId, saveSoundId, type SoundId } from './audio/sounds';

/**
 * How long the hero circle stays in the `triggered` state after a fire.
 * Matches the design.md §6 trigger arc: 450ms swell + 300ms hold + 900ms
 * release = 1650ms total. We flip back to idle once the arc completes so
 * the breathing animation resumes cleanly.
 */
const TRIGGER_ARC_MS = 1650;
const IS_TAURI = '__TAURI_INTERNALS__' in window;

/**
 * Main screen. Milestones 0–3:
 *   - M0: toolchain, design tokens, Hello renders.
 *   - M1: webcam preview, pause/resume, privacy statement, hero circle in
 *         idle-only state, session counter stays at zero, error microcopy
 *         for denied / busy / unavailable camera.
 *   - M2: MediaPipe hand + face landmarkers running, dots drawn to overlay
 *         canvas, "Show landmarks" inline toggle.
 *   - M3: eyebrow-proximity detection, alert sound w/ 2s cooldown, hero
 *         circle flips to triggered + runs the 1.65s arc, session counter
 *         increments on every fire. Threshold is hard-coded — sliders and
 *         persistence land in M4.
 */
export function App(): JSX.Element {
  const { videoRef, status: webcamStatus, retry } = useWebcam();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reducedMotion = useReducedMotion();

  const [paused, setPaused] = useState(false);
  const [showLandmarks, setShowLandmarks] = useState(false);
  const [habitId, setHabitId] = useState<HabitId>(loadHabitId);
  const [soundId, setSoundId] = useState<SoundId>(loadSoundId);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Session counter — incremented every time the detection rule fires.
  // Reset on reload (no localStorage until M4) per spec §8 open question 3.
  const [sessionCount, setSessionCount] = useState(0);

  // Transient flag flipped true for 1.65s after each fire so the hero
  // circle runs its trigger arc. A timeout resets it; a new fire restarts
  // the timeout so overlapping triggers don't clip the animation short
  // (design.md §6 "triggered → triggered rapid-fire" rule).
  const [triggered, setTriggered] = useState(false);
  const triggerTimeoutRef = useRef<number | null>(null);

  // Derive the hero circle state from webcam + paused + triggered flags.
  // Priority: error > paused > triggered > idle.
  const circleState: CircleState = useMemo(() => {
    if (webcamStatus === 'denied' || webcamStatus === 'busy' || webcamStatus === 'unavailable') {
      return 'error';
    }
    if (paused) return 'paused';
    if (triggered) return 'triggered';
    return 'idle';
  }, [webcamStatus, paused, triggered]);

  const errorKind: 'unavailable' | 'denied' | 'busy' | undefined =
    webcamStatus === 'denied'
      ? 'denied'
      : webcamStatus === 'busy'
      ? 'busy'
      : webcamStatus === 'unavailable'
      ? 'unavailable'
      : undefined;

  // onTrigger: fires once per detection cycle from the pipeline. Owns the
  // three user-facing side effects (sound, counter, circle flip) in one
  // place. design.md §6 step 1: counter increments *at the swell start*,
  // not at release — users want the number to update the moment they see
  // the circle move.
  const handleTrigger = useCallback((): void => {
    playAlert();
    setSessionCount((n) => {
      const next = n + 1;
      // Update the system tray tooltip when running inside Tauri.
      if (IS_TAURI) {
        invoke('update_tray_state', { triggered: true, count: next }).catch(() => {});
      }
      return next;
    });
    setTriggered(true);
    if (triggerTimeoutRef.current !== null) {
      window.clearTimeout(triggerTimeoutRef.current);
    }
    triggerTimeoutRef.current = window.setTimeout(() => {
      setTriggered(false);
      triggerTimeoutRef.current = null;
    }, TRIGGER_ARC_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (triggerTimeoutRef.current !== null) {
        window.clearTimeout(triggerTimeoutRef.current);
      }
    };
  }, []);

  // The landmark pipeline only runs when the webcam is actually ready AND
  // the user hasn't paused. design.md §7.2 specifies the preview stays
  // visible while paused, but we stop inference to save battery per
  // spec §8 risk 6.
  const pipelineEnabled = webcamStatus === 'ready' && !paused;
  const habitConfig = HABITS[habitId];
  useLandmarkPipeline({
    videoRef,
    canvasRef,
    drawLandmarks: showLandmarks,
    habit: habitConfig,
    enabled: pipelineEnabled,
    onTrigger: handleTrigger,
  });

  // Browser autoplay policy: audio can only start playing after a user
  // gesture. Prime on the first click anywhere in the document; the
  // alertPlayer module is idempotent so multiple primes are safe.
  useEffect(() => {
    const prime = (): void => {
      void primeAlertPlayer();
    };
    window.addEventListener('pointerdown', prime, { once: true });
    window.addEventListener('keydown', prime, { once: true });
    return () => {
      window.removeEventListener('pointerdown', prime);
      window.removeEventListener('keydown', prime);
    };
  }, []);

  const showRetry = circleState === 'error';

  return (
    <main className="relative min-h-screen w-full bg-surface text-text flex flex-col items-center px-space-6 pb-space-6">
      {!IS_TAURI && (
        <div className="w-full max-w-[520px] mt-space-4 px-space-4 py-space-3 rounded-lg bg-surface-raised border border-border-strong text-caption text-text-muted text-center leading-relaxed">
          You're using the browser version. Detection <strong className="text-text">pauses when this tab
          loses focus</strong>.{' '}
          <a
            href="https://github.com/KTsula/bad-habit-fixer/releases/latest"
            className="text-accent hover:text-accent-strong underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Download the desktop app
          </a>{' '}
          for background monitoring.
        </div>
      )}
      <WebcamThumbnail
        ref={canvasRef}
        videoRef={videoRef}
        unavailable={circleState === 'error'}
        showLandmarks={showLandmarks}
        onToggleLandmarks={() => setShowLandmarks((v) => !v)}
      />

      {/* Main stack: circle + label (inside HeroCircle) → counter → button.
          design.md §7.1 wants the circle's center at ~42vh. Rather than
          vertical-centering (which lands center at 50vh), we pad from the
          top by 42vh minus one circle radius. The circle diameter is
          clamp(220px, 35vh, 340px), so radius is clamp(110px, 17.5vh, 170px). */}
      <div
        className="flex flex-col items-center w-full"
        style={{
          paddingTop: 'calc(42vh - clamp(110px, 17.5vh, 170px))',
        }}
      >
        <HeroCircle
          state={circleState}
          reducedMotion={reducedMotion}
          errorKind={errorKind}
        />
        <div className="mt-space-3">
          <SessionCounter count={sessionCount} />
        </div>
        <div className="mt-space-5 inline-flex items-center gap-space-3">
          {showRetry ? (
            <button
              type="button"
              onClick={retry}
              className={[
                'inline-flex items-center justify-center',
                'h-[44px] px-space-4',
                'rounded-md text-label font-medium',
                'bg-accent text-surface',
                'hover:bg-accent-strong active:scale-[0.98]',
                'transition-colors duration-short ease-calm',
              ].join(' ')}
            >
              {copy.button.retryCamera}
            </button>
          ) : (
            <>
              <PauseButton
                paused={paused}
                disabled={webcamStatus !== 'ready'}
                onToggle={() => {
                  void primeAlertPlayer();
                  setPaused((p) => !p);
                }}
              />
              <button
                type="button"
                onClick={() => setSettingsOpen((v) => !v)}
                className={[
                  'inline-flex items-center justify-center',
                  'h-[44px] px-space-4',
                  'rounded-md text-label font-medium',
                  'border border-border-strong text-text',
                  'hover:bg-surface-raised active:scale-[0.98]',
                  'transition-colors duration-short ease-calm',
                ].join(' ')}
              >
                {settingsOpen ? copy.button.closeSettings : copy.button.openSettings}
              </button>
            </>
          )}
        </div>

        {settingsOpen && (
          <SettingsPanel
            habitId={habitId}
            onHabitChange={(id) => {
              setHabitId(id);
              saveHabitId(id);
            }}
            soundId={soundId}
            onSoundChange={(id) => {
              setSoundId(id);
              saveSoundId(id);
              setAlertSound(id);
            }}
            showLandmarks={showLandmarks}
            onToggleLandmarks={setShowLandmarks}
          />
        )}
      </div>

      <footer className="absolute bottom-space-5 left-space-5 text-caption text-text-faint">
        {copy.onboarding.footerCaption}
      </footer>
    </main>
  );
}
