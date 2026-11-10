import { useState } from 'react';
import { formatPhone } from '../domain/customer.ts';
import { formatDateTime } from '../domain/dates.ts';
import { formatPaise } from '../domain/money.ts';
import { amountDue } from '../domain/payments.ts';
import { canRecordPayment, deriveStatus } from '../domain/status.ts';
import type { PaymentLink } from '../domain/types.ts';
import { paymentUrl } from '../domain/url.ts';
import { CopyButton } from './CopyButton.tsx';
import { RecordPaymentForm } from './RecordPaymentForm.tsx';
import { StatusBadge } from './StatusBadge.tsx';

type LinksListProps = {
  /** The links to show, already filtered and sorted. */
  links: PaymentLink[];
  /** The current time, used to work out each link's status. */
  now: Date;
  /** Saves a payment. Should throw with a user-facing message on failure. */
  onRecordPayment: (link: PaymentLink, amountPaise: number) => Promise<void>;
};

/**
 * Describes when a link expires, for the "Expires" line.
 *
 * @param link - The link.
 * @returns "No expiry" or the formatted expiry date.
 */
function expiryText(link: PaymentLink): string {
  return link.expiresAt === null ? 'No expiry' : formatDateTime(link.expiresAt);
}

/**
 * Moves focus after a payment is saved, to the first of these that still exists: the
 * link's "Record payment" button, the link's title (if it's now Paid), or the list
 * heading (if the link is no longer shown under the current filter). Runs after React
 * has re-rendered, so focus never falls back to the page body.
 *
 * @param id - The link's id.
 */
function focusAfterPayment(id: string) {
  setTimeout(() => {
    const target =
      document.getElementById(`record-${id}`) ??
      document.getElementById(`link-title-${id}`) ??
      document.getElementById('links-heading');
    target?.focus();
  }, 0);
}

/**
 * The list of payment links. Each link shows its description, customer, amount, paid and
 * due, status, created and expiry times, a copy button and, for Active and Partially paid
 * links, "Record payment", which opens a small form under the link.
 * Shown as rows on wide screens and as stacked cards on narrow ones.
 */
export function LinksList({ links, now, onRecordPayment }: LinksListProps) {
  const [openId, setOpenId] = useState<string | null>(null);

  /** Saves the payment, closes the form and moves focus somewhere sensible. */
  async function handleSave(link: PaymentLink, amountPaise: number) {
    await onRecordPayment(link, amountPaise);
    setOpenId(null);
    focusAfterPayment(link.id);
  }

  /** Closes the form and puts focus back on the "Record payment" button. */
  function handleCancel(id: string) {
    setOpenId(null);
    setTimeout(() => document.getElementById(`record-${id}`)?.focus(), 0);
  }

  return (
    <ul className="links" aria-label="Payment links">
      {links.map((link) => {
        const status = deriveStatus(link, now);
        const isOpen = openId === link.id;
        const canPay = canRecordPayment(link, now);

        return (
          <li key={link.id} className="link-card">
            <div className="link-card__info">
              <p id={`link-title-${link.id}`} className="link-card__title" tabIndex={-1}>
                {link.description}
              </p>
              <p className="link-card__customer">
                {link.email && <span>{link.email}</span>}
                {link.phone && <span>{formatPhone(link.phone)}</span>}
              </p>
            </div>

            <div className="link-card__amount">
              <p className="link-card__total">{formatPaise(link.amountPaise)}</p>
              <p className="link-card__progress">
                Paid {formatPaise(link.amountPaidPaise)} · Due {formatPaise(amountDue(link))}
              </p>
            </div>

            <div className="link-card__status">
              <StatusBadge status={status} />
            </div>

            <dl className="link-card__dates">
              <div>
                <dt>Created</dt>
                <dd>
                  <time dateTime={link.createdAt}>{formatDateTime(link.createdAt)}</time>
                </dd>
              </div>
              <div>
                <dt>{status === 'Expired' ? 'Expired' : 'Expires'}</dt>
                <dd>{expiryText(link)}</dd>
              </div>
              {link.allowPartial && link.minFirstPaymentPaise !== null && (
                <div>
                  <dt>Partial payments</dt>
                  <dd>min. first {formatPaise(link.minFirstPaymentPaise)}</dd>
                </div>
              )}
            </dl>

            <div className="link-card__actions">
              <CopyButton text={paymentUrl(link.id)} itemName={link.description} />
              {canPay && (
                <button
                  id={`record-${link.id}`}
                  type="button"
                  className="button button--secondary"
                  aria-label={`Record payment: ${link.description}`}
                  aria-expanded={isOpen}
                  onClick={() => setOpenId(isOpen ? null : link.id)}
                >
                  Record payment
                </button>
              )}
            </div>

            {isOpen && canPay && (
              <div className="link-card__payment">
                <RecordPaymentForm
                  link={link}
                  onSave={(amountPaise) => handleSave(link, amountPaise)}
                  onCancel={() => handleCancel(link.id)}
                />
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
