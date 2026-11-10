import { formatDateTime, toDateTimeLocal } from './dates.ts';
import { paymentUrl } from './url.ts';

describe('toDateTimeLocal', () => {
  it.each([
    [new Date(2026, 10, 10, 9, 5), '2026-11-10T09:05'],
    [new Date(2027, 0, 1, 23, 59, 59), '2027-01-01T23:59'],
  ])('formats %s as %s', (date, expected) => {
    expect(toDateTimeLocal(date)).toBe(expected);
  });
});

describe('formatDateTime', () => {
  it('shows day, short month, year and time', () => {
    const local = new Date(2026, 10, 10, 15, 30);
    expect(formatDateTime(local.toISOString())).toMatch(/^10 Nov 2026, 3:30\spm$/i);
  });
});

describe('paymentUrl', () => {
  it('builds the payment address from the id', () => {
    expect(paymentUrl('abc123')).toBe('https://pay.example.com/l/abc123');
  });

  it('escapes characters that are not safe in a URL', () => {
    expect(paymentUrl('a/b c')).toBe('https://pay.example.com/l/a%2Fb%20c');
  });
});
