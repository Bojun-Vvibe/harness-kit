# harness-kit — Hard Constraints

Non-negotiable rules. Violating these breaks the build or fails review.

## Process constraints

- Respect `wip_limit` in `features.json` (default `1`). At most that many `features.json` items may be in state `active`. (L07)
- Every feature must have a `verification` description. No verification, no `done`. (L08)
- A feature only enters `passing` after `bash scripts/validate-feature.sh <id>` exits 0 — either via its `auto_verify` invocation or via a human-run `--ack`. Not by visual inspection. (L09)
- Don't merge to `main` if `make check` fails. (Local commits to feature branches are fine — half-finished WIP is a useful checkpoint.)
- Don't refactor unrelated code while a feature is `active`. Finish, then refactor. (L09)
- See [`FEATURES.md`](./FEATURES.md) for the full state machine and anti-patterns when editing `features.json`.

## Code constraints (TypeScript / harness-kit specifics)

- Source lives in `src/`; templates in `templates/`. The build emits a single `dist/cli.cjs`. Never check in `dist/`.
- All source uses `strict` TypeScript with `noUncheckedIndexedAccess`. No `any` without a `biome-ignore` comment explaining why.
- The CLI is intentionally tiny. Adding a new top-level command requires an ADR in `docs/decisions.md`. The current set is `init / inject / doctor / clean` (and the upcoming `view`).
- Templates ship as `.tpl` files under `templates/`. They use `${VAR}` placeholders rendered by `src/utils/fs.ts:render`. Never inline runtime variables in template strings.
- All bootstrap prompt translations under `templates/prompts/bootstrap.<lang>.txt` must stay in sync — same step numbering, same hard rules at the bottom.
- All 8 README translations must stay in sync — when a section is added/removed in `README.md`, propagate to `README.zh.md / .ja.md / .ko.md / .es.md / .pt.md / .fr.md / .de.md`.
- Runtime dependencies are intentionally minimal (cac, @clack/prompts, fast-glob, kleur). Adding a new runtime dep requires an ADR.

## Forbidden

- No `console.log` debugging left in committed source. Use `src/utils/log.ts` exports.
- No commented-out code blocks. Delete it; git remembers.
- No TODOs in source without an owner and a date. Format: `TODO(@owner, YYYY-MM-DD): ...`.
- No new commands registered in `src/cli.ts` without a corresponding test in `tests/init.test.ts`.
- No template additions without updating `src/commands/{init,inject}.ts` to render them.
- Do not register multi-word commands (e.g. `feature add`) — cac doesn't natively support them; that's a deliberate v0.2.0 simplification.
