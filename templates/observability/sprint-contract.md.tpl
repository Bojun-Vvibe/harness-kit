# Sprint Contract — <feature id>

> Use this template at the start of any non-trivial unit of work.
> The contract is signed (in spirit) before any code is written.
> Based on L11. Copy this file to `kitty-sprints/<feature-id>.md` or
> wherever your team keeps sprint records.

## Identifier

- Feature: `<F0?>`
- Started: `<YYYY-MM-DD>`
- Generator agent: `<claude-code | codex | opencode | human>`
- Evaluator agent: `<separate role; never the same persona as generator>`

## In scope

- Concrete behavior change A
- Concrete behavior change B
- Specific files expected to change

## Out of scope (explicit exclusions)

- Things adjacent to the feature that we are NOT touching
- Refactors deferred to follow-up (L09: do not "while you're at it")

## Acceptance criteria (must all be objectively checkable)

- [ ] `make check` passes
- [ ] `bash scripts/validate-feature.sh <id>` exits 0 (i.e., the feature's `verification` command passes)
- [ ] No regressions in QUALITY.md grades for affected modules
- [ ] (optional) e2e: `<specific user-visible behavior>` works

## Observability requirements

- Where is the run-time evidence captured? (log path, trace id, screenshot, etc.)
- What signals must the evaluator be able to inspect to pass/fail?

## Estimated session count

- `<small / 1 session | medium / 2-3 sessions | large — split first>`

## Sign-off

- Planner: ___
- Generator: ___
- Evaluator: ___
