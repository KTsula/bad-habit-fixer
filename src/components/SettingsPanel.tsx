import { HABIT_LIST, type HabitId } from '../detection/habits';
import { SOUND_OPTIONS, type SoundId } from '../audio/sounds';
import { playAlert } from '../audio/alertPlayer';

interface SettingsPanelProps {
  habitId: HabitId;
  onHabitChange: (id: HabitId) => void;
  soundId: SoundId;
  onSoundChange: (id: SoundId) => void;
  showLandmarks: boolean;
  onToggleLandmarks: (show: boolean) => void;
}

export function SettingsPanel({
  habitId,
  onHabitChange,
  soundId,
  onSoundChange,
  showLandmarks,
  onToggleLandmarks,
}: SettingsPanelProps): JSX.Element {
  return (
    <div className="mt-space-5 w-full max-w-[360px] rounded-lg bg-surface-raised border border-border p-space-4 space-y-space-4">
      {/* Habit selector */}
      <fieldset>
        <legend className="text-label font-medium text-text mb-space-2">
          Habit to detect
        </legend>
        <div className="space-y-space-2">
          {HABIT_LIST.map((habit) => (
            <label
              key={habit.id}
              className="flex items-center gap-space-2 cursor-pointer text-body text-text"
            >
              <input
                type="radio"
                name="habit"
                value={habit.id}
                checked={habitId === habit.id}
                onChange={() => onHabitChange(habit.id)}
                className="accent-accent w-4 h-4"
              />
              <span>
                {habit.label}
                <span className="text-caption text-text-faint ml-space-1">
                  — {habit.description}
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {/* Sound selector */}
      <fieldset>
        <legend className="text-label font-medium text-text mb-space-2">
          Alert sound
        </legend>
        <div className="space-y-space-2">
          {SOUND_OPTIONS.map((sound) => (
            <label
              key={sound.id}
              className="flex items-center gap-space-2 cursor-pointer text-body text-text"
            >
              <input
                type="radio"
                name="sound"
                value={sound.id}
                checked={soundId === sound.id}
                onChange={() => onSoundChange(sound.id)}
                className="accent-accent w-4 h-4"
              />
              <span>{sound.label}</span>
              {soundId === sound.id && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    playAlert();
                  }}
                  className="ml-auto text-caption text-accent hover:text-accent-strong transition-colors"
                >
                  Preview
                </button>
              )}
            </label>
          ))}
        </div>
      </fieldset>

      {/* Landmark toggle */}
      <label className="flex items-center gap-space-2 cursor-pointer text-body text-text">
        <input
          type="checkbox"
          checked={showLandmarks}
          onChange={(e) => onToggleLandmarks(e.target.checked)}
          className="accent-accent w-4 h-4"
        />
        Show face & hand landmarks
      </label>
    </div>
  );
}
