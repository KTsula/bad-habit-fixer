/**
 * Microcopy library — single source of truth for every user-visible string.
 * Pulled verbatim from design.md §8. Do not inline strings in components.
 */

export const copy = {
  // Status label (under hero circle)
  statusLabel: {
    idle: 'Watching',
    triggered: 'Caught one',
    paused: 'Paused',
    calibrating: 'Calibrating…',
    cameraUnavailable: 'Camera unavailable',
    cameraBusy: 'Camera is in use elsewhere',
    cameraDenied: 'Camera access needed',
    loadingMediaPipe: 'Getting ready…',
  },

  // Session counter
  counter: {
    zero: 'No catches yet',
    one: 'Caught once this session',
    many: (n: number): string => `Caught ${n} times this session`,
  },

  // Buttons
  button: {
    pause: 'Pause',
    resume: 'Resume',
    openSettings: 'Open settings',
    closeSettings: 'Close settings',
    startFirstRun: 'Grant camera access',
    startReturning: 'Start monitoring',
    recalibrate: 'Recalibrate',
    retryCamera: 'Try again',
    toggleLandmarks: 'Toggle landmark overlay',
  },

  // Onboarding
  onboarding: {
    headline: 'Bad Habit Fixer',
    subtitle: 'A quiet coach for the habits you want to drop.',
    privacyCard:
      'Everything runs on your computer. Your camera feed is processed locally and never leaves this app. No server. No account. No upload.',
    footerCaption: 'Local only · no upload',
  },

  // Error / empty states
  error: {
    cameraDenied:
      'Camera access needed. You can grant it in your system settings, then try again.',
    cameraBusy: 'Another app is using your camera. Close it and try again.',
    mediapipeFailed:
      "Couldn't load the detector. Check your connection and reload.",
    browserUnsupported:
      "Couldn't start the detector. Please update your system WebView.",
  },

  // Settings labels
  settings: {
    sensitivityLabel: 'Sensitivity',
    sensitivityHint: 'Higher = more catches, more false alarms.',
    volumeLabel: 'Alert volume',
    soundLabel: 'Alert sound',
    soundOption1: 'Soft chime',
    soundOption2: 'Gentle bell',
    soundOption3: 'Low tone',
    landmarkToggleLabel: 'Show face & hand landmarks',
    recalibrateHint: 'Sit normally for 5 seconds while we measure.',
    privacyFooter: 'Nothing leaves your device.',
  },

  // Accessibility announcements (aria-live) — terser than visible copy.
  aria: {
    triggerFires: 'Caught',
    paused: 'Monitoring paused',
    resumed: 'Monitoring resumed',
    calibrationStart: 'Calibrating, sit normally',
    calibrationDone: 'Ready',
    cameraLost: 'Camera unavailable',
  },
} as const;

/**
 * Format the session counter string. Zero → "No catches yet"; 1 → "Caught once
 * this session"; 2+ → "Caught {n} times this session". Handles pluralisation
 * as specified in design.md §8 counter table.
 */
export function formatCounter(n: number): string {
  if (n <= 0) return copy.counter.zero;
  if (n === 1) return copy.counter.one;
  return copy.counter.many(n);
}
