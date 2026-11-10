---
name: payment-link-domain
description: Business rules and edge-case matrix for payment links (amount in paise, description, email/phone, expiry, status derivation). Use before editing src/domain/, validation messages, status logic, or writing tests for them.
---

# Payment link domain rules

Together with the domain rules in `AGENTS.md`, this skill is the source of truth, written as testable cases.
Every row below must exist as a test case (`it.each`) in the matching `*.test.ts`.

## Error messages (export these constants from `src/domain/validation.ts`)

| Key                    | Message                                     |
| ---------------------- | ------------------------------------------- |
| `amount.required`      | Enter an amount                             |
| `amount.invalid`       | Enter a valid amount, e.g. 1499 or 1499.50  |
| `amount.decimals`      | Amount can have at most 2 decimal places    |
| `amount.min`           | Amount must be more than ₹0                 |
| `amount.max`           | Amount can't be more than ₹5,00,000         |
| `description.required` | Enter a description                         |
| `description.max`      | Description must be 100 characters or fewer |
| `customer.required`    | Enter a customer email or phone number      |
| `email.invalid`        | Enter a valid email, e.g. name@example.com  |
| `phone.invalid`        | Enter a valid 10-digit Indian mobile number |
| `expiry.past`          | Expiry must be in the future                |
| `expiry.invalid`       | Enter a valid date and time                 |

## Amount — `parseAmountToPaise(raw: string)`

| Input                                                 | Result                    |
| ----------------------------------------------------- | ------------------------- |
| `""`, `"   "`                                         | `amount.required`         |
| `"0"`, `"0.00"`                                       | `amount.min`              |
| `"0.01"`                                              | 1                         |
| `"1499"`                                              | 149900                    |
| `"1499.5"`                                            | 149950                    |
| `"1,00,000"`, `" 100000 "`                            | 10000000                  |
| `"500000"`, `"5,00,000.00"`                           | 50000000 (max, inclusive) |
| `"500000.01"`                                         | `amount.max`              |
| `"10.999"`                                            | `amount.decimals`         |
| `"-5"`, `"1e3"`, `"₹100"`, `"12.3.4"`, `"abc"`, `"."` | `amount.invalid`          |
| `"007"`                                               | 700                       |

Implementation: strip `,` and spaces → regex `^\d+(\.\d+)?$` → split on `.` → build paise
from integer + right-padded fraction strings. **No `parseFloat` × 100** (`1.005*100` bug).
`formatPaise(149950)` → `"₹1,499.50"`; `formatPaise(50000000)` → `"₹5,00,000.00"`.

## Description

Trim first. Count graphemes with `new Intl.Segmenter('en', { granularity: 'grapheme' })`.
`""`/whitespace → required; 100 chars ok; 101 → max; 100 emoji ok (each = 1 grapheme).

## Customer

- Both empty → `customer.required` (shown on a group-level error tied to the fieldset).
- Email: trim, lowercase domain is fine; valid: `a@b.co`, `first.last+tag@sub.example.in`;
  invalid: `a@b`, `a b@c.com`, `@b.com`, `a@.com`, `a@@b.com`, >254 chars.
- Phone: strip spaces, `-`, `(`, `)`. Then accept `^(?:\+91|91|0)?([6-9]\d{9})$` →
  normalise to `+91` + 10 digits. Valid: `9876543210`, `+91 98765 43210`, `098765-43210`;
  invalid: `5876543210`, `987654321`, `98765432100`, `+1 9876543210`.
- One valid + other non-empty invalid → error on the invalid field.

## Expiry — `validateExpiry(raw: string, now: Date)`

- `""` → valid, `expiresAt: null` (never expires).
- Parse `datetime-local` (`YYYY-MM-DDTHH:mm`) as local time → store `toISOString()`.
- `<= now` → `expiry.past`. Exactly `now + 1 minute` → valid. Unparseable → `expiry.invalid`.
- Re-validate on submit with a fresh `now`.

## Status — `deriveStatus(link, now)`

| paidAt | expiresAt       | Result                                |
| ------ | --------------- | ------------------------------------- |
| set    | any (even past) | `Paid`                                |
| null   | null            | `Active`                              |
| null   | > now           | `Active`                              |
| null   | <= now          | `Expired` (boundary: equal ⇒ Expired) |

`markPaid` is allowed only when derived status is `Active`; otherwise the repository rejects.

## Data shape

```ts
type PaymentLink = {
  id: string; // crypto.randomUUID()
  amountPaise: number;
  description: string;
  email: string | null;
  phone: string | null; // +91XXXXXXXXXX
  createdAt: string; // ISO UTC
  expiresAt: string | null;
  paidAt: string | null;
};
```

List order: `createdAt` desc. Filter counts are computed from derived status at the same `now`.
