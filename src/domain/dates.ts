/**
 * Formats a date as a `datetime-local` input value in the user's local time.
 *
 * @param date - The date to format.
 * @returns The date as `YYYY-MM-DDTHH:mm`.
 * @example toDateTimeLocal(new Date(2026, 10, 10, 9, 5)) // '2026-11-10T09:05'
 */
export function toDateTimeLocal(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const time = `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  return `${day}T${time}`;
}
