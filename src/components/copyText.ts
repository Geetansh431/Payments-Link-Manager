/**
 * Copies text to the clipboard.
 *
 * @param text - The text to copy.
 * @returns `true` if it was copied, `false` if the browser blocked it or has no clipboard.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
