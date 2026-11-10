# AGENTS.md — Payment Links Manager

Instructions for any coding agent (Claude Code, Codex, Cursor, …) working in this repo.
`CLAUDE.md` imports this file; keep tool-agnostic rules **here**.

## What this is

A Payment Links manager for a merchant dashboard: create a payment link, list links with
status (Active / Paid / Expired), filter by status. Frontend only — data is mocked and
persisted in `localStorage`. The spec is the domain rules below plus the edge-case matrix in
**`.claude/skills/payment-link-domain/SKILL.md`. Do not silently contradict them;** if a
task requires changing a rule, update them in the same commit and say so.

## Stack

Vite · React 19 · TypeScript (strict) · Vitest + Testing Library (unit/component) ·
Playwright + @axe-core/playwright (E2E + a11y) · ESLint · Prettier. Plain CSS (no UI kit).
Do not add runtime dependencies without stating why in the commit message.

## Commands

| Task           | Command                                                                                           |
| -------------- | ------------------------------------------------------------------------------------------------- |
| Install        | `npm ci`                                                                                          |
| Dev server     | `npm run dev` (http://localhost:4317)                                                             |
| Typecheck      | `npm run typecheck`                                                                               |
| Lint           | `npm run lint`                                                                                    |
| Unit tests     | `npm test` (single file: `npx vitest run src/domain/money.test.ts`)                               |
| Coverage       | `npm run coverage`                                                                                |
| E2E            | `npm run e2e` (first time: `npx playwright install --with-deps chromium`)                         |
| **Everything** | `./scripts/verify.sh` (add `--e2e` to include Playwright, `--quick` for typecheck+lint+unit only) |

## Architecture

```
src/
  domain/        Pure TS, no React, no I/O. The rules live here and are 100% unit-tested.
    types.ts       PaymentLink, LinkStatus, CreateLinkInput, ValidationErrors
    money.ts       parseAmountToPaise(), formatPaise()  — integer paise only
    customer.ts    normalizePhone(), isValidEmail()
    validation.ts  validateCreateLink(input, now) -> { ok: true, value } | { ok: false, errors }
    status.ts      deriveStatus(link, now)            — Paid > Expired > Active
  data/          Persistence + mock API, behind the LinksRepository interface.
    repository.ts  interface LinksRepository { list(); create(); markPaid() }
    localRepo.ts   localStorage impl; corrupt/unavailable storage -> in-memory + seed
    mockApi.ts     latency + failure injection (see "Mock API controls")
    seed.ts        deterministic seed data (Active, Paid, Expired examples)
  hooks/         useNow(intervalMs), usePaymentLinks(), useStatusFilter() (?status= URL param)
  components/    CreateLinkForm, LinksList, LinkCard/LinkRow, StatusFilter, StatusBadge,
                 EmptyState, ErrorState, LiveRegion
  App.tsx
e2e/             Playwright specs (*.spec.ts)
```

Dependency direction: `components -> hooks -> data -> domain`. `domain` imports nothing
from the app. Components never touch `localStorage` or `Date.now()` directly.

## Non-negotiable domain rules (details: payment-link-domain skill)

- **Money is integer paise.** Never do arithmetic on rupee floats. Parse with
  `parseAmountToPaise`, display with `formatPaise` (`en-IN`, INR). Range `1..50_000_000` paise.
- **Status is derived, never stored as Expired.** `deriveStatus(link, now)`; Paid wins over
  Expired. The list re-derives on a `useNow(30_000)` tick so links flip live.
- **Time is injected.** Domain functions take `now: Date`; never call `Date.now()`/`new Date()`
  inside `domain/`. Expiry is stored as ISO UTC; input is `datetime-local` in browser TZ.
- **Customer:** at least one of email/phone; any non-empty field must be valid. Phone = Indian
  mobile, normalised to `+91XXXXXXXXXX`.
- **Description:** trimmed, 1–100 graphemes (`Intl.Segmenter`).

## Code conventions

- TypeScript strict; **no `any`**, no non-null `!` without a comment explaining why.
- Named exports only. One component per file. Props typed with `type XProps = {...}`.
- Validation returns data, it never throws. Errors are user-facing strings defined in
  `domain/validation.ts` (single source; tests import them, no copy-pasted strings).
- No `console.log` in committed code. No commented-out code.
- Keep diffs focused; don't reformat files you didn't otherwise change.

## Accessibility & responsive (WCAG 2.1 AA) — required, not polish

- Native elements first (`<button>`, `<label>`, `<fieldset>/<legend>`, `<table>`); ARIA only
  to fill gaps.
- Each input: visible `<label>`, `aria-invalid` when invalid, error linked via
  `aria-describedby`. On failed submit, move focus to the first invalid field.
- Success/failure of async actions announced via a single polite `aria-live` region.
- Status filter is a group of toggle buttons with `aria-pressed` (or radio group) — operable
  by keyboard alone; visible `:focus-visible` outline everywhere.
- Status is conveyed by text, not colour alone. Contrast ≥ 4.5:1.
- Works at **320px** wide with no horizontal scroll; table → stacked cards below 640px.

## Testing conventions

- Domain: table-driven Vitest tests (`it.each`) covering every boundary in
  the payment-link-domain skill (₹0, ₹0.01, ₹5,00,000, ₹5,00,000.01, 3 decimals, 100 vs 101 chars, …).
- Components: Testing Library, query by **role/label** (`getByRole`, `getByLabelText`), never
  by class or test-id unless no accessible handle exists. Use `userEvent`, not `fireEvent`.
- Time-dependent tests use `vi.useFakeTimers()` + `vi.setSystemTime()`; never rely on real time.
- E2E covers the user journeys: create → appears in list; validation errors keyboard-only;
  filter; expiry flip; failure + retry; mobile viewport (320×640); axe scan with zero
  serious/critical violations.
- No snapshot tests. No `.only` / `.skip` committed (verify.sh fails on them).

## Mock API controls (for tests and demos)

URL query `?mock=` accepts comma-separated flags: `slow` (1500 ms latency), `fail-create`,
`fail-load`, `reset` (clear storage and reseed). Default latency is 300 ms; tests set
`latencyMs: 0` via the repository factory.

## Definition of done (every task)

1. `./scripts/verify.sh` passes (use `--e2e` before committing a section).
2. New behaviour has tests; bug fixes start with a failing test.
3. Keyboard-only and 320px checks still hold for any UI touched.
4. If a rule changed, AGENTS.md and the payment-link-domain skill are updated.

## Git

- Conventional Commits (`feat:`, `fix:`, `test:`, `docs:`, `chore:`). One commit per
  assessment section at minimum: `feat(section-N): <summary>`.
- Never commit with failing verification. Never force-push `main`.
