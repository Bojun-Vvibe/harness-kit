# PROGRESS — harness-kit

> The cross-session diary. Every session reads this at the start
> and stamps it at the end. Based on L05.

## Current state

- **Last commit**: `1430c60` (will be superseded by v0.3.1 commit)
- **Branch**: `main`
- **Build**: passing — `dist/cli.cjs` 54.78 KB
- **Tests**: 45/45 passing (lang 8, utils 8, view 4, init 17, validate-feature 8)
- **Active feature**: (none) — F02 transitioned `active → passing` this session

## Open blockers

- _(nothing)_

## Next steps (priority order)

1. Decide whether to publish v0.3.x to npm (audit pass + dashboard make this a strong public release).
2. Optional: `harness view` live-reload via SSE so file edits show without manual refresh.
3. Optional: README screenshot of the dashboard for hero image.

---

## Session 2026-05-14 — F02 done: rigidity audit + verification model rework (v0.3.1)

User feedback:
> "verification 不是必须是一行命令，也可能是一段 UI 行为的描述"
> "shell 只是可执行的一种，不要强绑定"
> "再走查一下有没有其他类似的问题需要优化"

Treated as one F02 with three deliverables: (a) split verification into
description + optional auto_verify, (b) decouple from shell as the
universal launcher (any tool), (c) audit framework for similar rigid
rules and soften them.

### (a) Verification model

- `verification` (required, always a description) + `auto_verify`
  (optional, any invocation bash can launch).
- `validate-feature.sh` rewritten: dispatches on auto_verify presence;
  description-only path requires human-run `--ack` which writes
  `.harness/feature-acks/<id>.txt` with timestamp + sha + email.
- Agents cannot self-ack — preserves L09 while supporting UI/visual/
  manual workflows.

### (b) Shell as launcher, not constraint

- Removed all "looks shell-y" detection.
- auto_verify can be `npm test`, `curl http://... | jq -e ...`,
  `playwright test settings/dark-mode`, `python tools/check.py F03`,
  any custom CLI from any ecosystem. Bash just launches it.
- Dropped the magical `$ ` prefix convention from the previous draft.

### (c) Audited 9 rigid rules; fixed all

| # | Rule | Fix |
|---|---|---|
| 1 | "WIP=1" hardcoded | "respect wip_limit (default 1, configurable)" |
| 2 | "doctor ≥ 24/30" hardcoded bar | dropped; "read Notes, fix what blocks the next session" |
| 3 | exit-clean fails on PROGRESS > 24h | warns at 24h, fails at HARNESS_PROGRESS_MAX_AGE_HOURS (default 168 = 7d) |
| 4 | "no commit if make check fails" | "no merge to main if make check fails" |
| 5 | session protocol on every session | exemption for trivial work (typo / version bump) |
| 6 | state machine "any → not_started: NEVER" | allowed when redefining feature, requires PROGRESS.md note |
| 7 | "5–15 hard rules" in CONSTRAINTS.md | dropped count target |
| 8 | TODO format `TODO(@owner, YYYY-MM-DD)` mandatory | moved to "Suggested" with team-call note |
| 9 | dashboard didn't show auto/manual form | features table now has `form` column with auto/manual badge |

### Files touched

- templates/state/FEATURES.md.tpl (rules 1, 2, 6 + new schema)
- templates/instructions/AGENTS.md.tpl (rules 1, 4, 5)
- templates/instructions/CONSTRAINTS.md.tpl (rules 4, 7, 8 — full rewrite)
- templates/feedback/scripts/exit-clean.sh.tpl (rule 3)
- templates/feedback/scripts/validate-feature.sh.tpl (verification rework)
- templates/prompts/bootstrap.{en,zh,ja,ko,es,pt,fr,de}.txt (rules 1, 2, 7)
- src/utils/project-data.ts + templates/web/index.html (rule 9: dashboard badge)
- harness-kit's own AGENTS.md / CONSTRAINTS.md / FEATURES.md / scripts/* re-synced from updated templates
- features.json (F01 + F02 entries with new schema, F02 marked passing)
- tests/validate-feature.test.ts (new file, 8 tests covering both branches)

### Verification

- `npm test` → 45/45 ✓ (was 37/37 — added 8 tests for validate-feature.sh)
- `bash scripts/validate-feature.sh F02` → exits 0, prints
  "F02 auto-verified" ✓
- `bash scripts/exit-clean.sh` → 5/5 dimensions green ✓
- F02 marked `passing` with evidence pointing at this commit + tests.

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
