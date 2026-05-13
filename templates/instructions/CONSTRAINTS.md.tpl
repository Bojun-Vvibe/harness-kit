# ${PROJECT_NAME} — Hard Constraints

Non-negotiable rules. Violating these breaks the build or fails review.
Keep this list short (≤ 15 items). If a rule is situational, move it to a topic doc instead.

## Process constraints

- WIP = 1. At most one `features.json` item may be in state `active`. (L07)
- Every feature must have a `verification` command. No verification, no `done`. (L08)
- A feature only enters `passing` after its `verification` command exits 0 — verified via `bash scripts/validate-feature.sh <id>`. Not by visual inspection. (L09)
- Do not commit if `make check` fails locally. (L02)
- Do not refactor unrelated code while a feature is `active`. Finish, then refactor. (L09)
- See [`FEATURES.md`](./FEATURES.md) for the full state machine and anti-patterns when editing `features.json`.

## Code constraints

> **TODO**: edit these to match your project. Examples below.

- All public functions must have type annotations.
- All API endpoints must be authenticated unless explicitly listed as public.
- All database queries must use parameterized queries (no string concatenation).
- All network I/O must have a timeout.
- All new code must come with at least one test.

## Forbidden

> **TODO**: list things that look reasonable but are wrong for this project.

- No `console.log` / `print` debug statements in committed code.
- No commented-out code blocks. Delete it; git remembers.
- No TODOs without an owner and a date. Format: `TODO(@you, 2026-06-01): ...`.
- No new top-level dependencies without a note in `docs/decisions.md`.
