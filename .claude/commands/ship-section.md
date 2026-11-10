---
description: Close out an assessment section - full verify incl. E2E, independent review, fix, log, commit
argument-hint: '<section-number> <one-line summary>'
allowed-tools: Bash(./scripts/verify.sh:*), Bash(git status:*), Bash(git diff:*), Bash(git add:*), Bash(git commit:*), Bash(git log:*), Read, Edit, Write, Grep, Glob, Agent
---

Shipping section **$1**: $ARGUMENTS

1. Run `./scripts/verify.sh --e2e`. If it fails, follow the `/verify` procedure until green.
2. Spawn the `code-reviewer` sub-agent on the current diff. Fix every BLOCKER and MAJOR;
   list any MINOR you deliberately leave, with a reason.
3. If any UI changed, load the `a11y-audit` skill and do the static checklist on the diff.
4. Re-run `./scripts/verify.sh --e2e` if step 2 or 3 changed code.
5. Append to `docs/SECTION_LOG.md` (create if missing):
   `## Section $1 — <date>` · what was built · decisions/assumption changes · known gaps.
6. `git add -A` and commit:
   `feat(section-$1): <summary>` with a body listing the main changes. Do not push unless
   asked.
7. Report: commit hash, verify summary, review verdict, any deferred items.
