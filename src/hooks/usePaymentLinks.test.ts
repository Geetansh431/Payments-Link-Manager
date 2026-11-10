import { act, renderHook, waitFor } from '@testing-library/react';
import { createLocalRepository } from '../data/localRepository.ts';
import { DATA_ERRORS } from '../data/repository.ts';
import type { LinksRepository } from '../data/repository.ts';
import type { NewLink } from '../domain/types.ts';
import { toErrorMessage, usePaymentLinks } from './usePaymentLinks.ts';

const NOW = new Date('2026-11-10T12:00:00.000Z');

const newLink: NewLink = {
  amountPaise: 50_000,
  description: 'Consultation',
  email: 'client@example.com',
  phone: null,
  expiresAt: null,
  allowPartial: false,
  minFirstPaymentPaise: null,
};

/** Renders the hook on an in-memory repository and waits for the first load to finish. */
async function renderLoaded(options: Parameters<typeof createLocalRepository>[0] = {}) {
  const repository = createLocalRepository({ now: () => NOW, ...options });
  const hook = renderHook(() => usePaymentLinks(repository));
  await waitFor(() => expect(hook.result.current.loadState).not.toBe('loading'));
  return hook;
}

describe('usePaymentLinks', () => {
  it('starts loading, then shows the links', async () => {
    const repository = createLocalRepository({ now: () => NOW });
    const { result } = renderHook(() => usePaymentLinks(repository));
    expect(result.current.loadState).toBe('loading');

    await waitFor(() => expect(result.current.loadState).toBe('ready'));
    expect(result.current.links).toHaveLength(5);
    expect(result.current.loadError).toBeNull();
  });

  it('shows the error message when loading fails', async () => {
    const { result } = await renderLoaded({ failLoad: true });

    expect(result.current.loadState).toBe('error');
    expect(result.current.loadError).toBe(DATA_ERRORS.load);
  });

  it('loads again when reload is called after a failure', async () => {
    const list = vi
      .fn<LinksRepository['list']>()
      .mockRejectedValueOnce(new Error(DATA_ERRORS.load))
      .mockResolvedValueOnce([]);
    const repository = { list, create: vi.fn(), recordPayment: vi.fn() };
    const { result } = renderHook(() => usePaymentLinks(repository));
    await waitFor(() => expect(result.current.loadState).toBe('error'));

    act(() => result.current.reload());
    expect(result.current.loadState).toBe('loading');
    expect(result.current.loadError).toBeNull();

    await waitFor(() => expect(result.current.loadState).toBe('ready'));
  });

  it('adds a created link to the top of the list', async () => {
    const { result } = await renderLoaded();

    await act(() => result.current.createLink(newLink));
    expect(result.current.links[0]?.description).toBe('Consultation');
    expect(result.current.links).toHaveLength(6);
  });

  it('leaves the list unchanged and throws when creating fails', async () => {
    const { result } = await renderLoaded({ failCreate: true });

    await expect(act(() => result.current.createLink(newLink))).rejects.toThrow(DATA_ERRORS.create);
    expect(result.current.links).toHaveLength(5);
  });

  it('updates a link in place when a payment is recorded', async () => {
    const { result } = await renderLoaded();

    await act(() => result.current.recordPayment('seed-2', 500_000));
    const updated = result.current.links.find((link) => link.id === 'seed-2');
    expect(updated?.amountPaidPaise).toBe(500_000);
    expect(result.current.links).toHaveLength(5);
  });
});

describe('toErrorMessage', () => {
  it('uses the message of an Error', () => {
    expect(toErrorMessage(new Error('Network down'))).toBe('Network down');
  });

  it('falls back to a generic message for anything else', () => {
    expect(toErrorMessage('oops')).toBe('Something went wrong. Please try again.');
  });
});
