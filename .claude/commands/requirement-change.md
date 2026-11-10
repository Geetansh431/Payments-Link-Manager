---
description: Adapt the existing plan, spec and code to a changed product requirement, spec-first
argument-hint: '<the new requirement, pasted verbatim>'
allowed-tools: Read, Edit, Write, Grep, Glob, Bash(./scripts/verify.sh:*), Bash(npm run:*), Bash(npx vitest:*), Bash(npx playwright:*), Bash(git status:*), Bash(git diff:*), Agent
---

A product requirement has changed. New requirement:

$ARGUMENTS

Adapt the **existing** project to it. Do not start over or create a new repo.

1. **Impact map.** Read AGENTS.md and the `payment-link-domain` skill. List every rule, type,
   stored field, message, component, hook, test and E2E journey the change touches. Note
   what it breaks: stored data shape, status precedence, existing tests, a11y.
2. **Assumptions.** List each ambiguity in the requirement and the assumption you'll build
   on, one line each. Stop and ask only if an assumption would be expensive to reverse.
3. **Spec first, no code yet.** Update `AGENTS.md` (domain rules, architecture, a11y, E2E
   journeys) and the `payment-link-domain` skill (messages, edge-case matrices, status table,
   data shape, migration). Update the `a11y-audit` skill and sub-agents if the UI or review
   checklist changes. Show the diff of these files.
4. **Persistence.** If the stored shape changes, bump the storage key and write a migration
   from the old key, so saved links survive.
5. **Tests from the spec.** Use the `spec-test-writer` sub-agent to write failing tests from
   the updated matrices before changing implementation.
6. **Implement layer by layer** (domain → data → hooks → UI → E2E), keeping the code simple
   (plain methods, no regex, JSDoc on every exported function). Run `./scripts/verify.sh`
   after each layer and stop at each layer for a commit.
7. **Review.** Run `./scripts/verify.sh --e2e`, then the `code-reviewer` sub-agent; fix every
   BLOCKER/MAJOR.
8. **Report.** What changed in the spec/agent files, the assumptions made, the commits, and
   anything deferred.
