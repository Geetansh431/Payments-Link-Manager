import { MESSAGES } from './messages.ts';
import { isDigits } from './text.ts';
import type { Result } from './types.ts';

/** Smallest allowed amount: ₹0.01. */
export const MIN_AMOUNT_PAISE = 1;

/** Largest allowed amount: ₹5,00,000. */
export const MAX_AMOUNT_PAISE = 50_000_000;

/** Why a typed amount couldn't be read. */
export type MoneyError = 'required' | 'invalid' | 'decimals';

/**
 * Reads a typed rupee amount as whole paise (₹1 = 100 paise), without checking any range.
 *
 * Commas are ignored, so `"1,00,000"` works. Up to 2 decimal places are allowed.
 * The rupee and paise parts are read separately, so no floating-point rounding can occur.
 *
 * @param input - The amount exactly as typed, e.g. `"1,499.50"`.
 * @returns The amount in paise (can be 0), or why it couldn't be read.
 * @example parseMoney('1499.5') // { ok: true, value: 149950 }
 * @example parseMoney('1.234')  // { ok: false, error: 'decimals' }
 */
export function parseMoney(input: string): Result<number, MoneyError> {
  const text = input.replaceAll(',', '').trim();
  if (text === '') return { ok: false, error: 'required' };

  const point = text.indexOf('.');
  const hasPoint = point !== -1;
  const rupees = hasPoint ? text.slice(0, point) : text;
  const paise = hasPoint ? text.slice(point + 1) : '';

  if (!isDigits(rupees) || (hasPoint && !isDigits(paise))) return { ok: false, error: 'invalid' };
  if (paise.length > 2) return { ok: false, error: 'decimals' };

  return { ok: true, value: Number(rupees) * 100 + Number(paise.padEnd(2, '0')) };
}

/**
 * Converts the link amount the user typed into paise and checks it is between
 * ₹0.01 and ₹5,00,000.
 *
 * @param input - The amount exactly as the user typed it, e.g. `"1,499.50"`.
 * @returns The amount in paise, or the error message to show the user.
 * @example parseAmountToPaise('1499.5') // { ok: true, value: 149950 }
 * @example parseAmountToPaise('0')      // { ok: false, error: 'Amount must be more than ₹0' }
 */
export function parseAmountToPaise(input: string): Result<number, string> {
  const parsed = parseMoney(input);
  if (!parsed.ok) return { ok: false, error: MESSAGES.amount[parsed.error] };
  if (parsed.value < MIN_AMOUNT_PAISE) return { ok: false, error: MESSAGES.amount.min };
  if (parsed.value > MAX_AMOUNT_PAISE) return { ok: false, error: MESSAGES.amount.max };
  return { ok: true, value: parsed.value };
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

/**
 * Writes an amount in paise the way a user would type it, to pre-fill an input.
 *
 * @param paise - The amount in paise.
 * @returns Rupees with 2 decimals and no symbol or commas.
 * @example toAmountInput(70050) // '700.50'
 */
export function toAmountInput(paise: number): string {
  const rupees = Math.floor(paise / 100);
  const rest = String(paise % 100).padStart(2, '0');
  return `${rupees}.${rest}`;
}
