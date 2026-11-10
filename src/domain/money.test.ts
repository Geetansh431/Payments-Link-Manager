import { MESSAGES } from './messages.ts';
import { formatPaise, parseAmountToPaise } from './money.ts';

describe('parseAmountToPaise', () => {
  it.each([
    ['0.01', 1],
    ['1', 100],
    ['1499', 149900],
    ['1499.5', 149950],
    ['1499.50', 149950],
    ['007', 700],
    ['1,00,000', 10_000_000],
    [' 100000 ', 10_000_000],
    ['500000', 50_000_000],
    ['5,00,000.00', 50_000_000],
    // Classic float trap: 1.005 * 100 = 100.49999… — integer maths must not drift.
    ['1.01', 101],
    ['0.29', 29],
  ])('parses %j to %i paise', (raw, paise) => {
    expect(parseAmountToPaise(raw)).toEqual({ ok: true, value: paise });
  });

  it.each([
    ['', MESSAGES.amount.required],
    ['   ', MESSAGES.amount.required],
    ['0', MESSAGES.amount.min],
    ['0.00', MESSAGES.amount.min],
    ['500000.01', MESSAGES.amount.max],
    ['5000001', MESSAGES.amount.max],
    ['99999999999999999999', MESSAGES.amount.max],
    ['10.999', MESSAGES.amount.decimals],
    ['-5', MESSAGES.amount.invalid],
    ['1e3', MESSAGES.amount.invalid],
    ['₹100', MESSAGES.amount.invalid],
    ['12.3.4', MESSAGES.amount.invalid],
    ['abc', MESSAGES.amount.invalid],
    ['.', MESSAGES.amount.invalid],
    ['1.', MESSAGES.amount.invalid],
  ])('rejects %j with %j', (raw, error) => {
    expect(parseAmountToPaise(raw)).toEqual({ ok: false, error });
  });
});

describe('formatPaise', () => {
  it.each([
    [1, '₹0.01'],
    [149950, '₹1,499.50'],
    [10_000_000, '₹1,00,000.00'],
    [50_000_000, '₹5,00,000.00'],
  ])('formats %i as %s', (paise, text) => {
    expect(formatPaise(paise)).toBe(text);
  });
});
