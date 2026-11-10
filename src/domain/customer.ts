import { isDigits, removeChars } from './text.ts';

const MAX_EMAIL_LENGTH = 254;

/**
 * Checks that an email address looks valid: some text, one `@`, then a domain with a dot
 * (e.g. `name@example.com`). It does not check that the address actually exists.
 *
 * @param input - The email as typed. Surrounding spaces are ignored.
 * @returns `true` if the email has a valid format.
 * @example isValidEmail('name@example.com') // true
 * @example isValidEmail('name@example')     // false
 */
export function isValidEmail(input: string): boolean {
  const email = input.trim();
  if (email.length > MAX_EMAIL_LENGTH || email.includes(' ')) return false;

  const at = email.indexOf('@');
  const domain = email.slice(at + 1);
  if (at < 1 || domain.includes('@')) return false;

  const domainParts = domain.split('.');
  return domainParts.length >= 2 && domainParts.every((part) => part !== '');
}

/**
 * Converts an Indian mobile number into the standard `+91XXXXXXXXXX` form.
 *
 * Spaces, dashes, brackets and `+` are ignored. An optional `91` or `0` prefix is removed.
 * What remains must be 10 digits starting with 6, 7, 8 or 9.
 *
 * @param input - The phone number as typed, e.g. `"+91 98765 43210"`.
 * @returns The number as `+91XXXXXXXXXX`, or `null` if it isn't a valid Indian mobile.
 * @example normalizePhone('098765-43210') // '+919876543210'
 * @example normalizePhone('12345')        // null
 */
export function normalizePhone(input: string): string | null {
  let digits = removeChars(input, ' -()+');
  if (!isDigits(digits)) return null;

  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);

  if (digits.length !== 10 || !'6789'.includes(digits.charAt(0))) return null;
  return `+91${digits}`;
}

/**
 * Formats a normalised phone number for display.
 *
 * @param phone - A number in `+91XXXXXXXXXX` form.
 * @returns The number split into readable groups.
 * @example formatPhone('+919876543210') // '+91 98765 43210'
 */
export function formatPhone(phone: string): string {
  return `${phone.slice(0, 3)} ${phone.slice(3, 8)} ${phone.slice(8)}`;
}
