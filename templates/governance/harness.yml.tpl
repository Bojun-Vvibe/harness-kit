name: harness

on:
  push:
    branches: [main]
  pull_request:

# This workflow is intentionally stack-agnostic. It expects `make setup` and
# `make check` to do the right thing for THIS project. Add language-specific
# setup steps (actions/setup-node, actions/setup-python, etc.) above
# `make setup` if your project needs them.
jobs:
  harness-check:
    name: harness exit-clean + check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      # ──────────────────────────────────────────────────────────────────
      # TODO: add language toolchain setup here if needed.
      # Examples:
      #   - uses: actions/setup-node@v4
      #     with: { node-version: '22' }
      #   - uses: actions/setup-python@v5
      #     with: { python-version: '3.12' }
      #   - uses: actions/setup-go@v5
      #     with: { go-version: '1.22' }
      # ──────────────────────────────────────────────────────────────────

      - name: make setup
        run: make setup

      - name: make check
        run: make check

      - name: harness exit-clean
        run: |
          if [ -x scripts/exit-clean.sh ]; then
            bash scripts/exit-clean.sh
          else
            echo "no exit-clean script; skipping"
          fi
