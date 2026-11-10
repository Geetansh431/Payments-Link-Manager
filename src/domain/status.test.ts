import {
  canRecordPayment,
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

/** A ₹1,000 link with the given amount paid and expiry. */
function link(amountPaidPaise: number, expiresAt: string | null) {
  return { amountPaise: 100_000, amountPaidPaise, expiresAt };
}

describe('deriveStatus', () => {
  it.each([
    [100_000, null, 'Paid'],
    [100_000, FUTURE, 'Paid'],
    // Paid links never expire.
    [100_000, PAST, 'Paid'],
    [0, null, 'Active'],
    [0, FUTURE, 'Active'],
    [30_000, null, 'Partially paid'],
    [30_000, FUTURE, 'Partially paid'],
    [0, PAST, 'Expired'],
    [0, EXACTLY_NOW, 'Expired'],
    // Expired wins over Partially paid once the expiry passes.
    [30_000, PAST, 'Expired'],
    [99_999, EXACTLY_NOW, 'Expired'],
  ])('paid=%i expiresAt=%s -> %s', (paid, expiresAt, expected) => {
    expect(deriveStatus(link(paid, expiresAt), NOW)).toBe(expected);
  });

  it('flips a Partially paid link to Expired once time passes its expiry', () => {
    const partial = link(30_000, '2026-11-10T12:30:00.000Z');
    expect(deriveStatus(partial, NOW)).toBe('Partially paid');
    expect(deriveStatus(partial, new Date('2026-11-10T12:30:00.000Z'))).toBe('Expired');
  });
});

describe('canRecordPayment', () => {
  it.each([
    [link(0, FUTURE), true],
    [link(0, null), true],
    [link(30_000, FUTURE), true],
    [link(0, PAST), false],
    [link(30_000, PAST), false],
    [link(100_000, null), false],
  ])('%j -> %s', (item, expected) => {
    expect(canRecordPayment(item, NOW)).toBe(expected);
  });
});

const links = [
  { id: 'a', ...link(0, null) }, // Active
  { id: 'b', ...link(0, FUTURE) }, // Active
  { id: 'c', ...link(100_000, PAST) }, // Paid
  { id: 'd', ...link(0, PAST) }, // Expired
  { id: 'e', ...link(30_000, null) }, // Partially paid
];

describe('matchesFilter', () => {
  it.each([
    ['All', ['a', 'b', 'c', 'd', 'e']],
    ['Active', ['a', 'b']],
    ['Partially paid', ['e']],
    ['Paid', ['c']],
    ['Expired', ['d']],
  ] as const)('%s shows %j', (filter, ids) => {
    expect(links.filter((l) => matchesFilter(l, filter, NOW)).map((l) => l.id)).toEqual(ids);
  });
});

describe('countByStatus', () => {
  it('counts every tab from the same now', () => {
    expect(countByStatus(links, NOW)).toEqual({
      All: 5,
      Active: 2,
      'Partially paid': 1,
      Paid: 1,
      Expired: 1,
    });
  });

  it('returns zeros for an empty list', () => {
    expect(countByStatus([], NOW)).toEqual({
      All: 0,
      Active: 0,
      'Partially paid': 0,
      Paid: 0,
      Expired: 0,
    });
  });
});

describe('isStatusFilter', () => {
  it.each([
    ['All', true],
    ['Active', true],
    ['Partially paid', true],
    ['Paid', true],
    ['Expired', true],
    ['active', false],
    ['Partially', false],
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
    ];
    expect(sortNewestFirst(input).map((l) => l.createdAt)).toEqual([
      '2026-11-10T00:00:00.000Z',
      '2026-11-09T00:00:00.000Z',
      '2026-11-08T00:00:00.000Z',
    ]);
    expect(input[0]?.createdAt).toBe('2026-11-08T00:00:00.000Z');
  });
});
