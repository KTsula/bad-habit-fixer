import { copy } from '../copy';

interface PauseButtonProps {
  paused: boolean;
  disabled?: boolean;
  onToggle: () => void;
}

/**
 * Pause / resume button. Single primary-accent variant per design.md §7.4.
 *
 * - Height 44px (satisfies WCAG 2.5.5 target size).
 * - accent → surface label color (7.9:1 contrast, AAA).
 * - Active (pressed) scales to 0.98 with accent-strong background.
 * - Focus ring comes from the global :focus-visible rule in index.css.
 */
export function PauseButton({
  paused,
  disabled,
  onToggle,
}: PauseButtonProps): JSX.Element {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      className={[
        'inline-flex items-center justify-center',
        'h-[44px] px-space-4',
        'rounded-md text-label font-medium',
        'bg-accent text-surface',
        'transition-colors duration-short ease-calm',
        'hover:bg-accent-strong',
        'active:bg-accent-strong active:scale-[0.98]',
        'disabled:bg-border-subtle disabled:text-text-faint disabled:cursor-not-allowed',
      ].join(' ')}
    >
      {paused ? copy.button.resume : copy.button.pause}
    </button>
  );
}
