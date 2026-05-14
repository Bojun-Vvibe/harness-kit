# Testing Standards — harness-kit

> What counts as a real test, and what doesn't. Based on L09/L10.

## The three layers (all must pass before `done`)

```
unit  →  integration  →  end-to-end
 fast       medium         slow
```

A feature is `passing` only when its `verification` command exercises the
appropriate layer for the change. Cross-component changes require an
end-to-end check (L10).

## Unit tests

- Test one function or class in isolation.
- May mock dependencies.
- Should run in milliseconds.
- ✅ Good for: pure logic, formatting, parsing, validation.
- ❌ Insufficient for: anything that crosses a process / network / DB boundary.

## Integration tests

- Test multiple modules together with real (or test-double) infrastructure.
- May spin up a test DB, an in-memory queue, a fake HTTP server.
- Should run in seconds.
- ✅ Good for: repo↔db, service↔repo, HTTP handler↔service.

## End-to-end tests

- Drive the system the way a real user (or another service) does.
- Hit a running server, click a real button, send a real HTTP request.
- ✅ Required for: any feature that touches more than one layer (L10).
- ❌ Don't use these for fast feedback during development.

## What does NOT count as verification

- "Code compiles" → only proves syntax.
- "Linter passes" → only proves style.
- "I ran it once and it looked right" → not reproducible. Not verification.
- "Unit tests pass" → may be true and feature still broken (L10 component-edge defects).

## Writing verification commands

When you add a feature to `features.json` (per the rules in [`FEATURES.md`](../../FEATURES.md)), its `verification` field must:

1. Be a single shell command (chain with `&&` if needed).
2. Exit 0 on success, non-zero on failure.
3. Be runnable on a clean checkout (CI must be able to run it).
4. Cover the actual behavior being added — not just "tests pass".

**Bad**: `make test` (catches nothing if no test was added)
**Better**: `make test && make e2e -- --grep "user can reset password"`
**Best**: `make test && curl -sf -X POST localhost:3000/reset -d '{...}' | jq -e '.status == "sent"'`

## Error messages must guide the next step (OpenAI rule)

If a check fails, its message must tell the agent what to do next.

- Bad: `Error: validation failed`
- Good: `Error: validation failed at user.email — must match RFC 5322. See src/validators/email.ts:12.`
