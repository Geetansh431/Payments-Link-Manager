import { deriveStatus } from '../domain/status.ts';
import type { NewLink } from '../domain/types.ts';
import { createLocalRepository } from './localRepository.ts';
import { DATA_ERRORS } from './repository.ts';
import { STORAGE_KEY } from './storage.ts';

const NOW = new Date('2026-11-10T12:00:00.000Z');

const newLink: NewLink = {
  amountPaise: 149_950,
  description: 'Logo design',
  email: 'client@example.com',
  phone: null,
  expiresAt: null,
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
    ]);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')).toHaveLength(4);
  });

  it('creates a link with an id, created time and no payment yet', async () => {
    const created = await setup().create(newLink);

    expect(created).toEqual({ ...newLink, id: 'id-1', createdAt: NOW.toISOString(), paidAt: null });
  });

  it('lists the newest link first', async () => {
    const repo = setup();
    await repo.create(newLink);

    const [first] = await repo.list();
    expect(first?.id).toBe('id-1');
  });

  it('keeps links after a page refresh', async () => {
    await setup().create(newLink);

    const afterRefresh = await setup().list();
    expect(afterRefresh.some((link) => link.description === 'Logo design')).toBe(true);
  });

  it('marks an Active link as paid', async () => {
    const repo = setup();
    const { id } = await repo.create(newLink);

    const paid = await repo.markPaid(id);
    expect(paid.paidAt).toBe(NOW.toISOString());
    expect(deriveStatus(paid, NOW)).toBe('Paid');
  });

  it.each([
    ['an expired link', 'seed-4', DATA_ERRORS.notActive],
    ['an already paid link', 'seed-3', DATA_ERRORS.notActive],
    ['an unknown link', 'missing', DATA_ERRORS.notFound],
  ])('refuses to mark %s as paid', async (_, id, message) => {
    await expect(setup().markPaid(id)).rejects.toThrow(message);
  });

  it('falls back to sample links when saved data is broken', async () => {
    localStorage.setItem(STORAGE_KEY, '{not json');
    expect(await setup().list()).toHaveLength(4);

    localStorage.setItem(STORAGE_KEY, JSON.stringify({ not: 'a list' }));
    expect(await setup().list()).toHaveLength(4);
  });

  it('skips saved entries that are not valid links', async () => {
    const valid = { ...newLink, id: 'ok', createdAt: NOW.toISOString(), paidAt: null };
    localStorage.setItem(STORAGE_KEY, JSON.stringify([valid, { id: 42 }, null]));

    expect((await setup().list()).map((link) => link.id)).toEqual(['ok']);
  });

  it('works in memory when storage is not available', async () => {
    const repo = setup({ storage: null });
    await repo.create(newLink);

    expect(await repo.list()).toHaveLength(5);
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
    expect(await repo.list()).toHaveLength(4);
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
