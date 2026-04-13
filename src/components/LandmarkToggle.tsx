import { copy } from '../copy';

interface LandmarkToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

/**
 * Milestone 2 stub for the "Show face & hand landmarks" setting. The full
 * settings drawer lands in Milestone 4; for now this is a small inline
 * native-checkbox affordance rendered near the webcam thumbnail so the user
 * can exercise the landmark pipeline while everything else in settings is
 * still deferred.
 *
 * Styled minimally — it's explicitly a temporary inline control per the
 * milestone brief. Design spec for the final checkbox (design.md §7.6 bullet
 * 5) is honored: native <input type="checkbox">, labelled.
 */
export function LandmarkToggle({
  checked,
  onChange,
}: LandmarkToggleProps): JSX.Element {
  return (
    <label className="fixed bottom-space-5 right-space-5 z-10 inline-flex items-center gap-space-2 text-caption text-text-muted cursor-pointer select-none">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 accent-accent"
      />
      {copy.settings.landmarkToggleLabel}
    </label>
  );
}
