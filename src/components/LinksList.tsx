import { formatPhone } from '../domain/customer.ts';
import { formatDateTime } from '../domain/dates.ts';
import { formatPaise } from '../domain/money.ts';
import { deriveStatus } from '../domain/status.ts';
import type { PaymentLink } from '../domain/types.ts';
import { paymentUrl } from '../domain/url.ts';
import { CopyButton } from './CopyButton.tsx';
import { StatusBadge } from './StatusBadge.tsx';

type LinksListProps = {
  /** The links to show, already filtered and sorted. */
  links: PaymentLink[];
  /** The current time, used to work out each link's status. */
  now: Date;
  /** The id of a link that is being marked as paid, if any. */
  pendingId: string | null;
  onMarkPaid: (link: PaymentLink) => void;
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
 * The list of payment links. Each link shows its description, customer, amount, status,
 * created and expiry times, a copy button and, for Active links, "Mark as paid".
 * Shown as rows on wide screens and as stacked cards on narrow ones.
 */
export function LinksList({ links, now, pendingId, onMarkPaid }: LinksListProps) {
  return (
    <ul className="links" aria-label="Payment links">
      {links.map((link) => {
        const status = deriveStatus(link, now);
        const isPending = pendingId === link.id;

        return (
          <li key={link.id} className="link-card">
            <div className="link-card__info">
              <p className="link-card__title">{link.description}</p>
              <p className="link-card__customer">
                {link.email && <span>{link.email}</span>}
                {link.phone && <span>{formatPhone(link.phone)}</span>}
              </p>
            </div>

            <p className="link-card__amount">{formatPaise(link.amountPaise)}</p>

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
            </dl>

            <div className="link-card__actions">
              <CopyButton text={paymentUrl(link.id)} itemName={link.description} />
              {status === 'Active' && (
                <button
                  type="button"
                  className="button button--secondary"
                  aria-label={`Mark as paid: ${link.description}`}
                  disabled={isPending}
                  onClick={() => onMarkPaid(link)}
                >
                  {isPending ? 'Saving…' : 'Mark as paid'}
                </button>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
