#!/usr/bin/env bash
# Install the notify-interchart.yml workflow into all Interverse plugin repos.
# Run from the Interverse root: bash plugins/interchart/scripts/install-hooks.sh
#
# This copies the workflow file, commits, and pushes for each repo that
# doesn't already have it.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
WORKFLOW_SRC="$SCRIPT_DIR/../notify-interchart.yml"
INTERVERSE_ROOT="${1:-$(cd "$SCRIPT_DIR/../../.." && pwd)}"

if [ ! -f "$WORKFLOW_SRC" ]; then
  echo "Error: $WORKFLOW_SRC not found"
  exit 1
fi

installed=0
skipped=0
failed=0

# Plugins
for dir in "$INTERVERSE_ROOT"/plugins/*/; do
  name=$(basename "$dir")
  [ "$name" = "interchart" ] && continue
  [ ! -d "$dir/.git" ] && continue

  target="$dir/.github/workflows/notify-interchart.yml"
  if [ -f "$target" ]; then
    skipped=$((skipped + 1))
    continue
  fi

  mkdir -p "$dir/.github/workflows"
  cp "$WORKFLOW_SRC" "$target"

  if (cd "$dir" && git add .github/workflows/notify-interchart.yml && \
      git commit -m "ci: notify interchart on ecosystem changes" && \
      git push origin main 2>/dev/null); then
    echo "  installed: $name"
    installed=$((installed + 1))
  else
    echo "  FAILED: $name"
    failed=$((failed + 1))
  fi
done

# Hub (Clavain)
clavain="$INTERVERSE_ROOT/hub/clavain"
if [ -d "$clavain/.git" ]; then
  target="$clavain/.github/workflows/notify-interchart.yml"
  if [ ! -f "$target" ]; then
    mkdir -p "$clavain/.github/workflows"
    cp "$WORKFLOW_SRC" "$target"
    if (cd "$clavain" && git add .github/workflows/notify-interchart.yml && \
        git commit -m "ci: notify interchart on ecosystem changes" && \
        git push origin main 2>/dev/null); then
      echo "  installed: clavain"
      installed=$((installed + 1))
    else
      echo "  FAILED: clavain"
      failed=$((failed + 1))
    fi
  else
    skipped=$((skipped + 1))
  fi
fi

# Services (intermute)
intermute="$INTERVERSE_ROOT/services/intermute"
if [ -d "$intermute/.git" ]; then
  target="$intermute/.github/workflows/notify-interchart.yml"
  if [ ! -f "$target" ]; then
    mkdir -p "$intermute/.github/workflows"
    cp "$WORKFLOW_SRC" "$target"
    if (cd "$intermute" && git add .github/workflows/notify-interchart.yml && \
        git commit -m "ci: notify interchart on ecosystem changes" && \
        git push origin main 2>/dev/null); then
      echo "  installed: intermute"
      installed=$((installed + 1))
    else
      echo "  FAILED: intermute"
      failed=$((failed + 1))
    fi
  else
    skipped=$((skipped + 1))
  fi
fi

echo ""
echo "Done: $installed installed, $skipped already had it, $failed failed"
