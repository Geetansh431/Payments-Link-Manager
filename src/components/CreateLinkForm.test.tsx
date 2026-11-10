import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { NewLink, PaymentLink } from '../domain/types.ts';
import { MESSAGES } from '../domain/validation.ts';
import { CreateLinkForm } from './CreateLinkForm.tsx';

/** Turns submitted data into a saved link, like the repository would. */
function savedLink(data: NewLink): PaymentLink {
  return {
    ...data,
    id: 'new-1',
    createdAt: new Date().toISOString(),
    amountPaidPaise: 0,
    paidAt: null,
  };
}

/** Renders the form with a create function the test can control. */
function setup(onCreate = vi.fn(async (data: NewLink) => savedLink(data))) {
  const user = userEvent.setup();
  render(<CreateLinkForm now={new Date()} onCreate={onCreate} />);
  return { user, onCreate };
}

const amountInput = () => screen.getByLabelText('Amount (₹)');
const descriptionInput = () => screen.getByLabelText('Description');
const emailInput = () => screen.getByLabelText('Email');
const phoneInput = () => screen.getByLabelText('Phone');
const submitButton = () => screen.getByRole('button', { name: /create payment link/i });

describe('CreateLinkForm', () => {
  it('shows every error and focuses the first invalid field when submitted empty', async () => {
    const { user, onCreate } = setup();

    await user.click(submitButton());

    expect(amountInput()).toHaveAccessibleDescription(
      expect.stringContaining(MESSAGES.amount.required),
    );
    expect(amountInput()).toHaveAttribute('aria-invalid', 'true');
    expect(descriptionInput()).toHaveAccessibleDescription(
      expect.stringContaining(MESSAGES.description.required),
    );
    expect(emailInput()).toHaveAccessibleDescription(
      expect.stringContaining(MESSAGES.customer.required),
    );
    expect(amountInput()).toHaveFocus();
    expect(onCreate).not.toHaveBeenCalled();
  });

  it('focuses the email field when only the customer is missing', async () => {
    const { user } = setup();
    await user.type(amountInput(), '100');
    await user.type(descriptionInput(), 'Tuition fee');

    await user.click(submitButton());

    expect(emailInput()).toHaveFocus();
    expect(screen.getByText(MESSAGES.customer.required)).toBeInTheDocument();
  });

  it('clears a field’s error as soon as the user edits it', async () => {
    const { user } = setup();
    await user.click(submitButton());

    await user.type(amountInput(), '5');

    expect(amountInput()).not.toHaveAttribute('aria-invalid');
    expect(screen.queryByText(MESSAGES.amount.required)).not.toBeInTheDocument();
    expect(screen.getByText(MESSAGES.description.required)).toBeInTheDocument();
  });

  it('shows the phone error for an invalid number', async () => {
    const { user } = setup();
    await user.type(amountInput(), '100');
    await user.type(descriptionInput(), 'Tuition fee');
    await user.type(phoneInput(), '12345');

    await user.click(submitButton());

    expect(phoneInput()).toHaveFocus();
    expect(phoneInput()).toHaveAccessibleDescription(
      expect.stringContaining(MESSAGES.phone.invalid),
    );
  });

  it('submits cleaned data, clears the form and shows the new link', async () => {
    const { user, onCreate } = setup();
    await user.type(amountInput(), '1,499.50');
    await user.type(descriptionInput(), '  Logo design  ');
    await user.type(phoneInput(), '98765 43210');

    await user.click(submitButton());

    expect(onCreate).toHaveBeenCalledWith({
      amountPaise: 149_950,
      description: 'Logo design',
      email: null,
      phone: '+919876543210',
      expiresAt: null,
      allowPartial: false,
      minFirstPaymentPaise: null,
    });
    expect(await screen.findByText('Payment link created')).toBeInTheDocument();
    expect(screen.getByText('https://pay.example.com/l/new-1')).toBeInTheDocument();
    expect(amountInput()).toHaveValue('');
    expect(descriptionInput()).toHaveValue('');
  });

  it('shows "Creating…" while saving and keeps the values when saving fails', async () => {
    let rejectCreate: (error: Error) => void = () => {};
    const onCreate = vi.fn(() => new Promise<PaymentLink>((_, reject) => (rejectCreate = reject)));
    const { user } = setup(onCreate);
    await user.type(amountInput(), '250');
    await user.type(descriptionInput(), 'Workshop seat');
    await user.type(emailInput(), 'sam@example.com');

    await user.click(submitButton());
    expect(screen.getByRole('button', { name: 'Creating…' })).toBeDisabled();

    rejectCreate(new Error('Server unavailable'));

    expect(await screen.findByRole('alert')).toHaveTextContent('Server unavailable');
    expect(amountInput()).toHaveValue('250');
    expect(emailInput()).toHaveValue('sam@example.com');
    expect(submitButton()).toBeEnabled();
  });

  it('asks for a minimum first payment only when partial payments are allowed', async () => {
    const { user, onCreate } = setup();
    expect(screen.queryByLabelText('Minimum first payment (₹)')).not.toBeInTheDocument();

    await user.type(amountInput(), '1000');
    await user.type(descriptionInput(), 'Course fee');
    await user.type(emailInput(), 'a@b.co');
    await user.click(screen.getByLabelText('Allow partial payments'));
    await user.click(submitButton());

    const minimum = screen.getByLabelText('Minimum first payment (₹)');
    expect(minimum).toHaveFocus();
    expect(minimum).toHaveAccessibleDescription(
      expect.stringContaining(MESSAGES.minFirstPayment.required),
    );

    await user.type(minimum, '1200');
    await user.click(submitButton());
    expect(screen.getByText(MESSAGES.minFirstPayment.max)).toBeInTheDocument();

    await user.clear(minimum);
    await user.type(minimum, '250');
    await user.click(submitButton());
    expect(onCreate).toHaveBeenCalledWith(
      expect.objectContaining({ allowPartial: true, minFirstPaymentPaise: 25_000 }),
    );
  });

  it('marks email and phone invalid when neither is given', async () => {
    const { user } = setup();
    await user.click(submitButton());

    expect(emailInput()).toHaveAttribute('aria-invalid', 'true');
    expect(phoneInput()).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('group', { name: 'Customer' })).toHaveAccessibleDescription(
      MESSAGES.customer.required,
    );
  });
});
