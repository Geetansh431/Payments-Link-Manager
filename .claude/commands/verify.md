---
description: Run the full verification gate (typecheck, lint, guards, unit tests, build, optional E2E) and fix failures
argument-hint: '[--e2e | --quick]'
allowed-tools: Bash(./scripts/verify.sh:*), Bash(npm run:*), Bash(npx vitest:*), Bash(npx playwright:*), Read, Edit, Write, Grep, Glob
---

Run `./scripts/verify.sh $ARGUMENTS`.

If it passes, reply with the summary table it prints and stop.

If it fails:

1. Read the first failing step's output. Fix the **root cause** in source — do not delete,
   skip, or loosen tests/lint rules to get green. If a test looks wrong, check it against the
   AGENTS.md domain rules and the payment-link-domain skill before touching it, and say so explicitly if you change it.
2. Re-run only the failing step (e.g. `npx vitest run <file>`), then re-run the whole script.
3. Stop after 3 full attempts and report what's still failing and why.

Finish with: steps passed/failed, files changed, and any test you modified with justification.
