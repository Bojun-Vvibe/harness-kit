# Review Rubric — <feature id>

> Use this rubric to turn "is the work good?" into a structured score.
> Different evaluators applying this rubric should reach similar conclusions.
> Based on L11.

## Per-dimension grading

For each row, pick A / B / C / D and quote one specific piece of evidence.

| Dimension | A (excellent) | B (good) | C (needs work) | D (reject) | Grade | Evidence |
|-----------|---------------|----------|----------------|------------|-------|----------|
| Correctness — does it actually do what the contract says? | All acceptance checks pass; no edge cases missed | Acceptance checks pass; minor edge cases not covered | Acceptance check passes superficially; obvious edge cases break | Acceptance check fails or feature is non-functional | | |
| Architecture compliance — does it respect layers, boundaries, hard constraints? | Fully compliant; reinforces existing patterns | Compliant; minor stylistic deviation | Visible deviation that should be cleaned up | Violates an architecture rule | | |
| Test coverage — does it come with the right kind of tests (L10)? | Unit + integration + e2e where appropriate | Right level of test for the change | Test exists but only at unit level when integration was needed | No tests, or only "code compiles" assertions | | |
| Code quality — readability, naming, simplicity | Clear, self-documenting, no dead code | Clear, minor smells | Mixed; some bits hard to follow | Obscure or copy-pasted | | |
| Observability — would on-call humans / agents be able to debug a failure? | Logs / traces / errors are actionable (OpenAI rule) | Logs present but generic | Sparse logging | None / silent failures | | |

## Verdict

- [ ] **APPROVE** — all dimensions C or better, no Ds
- [ ] **REJECT** — at least one D, or correctness is C
- [ ] **REQUEST CHANGES** — Cs that must become Bs before merge

## Specific actionable feedback

For every C/D above, write:

- **What is wrong** (be specific — file:line)
- **Why it matters** (cite the L0?-numbered principle if relevant)
- **How to fix it** (concrete next step — this is the OpenAI red-pen rule)

Example:

> `src/api/handlers.ts:42` returns a generic 500 on any DB error. **Why**: agents
> cannot self-correct from "internal error" (L09 error-message rule). **Fix**:
> wrap with a typed error and include the offending input id in the message.
