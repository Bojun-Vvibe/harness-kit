# Architecture — harness-kit

> Keep this short and current. If it disagrees with the code, the code wins
> (and this doc needs updating). Stale docs are worse than no docs (L03).

## One-paragraph overview

> **TODO**: what does this system do, in two or three sentences? Who uses it?

## Layers (boundaries are enforced)

> **TODO**: list the layers and the allowed dependency direction.
> Example for a typical web service:

```
ui  →  service  →  repo  →  db
```

- **db**: pure schema + migrations. No business logic.
- **repo**: typed access to data. No HTTP, no UI concerns.
- **service**: business logic. Calls `repo`. No direct DB or HTTP.
- **ui** (or `api`): HTTP/CLI entry points. Calls `service` only.

**Forbidden**:

- Skipping a layer (e.g., `ui` → `repo` directly).
- Reverse dependencies (e.g., `repo` importing from `service`).

## Cross-cutting concerns

> **TODO**: how do logging, auth, config, error handling, observability work?
> Reference the file/module that owns each.

- Logging: …
- Config: …
- Auth: …
- Errors: …
- Observability: …

## External dependencies

> **TODO**: which external services / APIs / databases? What happens if they're down?

| Dependency | Used for | Failure mode |
|------------|----------|--------------|
| …          | …        | …            |
