---
name: payment-link-domain
description: Business rules and edge-case matrix for payment links (amount in paise, description, email/phone, expiry, partial payments, recording payments, status derivation, stored data shape and migration). Use before editing src/domain/, src/data/, validation messages, status logic, or writing tests for them.
---

# Payment link domain rules

Together with the domain rules in `AGENTS.md`, this skill is the source of truth, written as testable cases.
Every row below must exist as a test case (`it.each`) in the matching `*.test.ts`.

## Error messages (export these constants from `src/domain/messages.ts`)

| Key                        | Message                                             |
| -------------------------- | --------------------------------------------------- |
| `amount.required`          | Enter an amount                                     |
| `amount.invalid`           | Enter a valid amount, e.g. 1499 or 1499.50          |
| `amount.decimals`          | Amount can have at most 2 decimal places            |
| `amount.min`               | Amount must be more than ₹0                         |
| `amount.max`               | Amount can't be more than ₹5,00,000                 |
| `description.required`     | Enter a description                                 |
| `description.max`          | Description must be 100 characters or fewer         |
| `customer.required`        | Enter a customer email or phone number              |
| `email.invalid`            | Enter a valid email, e.g. name@example.com          |
| `phone.invalid`            | Enter a valid 10-digit Indian mobile number         |
| `expiry.past`              | Expiry must be in the future                        |
| `expiry.invalid`           | Enter a valid date and time                         |
| `minFirstPayment.required` | Enter a minimum first payment                       |
| `minFirstPayment.min`      | Minimum first payment must be more than ₹0          |
| `minFirstPayment.max`      | Minimum first payment can't be more than the amount |
| `payment.required`         | Enter the amount received                           |
| `payment.min`              | Payment must be more than ₹0                        |
| `payment.max`              | Payment can't be more than the amount due ({due})   |
| `payment.belowMinimum`     | The first payment must be at least {minimum}        |
| `payment.fullOnly`         | This link must be paid in full ({due})              |

`invalid` / `decimals` errors for `minFirstPayment` and `payment` reuse the amount parser's
messages (`amount.invalid`, `amount.decimals`).

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

Implementation: remove `,` and trim → split at the `.` with `indexOf`/`slice` → check both
parts are digits (`isDigits`) → paise = rupees × 100 + fraction padded to 2 digits.
**No `parseFloat` × 100** (`1.005*100` bug). No regex.
`formatPaise(149950)` → `"₹1,499.50"`; `formatPaise(50000000)` → `"₹5,00,000.00"`.

## Description

Trim first. Count graphemes with `new Intl.Segmenter('en', { granularity: 'grapheme' })`.
`""`/whitespace → required; 100 chars ok; 101 → max; 100 emoji ok (each = 1 grapheme).

## Customer

- Both empty → `customer.required` (shown on a group-level error tied to the fieldset).
- Email: trim, lowercase domain is fine; valid: `a@b.co`, `first.last+tag@sub.example.in`;
  invalid: `a@b`, `a b@c.com`, `@b.com`, `a@.com`, `a@@b.com`, >254 chars.
- Phone: remove spaces, `-`, `(`, `)`, `+`; must then be all digits. Drop a leading `91`
  (if 12 digits) or `0` (if 11 digits); the rest must be 10 digits starting 6–9 →
  normalise to `+91` + 10 digits. Valid: `9876543210`, `+91 98765 43210`, `098765-43210`;
  invalid: `5876543210`, `987654321`, `98765432100`, `+1 9876543210`.
- One valid + other non-empty invalid → error on the invalid field.

## Expiry — `validateExpiry(raw: string, now: Date)`

- `""` → valid, `expiresAt: null` (never expires).
- Parse `datetime-local` (`YYYY-MM-DDTHH:mm`) as local time → store `toISOString()`.
- `<= now` → `expiry.past`. Exactly `now + 1 minute` → valid. Unparseable → `expiry.invalid`.
- Re-validate on submit with a fresh `now`.

## Partial payments — create form (`validateCreateLink`)

Form input gains `allowPartial: boolean` and `minFirstPayment: string`.

| allowPartial | amount  | minFirstPayment | Result                                                      |
| ------------ | ------- | --------------- | ----------------------------------------------------------- |
| false        | any     | anything        | ignored → `allowPartial: false, minFirstPaymentPaise: null` |
| true         | `1000`  | `""`            | `minFirstPayment.required`                                  |
| true         | `1000`  | `"0"`           | `minFirstPayment.min`                                       |
| true         | `1000`  | `"0.01"`        | ok → 1                                                      |
| true         | `1000`  | `"1000"`        | ok → 100000 (equal to amount is allowed)                    |
| true         | `1000`  | `"1000.01"`     | `minFirstPayment.max`                                       |
| true         | `1000`  | `"10.999"`      | `amount.decimals`                                           |
| true         | `1000`  | `"abc"`         | `amount.invalid`                                            |
| true         | invalid | `"500"`         | only the amount error (can't compare against a bad amount)  |

## Recording a payment — `validatePayment(link, raw, now)`

`due = amountPaise - amountPaidPaise`. A link can take payments only while its status is
`Active` or `Partially paid` (not `Paid`, not `Expired`).

| Link state                               | Input       | Result                                             |
| ---------------------------------------- | ----------- | -------------------------------------------------- |
| any                                      | `""`        | `payment.required`                                 |
| any                                      | `"0"`       | `payment.min`                                      |
| any                                      | `"1.999"`   | `amount.decimals`                                  |
| Active, allowPartial false, amount ₹1000 | `"1000"`    | ok → 100000, link becomes Paid                     |
| Active, allowPartial false, amount ₹1000 | `"500"`     | `payment.fullOnly` (₹1,000.00)                     |
| Active, allowPartial true, min ₹300      | `"299.99"`  | `payment.belowMinimum` (₹300.00)                   |
| Active, allowPartial true, min ₹300      | `"300"`     | ok → Partially paid, due ₹700                      |
| Active, allowPartial true, min ₹300      | `"1000"`    | ok → Paid                                          |
| Active, allowPartial true, min ₹300      | `"1000.01"` | `payment.max` (₹1,000.00)                          |
| Partially paid ₹300 of ₹1000 (min ₹300)  | `"50"`      | ok → minimum applies only to the **first** payment |
| Partially paid ₹300 of ₹1000             | `"700"`     | ok → Paid                                          |
| Partially paid ₹300 of ₹1000             | `"700.01"`  | `payment.max` (₹700.00)                            |
| Paid or Expired                          | anything    | repository rejects (`DATA_ERRORS.notPayable`)      |

Recording adds to `amountPaidPaise`. When it reaches `amountPaise`, set `paidAt` to `now`.
`amountPaidPaise` can never exceed `amountPaise`.

## Status — `deriveStatus(link, now)`

Precedence: **Paid > Expired > Partially paid > Active**. Paid links never expire.

| amountPaid        | expiresAt       | Result                                |
| ----------------- | --------------- | ------------------------------------- |
| = amount          | any (even past) | `Paid`                                |
| 0                 | null / > now    | `Active`                              |
| 0 < paid < amount | null / > now    | `Partially paid`                      |
| 0                 | <= now          | `Expired` (boundary: equal ⇒ Expired) |
| 0 < paid < amount | <= now          | `Expired`                             |

Filters: `All`, `Active`, `Partially paid`, `Paid`, `Expired` (URL: `?status=Partially+paid`).

## Data shape (storage key `payment-links:v2`)

```ts
type PaymentLink = {
  id: string; // crypto.randomUUID()
  amountPaise: number;
  description: string;
  email: string | null;
  phone: string | null; // +91XXXXXXXXXX
  createdAt: string; // ISO UTC
  expiresAt: string | null;
  allowPartial: boolean;
  minFirstPaymentPaise: number | null; // set only when allowPartial
  amountPaidPaise: number; // 0..amountPaise
  paidAt: string | null; // when amountPaidPaise reached amountPaise
};
```

**Migration from `payment-links:v1`** (links must survive the upgrade): if v2 is empty and v1
exists, convert each v1 link with `allowPartial: false`, `minFirstPaymentPaise: null`,
`amountPaidPaise: paidAt ? amountPaise : 0`, save as v2, then remove v1.

List order: `createdAt` desc. Filter counts are computed from derived status at the same `now`.
The list shows **paid / due** for every link, e.g. "Paid ₹300.00 · Due ₹700.00".
