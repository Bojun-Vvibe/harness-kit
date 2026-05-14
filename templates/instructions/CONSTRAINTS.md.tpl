# ${PROJECT_NAME} — Hard Constraints

Non-negotiable rules. Violating these breaks the build or fails review.

> Keep this list short — only rules that, if violated, *must* block a merge.
> Soft preferences (style, opinion) belong in `docs/` or in the linter, not here.
> There is no required count; some projects have 3 hard rules, some have 30.

## Process constraints

- Respect `wip_limit` in `features.json` (default `1`). At most that many `features.json` items may be in state `active`. (L07)
- Every feature must have a `verification` description. No verification, no `done`. (L08)
- A feature only enters `passing` after `bash scripts/validate-feature.sh <id>` exits 0 — either via its `auto_verify` invocation or via a human-run `--ack`. Not by visual inspection. (L09)
- Don't merge to `main` if `make check` fails. (Local commits to feature branches are fine — half-finished WIP is a useful checkpoint.)
- Don't refactor unrelated code while a feature is `active`. Finish, then refactor. (L09)
- See [`FEATURES.md`](./FEATURES.md) for the full state machine and anti-patterns when editing `features.json`.

## Code constraints

> **TODO**: edit these to match your project. Below are common starting points; keep what applies, drop what doesn't.

- All public functions have type annotations.
- All API endpoints are authenticated unless explicitly listed as public.
- All database queries use parameterized queries (no string concatenation).
- All network I/O has a timeout.
- All new code comes with at least one test.

## Forbidden in committed code

> Same — edit to fit. These are conventions, not laws of nature.

- No commented-out code blocks. Delete it; git remembers.
- No `console.log` / `print` left over from local debugging in user-facing code paths. (Tools that emit user output via stdout are obviously fine — `console.log` IS the output.)
- No new top-level dependencies without a note in `docs/decisions.md`.

## Suggested (not required)

- TODOs in source code are easier to track when they include an owner: `TODO(@you): ...` or `TODO(LIN-1234): ...`. Required format is your team's call, not harness-kit's.
