import { useEffect, useState } from 'react';

/** How often the clock ticks by default: every 30 seconds. */
export const DEFAULT_TICK_MS = 30_000;

/**
 * Returns the current time and updates it on a timer. Statuses are worked out from this
 * time, so a link turns Expired on screen without a page refresh.
 *
 * @param intervalMs - How often to update, in milliseconds. Default: 30 seconds.
 * @returns The current time, refreshed every `intervalMs`.
 */
export function useNow(intervalMs: number = DEFAULT_TICK_MS): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);

  return now;
}
