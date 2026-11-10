@AGENTS.md

# Claude Code specifics

## Tooling in this repo

- **`/verify`** — run the full verification gate and fix what fails.
- **`/ship-section <N> <summary>`** — verify (incl. E2E), independent review, then commit the section.
- **Skill `payment-link-domain`** — load before touching `src/domain/`, validation messages,
  status logic, or writing tests for them. Contains the edge-case matrix.
- **Skill `a11y-audit`** — load before finishing any UI change.
- **Sub-agent `spec-test-writer`** — writes tests from the spec _without reading the
  implementation_. Use it for new domain/UI behaviour so tests aren't shaped by the code.
- **Sub-agent `code-reviewer`** — read-only review of the current diff against AGENTS.md.
  Use before every section commit.
- A PostToolUse hook formats edited files with Prettier (no-op until deps are installed).

## Working style

- Plan in a short checklist before multi-file changes; build domain → data → hooks → UI.
- Prefer TDD for domain code: failing test first, then implementation.
- After UI changes, run the app and check it in a browser at desktop and 320px widths
  rather than relying on tests alone.
- When an instruction conflicts with the domain rules in AGENTS.md or the payment-link-domain
  skill, stop and ask.
