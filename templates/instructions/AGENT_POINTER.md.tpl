# ${PROJECT_NAME} — agent harness pointer

This project uses [harness-kit](https://github.com/Bojun-Vvibe/harness-kit).
**The single source of truth for agent instructions is [`AGENTS.md`](./AGENTS.md).**

Read `AGENTS.md` first. Everything else (project state, hard rules, verification commands,
session protocol) is routed from there.

If you are about to:

- write code → read `AGENTS.md` § Hard rules and `CONSTRAINTS.md`
- start a session → `bash scripts/session-init.sh`
- end a session → append a `## Session <ISO timestamp>` block to `PROGRESS.md` summarizing what you did, then `bash scripts/exit-clean.sh`
- declare a feature done → run `bash scripts/validate-feature.sh <id>` (must exit 0), then update `features.json` per the state-machine rules in `FEATURES.md`
- re-read the bootstrap prompt → `cat .harness/bootstrap-prompt.txt`

Do not maintain a separate copy of project rules in this file. Update `AGENTS.md` instead.
