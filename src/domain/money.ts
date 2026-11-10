import { MESSAGES } from './messages.ts';
import { isDigits } from './text.ts';
import type { Result } from './types.ts';

/** Smallest allowed amount: ₹0.01. */
export const MIN_AMOUNT_PAISE = 1;

/** Largest allowed amount: ₹5,00,000. */
export const MAX_AMOUNT_PAISE = 50_000_000;

/**
 * Converts a typed rupee amount into whole paise (₹1 = 100 paise).
 *
 * Commas are ignored, so `"1,00,000"` works. Up to 2 decimal places are allowed.
 * The rupee and paise parts are read separately, so no floating-point rounding can occur.
 *
 * @param input - The amount exactly as the user typed it, e.g. `"1,499.50"`.
 * @returns The amount in paise, or the error message to show the user.
 * @example parseAmountToPaise('1499.5') // { ok: true, value: 149950 }
 * @example parseAmountToPaise('0')      // { ok: false, error: 'Amount must be more than ₹0' }
 */
export function parseAmountToPaise(input: string): Result<number, string> {
  const text = input.replaceAll(',', '').trim();
  if (text === '') {
    return { ok: false, error: MESSAGES.amount.required };
  }

  const point = text.indexOf('.');
  const hasPoint = point !== -1;
  const rupees = hasPoint ? text.slice(0, point) : text;
  const paise = hasPoint ? text.slice(point + 1) : '';

  if (!isDigits(rupees) || (hasPoint && !isDigits(paise))) {
    return { ok: false, error: MESSAGES.amount.invalid };
  }
  if (paise.length > 2) {
    return { ok: false, error: MESSAGES.amount.decimals };
  }

  const total = Number(rupees) * 100 + Number(paise.padEnd(2, '0'));
  if (total < MIN_AMOUNT_PAISE) {
    return { ok: false, error: MESSAGES.amount.min };
  }
  if (total > MAX_AMOUNT_PAISE) {
    return { ok: false, error: MESSAGES.amount.max };
  }
  return { ok: true, value: total };
}

const rupeeFormatter = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });

/**
 * Formats an amount in paise as Indian rupees for display.
 *
 * @param paise - The amount in paise.
 * @returns The formatted amount with Indian digit grouping.
 * @example formatPaise(10000000) // '₹1,00,000.00'
 */
export function formatPaise(paise: number): string {
  return rupeeFormatter.format(paise / 100);
}
