export const LINK_STATUSES = ['Active', 'Paid', 'Expired'] as const;
export type LinkStatus = (typeof LINK_STATUSES)[number];

export const STATUS_FILTERS = ['All', ...LINK_STATUSES] as const;
export type StatusFilter = (typeof STATUS_FILTERS)[number];

export type PaymentLink = {
  id: string;
  /** Integer paise. Never a rupee float. */
  amountPaise: number;
  description: string;
  email: string | null;
  /** Normalised as +91XXXXXXXXXX. */
  phone: string | null;
  /** ISO 8601 UTC. */
  createdAt: string;
  /** ISO 8601 UTC, or null when the link never expires. */
  expiresAt: string | null;
  /** ISO 8601 UTC, set when paid. */
  paidAt: string | null;
};

/** Raw form values, exactly as typed. */
export type CreateLinkInput = {
  amount: string;
  description: string;
  email: string;
  phone: string;
  /** `datetime-local` value (YYYY-MM-DDTHH:mm, local time) or "". */
  expiresAt: string;
};

/** Validated, normalised data ready to persist. */
export type NewLink = Pick<
  PaymentLink,
  'amountPaise' | 'description' | 'email' | 'phone' | 'expiresAt'
>;

export type FormField = 'amount' | 'description' | 'customer' | 'email' | 'phone' | 'expiresAt';
export type ValidationErrors = Partial<Record<FormField, string>>;

export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };
