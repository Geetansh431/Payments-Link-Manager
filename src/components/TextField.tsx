import type { InputHTMLAttributes } from 'react';

type TextFieldProps = {
  /** The input's id; also used to build the hint and error ids. */
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** Helper text shown under the label. */
  hint?: string | undefined;
  /** Error message; when set, the field is marked invalid. */
  error?: string | undefined;
  /** Extra ids to describe the field, e.g. a group error. */
  describedBy?: string | undefined;
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'value' | 'onChange'>;

/**
 * A labelled text input with optional hint and error message. The hint and error are
 * linked to the input so screen readers read them, and an error marks it invalid.
 */
export function TextField({
  id,
  label,
  value,
  onChange,
  hint,
  error,
  describedBy,
  ...inputProps
}: TextFieldProps) {
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const descriptionIds = [hint ? hintId : '', error ? errorId : '', describedBy ?? '']
    .filter((item) => item !== '')
    .join(' ');

  return (
    <div className="field">
      <label htmlFor={id} className="field__label">
        {label}
      </label>
      {hint && (
        <p id={hintId} className="field__hint">
          {hint}
        </p>
      )}
      <input
        {...inputProps}
        id={id}
        className="field__input"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={descriptionIds || undefined}
      />
      {error && (
        <p id={errorId} className="field__error">
          {error}
        </p>
      )}
    </div>
  );
}
