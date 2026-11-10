import { STATUS_FILTERS } from './types.ts';
import type { LinkStatus, PaymentLink, StatusFilter } from './types.ts';

type StatusFields = Pick<PaymentLink, 'paidAt' | 'expiresAt'>;

/**
 * Works out a link's status at a given moment. Status is never stored, so a link
 * turns Expired on its own as time passes.
 *
 * Rules, in order: a paid link is always Paid (even after its expiry); otherwise it is
 * Expired once `now` reaches its expiry; otherwise it is Active.
 *
 * @param link - The link's `paidAt` and `expiresAt` values.
 * @param now - The current time.
 * @returns `'Paid'`, `'Expired'` or `'Active'`.
 */
export function deriveStatus(link: StatusFields, now: Date): LinkStatus {
  if (link.paidAt !== null) return 'Paid';
  if (link.expiresAt !== null && new Date(link.expiresAt) <= now) return 'Expired';
  return 'Active';
}

/**
 * Checks whether a link can be marked as paid. Only Active links can.
 *
 * @param link - The link's `paidAt` and `expiresAt` values.
 * @param now - The current time.
 * @returns `true` if the link is currently Active.
 */
export function canMarkPaid(link: StatusFields, now: Date): boolean {
  return deriveStatus(link, now) === 'Active';
}

/**
 * Checks whether a link should be shown under the selected filter tab.
 *
 * @param link - The link's `paidAt` and `expiresAt` values.
 * @param filter - The selected tab: `'All'`, `'Active'`, `'Paid'` or `'Expired'`.
 * @param now - The current time.
 * @returns `true` if the link belongs in that tab.
 */
export function matchesFilter(link: StatusFields, filter: StatusFilter, now: Date): boolean {
  return filter === 'All' || deriveStatus(link, now) === filter;
}

/**
 * Counts how many links fall under each filter tab, for the numbers shown on the tabs.
 *
 * @param links - All links.
 * @param now - The current time (the same one used to show the rows, so counts match).
 * @returns A count for `All`, `Active`, `Paid` and `Expired`.
 */
export function countByStatus(
  links: readonly StatusFields[],
  now: Date,
): Record<StatusFilter, number> {
  const counts = { All: 0, Active: 0, Paid: 0, Expired: 0 };
  for (const link of links) {
    counts.All += 1;
    counts[deriveStatus(link, now)] += 1;
  }
  return counts;
}

/**
 * Checks whether a value (e.g. from the URL) is one of the filter tab names.
 *
 * @param value - The value to check.
 * @returns `true` if it is `'All'`, `'Active'`, `'Paid'` or `'Expired'`.
 */
export function isStatusFilter(value: string | null): value is StatusFilter {
  return STATUS_FILTERS.some((filter) => filter === value);
}

/**
 * Sorts links so the most recently created come first. The original array is not changed.
 *
 * @param links - The links to sort.
 * @returns A new array, newest first.
 */
export function sortNewestFirst<T extends Pick<PaymentLink, 'createdAt'>>(
  links: readonly T[],
): T[] {
  return [...links].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
