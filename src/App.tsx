import { useState } from 'react';
import { CreateLinkForm } from './components/CreateLinkForm.tsx';
import { LinksPanel } from './components/LinksPanel.tsx';
import { StatusFilter } from './components/StatusFilter.tsx';
import { createAppRepository } from './data/appRepository.ts';
import type { LinksRepository } from './data/repository.ts';
import { countByStatus, matchesFilter } from './domain/status.ts';
import type { PaymentLink } from './domain/types.ts';
import { useNow } from './hooks/useNow.ts';
import { toErrorMessage, usePaymentLinks } from './hooks/usePaymentLinks.ts';
import { useStatusFilter } from './hooks/useStatusFilter.ts';

type AppProps = {
  /** Where links are stored. Default: the browser-backed mock set up from `?mock=`. */
  repository?: LinksRepository;
};

/**
 * The Payment Links page: the create form on one side and the filterable list on the other.
 */
export function App({ repository }: AppProps) {
  const [repo] = useState(() => repository ?? createAppRepository());
  const { links, loadState, loadError, reload, createLink, markPaid } = usePaymentLinks(repo);
  const now = useNow();
  const [filter, setFilter] = useStatusFilter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [notice, setNotice] = useState('');

  const counts = countByStatus(links, now);
  const visibleLinks = links.filter((link) => matchesFilter(link, filter, now));

  /** Marks a link as paid and announces the result. */
  async function handleMarkPaid(link: PaymentLink) {
    setPendingId(link.id);
    try {
      await markPaid(link.id);
      setNotice(`Marked “${link.description}” as paid.`);
    } catch (error) {
      setNotice(toErrorMessage(error));
    } finally {
      setPendingId(null);
    }
  }

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="app-header">
        <h1>Payment Links</h1>
        <p className="app-header__subtitle">
          Create payment links and track whether they’ve been paid.
        </p>
      </header>

      <main id="main" className="app-main" tabIndex={-1}>
        <section className="panel panel--form" aria-labelledby="create-heading">
          <h2 id="create-heading">Create a payment link</h2>
          <CreateLinkForm now={now} onCreate={createLink} />
        </section>

        <section className="panel panel--list" aria-labelledby="links-heading">
          <h2 id="links-heading">Your payment links</h2>
          <StatusFilter value={filter} counts={counts} onChange={setFilter} />
          <p role="status" className="notice">
            {notice}
          </p>
          <LinksPanel
            loadState={loadState}
            loadError={loadError}
            allLinks={links}
            visibleLinks={visibleLinks}
            filter={filter}
            now={now}
            pendingId={pendingId}
            onRetry={reload}
            onShowAll={() => setFilter('All')}
            onMarkPaid={handleMarkPaid}
          />
        </section>
      </main>
    </>
  );
}
