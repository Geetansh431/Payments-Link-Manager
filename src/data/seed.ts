import type { PaymentLink } from '../domain/types.ts';

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

/**
 * Creates the sample links shown the first time the app opens, so every status
 * (Active, Paid, Expired) is visible straight away. Times are relative to `now`
 * so the statuses are always correct.
 *
 * @param now - The current time.
 * @returns Four sample links: two Active, one Paid, one Expired.
 */
export function createSeedLinks(now: Date): PaymentLink[] {
  const at = (offsetMs: number) => new Date(now.getTime() + offsetMs).toISOString();

  return [
    {
      id: 'seed-1',
      amountPaise: 600_000,
      description: 'Bulk order: 40 notebooks',
      email: 'orders@example.in',
      phone: null,
      createdAt: at(-45 * MINUTE),
      expiresAt: null,
      paidAt: null,
    },
    {
      id: 'seed-2',
      amountPaise: 2_499_900,
      description: 'Website design: 50% deposit',
      email: 'riya@example.com',
      phone: null,
      createdAt: at(-2 * DAY),
      expiresAt: at(5 * DAY),
      paidAt: null,
    },
    {
      id: 'seed-3',
      amountPaise: 150_000,
      description: 'Yoga classes: November',
      email: null,
      phone: '+919876543210',
      createdAt: at(-3 * DAY),
      expiresAt: null,
      paidAt: at(-1 * DAY),
    },
    {
      id: 'seed-4',
      amountPaise: 5_000_000,
      description: 'Wedding photography advance',
      email: 'arjun@example.com',
      phone: '+918765432109',
      createdAt: at(-10 * DAY),
      expiresAt: at(-1 * DAY),
      paidAt: null,
    },
  ];
}
