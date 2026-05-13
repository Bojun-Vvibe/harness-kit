# ${PROJECT_NAME} — agent harness pointer

This project uses [harness-kit](https://github.com/Bojun-Vvibe/harness-kit).
**The single source of truth for agent instructions is [`AGENTS.md`](./AGENTS.md).**

Read `AGENTS.md` first. Everything else (project state, hard rules, verification commands,
session protocol) is routed from there.

If you are about to:

- write code → read `AGENTS.md` § Hard rules and `CONSTRAINTS.md`
- start a session → run `harness session start`
- end a session → run `harness session end "<one-line summary>"`
- declare a feature done → run `harness feature done <id>` (must pass verification)

Do not maintain a separate copy of project rules in this file. Update `AGENTS.md` instead.
