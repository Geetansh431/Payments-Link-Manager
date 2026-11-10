# Payments-Link-Manager

Payment Links manager for a merchant dashboard — create payment links (optionally allowing
partial payments), record payments, see their status (Active / Partially paid / Paid /
Expired) and filter by status. Frontend only; data is mocked and kept in
`localStorage`.

**Stack:** Vite · React 19 · TypeScript · Vitest + Testing Library · Playwright + axe

## Requirements

Node.js 22.12 or newer and npm.

## Install, run, test

```bash
# Install
npm ci
npx playwright install chromium     # one time, downloads the browser for E2E

# Run
npm run dev                         # http://localhost:4317

# Unit tests (Vitest + Testing Library)
npm test

# E2E tests (Playwright; starts the dev server itself, runs at desktop and 320px widths)
npm run e2e
```

## Features

- **Create form** — amount (₹, > 0, max 2 decimals, max ₹5,00,000), description (required,
  max 100 characters), customer email and/or phone (Indian mobile), optional expiry in the
  future, and "Allow partial payments" with a minimum first payment. All errors are shown at
  once and focus moves to the first one.
- **Links list** — amount, paid / due, description, customer, status, created and expiry
  time, "Copy link", and "Record payment" for Active and Partially paid links. Links turn **Expired** on screen when their
  expiry passes, without a refresh.
- **Status filter** — All / Active / Partially paid / Paid / Expired with counts; kept in the URL
  (`?status=Paid`).
- **States** — loading, load error with "Try again", save error (typed values are kept),
  "No payment links yet", and "No paid links" with "Show all links".
- **Accessible and responsive** — keyboard-only use, labelled fields with linked errors,
  screen-reader announcements, works at 320px wide.

## Mock switches

Add `?mock=` to the URL to force a state (combine with commas):

| Switch        | Effect                                       |
| ------------- | -------------------------------------------- |
| `reset`       | Clear saved links and start from sample data |
| `slow`        | 1.5 s delay on every request                 |
| `fail-load`   | Loading the list fails                       |
| `fail-create` | Creating a link fails                        |

Example: http://localhost:4317/?mock=reset,fail-create

## All scripts

| Command                              | What it does                                              |
| ------------------------------------ | --------------------------------------------------------- |
| `npm run dev`                        | Start the dev server                                      |
| `npm run build`                      | Typecheck + production build                              |
| `npm run typecheck` / `npm run lint` | Static checks                                             |
| `npm test` / `npm run coverage`      | Unit & component tests (Vitest)                           |
| `npm run e2e`                        | Playwright E2E + accessibility (desktop and 320px mobile) |

## Project structure

```
src/domain/      Business rules: validation, money (paise), status — pure TypeScript
src/data/        Mock backend: localStorage, sample data, ?mock= switches
src/hooks/       useNow (30 s clock), usePaymentLinks, useStatusFilter (URL)
src/components/  Form, list, filter, badges, copy button, empty/error states
e2e/             Playwright journeys and axe accessibility scans
```

## Verification

`./scripts/verify.sh` runs typecheck, lint, repo guards, unit tests with coverage and the
build. Add `--e2e` to include Playwright, or `--quick` for typecheck + lint + unit only.

## Agent context

- [`AGENTS.md`](AGENTS.md) — tool-agnostic rules for coding agents (architecture, domain rules, conventions)
- [`CLAUDE.md`](CLAUDE.md) — Claude Code specifics: skills, sub-agents, slash commands, hooks
