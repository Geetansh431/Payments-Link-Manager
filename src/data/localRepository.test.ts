import { MESSAGES } from '../domain/messages.ts';
import { deriveStatus } from '../domain/status.ts';
import type { NewLink } from '../domain/types.ts';
import { createLocalRepository } from './localRepository.ts';
import { DATA_ERRORS } from './repository.ts';
import { LEGACY_STORAGE_KEY, STORAGE_KEY } from './storage.ts';

const NOW = new Date('2026-11-10T12:00:00.000Z');
const SEED_COUNT = 5;

const newLink: NewLink = {
  amountPaise: 100_000,
  description: 'Logo design',
  email: 'client@example.com',
  phone: null,
  expiresAt: null,
  allowPartial: true,
  minFirstPaymentPaise: 30_000,
};

/** Builds a repository on jsdom's localStorage with a fixed clock and predictable ids. */
function setup(options: Parameters<typeof createLocalRepository>[0] = {}) {
  let nextId = 1;
  return createLocalRepository({
    storage: localStorage,
    now: () => NOW,
    createId: () => `id-${nextId++}`,
    ...options,
  });
}

describe('createLocalRepository', () => {
  it('starts with sample links covering every status, and saves them', async () => {
    const links = await setup().list();

    expect(links.map((link) => deriveStatus(link, NOW)).sort()).toEqual([
      'Active',
      'Active',
      'Expired',
      'Paid',
      'Partially paid',
    ]);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')).toHaveLength(SEED_COUNT);
  });

  it('creates a link with an id, created time and nothing paid yet', async () => {
    const created = await setup().create(newLink);

    expect(created).toEqual({
      ...newLink,
      id: 'id-1',
      createdAt: NOW.toISOString(),
      amountPaidPaise: 0,
      paidAt: null,
    });
  });

  it('lists the newest link first', async () => {
    const repo = setup();
    await repo.create(newLink);

    const [first] = await repo.list();
    expect(first?.id).toBe('id-1');
  });

  it('keeps links and payments after a page reload', async () => {
    const repo = setup();
    const { id } = await repo.create(newLink);
    await repo.recordPayment(id, 30_000);

    const afterReload = await setup().list();
    const saved = afterReload.find((link) => link.id === id);
    expect(saved?.amountPaidPaise).toBe(30_000);
    expect(saved && deriveStatus(saved, NOW)).toBe('Partially paid');
  });

  it('records a first part payment, then the rest', async () => {
    const repo = setup();
    const { id } = await repo.create(newLink);

    const partial = await repo.recordPayment(id, 30_000);
    expect(deriveStatus(partial, NOW)).toBe('Partially paid');
    expect(partial.paidAt).toBeNull();

    const paid = await repo.recordPayment(id, 70_000);
    expect(deriveStatus(paid, NOW)).toBe('Paid');
    expect(paid.paidAt).toBe(NOW.toISOString());
  });

  it('rejects a payment the rules do not allow, and saves nothing', async () => {
    const repo = setup();
    const { id } = await repo.create(newLink);

    await expect(repo.recordPayment(id, 10_000)).rejects.toThrow(
      MESSAGES.payment.belowMinimum('₹300.00'),
    );
    const [first] = await repo.list();
    expect(first?.amountPaidPaise).toBe(0);
  });

  it.each([
    ['an expired link', 'seed-4', DATA_ERRORS.notPayable],
    ['an already paid link', 'seed-3', DATA_ERRORS.notPayable],
    ['an unknown link', 'missing', DATA_ERRORS.notFound],
  ])('refuses a payment on %s', async (_, id, message) => {
    await expect(setup().recordPayment(id, 100)).rejects.toThrow(message);
  });

  it('falls back to sample links when saved data is broken', async () => {
    localStorage.setItem(STORAGE_KEY, '{not json');
    expect(await setup().list()).toHaveLength(SEED_COUNT);

    localStorage.setItem(STORAGE_KEY, JSON.stringify({ not: 'a list' }));
    expect(await setup().list()).toHaveLength(SEED_COUNT);
  });

  it('skips saved entries that are not valid links', async () => {
    const valid = {
      ...newLink,
      id: 'ok',
      createdAt: NOW.toISOString(),
      amountPaidPaise: 0,
      paidAt: null,
    };
    const overpaid = { ...valid, id: 'overpaid', amountPaidPaise: 100_001 };
    const badDate = { ...valid, id: 'bad-date', expiresAt: 'garbage' };
    const fraction = { ...valid, id: 'fraction', amountPaise: 1.5 };
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([valid, overpaid, badDate, fraction, { id: 42 }, null]),
    );

    expect((await setup().list()).map((link) => link.id)).toEqual(['ok']);
  });

  it('migrates links saved before partial payments existed (v1)', async () => {
    const v1Unpaid = {
      id: 'old-1',
      amountPaise: 50_000,
      description: 'Old unpaid link',
      email: 'a@b.co',
      phone: null,
      createdAt: '2026-11-01T00:00:00.000Z',
      expiresAt: null,
      paidAt: null,
    };
    const v1Paid = { ...v1Unpaid, id: 'old-2', paidAt: '2026-11-02T00:00:00.000Z' };
    localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify([v1Unpaid, v1Paid, { id: 7 }]));

    const links = await setup().list();

    expect(links.map((link) => [link.id, deriveStatus(link, NOW)])).toEqual([
      ['old-1', 'Active'],
      ['old-2', 'Paid'],
    ]);
    expect(links[0]).toMatchObject({ allowPartial: false, minFirstPaymentPaise: null });
    expect(localStorage.getItem(LEGACY_STORAGE_KEY)).toBeNull();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')).toHaveLength(2);
  });

  it('works in memory when storage is not available', async () => {
    const repo = setup({ storage: null });
    await repo.create(newLink);

    expect(await repo.list()).toHaveLength(SEED_COUNT + 1);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('keeps working when saving to storage fails', async () => {
    const fullStorage = {
      getItem: () => null,
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
    } as unknown as Storage;
    const repo = setup({ storage: fullStorage });

    await expect(repo.create(newLink)).resolves.toMatchObject({ id: 'id-1' });
  });

  it('gives each new link a unique id by default', async () => {
    const repo = createLocalRepository();
    const first = await repo.create(newLink);
    const second = await repo.create(newLink);

    expect(first.id).not.toBe(second.id);
  });

  it('fails to load when failLoad is on', async () => {
    await expect(setup({ failLoad: true }).list()).rejects.toThrow(DATA_ERRORS.load);
  });

  it('fails to create, and saves nothing, when failCreate is on', async () => {
    const repo = setup({ failCreate: true });

    await expect(repo.create(newLink)).rejects.toThrow(DATA_ERRORS.create);
    expect(await repo.list()).toHaveLength(SEED_COUNT);
  });

  it('waits for the fake network delay before answering', async () => {
    vi.useFakeTimers();
    const repo = setup({ latencyMs: 300 });
    let done = false;
    void repo.list().then(() => (done = true));

    await vi.advanceTimersByTimeAsync(299);
    expect(done).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(done).toBe(true);
    vi.useRealTimers();
  });
});
