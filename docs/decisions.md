# Decision Log — harness-kit

> Append-only log of significant decisions. New entries go at the top.
> Format: short, dated, includes the rejected alternatives and why.
> Based on L05 (DECISIONS.md) — never lose the "why".

---

## 2026-05-14: Adopted harness-kit

- **Decision**: Use [harness-kit](https://github.com/Bojun-Vvibe/harness-kit) for the
  project's agent harness (instructions / state / feedback / observability / governance).
- **Why**: Need a consistent, repo-as-source-of-truth setup that any AI coding agent
  (claude-code, codex, opencode) can pick up without verbal context.
- **Alternatives considered**:
  - Hand-written `AGENTS.md` only — too fragile, drifts.
  - spec-kitty — heavier, opinionated mission/WP workflow not needed yet.
- **Constraint**: Edits to `features.json` follow the rules in `FEATURES.md` (state machine, WIP=1, verification gating).

---

## YYYY-MM-DD: <decision title>

- **Decision**: …
- **Why**: …
- **Alternatives considered**: …
- **Constraint**: …
- **Revisit when**: …
