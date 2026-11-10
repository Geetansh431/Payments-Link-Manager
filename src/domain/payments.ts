import { MESSAGES } from './messages.ts';
import { formatPaise, parseMoney } from './money.ts';
import type { PaymentLink, Result } from './types.ts';

type PaymentFields = Pick<
  PaymentLink,
  'amountPaise' | 'amountPaidPaise' | 'allowPartial' | 'minFirstPaymentPaise'
>;

/**
 * Works out how much is still owed on a link.
 *
 * @param link - The link's amount and amount paid.
 * @returns The amount due, in paise.
 * @example amountDue({ amountPaise: 100000, amountPaidPaise: 30000 }) // 70000
 */
export function amountDue(link: Pick<PaymentLink, 'amountPaise' | 'amountPaidPaise'>): number {
  return link.amountPaise - link.amountPaidPaise;
}

/**
 * Checks a payment amount (already in paise) against the link's rules:
 * more than ₹0, no more than the amount due, the full amount when partial payments are off,
 * and at least the minimum for the first partial payment.
 *
 * @param link - The link being paid.
 * @param paise - The payment amount in paise.
 * @returns `null` if the payment is allowed, otherwise the error message.
 */
export function checkPayment(link: PaymentFields, paise: number): string | null {
  const due = amountDue(link);
  if (paise < 1) return MESSAGES.payment.min;
  if (paise > due) return MESSAGES.payment.max(formatPaise(due));
  if (!link.allowPartial && paise !== due) return MESSAGES.payment.fullOnly(formatPaise(due));

  const isFirstPayment = link.amountPaidPaise === 0;
  const minimum = link.minFirstPaymentPaise ?? 0;
  if (isFirstPayment && paise < minimum) {
    return MESSAGES.payment.belowMinimum(formatPaise(minimum));
  }
  return null;
}

/**
 * Validates the amount typed into the "Record payment" form.
 *
 * @param link - The link being paid.
 * @param input - The amount as typed, e.g. `"700"`.
 * @returns The payment in paise, or the error message to show the user.
 * @example validatePayment(link, '300') // { ok: true, value: 30000 }
 */
export function validatePayment(link: PaymentFields, input: string): Result<number, string> {
  const parsed = parseMoney(input);
  if (!parsed.ok) {
    const error =
      parsed.error === 'required' ? MESSAGES.payment.required : MESSAGES.amount[parsed.error];
    return { ok: false, error };
  }
  const problem = checkPayment(link, parsed.value);
  return problem === null ? { ok: true, value: parsed.value } : { ok: false, error: problem };
}

/**
 * Adds a payment to a link. When the link is now fully paid, `paidAt` is set.
 * The original link is not changed.
 *
 * @param link - The link being paid.
 * @param paise - The payment amount in paise (already checked).
 * @param now - The time of the payment.
 * @returns The updated link.
 */
export function applyPayment(link: PaymentLink, paise: number, now: Date): PaymentLink {
  const amountPaidPaise = link.amountPaidPaise + paise;
  const isFullyPaid = amountPaidPaise >= link.amountPaise;
  return { ...link, amountPaidPaise, paidAt: isFullyPaid ? now.toISOString() : link.paidAt };
}
