# PROGRESS — harness-kit

> The cross-session diary. Every session reads this at the start
> and stamps it at the end. Based on L05.

## Current state

- **Last commit**: `576f53f` (v0.2.1, fix(inject): preserve user edits in if-missing files)
- **Branch**: `main`
- **Build**: passing — `dist/cli.cjs` 37.44 KB
- **Tests**: 32/32 passing (lang.test.ts 8, utils.test.ts 8, init.test.ts 16)
- **Active feature**: (none) — see FEATURES.md before adding one

## Open blockers

- _(nothing)_

## Next steps (priority order)

1. Implement `harness view` — local web dashboard showing the 5-subsystem snapshot of the current project (指令 / 工具 / 环境 / 状态 / 反馈). Tracked as the next conversation step, not yet a feature in `features.json`.
2. Refactor `harness doctor` to use the same canonical 5-subsystem labels (instead of the v0.1.x split of instructions/state/feedback/observability/governance).
3. Decide whether to publish to npm (currently install path is `git clone && npm i -g .`).

---

## Session 2026-05-14 — dogfood: install harness-kit on harness-kit itself

- Ran `harness inject --apply --force` on the kit's own repo (greenfield, no prior harness files).
- Filled in three highest-value TODOs by hand (acting as the agent that the bootstrap prompt addresses):
  - `AGENTS.md § What this is` — actual project description.
  - `Makefile` — replaced placeholder targets with real npm wrappers (`make setup` → `npm install`, etc.). `make check` now actually runs lint + typecheck + test + build.
  - `CONSTRAINTS.md` — replaced example sections with real harness-kit-specific rules (no committed `dist/`, all 8 prompts/READMEs must stay in sync, single-token CLI commands only, etc.).
- Added `.harnessrc.json`, `.harness/`, and `features.json` to biome's ignore list — they are generated state files, not source.
- `make check` passes. `bash scripts/exit-clean.sh` passes (5/5). `harness doctor` scores 29/30 (97%).
- Left 12 of 17 TODO markers intentionally unfilled in scaffolding files (`docs/architecture.md`, `docs/decisions.md`, `docs/testing-standards.md`, `QUALITY.md`, the agent-pointer files) — they will provide useful TODO-count data for the upcoming `harness view` feature.

## Session 2026-05-14 — followup: bug fix v0.2.1 (preserve user edits in if-missing files)

- Caught while running v0.2.0 inject on a real MS work project.
- Bug: `actionFor` returned `"create"` for any if-missing file beyond the 4 special-cased ones, so re-inject would clobber user-edited CONSTRAINTS.md / docs / scripts.
- Fix: made `actionFor` async + does a real `pathExists` check.
- Added regression test (16th test in init.test.ts).
- Released as v0.2.1 (commit `576f53f`).
