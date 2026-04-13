/**
 * Sound preset definitions. Each entry maps to a file in public/sounds/.
 * The user drops their MP3 files there with the matching filename.
 * The "beep" option uses the built-in Web Audio synth (no file needed).
 */

export type SoundId =
  | 'beep'
  | 'alert-1'
  | 'alert-2'
  | 'alert-3'
  | 'alert-4'
  | 'alert-5'
  | 'alert-6';

export interface SoundOption {
  id: SoundId;
  label: string;
  /** Path relative to public root, or null for the synth beep. */
  file: string | null;
}

export const SOUND_OPTIONS: SoundOption[] = [
  { id: 'beep', label: 'Default beep', file: null },
  { id: 'alert-1', label: 'Sound 1', file: '/sounds/alert-1.mp3' },
  { id: 'alert-2', label: 'Stop! (firm)', file: '/sounds/alert-2.mp3' },
  { id: 'alert-3', label: 'Stop (hesitant)', file: '/sounds/alert-3.mp3' },
  { id: 'alert-4', label: 'Sound 4', file: '/sounds/faaaa.mp3' },
  { id: 'alert-5', label: 'No! x5', file: '/sounds/freesound_community-no-x5-95904.mp3' },
  { id: 'alert-6', label: 'Sound 6', file: '/sounds/untitled3_13.mp3' },
];

const STORAGE_KEY = 'bhf-sound';

export function loadSoundId(): SoundId {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && SOUND_OPTIONS.some((s) => s.id === stored)) {
      return stored as SoundId;
    }
  } catch { /* localStorage unavailable */ }
  return 'beep';
}

export function saveSoundId(id: SoundId): void {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch { /* localStorage unavailable */ }
}
