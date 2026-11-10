import { useCallback, useState } from 'react';
import { isStatusFilter } from '../domain/status.ts';
import type { StatusFilter } from '../domain/types.ts';

/**
 * Reads the selected filter from the page URL (`?status=Paid`).
 *
 * @returns The filter in the URL, or `'All'` if it's missing or not a valid filter.
 */
export function readFilterFromUrl(): StatusFilter {
  const value = new URLSearchParams(window.location.search).get('status');
  return isStatusFilter(value) ? value : 'All';
}

/**
 * Holds the selected status filter and keeps it in the URL, so a refresh or a shared
 * link opens on the same filter. Other URL parameters are left as they are.
 *
 * @returns The current filter and a function to change it.
 */
export function useStatusFilter() {
  const [filter, setFilterState] = useState<StatusFilter>(readFilterFromUrl);

  /**
   * Changes the filter and updates the URL. `'All'` removes `?status` from the URL.
   *
   * @param next - The filter to select.
   */
  const setFilter = useCallback((next: StatusFilter) => {
    const url = new URL(window.location.href);
    if (next === 'All') {
      url.searchParams.delete('status');
    } else {
      url.searchParams.set('status', next);
    }
    window.history.replaceState(null, '', url);
    setFilterState(next);
  }, []);

  return [filter, setFilter] as const;
}
