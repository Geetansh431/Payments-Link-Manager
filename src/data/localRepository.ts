import { applyPayment, checkPayment } from '../domain/payments.ts';
import { canRecordPayment, sortNewestFirst } from '../domain/status.ts';
import type { NewLink, PaymentLink } from '../domain/types.ts';
import { DATA_ERRORS } from './repository.ts';
import type { LinksRepository } from './repository.ts';
import { createSeedLinks } from './seed.ts';
import { readLinks, writeLinks } from './storage.ts';

export type LocalRepositoryOptions = {
  /** Where links are saved. `null` keeps them in memory only. Default: `null`. */
  storage?: Storage | null;
  /** Fake network delay for every call, in milliseconds. Default: `0`. */
  latencyMs?: number;
  /** Make `list()` fail, to show the error state. Default: `false`. */
  failLoad?: boolean;
  /** Make `create()` fail, to show the error state. Default: `false`. */
  failCreate?: boolean;
  /** Returns the current time. Default: the real clock. */
  now?: () => Date;
  /** Creates ids for new links. Default: `crypto.randomUUID()`. */
  createId?: () => string;
};

/**
 * Waits for the given time, like a slow network would.
 *
 * @param ms - How long to wait, in milliseconds.
 */
function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Creates a mock backend that keeps payment links in the browser.
 *
 * On first use (or if saved data is broken) it starts with sample links. Every
 * change is saved straight away, so links survive a page refresh.
 *
 * @param options - Storage, fake delay, forced failures and test hooks.
 * @returns A repository the UI can use like a real API.
 */
export function createLocalRepository(options: LocalRepositoryOptions = {}): LinksRepository {
  const {
    storage = null,
    latencyMs = 0,
    failLoad = false,
    failCreate = false,
    now = () => new Date(),
    createId = () => crypto.randomUUID(),
  } = options;

  let links = readLinks(storage) ?? createSeedLinks(now());
  writeLinks(storage, links);

  return {
    async list() {
      await wait(latencyMs);
      if (failLoad) throw new Error(DATA_ERRORS.load);
      return sortNewestFirst(links);
    },

    async create(data: NewLink) {
      await wait(latencyMs);
      if (failCreate) throw new Error(DATA_ERRORS.create);

      const link: PaymentLink = {
        ...data,
        id: createId(),
        createdAt: now().toISOString(),
        amountPaidPaise: 0,
        paidAt: null,
      };
      links = [...links, link];
      writeLinks(storage, links);
      return link;
    },

    async recordPayment(id: string, amountPaise: number) {
      await wait(latencyMs);
      const link = links.find((item) => item.id === id);
      if (!link) throw new Error(DATA_ERRORS.notFound);
      if (!canRecordPayment(link, now())) throw new Error(DATA_ERRORS.notPayable);

      const problem = checkPayment(link, amountPaise);
      if (problem !== null) throw new Error(problem);

      const updated = applyPayment(link, amountPaise, now());
      links = links.map((item) => (item.id === id ? updated : item));
      writeLinks(storage, links);
      return updated;
    },
  };
}
