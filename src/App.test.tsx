import { render, screen, waitFor, waitForElementToBeRemoved, within } from '@testing-library/react';
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

/** Renders the app and waits until the loading message is gone. */
async function renderApp(repository: LinksRepository = createLocalRepository()) {
  const user = userEvent.setup();
  render(<App repository={repository} />);
  await waitForElementToBeRemoved(() => screen.queryByText('Loading payment links…'));
  return user;
}

const list = () => screen.getByRole('list', { name: 'Payment links' });
const cards = () => within(list()).getAllByRole('listitem');
const card = (text: string) => cards().find((item) => item.textContent?.includes(text));
const filterButton = (name: RegExp) => screen.getByRole('button', { name });

const activeOnly: PaymentLink = {
  id: 'a',
  amountPaise: 100,
  description: 'Only active',
  email: 'a@b.co',
  phone: null,
  createdAt: new Date().toISOString(),
  expiresAt: null,
  allowPartial: false,
  minFirstPaymentPaise: null,
  amountPaidPaise: 0,
  paidAt: null,
};

describe('App', () => {
  it('shows a loading message, then the links with a count on each filter', async () => {
    render(<App repository={createLocalRepository()} />);
    expect(screen.getByText('Loading payment links…')).toBeInTheDocument();

    expect(await screen.findByRole('list', { name: 'Payment links' })).toBeInTheDocument();
    expect(cards()).toHaveLength(5);
    expect(filterButton(/^All \(5\)/)).toHaveAttribute('aria-pressed', 'true');
    expect(filterButton(/^Active \(2\)/)).toBeInTheDocument();
    expect(filterButton(/^Partially paid \(1\)/)).toBeInTheDocument();
    expect(filterButton(/^Paid \(1\)/)).toBeInTheDocument();
    expect(filterButton(/^Expired \(1\)/)).toBeInTheDocument();
  });

  it('shows paid and due on every link', async () => {
    await renderApp();

    expect(card('Sofa repair')).toHaveTextContent('Paid ₹4,000.00 · Due ₹8,000.00');
    expect(card('Yoga classes')).toHaveTextContent('Paid ₹1,500.00 · Due ₹0.00');
  });

  it('filters the list by status and remembers it in the URL', async () => {
    const user = await renderApp();

    await user.click(filterButton(/^Partially paid/));

    expect(cards()).toHaveLength(1);
    expect(cards()[0]).toHaveTextContent('Sofa repair: 3 instalments');
    expect(new URLSearchParams(window.location.search).get('status')).toBe('Partially paid');
  });

  it('creates a link that allows partial payments', async () => {
    const user = await renderApp();

    await user.type(screen.getByLabelText('Amount (₹)'), '1000');
    await user.type(screen.getByLabelText('Description'), 'Guitar course');
    await user.type(screen.getByLabelText('Email'), 'neha@example.com');
    await user.click(screen.getByLabelText('Allow partial payments'));
    await user.type(screen.getByLabelText('Minimum first payment (₹)'), '250');
    await user.click(screen.getByRole('button', { name: /create payment link/i }));

    expect(await screen.findByText('Payment link created')).toBeInTheDocument();
    expect(cards()[0]).toHaveTextContent('Guitar course');
    expect(cards()[0]).toHaveTextContent('min. first ₹250.00');
    expect(cards()[0]).toHaveTextContent('Active');
    expect(filterButton(/^All \(6\)/)).toBeInTheDocument();
  });

  it('records a first part payment, then the rest, moving the link to Paid', async () => {
    const user = await renderApp();
    const recordButton = () =>
      screen.getByRole('button', { name: 'Record payment: Website design: 50% deposit' });

    await user.click(recordButton());
    const amount = screen.getByLabelText('Amount received (₹)');
    expect(amount).toHaveFocus();
    expect(amount).toHaveValue('24999.00');
    await user.clear(amount);
    await user.type(amount, '5000');
    await user.click(screen.getByRole('button', { name: 'Save payment' }));

    expect(
      await screen.findByText(
        'Recorded ₹5,000.00 for “Website design: 50% deposit”. ₹19,999.00 still due.',
      ),
    ).toBeInTheDocument();
    expect(card('Website design')).toHaveTextContent('Partially paid');
    await waitFor(() => expect(recordButton()).toHaveFocus());

    await user.click(recordButton());
    await user.click(screen.getByRole('button', { name: 'Save payment' }));

    expect(await screen.findByText(/It is now fully paid\./)).toBeInTheDocument();
    expect(card('Website design')).toHaveTextContent('Paid ₹24,999.00 · Due ₹0.00');
    expect(
      screen.queryByRole('button', { name: 'Record payment: Website design: 50% deposit' }),
    ).not.toBeInTheDocument();
    // The button is gone, so focus moves to the link's title instead of the page body.
    await waitFor(() => expect(screen.getByText('Website design: 50% deposit')).toHaveFocus());
  });

  it('shows the rule when a payment is not allowed and keeps the form open', async () => {
    const user = await renderApp();

    await user.click(
      screen.getByRole('button', { name: 'Record payment: Website design: 50% deposit' }),
    );
    const amount = screen.getByLabelText('Amount received (₹)');
    await user.clear(amount);
    await user.type(amount, '100');
    await user.click(screen.getByRole('button', { name: 'Save payment' }));

    expect(amount).toHaveAccessibleDescription(
      expect.stringContaining('The first payment must be at least ₹5,000.00'),
    );
    expect(amount).toHaveFocus();
  });

  it('puts focus back on "Record payment" when the form is cancelled', async () => {
    const user = await renderApp();
    const recordButton = screen.getByRole('button', {
      name: 'Record payment: Bulk order: 40 notebooks',
    });

    await user.click(recordButton);
    expect(recordButton).toHaveAttribute('aria-expanded', 'true');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByLabelText('Amount received (₹)')).not.toBeInTheDocument();
    await waitFor(() => expect(recordButton).toHaveFocus());
  });

  it('shows an empty state when there are no links', async () => {
    await renderApp(createLocalRepository({ storage: storageWith([]) }));

    expect(screen.getByText('No payment links yet')).toBeInTheDocument();
  });

  it('shows a filter-specific empty state with a way back to all links', async () => {
    const user = await renderApp(createLocalRepository({ storage: storageWith([activeOnly]) }));

    await user.click(filterButton(/^Paid/));
    expect(screen.getByText('No paid links')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Show all links' }));
    expect(cards()).toHaveLength(1);
  });

  it('shows an error with a retry button when loading fails', async () => {
    const listLinks = vi
      .fn<LinksRepository['list']>()
      .mockRejectedValueOnce(new Error(DATA_ERRORS.load))
      .mockResolvedValueOnce([]);
    const user = userEvent.setup();
    render(<App repository={{ list: listLinks, create: vi.fn(), recordPayment: vi.fn() }} />);

    expect(await screen.findByRole('alert')).toHaveTextContent(DATA_ERRORS.load);
    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByText('No payment links yet')).toBeInTheDocument();
  });
});
