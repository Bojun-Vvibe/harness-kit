#!/usr/bin/env bash
# Run the verification command for a single feature id.
# Usage: bash scripts/validate-feature.sh F03

set -euo pipefail

FEATURE_ID="${1:-}"

if [ -z "$FEATURE_ID" ]; then
  echo "usage: $0 <feature-id>"
  exit 2
fi

cd "$(dirname "$0")/.." || exit 1

if [ ! -f features.json ]; then
  echo "✗ features.json not found"
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "✗ jq required (brew install jq | apt install jq)"
  exit 1
fi

VERIFY=$(jq -r --arg id "$FEATURE_ID" '.features[] | select(.id == $id) | .verification' features.json)
BEHAVIOR=$(jq -r --arg id "$FEATURE_ID" '.features[] | select(.id == $id) | .behavior' features.json)

if [ -z "$VERIFY" ] || [ "$VERIFY" = "null" ]; then
  echo "✗ feature $FEATURE_ID not found, or has no verification command"
  exit 1
fi

echo "▸ validating $FEATURE_ID: $BEHAVIOR"
echo "  command: $VERIFY"
echo ""

if eval "$VERIFY"; then
  echo ""
  echo "✓ $FEATURE_ID verified"
  exit 0
else
  echo ""
  echo "✗ $FEATURE_ID failed verification — do not mark done (L09)"
  exit 1
fi
