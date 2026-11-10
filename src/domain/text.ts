/**
 * Checks whether a string is made only of the digits 0–9.
 *
 * @param text - The string to check.
 * @returns `true` if `text` is non-empty and every character is a digit.
 * @example isDigits('1499') // true
 * @example isDigits('14a9') // false
 */
export function isDigits(text: string): boolean {
  if (text === '') return false;
  return [...text].every((char) => char >= '0' && char <= '9');
}

/**
 * Removes every occurrence of the given characters from a string.
 *
 * @param text - The string to clean.
 * @param chars - The characters to remove, e.g. `' -()'`.
 * @returns `text` without any of the characters in `chars`.
 * @example removeChars('+91 98765-43210', ' -') // '+919876543210'
 */
export function removeChars(text: string, chars: string): string {
  return [...text].filter((char) => !chars.includes(char)).join('');
}
