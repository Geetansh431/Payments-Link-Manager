import { MESSAGES } from './messages.ts';
import { amountDue, applyPayment, checkPayment, validatePayment } from './payments.ts';
import type { PaymentLink } from './types.ts';

const NOW = new Date('2026-11-10T12:00:00.000Z');

/** A ₹1,000 link; override any field. */
function link(overrides: Partial<PaymentLink> = {}): PaymentLink {
  return {
    id: 'l1',
    amountPaise: 100_000,
    description: 'Sofa repair',
    email: 'a@b.co',
    phone: null,
    createdAt: '2026-11-01T00:00:00.000Z',
    expiresAt: null,
    allowPartial: false,
    minFirstPaymentPaise: null,
    amountPaidPaise: 0,
    paidAt: null,
    ...overrides,
  };
}

const fullOnly = link();
const partialMin300 = link({ allowPartial: true, minFirstPaymentPaise: 30_000 });
const partlyPaid300 = link({
  allowPartial: true,
  minFirstPaymentPaise: 30_000,
  amountPaidPaise: 30_000,
});

describe('amountDue', () => {
  it('is the amount minus what has been paid', () => {
    expect(amountDue(partlyPaid300)).toBe(70_000);
    expect(amountDue(fullOnly)).toBe(100_000);
  });
});

describe('validatePayment', () => {
  it.each([
    ['empty', fullOnly, '', MESSAGES.payment.required],
    ['zero', partialMin300, '0', MESSAGES.payment.min],
    ['3 decimals', partialMin300, '1.999', MESSAGES.amount.decimals],
    ['not a number', partialMin300, 'abc', MESSAGES.amount.invalid],
    ['part of a full-only link', fullOnly, '500', MESSAGES.payment.fullOnly('₹1,000.00')],
    ['more than the amount', fullOnly, '1000.01', MESSAGES.payment.max('₹1,000.00')],
    ['below the first minimum', partialMin300, '299.99', MESSAGES.payment.belowMinimum('₹300.00')],
    ['more than the due', partialMin300, '1000.01', MESSAGES.payment.max('₹1,000.00')],
    ['more than what is left', partlyPaid300, '700.01', MESSAGES.payment.max('₹700.00')],
  ])('rejects %s', (_, item, input, error) => {
    expect(validatePayment(item, input)).toEqual({ ok: false, error });
  });

  it.each([
    ['the full amount on a full-only link', fullOnly, '1000', 100_000],
    ['exactly the first minimum', partialMin300, '300', 30_000],
    ['the full amount on a partial link', partialMin300, '1,000', 100_000],
    // The minimum applies to the first payment only.
    ['a small later payment', partlyPaid300, '50', 5_000],
    ['the rest of the amount', partlyPaid300, '700', 70_000],
  ])('accepts %s', (_, item, input, paise) => {
    expect(validatePayment(item, input)).toEqual({ ok: true, value: paise });
  });

  it('treats a partial link without a minimum as minimum ₹0.01', () => {
    const noMinimum = link({ allowPartial: true, minFirstPaymentPaise: null });
    expect(checkPayment(noMinimum, 1)).toBeNull();
  });
});

describe('applyPayment', () => {
  it('adds a part payment without marking the link paid', () => {
    const updated = applyPayment(partialMin300, 30_000, NOW);
    expect(updated.amountPaidPaise).toBe(30_000);
    expect(updated.paidAt).toBeNull();
    expect(partialMin300.amountPaidPaise).toBe(0);
  });

  it('sets paidAt when the link becomes fully paid', () => {
    const updated = applyPayment(partlyPaid300, 70_000, NOW);
    expect(updated.amountPaidPaise).toBe(100_000);
    expect(updated.paidAt).toBe(NOW.toISOString());
  });
});
