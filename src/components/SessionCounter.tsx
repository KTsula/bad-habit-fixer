import { formatCounter } from '../copy';

interface SessionCounterProps {
  count: number;
}

/**
 * Session counter. design.md §7.3:
 *   - text-label (14px, 400), color text-muted.
 *   - Zero state: "No catches yet".
 *   - Singular/plural handled via formatCounter().
 *   - aria-live="off" per §9 (the hero circle handles the announcement).
 */
export function SessionCounter({ count }: SessionCounterProps): JSX.Element {
  return (
    <div
      aria-live="off"
      className="text-label text-text-muted text-center"
    >
      {formatCounter(count)}
    </div>
  );
}
