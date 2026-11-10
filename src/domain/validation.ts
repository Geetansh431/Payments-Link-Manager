import { isValidEmail, normalizePhone } from './customer.ts';
import { toDateTimeLocal } from './dates.ts';
import { MESSAGES } from './messages.ts';
import { parseAmountToPaise, parseMoney } from './money.ts';
import type { CreateLinkInput, NewLink, Result, ValidationErrors } from './types.ts';

export { MESSAGES } from './messages.ts';

/** Longest allowed description, in visible characters. */
export const MAX_DESCRIPTION_LENGTH = 100;

const characterSplitter = new Intl.Segmenter('en', { granularity: 'grapheme' });

/**
 * Counts the characters a person would see, so an emoji like 👍🏽 counts as 1
 * (a plain `.length` would count it as 4).
 *
 * @param text - The text to measure.
 * @returns The number of visible characters.
 * @example countCharacters('👍🏽ab') // 3
 */
export function countCharacters(text: string): number {
  return Array.from(characterSplitter.segment(text)).length;
}

/**
 * Checks the description: required, at most 100 characters, surrounding spaces removed.
 *
 * @param input - The description as typed.
 * @returns The trimmed description, or the error message to show the user.
 */
export function validateDescription(input: string): Result<string, string> {
  const description = input.trim();
  if (description === '') {
    return { ok: false, error: MESSAGES.description.required };
  }
  if (countCharacters(description) > MAX_DESCRIPTION_LENGTH) {
    return { ok: false, error: MESSAGES.description.max };
  }
  return { ok: true, value: description };
}

/**
 * Checks the optional expiry date. An empty value means the link never expires.
 *
 * The value comes from a `datetime-local` input (`YYYY-MM-DDTHH:mm`) in the user's local
 * time. Impossible dates such as 30 February are rejected, as is any time not after `now`.
 *
 * @param input - The `datetime-local` value, or `""`.
 * @param now - The current time (passed in so tests can control it).
 * @returns The expiry as an ISO UTC string, `null` for no expiry, or the error message.
 */
export function validateExpiry(input: string, now: Date): Result<string | null, string> {
  const value = input.trim();
  if (value === '') {
    return { ok: true, value: null };
  }

  const date = new Date(value);
  // JavaScript quietly turns 30 Feb into 2 Mar; formatting it back catches that.
  const isRealDate = !Number.isNaN(date.getTime()) && toDateTimeLocal(date) === value.slice(0, 16);
  if (!isRealDate) {
    return { ok: false, error: MESSAGES.expiresAt.invalid };
  }
  if (date.getTime() <= now.getTime()) {
    return { ok: false, error: MESSAGES.expiresAt.past };
  }
  return { ok: true, value: date.toISOString() };
}

/**
 * Checks the customer contact: at least one of email or phone is required, and any
 * field that is filled in must be valid.
 *
 * @param emailInput - The email as typed (may be empty).
 * @param phoneInput - The phone number as typed (may be empty).
 * @returns The cleaned email and phone (`null` when empty), or errors keyed by field.
 */
export function validateCustomer(
  emailInput: string,
  phoneInput: string,
): Result<{ email: string | null; phone: string | null }, ValidationErrors> {
  const email = emailInput.trim();
  const phone = phoneInput.trim();

  if (email === '' && phone === '') {
    return { ok: false, error: { customer: MESSAGES.customer.required } };
  }

  const errors: ValidationErrors = {};
  const normalizedPhone = phone === '' ? null : normalizePhone(phone);
  if (email !== '' && !isValidEmail(email)) errors.email = MESSAGES.email.invalid;
  if (phone !== '' && normalizedPhone === null) errors.phone = MESSAGES.phone.invalid;

  if (errors.email || errors.phone) {
    return { ok: false, error: errors };
  }
  return { ok: true, value: { email: email === '' ? null : email, phone: normalizedPhone } };
}

/**
 * Validates the whole "create payment link" form. Every field is checked, so the user
 * sees all problems at once. Never throws.
 *
 * @param input - The raw form values.
 * @param now - The current time, used to check the expiry.
 * @returns The cleaned link data ready to save, or an error message for each invalid field.
 */
export function validateCreateLink(
  input: CreateLinkInput,
  now: Date,
): Result<NewLink, ValidationErrors> {
  const amount = parseAmountToPaise(input.amount);
  const description = validateDescription(input.description);
  const customer = validateCustomer(input.email, input.phone);
  const expiry = validateExpiry(input.expiresAt, now);
  // The minimum can only be compared with a valid amount, so it's checked after the amount.
  const minFirstPayment: Result<number | null, string> =
    input.allowPartial && amount.ok
      ? validateMinFirstPayment(input.minFirstPayment, amount.value)
      : { ok: true, value: null };

  if (amount.ok && description.ok && customer.ok && expiry.ok && minFirstPayment.ok) {
    return {
      ok: true,
      value: {
        amountPaise: amount.value,
        description: description.value,
        email: customer.value.email,
        phone: customer.value.phone,
        expiresAt: expiry.value,
        allowPartial: input.allowPartial,
        minFirstPaymentPaise: minFirstPayment.value,
      },
    };
  }

  const errors: ValidationErrors = customer.ok ? {} : { ...customer.error };
  if (!amount.ok) errors.amount = amount.error;
  if (!description.ok) errors.description = description.error;
  if (!expiry.ok) errors.expiresAt = expiry.error;
  if (!minFirstPayment.ok) errors.minFirstPayment = minFirstPayment.error;
  return { ok: false, error: errors };
}

/**
 * Checks the "Minimum first payment" field: required when partial payments are allowed,
 * more than ₹0 and no more than the link amount.
 *
 * @param input - The minimum as typed.
 * @param amountPaise - The link amount in paise (already valid).
 * @returns The minimum in paise, or the error message to show the user.
 * @example validateMinFirstPayment('300', 100000) // { ok: true, value: 30000 }
 */
export function validateMinFirstPayment(
  input: string,
  amountPaise: number,
): Result<number, string> {
  const parsed = parseMoney(input);
  if (!parsed.ok) {
    const error =
      parsed.error === 'required'
        ? MESSAGES.minFirstPayment.required
        : MESSAGES.amount[parsed.error];
    return { ok: false, error };
  }
  if (parsed.value < 1) return { ok: false, error: MESSAGES.minFirstPayment.min };
  if (parsed.value > amountPaise) return { ok: false, error: MESSAGES.minFirstPayment.max };
  return { ok: true, value: parsed.value };
}
