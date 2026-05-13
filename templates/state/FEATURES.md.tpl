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
      "verification": "<single shell command, exit 0 = passing>",
      "state": "not_started" | "active" | "blocked" | "passing",
      "evidence": "<commit sha, log path, or similar — set when passing>",
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
- `verification` — a single shell command (chain with `&&` if needed) that exits 0 when the feature is truly working. **Required.** If you can't write one, the feature isn't well-defined yet.
- `state` — one of the four allowed values. Transitions below.
- `evidence` — set when entering `passing`. A `git rev-parse --short HEAD` is the minimum.
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
| `not_started` | `active` | yes | WIP=1 holds (see below) |
| `not_started` | `blocked` | yes | set `blocked_reason` |
| `active` | `blocked` | yes | set `blocked_reason` |
| `active` | `passing` | yes | **only if** verification command exited 0 in this session AND `evidence` is set |
| `blocked` | `active` | yes | clear `blocked_reason`; WIP=1 holds |
| `passing` | `active` | yes | regression found; explain in PROGRESS.md |
| anything | `not_started` | no | once started, never reset to virgin |
| anywhere | `passing` without verification | **NEVER** | this is the L09 anti-pattern |

---

## Hard rules (do not violate)

1. **WIP = 1.** Before setting any feature to `active`, scan
   `features.json` for other features in state `active`. If any exist,
   either finish them (→ `passing`) or set them to `blocked` first.
   Never have two features `active` simultaneously.

2. **Every feature has a `verification` command.** No verification
   field, no feature. If unsure what to verify, write a `behavior` you
   *can* verify and split the rest into a follow-up feature.

3. **`passing` requires running the verification.** Run:

   ```bash
   bash scripts/validate-feature.sh <id>
   ```

   That script reads the feature's `verification` from `features.json`
   and runs it. Only if it exits 0 may you set state to `passing`.
   Never mark `passing` based on visual inspection or "I'm sure it works".
   This is the L09 rule — agents are systematically over-confident.

4. **Capture evidence.** When marking a feature `passing`, set
   `evidence` to at least the current commit SHA:
   `git rev-parse --short HEAD`. A pointer to a CI run, a log file, or
   a screenshot is even better.

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
3. Append the new entry with `state: "not_started"`, fill `behavior`
   and `verification`. Set `created_at` and `updated_at` to the current
   ISO timestamp.
4. Commit `features.json` with a message like `feat(spine): add F03 — <behavior>`.

### Starting a feature

1. Verify WIP=1 (no other feature in `active`).
2. Set `state: "active"`. Update `updated_at`.
3. Begin the actual work.

### Finishing a feature

1. Run `bash scripts/validate-feature.sh <id>`.
2. If exit 0:
   - Set `state: "passing"`.
   - Set `evidence: "commit <sha>"` (use `git rev-parse --short HEAD`).
   - Update `updated_at`.
3. If exit non-zero: stay in `active`, fix the underlying issue, retry.
   Do not change state.

### Blocking a feature

1. Set `state: "blocked"`.
2. Set `blocked_reason` to a one-line explanation (max ~80 chars).
3. Update `updated_at`.

### Re-opening a `passing` feature (regression)

1. Set `state: "active"`.
2. Update `updated_at`.
3. Add a one-line note in `PROGRESS.md` under "Open blockers" or
   "Next steps" explaining what regressed.
4. Treat it like a fresh `active` feature — re-run validation when fixed.

---

## Anti-patterns (don't do this)

- ❌ Marking a feature `passing` without running validation.
- ❌ Two features in `active` at once.
- ❌ Empty or vague `verification` (e.g., `make test` when the test
  wasn't actually written for this feature).
- ❌ Editing `state` to `passing` because the code "looks fine".
- ❌ Deleting a feature instead of `blocked: abandoned`.
- ❌ Re-using an `id`.

---

## A note on tooling

There is a thin helper at `scripts/validate-feature.sh <id>` that reads
`features.json` and runs the feature's verification command. That's the
only mechanical piece. Everything else is your discipline + the
human's review of `git diff features.json`.

If discipline keeps slipping, that's a signal to either:
- (a) write a `pre-commit` hook that rejects `features.json` changes
  violating these rules, or
- (b) add the per-feature verification to `make check`.

Either belongs to *your* project, not to harness-kit.
