import type { PaymentLink } from '../domain/types.ts';

/** The localStorage key the links are saved under. Bump the version if the shape changes. */
export const STORAGE_KEY = 'payment-links:v1';

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
 * Checks that a value read back from storage has the shape of a payment link.
 *
 * @param value - Anything parsed from JSON.
 * @returns `true` if every field has the expected type.
 */
export function isPaymentLink(value: unknown): value is PaymentLink {
  if (typeof value !== 'object' || value === null) return false;
  const link = value as Record<string, unknown>;
  const isStringOrNull = (field: unknown) => typeof field === 'string' || field === null;

  return (
    typeof link.id === 'string' &&
    typeof link.amountPaise === 'number' &&
    typeof link.description === 'string' &&
    typeof link.createdAt === 'string' &&
    isStringOrNull(link.email) &&
    isStringOrNull(link.phone) &&
    isStringOrNull(link.expiresAt) &&
    isStringOrNull(link.paidAt)
  );
}

/**
 * Reads the saved links. Broken or missing data is treated as "nothing saved".
 *
 * @param storage - Where links are kept, or `null` when storage isn't available.
 * @returns The saved links (invalid entries skipped), or `null` if nothing usable is saved.
 */
export function readLinks(storage: Storage | null): PaymentLink[] | null {
  if (storage === null) return null;
  try {
    const saved: unknown = JSON.parse(storage.getItem(STORAGE_KEY) ?? 'null');
    return Array.isArray(saved) ? saved.filter(isPaymentLink) : null;
  } catch {
    return null;
  }
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
