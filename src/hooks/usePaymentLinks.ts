import { useCallback, useEffect, useState } from 'react';
import type { LinksRepository } from '../data/repository.ts';
import type { NewLink, PaymentLink } from '../domain/types.ts';

/** Where the list is in loading: still loading, loaded, or failed. */
export type LoadState = 'loading' | 'ready' | 'error';

/**
 * Turns any thrown value into a message that can be shown to the user.
 *
 * @param error - Whatever was thrown.
 * @returns The error's message, or a generic message if there isn't one.
 */
export function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}

/**
 * Loads the payment links and keeps them in sync with the repository.
 *
 * The list is loaded once when the component mounts. `createLink` and `markPaid` update
 * the list straight away on success, and throw on failure so the caller can show the error.
 *
 * @param repository - Where links are loaded from and saved to.
 * @returns The links, the load state, the load error, and actions to reload, create and mark paid.
 */
export function usePaymentLinks(repository: LinksRepository) {
  const [links, setLinks] = useState<PaymentLink[]>([]);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [loadError, setLoadError] = useState<string | null>(null);

  /** Fetches the list and stores the result or the error. */
  const fetchLinks = useCallback(() => {
    repository.list().then(
      (items) => {
        setLinks(items);
        setLoadState('ready');
      },
      (error: unknown) => {
        setLoadError(toErrorMessage(error));
        setLoadState('error');
      },
    );
  }, [repository]);

  useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

  /** Tries loading the list again, e.g. from a "Try again" button. */
  const reload = useCallback(() => {
    setLoadState('loading');
    setLoadError(null);
    fetchLinks();
  }, [fetchLinks]);

  /**
   * Saves a new link and adds it to the top of the list.
   *
   * @param data - Validated link data.
   * @returns The saved link.
   * @throws Error with a user-facing message if saving fails.
   */
  const createLink = useCallback(
    async (data: NewLink) => {
      const link = await repository.create(data);
      setLinks((current) => [link, ...current]);
      return link;
    },
    [repository],
  );

  /**
   * Marks a link as paid and updates it in the list.
   *
   * @param id - The link's id.
   * @returns The updated link.
   * @throws Error with a user-facing message if it can't be marked as paid.
   */
  const markPaid = useCallback(
    async (id: string) => {
      const updated = await repository.markPaid(id);
      setLinks((current) => current.map((link) => (link.id === id ? updated : link)));
      return updated;
    },
    [repository],
  );

  return { links, loadState, loadError, reload, createLink, markPaid };
}
