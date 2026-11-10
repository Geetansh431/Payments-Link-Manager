import type { StatusFilter as Filter, PaymentLink } from '../domain/types.ts';
import type { LoadState } from '../hooks/usePaymentLinks.ts';
import { LinksList } from './LinksList.tsx';

type LinksPanelProps = {
  loadState: LoadState;
  loadError: string | null;
  /** Every link, before filtering. */
  allLinks: PaymentLink[];
  /** The links that match the selected filter. */
  visibleLinks: PaymentLink[];
  filter: Filter;
  now: Date;
  pendingId: string | null;
  onRetry: () => void;
  onShowAll: () => void;
  onMarkPaid: (link: PaymentLink) => void;
};

/**
 * Shows the right thing for the list area: loading text, an error with "Try again",
 * an empty state (no links at all, or none for the selected filter), or the list.
 */
export function LinksPanel(props: LinksPanelProps) {
  const { loadState, loadError, allLinks, visibleLinks, filter } = props;

  if (loadState === 'loading') {
    return (
      <p role="status" className="state">
        Loading payment links…
      </p>
    );
  }

  if (loadState === 'error') {
    return (
      <div role="alert" className="state state--error">
        <p>{loadError}</p>
        <button type="button" className="button button--secondary" onClick={props.onRetry}>
          Try again
        </button>
      </div>
    );
  }

  if (allLinks.length === 0) {
    return (
      <div className="state">
        <p className="state__title">No payment links yet</p>
        <p>Create your first link with the form to get started.</p>
      </div>
    );
  }

  if (visibleLinks.length === 0) {
    return (
      <div className="state">
        <p className="state__title">No {filter.toLowerCase()} links</p>
        <button type="button" className="button button--secondary" onClick={props.onShowAll}>
          Show all links
        </button>
      </div>
    );
  }

  return (
    <LinksList
      links={visibleLinks}
      now={props.now}
      pendingId={props.pendingId}
      onMarkPaid={props.onMarkPaid}
    />
  );
}
