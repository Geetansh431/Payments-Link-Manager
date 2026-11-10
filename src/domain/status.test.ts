import {
  canMarkPaid,
  countByStatus,
  deriveStatus,
  isStatusFilter,
  matchesFilter,
  sortNewestFirst,
} from './status.ts';

const NOW = new Date('2026-11-10T12:00:00.000Z');
const PAST = '2026-11-10T11:59:59.999Z';
const FUTURE = '2026-11-10T12:00:00.001Z';
const EXACTLY_NOW = NOW.toISOString();
const PAID_AT = '2026-11-09T10:00:00.000Z';

describe('deriveStatus', () => {
  it.each([
    { paidAt: PAID_AT, expiresAt: null, expected: 'Paid' },
    { paidAt: PAID_AT, expiresAt: FUTURE, expected: 'Paid' },
    // Paid wins even after the expiry has passed.
    { paidAt: PAID_AT, expiresAt: PAST, expected: 'Paid' },
    { paidAt: null, expiresAt: null, expected: 'Active' },
    { paidAt: null, expiresAt: FUTURE, expected: 'Active' },
    { paidAt: null, expiresAt: PAST, expected: 'Expired' },
    { paidAt: null, expiresAt: EXACTLY_NOW, expected: 'Expired' },
  ])('paidAt=$paidAt expiresAt=$expiresAt -> $expected', ({ paidAt, expiresAt, expected }) => {
    expect(deriveStatus({ paidAt, expiresAt }, NOW)).toBe(expected);
  });

  it('flips an Active link to Expired once time passes its expiry', () => {
    const link = { paidAt: null, expiresAt: '2026-11-10T12:30:00.000Z' };
    expect(deriveStatus(link, NOW)).toBe('Active');
    expect(deriveStatus(link, new Date('2026-11-10T12:30:00.000Z'))).toBe('Expired');
  });
});

describe('canMarkPaid', () => {
  it.each([
    [{ paidAt: null, expiresAt: FUTURE }, true],
    [{ paidAt: null, expiresAt: null }, true],
    [{ paidAt: null, expiresAt: PAST }, false],
    [{ paidAt: PAID_AT, expiresAt: null }, false],
  ])('%j -> %s', (link, expected) => {
    expect(canMarkPaid(link, NOW)).toBe(expected);
  });
});

const links = [
  { id: 'a', paidAt: null, expiresAt: null }, // Active
  { id: 'b', paidAt: null, expiresAt: FUTURE }, // Active
  { id: 'c', paidAt: PAID_AT, expiresAt: PAST }, // Paid
  { id: 'd', paidAt: null, expiresAt: PAST }, // Expired
];

describe('matchesFilter', () => {
  it.each([
    ['All', ['a', 'b', 'c', 'd']],
    ['Active', ['a', 'b']],
    ['Paid', ['c']],
    ['Expired', ['d']],
  ] as const)('%s shows %j', (filter, ids) => {
    expect(links.filter((l) => matchesFilter(l, filter, NOW)).map((l) => l.id)).toEqual(ids);
  });
});

describe('countByStatus', () => {
  it('counts every tab from the same now', () => {
    expect(countByStatus(links, NOW)).toEqual({ All: 4, Active: 2, Paid: 1, Expired: 1 });
  });

  it('returns zeros for an empty list', () => {
    expect(countByStatus([], NOW)).toEqual({ All: 0, Active: 0, Paid: 0, Expired: 0 });
  });
});

describe('isStatusFilter', () => {
  it.each([
    ['All', true],
    ['Active', true],
    ['Paid', true],
    ['Expired', true],
    ['active', false],
    ['Cancelled', false],
    ['', false],
    [null, false],
  ])('%j -> %s', (value, expected) => {
    expect(isStatusFilter(value)).toBe(expected);
  });
});

describe('sortNewestFirst', () => {
  it('orders by createdAt descending without mutating the input', () => {
    const input = [
      { createdAt: '2026-11-08T00:00:00.000Z' },
      { createdAt: '2026-11-10T00:00:00.000Z' },
      { createdAt: '2026-11-09T00:00:00.000Z' },
      { createdAt: '2026-11-09T00:00:00.000Z' },
    ];
    const sorted = sortNewestFirst(input);
    expect(sorted.map((l) => l.createdAt)).toEqual([
      '2026-11-10T00:00:00.000Z',
      '2026-11-09T00:00:00.000Z',
      '2026-11-09T00:00:00.000Z',
      '2026-11-08T00:00:00.000Z',
    ]);
    expect(input[0]?.createdAt).toBe('2026-11-08T00:00:00.000Z');
  });
});
