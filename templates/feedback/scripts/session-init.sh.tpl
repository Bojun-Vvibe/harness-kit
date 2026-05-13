#!/usr/bin/env bash
# L06 session-init: bootstrapping check + briefing.

set -uo pipefail

cd "$(dirname "$0")/.." || exit 1

echo ""
echo "▸ session start"
echo ""

# Tooling sanity
echo "Tooling:"
for t in setup test check; do
  if make -n "$t" >/dev/null 2>&1; then
    echo "  ✓ make $t"
  else
    echo "  ✗ make $t (target missing)"
  fi
done
echo ""

# PROGRESS briefing
if [ -f PROGRESS.md ]; then
  echo "PROGRESS.md (top 60 lines):"
  head -60 PROGRESS.md | sed 's/^/  /'
else
  echo "  ⚠ PROGRESS.md missing — agents have no diary."
fi
echo ""

# features.json briefing
if [ -f features.json ]; then
  echo "features.json:"
  if command -v jq >/dev/null 2>&1; then
    jq -r '.features[] | "  [\(.state)] \(.id)  \(.behavior)"' features.json
  else
    echo "  (install jq for a nicer view)"
  fi
fi
echo ""

# Git state
if [ -d .git ]; then
  echo "Git:"
  echo "  branch: $(git rev-parse --abbrev-ref HEAD 2>/dev/null)"
  echo "  HEAD:   $(git rev-parse --short HEAD 2>/dev/null)"
  if [ -z "$(git status --porcelain 2>/dev/null)" ]; then
    echo "  tree:   clean"
  else
    echo "  tree:   dirty"
  fi
fi
echo ""

echo "✓ Ready. Read FEATURES.md for the rules, then pick up the active feature in features.json."
