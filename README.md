# harness-kit

> A pragmatic scaffolding kit for AI-coding-agent harnesses.
> Drop a complete 5-subsystem harness — instructions, state, feedback, observability, governance — into any new or existing repo. Stack-agnostic.

[![npm version](https://img.shields.io/npm/v/@bojunchai/harness-kit.svg)](https://www.npmjs.com/package/@bojunchai/harness-kit)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> **English** · [简体中文](./README.zh.md) · [日本語](./README.ja.md) · [한국어](./README.ko.md) · [Español](./README.es.md) · [Português](./README.pt.md) · [Français](./README.fr.md) · [Deutsch](./README.de.md)

---

## What is this?

`harness-kit` is the toolkit version of the ideas in
[**walkinglabs/learn-harness-engineering**](https://github.com/walkinglabs/learn-harness-engineering)
([course site](https://walkinglabs.github.io/learn-harness-engineering/)),
which distills the OpenAI / Anthropic engineering posts on what it actually
takes to make coding agents (Claude Code, Codex, OpenCode, Cursor, Aider, …)
reliable on real codebases.

The course (and this kit) builds on three primary sources:

- [OpenAI — *Harness Engineering: Leveraging Codex in an Agent-First World*](https://openai.com/index/harness-engineering/)
- [Anthropic — *Effective Harnesses for Long-Running Agents*](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)
- [Anthropic — *Harness Design for Long-Running Application Development*](https://www.anthropic.com/engineering/harness-design-long-running-apps)

The thesis (in one line): **swapping a more expensive model is the costliest
fix; fixing the harness is the cheapest.** This kit gives you the harness.

You get one CLI command — `harness init` — and you walk away with:

- `AGENTS.md` — a routed entry point (≤ 200 lines, never the kitchen sink)
- `CONSTRAINTS.md` — non-negotiable hard rules
- `docs/` — architecture, decisions, testing standards (split, not stuffed)
- `PROGRESS.md` — the cross-session diary so agents stop "losing the thread"
- `features.json` — the project's spine, with a `verification` command per item
- `QUALITY.md` — per-module grade so the next session knows where to focus
- `Makefile` — canonical `setup / test / lint / check` targets (you fill the bodies)
- `scripts/exit-clean.sh` — the 5-dimension session-end check
- `scripts/session-init.sh` — the session-start briefing
- `scripts/e2e-check.sh` — three-layer (static / behavior / system) verifier
- `docs/templates/sprint-contract.md` + `rubric.md` — for multi-step work
- `.github/workflows/harness.yml` — CI that runs the whole bar
- per-agent pointer files (`CLAUDE.md`, `.codex/AGENTS.md`, …) that route to `AGENTS.md`

Everything is plain text. No daemon. No lock-in. **Stack-agnostic** — Node, Python, Rust, Go, mobile, polyglot, anything.
Delete the kit and the files keep working.

---

## Install / use

The kit ships a `harness` CLI. The generated `Makefile` and `scripts/` call
`harness ...` directly, so you almost always want it on your PATH.

```bash
# Install once globally (recommended) ──────────────────────────────────
npm install -g @bojunchai/harness-kit
harness init                 # new project (interactive)
harness inject               # existing project (dry-run by default)
harness view                 # localhost dashboard for the project's harness

# Or zero-install via npx ───────────────────────────────────────────────
# Note: npx exposes `harness` only inside that single call. The
# generated Makefile / scripts call `harness doctor`, so you'll still
# want the global install eventually.
npx @bojunchai/harness-kit init
npx @bojunchai/harness-kit inject --apply
```

> Why the `@bojunchai/` scope? The unscoped name `harness-kit` is taken on
> npm by an unrelated package. The CLI binary is just `harness` — only
> `npm install` / `npx` mention the scope.

If you used `npx` and now see "command not found: harness" when running
`harness doctor`, install globally:

```bash
npm install -g @bojunchai/harness-kit
```

### Troubleshooting: `EEXIST: file already exists` on `/bin/harness`

The CLI registers a binary called `harness`. Two known cases where another
package may already own that name on your system:

1. You previously did `npm install -g .` from a local clone of this repo
   (early-adopter case). Fix:

   ```bash
   npm uninstall -g harness-kit
   npm install -g @bojunchai/harness-kit
   ```

2. You have the unrelated [`harness-cli`](https://www.npmjs.com/package/harness-cli)
   installed (also exposes `bin: harness`). Either uninstall it, install
   side-by-side under the alias `harness-kit`, or use `--force`:

   ```bash
   # Option A — uninstall the conflicting package, then install:
   npm uninstall -g harness-cli
   npm install -g @bojunchai/harness-kit

   # Option B — keep both, use the harness-kit alias instead:
   npm install -g @bojunchai/harness-kit
   harness-kit init       # this kit ships both `harness` and `harness-kit` binaries

   # Option C — overwrite recklessly:
   npm install -g @bojunchai/harness-kit --force
   ```

---

## After init: hand it to your agent

The scaffolding has TODO placeholders everywhere. Don't fill them by hand.

**`harness init` automatically prints the bootstrap prompt at the end** and saves
a copy to `.harness/bootstrap-prompt.txt`. Re-read it any time:

```bash
cat .harness/bootstrap-prompt.txt   # the prompt as printed at init time
```

To get the prompt in a different language up front, pass `--lang`:

```bash
harness init --lang en   # en | zh | ja | ko | es | pt | fr | de
```

For reference, here's the English version of the prompt — open the project
in your coding agent (Claude Code / Codex / OpenCode / Cursor / Aider) and
paste it:

```
You are working in a repo that just had harness-kit initialized.
Your job is to make the harness real for THIS project.

1. Read every generated file: AGENTS.md, CONSTRAINTS.md, PROGRESS.md, QUALITY.md,
   docs/architecture.md, docs/decisions.md, docs/testing-standards.md, Makefile,
   .harnessrc.json. Understand the structure.

2. Inspect the actual project: read package.json / pyproject.toml / Cargo.toml /
   go.mod / src tree / existing README / CI configs / lockfiles. Figure out what
   this project really is, what stack it uses, where its entry points are, and
   what conventions it already follows.

3. Replace every `> **TODO**:` marker in the generated docs with content that is
   TRUE for this project. Be specific — cite real files and line numbers.
   If you cannot answer something with high confidence, leave
   `> **TODO(@me, YYYY-MM-DD): need answer for X**` instead of guessing.

4. Replace the placeholder Makefile target bodies (setup / dev / test / lint /
   typecheck / build / clean) with this project's real commands. Verify each
   by running `make -n <target>` then `make <target>` once. If a target does
   not apply, leave it as `@true` with a one-line comment explaining why.

5. In CONSTRAINTS.md, replace the example "Code constraints" and "Forbidden"
   sections with 5–15 hard rules that are TRUE for this project. Derive them
   from existing tests, lint configs, CI, error handlers, and ADRs. Drop
   examples that don't apply.

6. In features.json, do NOT add features yourself yet. Wait for the human to tell
   you what to build. When they do, follow the rules in FEATURES.md to add
   the entry — that file is the contract for editing features.json (state
   machine, WIP=1, verification gating, anti-patterns). Read it once, then
   act.

7. When done, verify and stamp:
   - run `make check` — must exit 0
   - run `harness doctor` — score must be at least 24/30
   - append a `## Session <ISO timestamp>` block to PROGRESS.md describing what
     you did (bootstrap: filled scaffolding for <project name>)
   - run `bash scripts/exit-clean.sh` — must exit 0

Hard rules during this bootstrap:
- WIP = 1. Do not start coding new features.
- Do not modify any file outside the harness scaffolding listed in step 1.
- Do not declare done until `harness doctor` and `make check` both pass.
- If something is genuinely undecidable from the repo, ask the human — don't invent.
```

Save it as a snippet so you can reuse it on every new repo you scaffold.

---

## Commands

The CLI is intentionally tiny: two scaffolding commands, two diagnostics,
and one viewer. Everything else lives in the generated repo as markdown +
scripts you can read, grep, and modify.

| Command | What it does |
|---|---|
| `harness init [dir]` | Scaffold a fresh harness (interactive). Writes ~18 files. Prints the bootstrap prompt at the end. |
| `harness inject [dir]` | Add a harness to an existing repo. Dry-run by default; `--apply` to write. Safe-merges existing `AGENTS.md` / `Makefile`. |
| `harness doctor [dir]` | Score the 5 subsystems out of 5 each + cold-start test (5 questions). Same labels as `view`. |
| `harness view [dir]` | Open a localhost dashboard (default port 3737). Visualizes the project's harness organized by **指令 / 工具 / 环境 / 状态 / 反馈**. |
| `harness clean [dir]` | Run the L12 5-dimension exit-clean (build / tests / progress / artifacts / startup). |

After init, you typically don't need the `harness` CLI again. The day-to-day
workflow lives in:

| Action | Where |
|---|---|
| Manage features (add / start / done / block) | Edit `features.json` per the rules in `FEATURES.md` |
| Verify a feature is really done | `bash scripts/validate-feature.sh <id>` |
| Session-start briefing | `bash scripts/session-init.sh` |
| Session-end check | Append to `PROGRESS.md`, then `bash scripts/exit-clean.sh` |
| Re-read the bootstrap prompt | `cat .harness/bootstrap-prompt.txt` |

---

## The 5 subsystems (and which "lecture" each comes from)

| Subsystem | Files generated | Lecture |
|---|---|---|
| **Instructions** | `AGENTS.md`, `CONSTRAINTS.md`, `docs/architecture.md`, `docs/decisions.md`, `docs/testing-standards.md` + per-agent pointers | L02 / L04 |
| **State** | `PROGRESS.md`, `features.json`, `FEATURES.md`, `QUALITY.md` | L05 / L08 / L12 |
| **Feedback** | `Makefile`, `scripts/exit-clean.sh`, `scripts/session-init.sh`, `scripts/validate-feature.sh`, `scripts/e2e-check.sh` | L02 / L09 / L10 |
| **Observability** | `docs/templates/sprint-contract.md`, `docs/templates/rubric.md` | L11 |
| **Governance** | `CONSTRAINTS.md`, `.github/workflows/harness.yml`, `.harnessrc.json` | L03 / L12 |

---

## Three things this kit insists on (so you don't have to argue with the agent)

1. **WIP = 1.** `features.json` may only have one feature in state `active` at a time. Documented in `FEATURES.md`; enforced by agent discipline + git diff review. This kills the "do six things at once, finish zero" failure mode (L07).

2. **Verification is the only path to `passing`.** Every feature must have a `verification` shell command. A feature only enters `passing` after `bash scripts/validate-feature.sh <id>` exits 0. No "looks ok to me" → done (L09).

3. **Clean exit is part of "done".** `scripts/exit-clean.sh` checks five things at session end (build / tests / PROGRESS recency / no stale artifacts / startup path callable). The CI runs the same script (L12).

---

## Agents supported in v0.1.0

`claude-code`, `codex`, `opencode`, `cursor`, `aider`. Each gets the
expected file in the expected place, all of which point back to `AGENTS.md`
as the single source of truth.

---

## Compared to spec-kitty

[spec-kitty](https://github.com/spec-kitty/spec-kitty) is a heavier
mission-driven harness. `harness-kit` is the minimal, opinionated 80%-case
kit. They can coexist — `harness-kit` runs *under* spec-kitty fine.

| | harness-kit | spec-kitty |
|---|---|---|
| Concept count | low (5 subsystems) | high (mission/WP/charter/doctrine) |
| Time to first useful output | minutes | hour-ish |
| Workflow opinion | none — bring your own | strong — specify→plan→tasks→implement→review |
| Old-project injection | first-class (`inject` command) | possible but not a focus |
| Dependencies | Node ≥ 18 only | Python + a few |

---

## License

MIT © Bojun Chai. See [LICENSE](./LICENSE).

## Credit & references

This project is a packaging of ideas that are not mine. Lecture references
(`L01`–`L12`) throughout the generated files point to chapters of:

- [**walkinglabs/learn-harness-engineering**](https://github.com/walkinglabs/learn-harness-engineering)
  — course repo / [readable site](https://walkinglabs.github.io/learn-harness-engineering/)

The course in turn distills the engineering posts:

- OpenAI — [Harness Engineering: Leveraging Codex in an Agent-First World](https://openai.com/index/harness-engineering/)
- Anthropic — [Effective Harnesses for Long-Running Agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)
- Anthropic — [Harness Design for Long-Running Application Development](https://www.anthropic.com/engineering/harness-design-long-running-apps)

If this kit helped you, consider starring the course repo too — it's the
upstream source of the framework.
