import type { PaymentLink } from '../domain/types.ts';

/** The localStorage key the links are saved under. Bump the version if the shape changes. */
export const STORAGE_KEY = 'payment-links:v2';

/** The key used before partial payments existed. Read once, migrated, then removed. */
export const LEGACY_STORAGE_KEY = 'payment-links:v1';

/**
 * Gets the browser's localStorage, if it can be used. Some browsers (e.g. private
 * mode or blocked site data) throw when it's accessed.
 *
 * @returns localStorage, or `null` when it isn't available.
 */
export function getBrowserStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/**
 * Checks that a value is `null` or a string that reads as a real date.
 *
 * @param value - The value to check.
 * @returns `true` for `null` or a parseable date string.
 */
function isDateOrNull(value: unknown): boolean {
  return value === null || (typeof value === 'string' && !Number.isNaN(Date.parse(value)));
}

/**
 * Checks that a value is `null` or a string.
 *
 * @param value - The value to check.
 */
function isStringOrNull(value: unknown): boolean {
  return value === null || typeof value === 'string';
}

/**
 * Checks that a value read back from storage is a valid payment link: every field has the
 * right type, amounts are whole paise, the amount paid is between 0 and the amount, and
 * dates are real dates.
 *
 * @param value - Anything parsed from JSON.
 * @returns `true` if it can be used as a payment link.
 */
export function isPaymentLink(value: unknown): value is PaymentLink {
  if (typeof value !== 'object' || value === null) return false;
  const link = value as Record<string, unknown>;
  const amount = link.amountPaise;
  const paid = link.amountPaidPaise;

  return (
    typeof link.id === 'string' &&
    typeof link.description === 'string' &&
    Number.isInteger(amount) &&
    Number.isInteger(paid) &&
    (paid as number) >= 0 &&
    (paid as number) <= (amount as number) &&
    (amount as number) > 0 &&
    typeof link.allowPartial === 'boolean' &&
    (link.minFirstPaymentPaise === null || Number.isInteger(link.minFirstPaymentPaise)) &&
    isStringOrNull(link.email) &&
    isStringOrNull(link.phone) &&
    isDateOrNull(link.createdAt) &&
    link.createdAt !== null &&
    isDateOrNull(link.expiresAt) &&
    isDateOrNull(link.paidAt)
  );
}

/**
 * Converts a link saved before partial payments existed (v1) into the current shape.
 * A v1 link with `paidAt` becomes fully paid; any other becomes unpaid.
 *
 * @param value - One entry from the v1 list.
 * @returns The converted link, or `null` if the entry isn't usable.
 */
export function migrateLegacyLink(value: unknown): PaymentLink | null {
  if (typeof value !== 'object' || value === null) return null;
  const old = value as Record<string, unknown>;
  const link = {
    ...old,
    allowPartial: false,
    minFirstPaymentPaise: null,
    amountPaidPaise: old.paidAt ? old.amountPaise : 0,
  };
  return isPaymentLink(link) ? link : null;
}

/**
 * Reads and parses a JSON list from storage.
 *
 * @param storage - Where links are kept.
 * @param key - The storage key.
 * @returns The parsed list, or `null` if missing, broken or not a list.
 */
function readList(storage: Storage, key: string): unknown[] | null {
  try {
    const saved: unknown = JSON.parse(storage.getItem(key) ?? 'null');
    return Array.isArray(saved) ? saved : null;
  } catch {
    return null;
  }
}

/**
 * Reads the saved links. If only old (v1) links exist, they are converted, saved under the
 * new key and the old key is removed, so links survive the upgrade.
 * Broken or missing data is treated as "nothing saved".
 *
 * @param storage - Where links are kept, or `null` when storage isn't available.
 * @returns The saved links (invalid entries skipped), or `null` if nothing usable is saved.
 */
export function readLinks(storage: Storage | null): PaymentLink[] | null {
  if (storage === null) return null;

  const current = readList(storage, STORAGE_KEY);
  if (current !== null) return current.filter(isPaymentLink);

  const legacy = readList(storage, LEGACY_STORAGE_KEY);
  if (legacy === null) return null;

  const migrated = legacy
    .map(migrateLegacyLink)
    .filter((link): link is PaymentLink => link !== null);
  writeLinks(storage, migrated);
  try {
    storage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    // Can't remove the old copy; the new key is read first next time anyway.
  }
  return migrated;
}

/**
 * Saves the links. Failures (e.g. storage full) are ignored so the app keeps
 * working in memory.
 *
 * @param storage - Where links are kept, or `null` when storage isn't available.
 * @param links - The links to save.
 */
export function writeLinks(storage: Storage | null, links: PaymentLink[]): void {
  if (storage === null) return;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(links));
  } catch {
    // Storage is full or blocked; keep going with the in-memory copy.
  }
}
