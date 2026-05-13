# Quality Document — ${PROJECT_NAME}

> Per-module quality grade. Updated by humans (or your evaluator agent)
> at session end. New sessions read this to know where to focus next.
> Based on L12.

## Grades

- **A**: passes verification, agent-comprehensible, stable tests, architecture-compliant.
- **B**: above + minor stylistic deviations.
- **C**: works but has known smells (flaky tests, unclear ownership, partial test coverage).
- **D**: bugs known but unfixed, or violates an architecture boundary.
- **F**: broken or unverifiable.

## Modules

| Module | Grade | Verification | Stability | Notes |
|--------|-------|--------------|-----------|-------|
| _(add rows as the project grows)_ | — | — | — | — |

## Recent regressions

> **TODO**: when something drops a grade, log it here with the date and the cause.

## Pin: lowest-grade module

The next session should treat the lowest-graded non-blocked module as the default
target for cleanup, unless an active feature already takes priority.
