#!/usr/bin/env bash
# Run (or acknowledge) the verification for a single feature id.
#
# Each feature in features.json has TWO fields:
#
#   verification   REQUIRED. A human-readable description of what "done"
#                  looks like for this feature. May be one line, may be
#                  multi-line. This is what the PR reviewer / human ack-er
#                  reads and judges against.
#
#   auto_verify    OPTIONAL. A single invocation that, when run, exits 0
#                  iff the verification is satisfied. It can be anything
#                  bash can launch — `npm test`, `curl ...`, `playwright
#                  test foo`, `python tools/check.py`, `http get .../ | jq
#                  -e ...`, your own CLI. shell is just the launcher; the
#                  thing being launched can come from any ecosystem.
#
# Behavior of this script:
#
#   - If auto_verify is set:       run it via `bash -c`; exit code decides.
#   - If auto_verify is not set:   print the description; require `--ack`
#                                  (a separate human invocation) which
#                                  writes a timestamped + sha record to
#                                  `.harness/feature-acks/<id>.txt`.
#
# This preserves L09 (the agent cannot self-declare a feature done) while
# letting verification describe behavior the agent can't directly execute.
#
# Usage:
#   bash scripts/validate-feature.sh F03
#   bash scripts/validate-feature.sh F03 --ack    # human ack for description-only features

set -uo pipefail

FEATURE_ID=""
ACK=""
for arg in "$@"; do
  case "$arg" in
    --ack) ACK=1 ;;
    -h|--help)
      echo "usage: $0 <feature-id> [--ack]"
      exit 0
      ;;
    *) FEATURE_ID="$arg" ;;
  esac
done

if [ -z "$FEATURE_ID" ]; then
  echo "usage: $0 <feature-id> [--ack]" >&2
  exit 2
fi

cd "$(dirname "$0")/.." || exit 1

if [ ! -f features.json ]; then
  echo "✗ features.json not found" >&2
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "✗ jq required (brew install jq | apt install jq)" >&2
  exit 1
fi

VERIFY=$(jq -r --arg id "$FEATURE_ID" '.features[] | select(.id == $id) | .verification // ""' features.json)
AUTO=$(jq -r --arg id "$FEATURE_ID" '.features[] | select(.id == $id) | .auto_verify // ""' features.json)
BEHAVIOR=$(jq -r --arg id "$FEATURE_ID" '.features[] | select(.id == $id) | .behavior // ""' features.json)

# Feature must exist (probe via a separate query that returns boolean)
EXISTS=$(jq --arg id "$FEATURE_ID" '[.features[] | select(.id == $id)] | length > 0' features.json)
if [ "$EXISTS" != "true" ]; then
  echo "✗ feature $FEATURE_ID not found in features.json" >&2
  exit 1
fi

if [ -z "$VERIFY" ]; then
  echo "✗ feature $FEATURE_ID has no verification field — required by FEATURES.md" >&2
  exit 1
fi

# ────────────────────────────────────────────────────────────────────────
# auto_verify branch
# ────────────────────────────────────────────────────────────────────────
if [ -n "$AUTO" ]; then
  if [ -n "$ACK" ]; then
    echo "ℹ feature $FEATURE_ID has auto_verify — --ack ignored, will run the auto check instead" >&2
  fi
  echo "▸ validating $FEATURE_ID: $BEHAVIOR"
  echo "  verification (description):"
  echo "$VERIFY" | sed 's/^/    /'
  echo ""
  echo "  auto_verify (will run via bash -c):"
  echo "    $AUTO"
  echo ""
  if bash -c "$AUTO"; then
    echo ""
    echo "✓ $FEATURE_ID auto-verified (auto_verify exited 0)"
    exit 0
  else
    code=$?
    echo "" >&2
    echo "✗ $FEATURE_ID failed auto_verify (exit $code) — do not mark done (L09)" >&2
    exit "$code"
  fi
fi

# ────────────────────────────────────────────────────────────────────────
# description-only branch (manual ack required)
# ────────────────────────────────────────────────────────────────────────
ACK_DIR=".harness/feature-acks"
ACK_FILE="$ACK_DIR/$FEATURE_ID.txt"

if [ -z "$ACK" ]; then
  echo "▸ feature $FEATURE_ID — manual verification required (no auto_verify set)"
  echo "  behavior:     $BEHAVIOR"
  echo ""
  echo "  verification:"
  echo "$VERIFY" | sed 's/^/    /'
  echo ""
  if [ -f "$ACK_FILE" ]; then
    echo "  ✓ a previous ack exists at $ACK_FILE:"
    sed 's/^/    /' "$ACK_FILE"
    echo ""
    echo "  If the previous ack still applies, the feature can be marked passing."
    echo "  Otherwise re-verify by hand and run with --ack."
  else
    echo "  No ack on file. After verifying by hand, confirm with:"
    echo "    bash scripts/validate-feature.sh $FEATURE_ID --ack"
  fi
  exit 1
fi

# --ack path: record the acknowledgment
mkdir -p "$ACK_DIR"
SHA=$(git rev-parse --short HEAD 2>/dev/null || echo "no-git")
TS=$(date -u +%Y-%m-%dT%H:%M:%SZ)
WHO=$(git config --get user.email 2>/dev/null || whoami)
{
  echo "ack_at: $TS"
  echo "ack_by: $WHO"
  echo "commit: $SHA"
  echo "behavior: $BEHAVIOR"
  echo ""
  echo "verification:"
  echo "$VERIFY" | sed 's/^/  /'
} > "$ACK_FILE"

echo "✓ $FEATURE_ID — ack recorded at $ACK_FILE"
echo "  commit: $SHA"
echo "  by:     $WHO"
echo "  at:     $TS"
echo ""
echo "  Now safe to set state: \"passing\" in features.json with this ack file as evidence."
exit 0
