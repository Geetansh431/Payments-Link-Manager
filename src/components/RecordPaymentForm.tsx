import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { formatPaise, toAmountInput } from '../domain/money.ts';
import { amountDue, validatePayment } from '../domain/payments.ts';
import type { PaymentLink } from '../domain/types.ts';
import { toErrorMessage } from '../hooks/usePaymentLinks.ts';
import { TextField } from './TextField.tsx';

type RecordPaymentFormProps = {
  link: PaymentLink;
  /** Saves the payment. Should throw with a user-facing message on failure. */
  onSave: (amountPaise: number) => Promise<void>;
  onCancel: () => void;
};

/**
 * Explains what can be paid, shown under the amount field.
 *
 * @param link - The link being paid.
 * @returns e.g. "Due ₹700.00" or "Due ₹1,000.00. First payment at least ₹300.00".
 */
function paymentHint(link: PaymentLink): string {
  const due = `Due ${formatPaise(amountDue(link))}`;
  if (!link.allowPartial) return `${due}. Must be paid in full`;
  if (link.amountPaidPaise === 0 && link.minFirstPaymentPaise !== null) {
    return `${due}. First payment at least ${formatPaise(link.minFirstPaymentPaise)}`;
  }
  return due;
}

/**
 * A small inline form to record a payment received for a link. The amount starts as the
 * full amount due. Focus moves into the amount field when the form opens. While saving
 * the button shows "Saving…"; a failure is shown as an alert and the form stays open.
 */
export function RecordPaymentForm({ link, onSave, onCancel }: RecordPaymentFormProps) {
  const [amount, setAmount] = useState(() => toAmountInput(amountDue(link)));
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const fieldId = `payment-${link.id}`;

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  /** Checks the amount and, if it's allowed, saves the payment. */
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSaving) return;
    setSaveError(null);

    const result = validatePayment(link, amount);
    if (!result.ok) {
      setError(result.error);
      inputRef.current?.focus();
      return;
    }

    setIsSaving(true);
    try {
      await onSave(result.value);
    } catch (caught) {
      setSaveError(toErrorMessage(caught));
      setIsSaving(false);
    }
  }

  return (
    <form
      className="payment-form"
      onSubmit={handleSubmit}
      noValidate
      aria-label={`Record payment for ${link.description}`}
    >
      <TextField
        ref={inputRef}
        id={fieldId}
        label="Amount received (₹)"
        hint={paymentHint(link)}
        inputMode="decimal"
        autoComplete="off"
        value={amount}
        onChange={(value) => {
          setAmount(value);
          setError(null);
        }}
        error={error ?? undefined}
      />
      {saveError && (
        <p role="alert" className="message message--error">
          {saveError}
        </p>
      )}
      <div className="payment-form__actions">
        <button type="submit" className="button button--primary-small" disabled={isSaving}>
          {isSaving ? 'Saving…' : 'Save payment'}
        </button>
        <button type="button" className="button button--secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
