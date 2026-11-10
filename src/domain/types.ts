export const LINK_STATUSES = ['Active', 'Partially paid', 'Paid', 'Expired'] as const;
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
  /** Whether the customer may pay in more than one instalment. */
  allowPartial: boolean;
  /** Smallest allowed first payment, in paise. Only set when `allowPartial` is true. */
  minFirstPaymentPaise: number | null;
  /** Total received so far, in paise. Between 0 and `amountPaise`. */
  amountPaidPaise: number;
  /** ISO 8601 UTC, set when the link became fully paid. */
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
  /** The "Allow partial payments" checkbox. */
  allowPartial: boolean;
  /** The "Minimum first payment" field (ignored unless `allowPartial`). */
  minFirstPayment: string;
};

/** Validated, normalised data ready to persist. */
export type NewLink = Pick<
  PaymentLink,
  | 'amountPaise'
  | 'description'
  | 'email'
  | 'phone'
  | 'expiresAt'
  | 'allowPartial'
  | 'minFirstPaymentPaise'
>;

export type FormField =
  'amount' | 'description' | 'customer' | 'email' | 'phone' | 'expiresAt' | 'minFirstPayment';
export type ValidationErrors = Partial<Record<FormField, string>>;

export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };
