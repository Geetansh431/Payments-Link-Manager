# Payments-Link-Manager

Payment Links manager for a merchant dashboard — create payment links, see their status
(Active / Paid / Expired) and filter by status. Frontend only; data is mocked and kept in
`localStorage`.

**Stack:** Vite · React · TypeScript · Vitest + Testing Library · Playwright + axe

## Getting started

```bash
npm ci
npx playwright install chromium   # once, for E2E
npm run dev                        # http://localhost:4317
```

## Scripts

| Command                              | What it does                                              |
| ------------------------------------ | --------------------------------------------------------- |
| `npm run dev`                        | Start the dev server                                      |
| `npm run build`                      | Typecheck + production build                              |
| `npm run typecheck` / `npm run lint` | Static checks                                             |
| `npm test` / `npm run coverage`      | Unit & component tests (Vitest)                           |
| `npm run e2e`                        | Playwright E2E + accessibility (desktop and 320px mobile) |
