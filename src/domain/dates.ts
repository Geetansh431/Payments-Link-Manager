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

const dateTimeFormatter = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

/**
 * Formats an ISO timestamp for display in the user's local time.
 *
 * @param iso - An ISO 8601 timestamp, e.g. a link's `createdAt`.
 * @returns A short readable date and time.
 * @example formatDateTime('2026-11-10T06:30:00.000Z') // '10 Nov 2026, 12:00 pm' (in IST)
 */
export function formatDateTime(iso: string): string {
  return dateTimeFormatter.format(new Date(iso));
}
