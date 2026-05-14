# PROGRESS — harness-kit

> The cross-session diary. Every session reads this at the start
> and stamps it at the end. Based on L05.

## Current state

- **Last commit**: `3acb62b` (will be superseded by v0.3.0 commit)
- **Branch**: `main`
- **Build**: passing — `dist/cli.cjs` 54.70 KB
- **Tests**: 37/37 passing (lang 8, utils 8, view 4, init 17)
- **Active feature**: (none) — F01 just transitioned `active → passing`

## Open blockers

- _(nothing)_

## Next steps (priority order)

1. Decide whether to publish to npm (v0.3.0 is the first release with a real "killer feature" beyond scaffolding — the dashboard).
2. Optional polish: live-reload the dashboard via SSE so file edits show without manual refresh.
3. Optional: GitHub Pages screenshot of the dashboard for the README.

---

## Session 2026-05-14 — F01 done: `harness view` dashboard + doctor refactor (v0.3.0)

- Per FEATURES.md, opened F01 in features.json before any code: behavior + verification + state="active".
- Built three new files:
  - `src/utils/project-data.ts` (~330 lines) — collector that walks the project and produces a JSON snapshot of all 5 subsystems plus features / Makefile parse / stack detection / git state / bootstrap-prompt presence.
  - `src/commands/view.ts` (~140 lines) — tiny Node http server (no Express) on 127.0.0.1:3737. Routes: `/` serves the dashboard HTML, `/api/project` serves the JSON snapshot, `/api/file?path=…` serves raw file contents (with path-traversal guard). Auto-opens the browser via `open`/`xdg-open`/`start` unless `--no-open`. Supports `--port 0` for ephemeral.
  - `templates/web/index.html` (~430 lines, single file with inline CSS+JS, dark-mode aware) — header strip + 5 summary stats + 5 subsystem cards + features.json table. Click any file → modal with raw content. Ships under `templates/` so the existing `files[]` already covers it.
- Refactored `src/commands/doctor.ts` to use the canonical L02 split (指令 / 工具 / 环境 / 状态 / 反馈), so `view` and `doctor` speak the same language. Total still 30 (5 subsystems × 5 + cold-start 5).
- Registered `harness view` in `src/cli.ts` with `--port` and `--no-open`. Added to unknown-command suggestion list.
- Added 4 e2e tests in `tests/view.test.ts` covering: server boots + URL printed, `/api/project` returns 5 subsystems with both zh and en labels in the documented order, `/` serves the dashboard HTML, `/api/file` works + rejects path traversal + returns 404 for missing files. Added 2 doctor tests asserting the new labels are present and the legacy ones (`observability`, `governance`) are gone.
- Acted as the agent for the dogfood install: filled AGENTS.md / Makefile / CONSTRAINTS.md TODOs from project knowledge so harness-kit's own `doctor` now scores **30/30 (100%)** on itself.
- Verification: `npm test` 37/37 ✓ ; `bash scripts/validate-feature.sh F01` exit 0 ✓ ; `bash scripts/exit-clean.sh` 5/5 ✓ ; manual smoke `curl /api/project` shows files/subsystem = 11/6/5/3/6 on harness-kit's own dogfood install.
- F01 marked `passing` with `evidence` pointing at the dogfood-install commit and tests/view.test.ts.

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
