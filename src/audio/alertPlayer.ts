/**
 * Alert sound player.
 *
 * Two paths, in priority order:
 *   1. A real audio file at /sounds/alert.ogg served from `public/`. We
 *      try to load this eagerly on first use; if the fetch succeeds, every
 *      subsequent play() uses HTMLAudioElement for sub-50ms latency.
 *   2. If the file isn't there (404, decode error, user hasn't dropped
 *      one in yet), we synthesize a short sine chime via Web Audio API.
 *      That way the app works on first run with zero asset-wrangling.
 *
 * Browser autoplay policies require a user gesture before audio can play.
 * Call `primeAlertPlayer()` on any click handler (Start, Pause, etc.) to
 * unlock both paths. Until primed, `playAlert()` is a no-op (logged once).
 *
 * No volume control yet — M4 adds the slider. Plays at 1.0 gain.
 */

import { SOUND_OPTIONS, loadSoundId, type SoundId } from './sounds';

let currentSoundId: SoundId = loadSoundId();
function getAlertFileUrl(): string | null {
  const option = SOUND_OPTIONS.find((s) => s.id === currentSoundId);
  return option?.file ?? null;
}

/** Fallback beep params. 660Hz ≈ E5, non-abrasive sine, ~180ms envelope. */
const FALLBACK_FREQ_HZ = 660;
const FALLBACK_DURATION_MS = 180;
const FALLBACK_ATTACK_MS = 8;
const FALLBACK_RELEASE_MS = 140;
const FALLBACK_PEAK_GAIN = 0.25;

type ActivePath = 'file' | 'synth' | 'uninitialized';

let activePath: ActivePath = 'uninitialized';
let primed = false;
let primePromise: Promise<void> | null = null;

let fileAudio: HTMLAudioElement | null = null;
let audioContext: AudioContext | null = null;

// One-time logs so we don't spam the console on every frame.
let loggedActivePath = false;
let loggedUnprimed = false;

/** Visible for tests / status UI. Which path is currently active. */
export function getActivePath(): ActivePath {
  return activePath;
}

/**
 * Prepare audio. Must be called from a user-gesture handler (click, keydown,
 * pointerdown) the first time to satisfy autoplay policies. Idempotent —
 * safe to call on every click.
 *
 * Returns a promise that resolves once the file-load attempt has completed
 * (successfully or not) and a fallback AudioContext has been created if
 * needed. Callers don't need to await it — playAlert() will work from the
 * moment priming starts because the synth path requires no preload.
 */
export function primeAlertPlayer(): Promise<void> {
  if (primePromise) return primePromise;
  primePromise = (async () => {
    // Try the file path first. Construct an <audio> element and preload
    // it. If loading fails (404 / decode), fall through to the synth path.
    try {
      const fileUrl = getAlertFileUrl();
      if (!fileUrl) throw new Error('no file configured');
      const audio = new Audio(fileUrl);
      audio.preload = 'auto';
      audio.volume = 1.0;
      await new Promise<void>((resolve, reject) => {
        const onOk = (): void => {
          cleanup();
          resolve();
        };
        const onErr = (): void => {
          cleanup();
          reject(new Error('audio load failed'));
        };
        const timeoutHandle = window.setTimeout(() => {
          cleanup();
          reject(new Error('audio load timeout'));
        }, 1500);
        function cleanup(): void {
          window.clearTimeout(timeoutHandle);
          audio.removeEventListener('canplaythrough', onOk);
          audio.removeEventListener('error', onErr);
        }
        audio.addEventListener('canplaythrough', onOk, { once: true });
        audio.addEventListener('error', onErr, { once: true });
        audio.load();
      });
      fileAudio = audio;
      activePath = 'file';
    } catch {
      // Drop through to synth. Not an error — this is the "user hasn't
      // dropped a file in yet" case.
      fileAudio = null;
      activePath = 'synth';
    }

    // Always initialize the AudioContext on prime — it's cheap, it needs
    // the user gesture that got us here, and it's our backup even if the
    // file path loaded (in case the file playback fails mid-session).
    try {
      const AudioCtx: typeof AudioContext =
        window.AudioContext ??
        // Safari <14 exposed webkitAudioContext; the cast is justified
        // because DOM lib.d.ts doesn't include the prefixed constructor.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).webkitAudioContext;
      if (AudioCtx && !audioContext) {
        audioContext = new AudioCtx();
      }
      if (audioContext && audioContext.state === 'suspended') {
        await audioContext.resume();
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('AudioContext init failed; alert audio will be silent', err);
    }

    primed = true;
    if (!loggedActivePath) {
      loggedActivePath = true;
      // eslint-disable-next-line no-console
      console.info(
        `[alertPlayer] active path: ${activePath} ` +
          (activePath === 'file'
            ? `(${getAlertFileUrl()})`
            : '(synthesized sine beep)')
      );
    }
  })();
  return primePromise;
}

/**
 * Play the alert immediately. Idempotent — if a previous play is still
 * decoding, the new call rewinds and re-plays. First-fire latency is
 * <50ms on a primed player because both paths are warm.
 */
export function playAlert(): void {
  if (!primed) {
    if (!loggedUnprimed) {
      loggedUnprimed = true;
      // eslint-disable-next-line no-console
      console.warn(
        '[alertPlayer] playAlert() called before primeAlertPlayer(); ' +
          'a user gesture must prime audio first (browser autoplay policy).'
      );
    }
    return;
  }

  if (activePath === 'file' && fileAudio) {
    try {
      fileAudio.currentTime = 0;
      const p = fileAudio.play();
      if (p && typeof p.then === 'function') {
        p.catch((err: unknown) => {
          if (err instanceof DOMException && err.name === 'AbortError') return;
          // eslint-disable-next-line no-console
          console.warn('[alertPlayer] file play() failed, falling back to synth', err);
          playSynth();
        });
      }
      return;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[alertPlayer] file path threw, falling back to synth', err);
      playSynth();
      return;
    }
  }

  playSynth();
}

/**
 * Web Audio fallback: a short sine chime with a quick attack/release
 * envelope. Fire-and-forget — each call creates a fresh oscillator +
 * gain node pair so overlapping triggers don't stomp each other.
 */
function playSynth(): void {
  if (!audioContext) return;
  if (audioContext.state === 'suspended') {
    void audioContext.resume();
  }
  const ctx = audioContext;
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.value = FALLBACK_FREQ_HZ;

  const gain = ctx.createGain();
  const attackEnd = now + FALLBACK_ATTACK_MS / 1000;
  const releaseEnd = now + FALLBACK_DURATION_MS / 1000;
  const releaseStart = releaseEnd - FALLBACK_RELEASE_MS / 1000;
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(FALLBACK_PEAK_GAIN, attackEnd);
  gain.gain.setValueAtTime(FALLBACK_PEAK_GAIN, releaseStart);
  gain.gain.linearRampToValueAtTime(0, releaseEnd);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(releaseEnd + 0.02);
}

/**
 * Switch the active alert sound. Re-primes the player so the next
 * playAlert() uses the new file. If the new sound has no file (synth
 * beep), the file path is cleared and the synth path activates.
 */
export function setAlertSound(id: SoundId): void {
  currentSoundId = id;
  // Reset priming so the next prime loads the new file.
  fileAudio = null;
  primePromise = null;
  primed = false;
  loggedActivePath = false;
  activePath = 'uninitialized';
  // Re-prime immediately if we can (AudioContext already exists).
  void primeAlertPlayer();
}
