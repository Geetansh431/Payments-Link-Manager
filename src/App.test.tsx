import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './App.tsx';
import { createLocalRepository } from './data/localRepository.ts';
import { DATA_ERRORS } from './data/repository.ts';
import type { LinksRepository } from './data/repository.ts';
import type { PaymentLink } from './domain/types.ts';

/** Storage that already holds the given links (so the sample data isn't used). */
function storageWith(links: PaymentLink[]): Storage {
  return { getItem: () => JSON.stringify(links), setItem: () => {} } as unknown as Storage;
}

/** Renders the app and waits for the list to finish loading. */
async function renderApp(repository: LinksRepository = createLocalRepository()) {
  const user = userEvent.setup();
  render(<App repository={repository} />);
  await screen.findByRole('group', { name: 'Filter by status' });
  return user;
}

const list = () => screen.getByRole('list', { name: 'Payment links' });
const filterButton = (name: RegExp) => screen.getByRole('button', { name });

describe('App', () => {
  it('shows a loading message, then the links with a count on each filter', async () => {
    render(<App repository={createLocalRepository()} />);
    expect(screen.getByText('Loading payment links…')).toBeInTheDocument();

    expect(await screen.findByRole('list', { name: 'Payment links' })).toBeInTheDocument();
    expect(within(list()).getAllByRole('listitem')).toHaveLength(4);
    expect(filterButton(/^All \(4\)/)).toHaveAttribute('aria-pressed', 'true');
    expect(filterButton(/^Active \(2\)/)).toBeInTheDocument();
    expect(filterButton(/^Paid \(1\)/)).toBeInTheDocument();
    expect(filterButton(/^Expired \(1\)/)).toBeInTheDocument();
  });

  it('filters the list by status and remembers it in the URL', async () => {
    const user = await renderApp();

    await user.click(filterButton(/^Paid/));

    const items = within(list()).getAllByRole('listitem');
    expect(items).toHaveLength(1);
    expect(items[0]).toHaveTextContent('Yoga classes: November');
    expect(window.location.search).toBe('?status=Paid');
  });

  it('adds a created link to the top of the list and updates the counts', async () => {
    const user = await renderApp();

    await user.type(screen.getByLabelText('Amount (₹)'), '750');
    await user.type(screen.getByLabelText('Description'), 'Guitar lesson');
    await user.type(screen.getByLabelText('Email'), 'neha@example.com');
    await user.click(screen.getByRole('button', { name: /create payment link/i }));

    expect(await screen.findByText('Payment link created')).toBeInTheDocument();
    const first = within(list()).getAllByRole('listitem')[0];
    expect(first).toHaveTextContent('Guitar lesson');
    expect(first).toHaveTextContent('₹750.00');
    expect(first).toHaveTextContent('Active');
    expect(filterButton(/^All \(5\)/)).toBeInTheDocument();
  });

  it('marks an Active link as paid', async () => {
    const user = await renderApp();

    await user.click(
      screen.getByRole('button', { name: 'Mark as paid: Bulk order: 40 notebooks' }),
    );

    expect(
      await screen.findByText('Marked “Bulk order: 40 notebooks” as paid.'),
    ).toBeInTheDocument();
    expect(filterButton(/^Paid \(2\)/)).toBeInTheDocument();
  });

  it('shows an empty state when there are no links', async () => {
    await renderApp(createLocalRepository({ storage: storageWith([]) }));

    expect(screen.getByText('No payment links yet')).toBeInTheDocument();
  });

  it('shows a filter-specific empty state with a way back to all links', async () => {
    const active: PaymentLink = {
      id: 'a',
      amountPaise: 100,
      description: 'Only active',
      email: 'a@b.co',
      phone: null,
      createdAt: new Date().toISOString(),
      expiresAt: null,
      paidAt: null,
    };
    const user = await renderApp(createLocalRepository({ storage: storageWith([active]) }));

    await user.click(filterButton(/^Paid/));
    expect(screen.getByText('No paid links')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Show all links' }));
    expect(within(list()).getAllByRole('listitem')).toHaveLength(1);
  });

  it('shows an error with a retry button when loading fails', async () => {
    const listLinks = vi
      .fn<LinksRepository['list']>()
      .mockRejectedValueOnce(new Error(DATA_ERRORS.load))
      .mockResolvedValueOnce([]);
    const user = userEvent.setup();
    render(<App repository={{ list: listLinks, create: vi.fn(), markPaid: vi.fn() }} />);

    expect(await screen.findByRole('alert')).toHaveTextContent(DATA_ERRORS.load);
    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByText('No payment links yet')).toBeInTheDocument();
  });
});
