/** Single source of user-facing validation messages. Tests import these; never copy strings. */
export const MESSAGES = {
  amount: {
    required: 'Enter an amount',
    invalid: 'Enter a valid amount, e.g. 1499 or 1499.50',
    decimals: 'Amount can have at most 2 decimal places',
    min: 'Amount must be more than ₹0',
    max: "Amount can't be more than ₹5,00,000",
  },
  description: {
    required: 'Enter a description',
    max: 'Description must be 100 characters or fewer',
  },
  customer: {
    required: 'Enter a customer email or phone number',
  },
  email: {
    invalid: 'Enter a valid email, e.g. name@example.com',
  },
  phone: {
    invalid: 'Enter a valid 10-digit Indian mobile number',
  },
  expiresAt: {
    past: 'Expiry must be in the future',
    invalid: 'Enter a valid date and time',
  },
} as const;
