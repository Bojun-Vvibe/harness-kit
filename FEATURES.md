# How to work with `features.json`

> This file is the **rulebook** for the project's spine (`features.json`).
> Agents read this once and follow it. There is intentionally no
> `harness feature` CLI — that would just be a wrapper around what
> you can already do by editing one JSON file. The rules below are
> the source of truth.

## Why a rulebook instead of CLI commands

`harness-kit` deliberately keeps the surface tiny: every rule that an
agent must follow lives in markdown so the agent can read it once and
then act. CLI subcommands hide the rules behind imperatives ("do this for
me") and break flexibility (you can't compose them, you can't bypass
them when justified, you can't grep them).

This file replaces the v0.1.x `harness feature add | start | done | block`
commands with a contract you can actually inspect.

---

## Schema (`features.json`)

```json
{
  "version": "1",
  "wip_limit": 1,
  "features": [
    {
      "id": "F01",
      "behavior": "<one-sentence user-visible thing this delivers>",
      "verification": "<human-readable description of what 'done' looks like — required>",
      "auto_verify": "<optional: any invocation that exits 0 when verification is satisfied>",
      "state": "not_started" | "active" | "blocked" | "passing",
      "evidence": "<commit sha, ack file path, or similar — set when passing>",
      "blocked_reason": "<one-line why — set when blocked>",
      "created_at": "<ISO 8601 timestamp>",
      "updated_at": "<ISO 8601 timestamp>"
    }
  ]
}
```

### Field rules

- `id` — `F` followed by zero-padded 2+ digits (`F01`, `F02`, …, `F99`, `F100`). Never reused.
- `behavior` — what a user can do that they couldn't before. Not "implement X module". Not "refactor Y". One sentence.
- `verification` — **required**, **always a description**. A human-readable account of what "done" looks like for *this* feature. May be one sentence ("All `npm test` cases pass, including the 4 new ones for view") or multi-line ("Open the settings panel; toggle the dark mode switch; reload the page; confirm the dark theme is still active. Repeat with system preference set to 'auto'."). This is what the PR reviewer / human ack-er reads and judges against.
- `auto_verify` — **optional**, an invocation that mechanically checks the verification. Anything bash can launch: `npm test`, `curl http://localhost:3737/api/project | jq -e '.subsystems | length == 5'`, `playwright test settings/dark-mode`, `python tools/check.py F03`, `gh pr checks 1234 --required`, your own CLI. **shell is just the launcher** — the thing being launched can come from any ecosystem (HTTP probe, headless browser test, custom script, deployed-service probe). When set, `bash scripts/validate-feature.sh <id>` runs it and the exit code decides.
- `state` — one of the four allowed values. Transitions below.
- `evidence` — set when entering `passing`. For `auto_verify` features: a `git rev-parse --short HEAD` is the minimum (with the commit where the auto-check passed). For description-only features: the path to the ack file (`.harness/feature-acks/<id>.txt`) plus the commit SHA.
- `blocked_reason` — set when entering `blocked`. Cleared when leaving.
- `created_at` / `updated_at` — ISO 8601, e.g. `2026-05-13T07:42:00Z`. Update `updated_at` on every state change.

---

## State transitions (the only legal moves)

```
                 +-> blocked --+
                 |             |
not_started --> active --> passing
                 ^             |
                 +-------------+   (re-open if regression found)
```

| From | To | Allowed? | Conditions |
|---|---|---|---|
| `not_started` | `active` | yes | `wip_limit` not exceeded (see below) |
| `not_started` | `blocked` | yes | set `blocked_reason` |
| `active` | `blocked` | yes | set `blocked_reason` |
| `active` | `passing` | yes | **only if** `bash scripts/validate-feature.sh <id>` exited 0 in this session AND `evidence` is set |
| `blocked` | `active` | yes | clear `blocked_reason`; `wip_limit` not exceeded |
| `passing` | `active` | yes | regression found; explain in PROGRESS.md |
| any | `not_started` | yes (rare) | only when redefining the feature from scratch; **must** add a one-line note in PROGRESS.md explaining why |
| anywhere | `passing` without running validate-feature.sh | **NEVER** | this is the L09 anti-pattern |

---

## Hard rules (do not violate)

1. **Respect `wip_limit`** (default `1`, configurable in `features.json`).
   Before setting any feature to `active`, scan `features.json` for
   features already in state `active`. If the count would exceed
   `wip_limit`, finish one (→ `passing`) or set it to `blocked` first.
   The default of 1 is opinionated for solo agent runs; bump it for
   teams or when multiple small parallel features are genuinely safe
   (e.g., docs + tooling at the same time).

2. **Every feature has a `verification` field — always a description.**
   No verification field, no feature. If you can't write a clear
   description of what "done" looks like, the feature isn't well-defined
   yet — sharpen the behavior or split it.

3. **`passing` requires a passing run of `validate-feature.sh <id>`.** Run:

   ```bash
   bash scripts/validate-feature.sh <id>
   ```

   - If the feature has `auto_verify` set, the script runs it. **Only if it exits 0** may you set state to `passing`.
   - If the feature has no `auto_verify`, the script prints the description and exits non-zero, asking for a separate `--ack` invocation. A human (not the agent) re-runs:

     ```bash
     bash scripts/validate-feature.sh <id> --ack
     ```

     which writes `.harness/feature-acks/<id>.txt` with a timestamp + commit SHA + ack-er email. **Only after that ack file exists** may the agent set state to `passing`.

   This is the L09 rule — agents are systematically over-confident. Visual inspection or "I'm sure it works" do not count.

4. **Capture evidence.** When marking `passing`, set `evidence` to:
   - `auto_verify` features: `commit <sha>` (use `git rev-parse --short HEAD`). A pointer to a CI run, a log file, or a screenshot is even better.
   - description-only features: `ack <path/to/ack.txt> + commit <sha>`.

5. **Update `updated_at` on every change.** Use the current ISO
   timestamp, e.g. via `date -u +%Y-%m-%dT%H:%M:%SZ`.

6. **Never edit `id` or `created_at` after creation.**

7. **Never silently delete a feature.** Set its state to `blocked` with
   a `blocked_reason` of `"abandoned: <why>"` and leave it in the file.
   The historical record matters.

---

## Workflow recipes

### Adding a new feature

1. Read `features.json`.
2. Compute next id: `max(F##) + 1`, zero-padded to 2 digits.
3. Append the new entry with `state: "not_started"`. Always fill `behavior` and `verification` (description). Fill `auto_verify` only if you can express the check as an invocation that exits 0/non-0; leave it `null` (or omit) if the verification is genuinely manual.
4. Set `created_at` and `updated_at` to the current ISO timestamp.
5. Commit `features.json` with a message like `feat(spine): add F03 — <behavior>`.

### Starting a feature

1. Verify WIP=1 (no other feature in `active`).
2. Set `state: "active"`. Update `updated_at`.
3. Begin the actual work.

### Finishing a feature

1. Run `bash scripts/validate-feature.sh <id>`.
2. **auto_verify path** — script ran the auto check:
   - exit 0 → set `state: "passing"`; set `evidence: "commit <sha>"`; update `updated_at`.
   - non-zero → stay in `active`; fix the underlying issue; retry.
3. **description path** — script printed the description and exited non-zero:
   - Verify by hand against the description.
   - Have a human (not the agent) run `bash scripts/validate-feature.sh <id> --ack`.
   - The script writes `.harness/feature-acks/<id>.txt`.
   - Now set `state: "passing"`; set `evidence: "ack .harness/feature-acks/<id>.txt + commit <sha>"`; update `updated_at`.

### Blocking a feature

1. Set `state: "blocked"`.
2. Set `blocked_reason` to a one-line explanation (max ~80 chars).
3. Update `updated_at`.

### Re-opening a `passing` feature (regression)

1. Set `state: "active"`.
2. Update `updated_at`.
3. Add a one-line note in `PROGRESS.md` under "Open blockers" or "Next steps" explaining what regressed.
4. Treat it like a fresh `active` feature — re-run validation when fixed.

---

## Anti-patterns (don't do this)

- ❌ Marking a feature `passing` without running `validate-feature.sh`.
- ❌ Adding `auto_verify` that doesn't actually check the behavior (e.g., `auto_verify: "true"` to bypass the gate, or `auto_verify: "make test"` when no test was written for *this* feature).
- ❌ Leaving `verification` empty or vague ("it works", "looks good").
- ❌ Two features in `active` at once.
- ❌ The agent running `--ack` on its own. The whole point of `--ack` is that a human is in the loop for description-only features.
- ❌ Editing `state` directly to `passing` because the code "looks fine".
- ❌ Deleting a feature instead of `blocked: abandoned`.
- ❌ Re-using an `id`.

---

## A note on tooling

The thin helper at `scripts/validate-feature.sh <id>` is the only mechanical
piece. It reads `features.json`, dispatches based on whether `auto_verify`
is set, and either runs the check or requires a human ack. Everything else
is your discipline + the human's review of `git diff features.json`.

If discipline keeps slipping, that's a signal to either:
- (a) write a `pre-commit` hook that rejects `features.json` changes
  violating these rules, or
- (b) add the per-feature verification to `make check`.

Either belongs to *your* project, not to harness-kit.
