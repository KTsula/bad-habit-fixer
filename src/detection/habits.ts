/**
 * Habit definitions. Each habit maps to a set of face-mesh landmark
 * indices (the "target zone") and hand-landmark fingertip indices that
 * the proximity detector checks against. Adding a new habit = adding
 * a new entry here — no model retraining needed.
 */

export type HabitId = 'eyebrow' | 'nose' | 'head';

export interface HabitConfig {
  id: HabitId;
  label: string;
  description: string;
  /** Face mesh landmark indices that define the target zone. */
  targetIndices: readonly number[];
  /** Hand skeleton fingertip indices to check. */
  fingertipIndices: readonly number[];
  /** Normalized distance threshold (fraction of face bbox width). */
  threshold: number;
}

/**
 * MediaPipe face mesh reference:
 *   - Eyebrow: left {70,63,105,66,107}, right {336,296,334,293,300}
 *   - Nose: tip 1, bridge 2/5/6, bottom 4/19/94, nostrils 97/326
 *   - Forehead/hairline: top center 10, upper forehead 151, hairline
 *     21/54/103/109/67 (left), 338/284/332/297/251 (right)
 *
 * Hand skeleton fingertip indices:
 *   4=thumb, 8=index, 12=middle, 16=ring, 20=pinky
 */
export const HABITS: Record<HabitId, HabitConfig> = {
  eyebrow: {
    id: 'eyebrow',
    label: 'Eyebrow plucking',
    description: 'Fingers near your eyebrows',
    targetIndices: [70, 63, 105, 66, 107, 336, 296, 334, 293, 300],
    fingertipIndices: [4, 8],
    threshold: 0.12,
  },
  nose: {
    id: 'nose',
    label: 'Nose touching',
    description: 'Fingers near your nose',
    targetIndices: [1, 2, 4, 5, 6, 19, 94, 97, 326],
    fingertipIndices: [4, 8, 12],
    threshold: 0.10,
  },
  head: {
    id: 'head',
    label: 'Hair / head touching',
    description: 'Hand near the top of your head',
    targetIndices: [10, 151, 21, 54, 103, 109, 67, 338, 284, 332, 297, 251],
    fingertipIndices: [4, 8, 12, 16, 20],
    threshold: 0.18,
  },
} as const;

export const HABIT_LIST: HabitConfig[] = Object.values(HABITS);

const STORAGE_KEY = 'bhf-habit';

export function loadHabitId(): HabitId {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && stored in HABITS) return stored as HabitId;
  } catch { /* localStorage unavailable */ }
  return 'eyebrow';
}

export function saveHabitId(id: HabitId): void {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch { /* localStorage unavailable */ }
}
