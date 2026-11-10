import type { NewLink, PaymentLink } from '../domain/types.ts';

/**
 * Everything the app can do with payment links. The UI only talks to this interface,
 * so the local mock can later be swapped for a real API without changing any screens.
 */
export type LinksRepository = {
  /**
   * Loads all payment links.
   *
   * @returns The links, newest first.
   * @throws Error with a user-facing message if loading fails.
   */
  list(): Promise<PaymentLink[]>;

  /**
   * Saves a new payment link.
   *
   * @param data - Validated link data from `validateCreateLink`.
   * @returns The saved link, including its new `id` and `createdAt`, with nothing paid yet.
   * @throws Error with a user-facing message if saving fails.
   */
  create(data: NewLink): Promise<PaymentLink>;

  /**
   * Records a payment received for a link (simulates the payment gateway confirming it).
   *
   * @param id - The link's id.
   * @param amountPaise - The amount received, in paise.
   * @returns The updated link.
   * @throws Error if the link doesn't exist, can't take payments, or the amount isn't allowed.
   */
  recordPayment(id: string, amountPaise: number): Promise<PaymentLink>;
};

/** User-facing error messages from the data layer. */
export const DATA_ERRORS = {
  load: "We couldn't load your payment links. Please try again.",
  create: "We couldn't create the payment link. Please try again.",
  notFound: 'That payment link no longer exists.',
  notPayable: 'Payments can only be recorded on active or partially paid links.',
} as const;
