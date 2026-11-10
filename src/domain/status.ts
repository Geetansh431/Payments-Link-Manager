import { STATUS_FILTERS } from './types.ts';
import type { LinkStatus, PaymentLink, StatusFilter } from './types.ts';

type StatusFields = Pick<PaymentLink, 'amountPaise' | 'amountPaidPaise' | 'expiresAt'>;

/**
 * Works out a link's status at a given moment. Status is never stored, so a link
 * turns Expired on its own as time passes.
 *
 * Rules, in order: a fully paid link is always Paid (paid links never expire); otherwise it
 * is Expired once `now` reaches its expiry; otherwise it is Partially paid if anything has
 * been paid; otherwise it is Active.
 *
 * @param link - The link's amount, amount paid and expiry.
 * @param now - The current time.
 * @returns `'Paid'`, `'Expired'`, `'Partially paid'` or `'Active'`.
 */
export function deriveStatus(link: StatusFields, now: Date): LinkStatus {
  if (link.amountPaidPaise >= link.amountPaise) return 'Paid';
  if (link.expiresAt !== null && new Date(link.expiresAt) <= now) return 'Expired';
  if (link.amountPaidPaise > 0) return 'Partially paid';
  return 'Active';
}

/**
 * Checks whether a payment can be recorded on a link. Only Active and Partially paid
 * links accept payments.
 *
 * @param link - The link's amount, amount paid and expiry.
 * @param now - The current time.
 * @returns `true` if the link can take a payment.
 */
export function canRecordPayment(link: StatusFields, now: Date): boolean {
  const status = deriveStatus(link, now);
  return status === 'Active' || status === 'Partially paid';
}

/**
 * Checks whether a link should be shown under the selected filter tab.
 *
 * @param link - The link's amount, amount paid and expiry.
 * @param filter - The selected tab, e.g. `'All'` or `'Partially paid'`.
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
 * @returns A count for every filter tab.
 */
export function countByStatus(
  links: readonly StatusFields[],
  now: Date,
): Record<StatusFilter, number> {
  const counts = { All: 0, Active: 0, 'Partially paid': 0, Paid: 0, Expired: 0 };
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
 * @returns `true` if it is a filter tab name, e.g. `'Partially paid'`.
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
