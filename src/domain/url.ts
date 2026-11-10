/** Base address customers open to pay. Mocked: there is no real payment page. */
export const PAYMENT_URL_BASE = 'https://pay.example.com/l/';

/**
 * Builds the address a customer opens to pay a link.
 *
 * @param id - The link's id.
 * @returns The full payment URL.
 * @example paymentUrl('abc123') // 'https://pay.example.com/l/abc123'
 */
export function paymentUrl(id: string): string {
  return `${PAYMENT_URL_BASE}${encodeURIComponent(id)}`;
}
