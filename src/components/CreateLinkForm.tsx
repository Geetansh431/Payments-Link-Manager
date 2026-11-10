import { useState } from 'react';
import type { FormEvent } from 'react';
import { toDateTimeLocal } from '../domain/dates.ts';
import { formatPaise } from '../domain/money.ts';
import type {
  CreateLinkInput,
  FormField,
  NewLink,
  PaymentLink,
  ValidationErrors,
} from '../domain/types.ts';
import { paymentUrl } from '../domain/url.ts';
import {
  MAX_DESCRIPTION_LENGTH,
  countCharacters,
  validateCreateLink,
} from '../domain/validation.ts';
import { toErrorMessage } from '../hooks/usePaymentLinks.ts';
import { CopyButton } from './CopyButton.tsx';
import { TextField } from './TextField.tsx';

type CreateLinkFormProps = {
  /** The current time, used as the earliest selectable expiry. */
  now: Date;
  /** Saves the link. Should throw with a user-facing message on failure. */
  onCreate: (data: NewLink) => Promise<PaymentLink>;
};

const EMPTY_FORM: CreateLinkInput = {
  amount: '',
  description: '',
  email: '',
  phone: '',
  expiresAt: '',
};

/** The input that gets focus for each error, in the order they appear on screen. */
const FOCUS_ORDER: [FormField, string][] = [
  ['amount', 'link-amount'],
  ['description', 'link-description'],
  ['customer', 'link-email'],
  ['email', 'link-email'],
  ['phone', 'link-phone'],
  ['expiresAt', 'link-expiry'],
];

/**
 * Moves keyboard focus to the first field that has an error.
 *
 * @param errors - The current validation errors.
 */
function focusFirstError(errors: ValidationErrors) {
  const first = FOCUS_ORDER.find(([field]) => errors[field]);
  if (first) document.getElementById(first[1])?.focus();
}

/**
 * Returns a copy of the errors without the given fields.
 *
 * @param errors - The current validation errors.
 * @param fields - The fields whose errors should be cleared.
 */
function clearErrors(errors: ValidationErrors, fields: FormField[]): ValidationErrors {
  const entries = Object.entries(errors).filter(([field]) => !fields.includes(field as FormField));
  return Object.fromEntries(entries);
}

/**
 * The "create a payment link" form.
 *
 * Validates everything on submit, shows each error under its field and moves focus to
 * the first one. While saving, the button shows "Creating…". On success the form is
 * cleared and the new link is shown with a copy button; on failure the typed values are
 * kept so the user can try again.
 */
export function CreateLinkForm({ now, onCreate }: CreateLinkFormProps) {
  const [values, setValues] = useState<CreateLinkInput>(EMPTY_FORM);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createdLink, setCreatedLink] = useState<PaymentLink | null>(null);

  /**
   * Updates one field and clears its error (and the "email or phone" error when a
   * contact field changes).
   */
  function updateField(field: keyof CreateLinkInput, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    const isContact = field === 'email' || field === 'phone';
    setErrors((current) => clearErrors(current, isContact ? [field, 'customer'] : [field]));
  }

  /** Validates the form and, if everything is valid, saves the link. */
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;
    setSubmitError(null);
    setCreatedLink(null);

    const result = validateCreateLink(values, new Date());
    if (!result.ok) {
      setErrors(result.error);
      focusFirstError(result.error);
      return;
    }

    setIsSubmitting(true);
    try {
      const link = await onCreate(result.value);
      setValues(EMPTY_FORM);
      setErrors({});
      setCreatedLink(link);
    } catch (error) {
      setSubmitError(toErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  const descriptionLength = countCharacters(values.description.trim());

  return (
    <form className="create-form" onSubmit={handleSubmit} noValidate>
      <TextField
        id="link-amount"
        label="Amount (₹)"
        hint="Up to ₹5,00,000, with at most 2 decimal places"
        inputMode="decimal"
        autoComplete="off"
        value={values.amount}
        onChange={(value) => updateField('amount', value)}
        error={errors.amount}
      />

      <TextField
        id="link-description"
        label="Description"
        hint={`What the payment is for (${descriptionLength}/${MAX_DESCRIPTION_LENGTH} characters)`}
        autoComplete="off"
        value={values.description}
        onChange={(value) => updateField('description', value)}
        error={errors.description}
      />

      <fieldset className="fieldset">
        <legend className="field__label">Customer</legend>
        <p id="customer-hint" className="field__hint">
          Enter an email, a phone number, or both
        </p>
        {errors.customer && (
          <p id="customer-error" className="field__error">
            {errors.customer}
          </p>
        )}
        <TextField
          id="link-email"
          label="Email"
          type="email"
          autoComplete="email"
          value={values.email}
          onChange={(value) => updateField('email', value)}
          error={errors.email}
          describedBy={errors.customer ? 'customer-hint customer-error' : 'customer-hint'}
        />
        <TextField
          id="link-phone"
          label="Phone"
          type="tel"
          hint="10-digit Indian mobile number"
          autoComplete="tel"
          value={values.phone}
          onChange={(value) => updateField('phone', value)}
          error={errors.phone}
          describedBy={errors.customer ? 'customer-error' : undefined}
        />
      </fieldset>

      <TextField
        id="link-expiry"
        label="Expiry (optional)"
        hint="Leave empty for a link that never expires"
        type="datetime-local"
        min={toDateTimeLocal(now)}
        value={values.expiresAt}
        onChange={(value) => updateField('expiresAt', value)}
        error={errors.expiresAt}
      />

      {submitError && (
        <p role="alert" className="message message--error">
          {submitError}
        </p>
      )}

      <button type="submit" className="button button--primary" disabled={isSubmitting}>
        {isSubmitting ? 'Creating…' : 'Create payment link'}
      </button>

      <div role="status" className="create-form__status">
        {createdLink && (
          <div className="message message--success">
            <p>
              <strong>Payment link created</strong> for {formatPaise(createdLink.amountPaise)}.
            </p>
            <p className="message__url">{paymentUrl(createdLink.id)}</p>
            <CopyButton text={paymentUrl(createdLink.id)} itemName={createdLink.description} />
          </div>
        )}
      </div>
    </form>
  );
}
