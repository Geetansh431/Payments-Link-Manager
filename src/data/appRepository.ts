import { createLocalRepository } from './localRepository.ts';
import type { LinksRepository } from './repository.ts';
import { STORAGE_KEY, getBrowserStorage } from './storage.ts';

/** Normal fake network delay, so loading states are visible. */
export const DEFAULT_LATENCY_MS = 300;

/** Delay used with `?mock=slow`. */
export const SLOW_LATENCY_MS = 1500;

export type MockOptions = {
  /** `?mock=slow`: use a long delay. */
  slow: boolean;
  /** `?mock=fail-load`: loading the list fails. */
  failLoad: boolean;
  /** `?mock=fail-create`: creating a link fails. */
  failCreate: boolean;
  /** `?mock=reset`: delete saved links and start again from the sample data. */
  reset: boolean;
};

/**
 * Reads the `?mock=` switches from the page URL. Several can be combined with commas,
 * e.g. `?mock=slow,fail-create`. These let tests and demos force each state.
 *
 * @param search - The URL query string, e.g. `window.location.search`.
 * @returns Which switches are on.
 * @example readMockOptions('?mock=reset,fail-load') // { reset: true, failLoad: true, ... }
 */
export function readMockOptions(search: string): MockOptions {
  const flags = (new URLSearchParams(search).get('mock') ?? '').split(',');
  return {
    slow: flags.includes('slow'),
    failLoad: flags.includes('fail-load'),
    failCreate: flags.includes('fail-create'),
    reset: flags.includes('reset'),
  };
}

/**
 * Creates the repository the app uses, set up from the `?mock=` switches in the URL.
 *
 * @param search - The URL query string. Default: the current page's.
 * @param storage - Where links are saved. Default: the browser's localStorage.
 * @returns The app's repository.
 */
export function createAppRepository(
  search: string = window.location.search,
  storage: Storage | null = getBrowserStorage(),
): LinksRepository {
  const mock = readMockOptions(search);
  if (mock.reset) storage?.removeItem(STORAGE_KEY);

  return createLocalRepository({
    storage,
    latencyMs: mock.slow ? SLOW_LATENCY_MS : DEFAULT_LATENCY_MS,
    failLoad: mock.failLoad,
    failCreate: mock.failCreate,
  });
}
