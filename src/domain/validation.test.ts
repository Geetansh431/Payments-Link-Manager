import type { CreateLinkInput } from './types.ts';
import {
  MESSAGES,
  countCharacters,
  validateCreateLink,
  validateDescription,
  validateExpiry,
} from './validation.ts';

// Local time; expiry inputs are datetime-local values in the same (local) timezone.
const NOW = new Date(2026, 10, 10, 12, 0, 0);

const valid: CreateLinkInput = {
  amount: '1499.50',
  description: '  Website design — deposit  ',
  email: 'client@example.com',
  phone: '',
  expiresAt: '',
  allowPartial: false,
  minFirstPayment: '',
};

describe('validateDescription', () => {
  it.each([
    ['', MESSAGES.description.required],
    ['    ', MESSAGES.description.required],
    ['a'.repeat(101), MESSAGES.description.max],
    [`  ${'a'.repeat(101)}  `, MESSAGES.description.max],
  ])('rejects %j', (raw, error) => {
    expect(validateDescription(raw)).toEqual({ ok: false, error });
  });

  it.each([
    ['a'.repeat(100), 'a'.repeat(100)],
    [`   ${'a'.repeat(100)}   `, 'a'.repeat(100)],
    ['👍🏽'.repeat(100), '👍🏽'.repeat(100)],
  ])('accepts and trims a %#th valid description', (raw, value) => {
    expect(validateDescription(raw)).toEqual({ ok: true, value });
  });

  it('counts an emoji with a skin-tone modifier as one character', () => {
    expect(countCharacters('👍🏽ab')).toBe(3);
  });
});

describe('validateExpiry', () => {
  it('treats empty as "never expires"', () => {
    expect(validateExpiry('', NOW)).toEqual({ ok: true, value: null });
  });

  it.each([
    ['2026-11-10T12:00', MESSAGES.expiresAt.past], // exactly now
    ['2026-11-10T11:59', MESSAGES.expiresAt.past],
    ['2025-01-01T00:00', MESSAGES.expiresAt.past],
    ['2026-02-30T10:00', MESSAGES.expiresAt.invalid], // would roll over to 2 Mar
    ['2026-13-01T10:00', MESSAGES.expiresAt.invalid],
    ['2026-11-10T25:00', MESSAGES.expiresAt.invalid],
    ['tomorrow', MESSAGES.expiresAt.invalid],
    ['2026-11-10', MESSAGES.expiresAt.invalid],
  ])('rejects %j', (raw, error) => {
    expect(validateExpiry(raw, NOW)).toEqual({ ok: false, error });
  });

  it.each([
    ['2026-11-10T12:01', new Date(2026, 10, 10, 12, 1)],
    ['2026-11-10T12:00:01', new Date(2026, 10, 10, 12, 0, 1)],
    ['2027-03-01T09:30', new Date(2027, 2, 1, 9, 30)],
  ])('accepts future %j and stores it as ISO UTC', (raw, expected) => {
    expect(validateExpiry(raw, NOW)).toEqual({ ok: true, value: expected.toISOString() });
  });
});

describe('validateCreateLink', () => {
  it('returns normalised data for a valid form', () => {
    expect(validateCreateLink(valid, NOW)).toEqual({
      ok: true,
      value: {
        amountPaise: 149950,
        description: 'Website design — deposit',
        email: 'client@example.com',
        phone: null,
        expiresAt: null,
        allowPartial: false,
        minFirstPaymentPaise: null,
      },
    });
  });

  it('accepts phone only and normalises it', () => {
    const result = validateCreateLink({ ...valid, email: '', phone: '98765 43210' }, NOW);
    expect(result).toMatchObject({ ok: true, value: { email: null, phone: '+919876543210' } });
  });

  it('accepts both email and phone', () => {
    const result = validateCreateLink({ ...valid, phone: '+91 98765 43210' }, NOW);
    expect(result).toMatchObject({
      ok: true,
      value: { email: 'client@example.com', phone: '+919876543210' },
    });
  });

  it('requires at least one of email or phone', () => {
    expect(validateCreateLink({ ...valid, email: '  ', phone: '' }, NOW)).toEqual({
      ok: false,
      error: { customer: MESSAGES.customer.required },
    });
  });

  it('flags a half-typed second contact even when the first is valid', () => {
    expect(validateCreateLink({ ...valid, phone: '98765' }, NOW)).toEqual({
      ok: false,
      error: { phone: MESSAGES.phone.invalid },
    });
  });

  it('reports only the invalid fields when the customer is valid', () => {
    expect(validateCreateLink({ ...valid, amount: '10.999' }, NOW)).toEqual({
      ok: false,
      error: { amount: MESSAGES.amount.decimals },
    });
  });

  it('reports every invalid field at once', () => {
    const result = validateCreateLink(
      {
        amount: '0',
        description: '',
        email: 'not-an-email',
        phone: '12345',
        expiresAt: '2020-01-01T00:00',
        allowPartial: false,
        minFirstPayment: '',
      },
      NOW,
    );
    expect(result).toEqual({
      ok: false,
      error: {
        amount: MESSAGES.amount.min,
        description: MESSAGES.description.required,
        email: MESSAGES.email.invalid,
        phone: MESSAGES.phone.invalid,
        expiresAt: MESSAGES.expiresAt.past,
      },
    });
  });

  it('stores a future expiry as ISO UTC', () => {
    const result = validateCreateLink({ ...valid, expiresAt: '2026-12-01T18:00' }, NOW);
    expect(result).toMatchObject({
      ok: true,
      value: { expiresAt: new Date(2026, 11, 1, 18, 0).toISOString() },
    });
  });
});

describe('partial payments in validateCreateLink', () => {
  const amount1000 = { ...valid, amount: '1000' };

  it('ignores the minimum when partial payments are off', () => {
    const result = validateCreateLink({ ...amount1000, minFirstPayment: 'nonsense' }, NOW);
    expect(result).toMatchObject({
      ok: true,
      value: { allowPartial: false, minFirstPaymentPaise: null },
    });
  });

  it.each([
    ['', MESSAGES.minFirstPayment.required],
    ['0', MESSAGES.minFirstPayment.min],
    ['1000.01', MESSAGES.minFirstPayment.max],
    ['10.999', MESSAGES.amount.decimals],
    ['abc', MESSAGES.amount.invalid],
  ])('rejects a minimum of %j', (minFirstPayment, error) => {
    const result = validateCreateLink({ ...amount1000, allowPartial: true, minFirstPayment }, NOW);
    expect(result).toEqual({ ok: false, error: { minFirstPayment: error } });
  });

  it.each([
    ['0.01', 1],
    ['300', 30_000],
    ['1000', 100_000],
  ])('accepts a minimum of %j', (minFirstPayment, paise) => {
    const result = validateCreateLink({ ...amount1000, allowPartial: true, minFirstPayment }, NOW);
    expect(result).toMatchObject({
      ok: true,
      value: { allowPartial: true, minFirstPaymentPaise: paise },
    });
  });

  it('only reports the amount error when the amount itself is invalid', () => {
    const result = validateCreateLink(
      { ...valid, amount: 'abc', allowPartial: true, minFirstPayment: '500' },
      NOW,
    );
    expect(result).toEqual({ ok: false, error: { amount: MESSAGES.amount.invalid } });
  });
});
