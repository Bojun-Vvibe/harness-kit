#!/usr/bin/env bash
# L09/L10 three-layer end-to-end check.
# Override per stack: customize the sections below for your project.

set -uo pipefail

cd "$(dirname "$0")/.." || exit 1

PASS=0
FAIL=0

run_layer() {
  local name="$1"; shift
  echo ""
  echo "▸ Layer: $name"
  if "$@"; then
    echo "  ✓ $name passed"
    PASS=$((PASS + 1))
  else
    echo "  ✗ $name failed — earlier layers cannot be skipped"
    FAIL=$((FAIL + 1))
    return 1
  fi
}

# Layer 1: syntax / static
run_layer "static (lint + typecheck)" bash -c '
  if make -n lint >/dev/null 2>&1; then make lint || exit 1; fi
  if make -n typecheck >/dev/null 2>&1; then make typecheck || exit 1; fi
' || exit 1

# Layer 2: behavior (unit + integration)
run_layer "behavior (unit + integration tests)" bash -c '
  make test
' || exit 1

# Layer 3: system (end-to-end)
# Customize: replace this with a real e2e command for your project.
run_layer "system (end-to-end)" bash -c '
  # e.g.: npx playwright test
  # e.g.: pytest tests/e2e
  echo "(no e2e configured yet — fill in scripts/e2e-check.sh)"
'

echo ""
echo "  ${PASS} passed, ${FAIL} failed"
echo ""

if [ "$FAIL" -gt 0 ]; then
  echo "✗ Three-layer check failed."
  exit 1
fi

echo "✓ All three layers passed."
