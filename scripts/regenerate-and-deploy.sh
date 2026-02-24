#!/usr/bin/env bash
# Regenerate the ecosystem diagram from local repos and push to gh-pages.
# Uses git worktree so it never disturbs the main working tree.
# Designed to be called from a git post-push hook or cron.
set -euo pipefail

DEMARCH_ROOT="${1:-/root/projects/Demarch}"
INTERCHART_DIR="$DEMARCH_ROOT/interverse/interchart"

# Generate
DATA=$(node "$INTERCHART_DIR/scripts/scan.js" "$DEMARCH_ROOT" 2>/dev/null)
NODE_COUNT=$(echo "$DATA" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).stats.nodes))")
EDGE_COUNT=$(echo "$DATA" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).stats.edges))")

# Build HTML into a temp file
TMPHTML=$(mktemp)
node -e "
  const fs = require('fs');
  const tmpl = fs.readFileSync('$INTERCHART_DIR/templates/ecosystem.html', 'utf8');
  const data = fs.readFileSync('/dev/stdin', 'utf8');
  fs.writeFileSync('$TMPHTML', tmpl.replace('/*DATA_PLACEHOLDER*/', data.trim()));
" <<< "$DATA"

# Check if anything changed (compare full file hash, not just node count)
CURRENT="$DEMARCH_ROOT/docs/diagrams/ecosystem.html"
if [ -f "$CURRENT" ]; then
  OLD_HASH=$(sha256sum "$CURRENT" | cut -d' ' -f1)
  NEW_HASH=$(sha256sum "$TMPHTML" | cut -d' ' -f1)
  if [ "$OLD_HASH" = "$NEW_HASH" ]; then
    rm "$TMPHTML"
    exit 0
  fi
fi

# Update local copy
mkdir -p "$(dirname "$CURRENT")"
mv "$TMPHTML" "$CURRENT"

# Update scan data for CI deploys
echo "$DATA" > "$INTERCHART_DIR/data/scan.json"

# Deploy to gh-pages using a temporary worktree (never touches main working tree)
WORKTREE_DIR=$(mktemp -d)
trap 'git -C "$INTERCHART_DIR" worktree remove --force "$WORKTREE_DIR" 2>/dev/null; rm -rf "$WORKTREE_DIR"' EXIT

git -C "$INTERCHART_DIR" fetch origin gh-pages 2>/dev/null
git -C "$INTERCHART_DIR" worktree add --detach "$WORKTREE_DIR" origin/gh-pages 2>/dev/null
cp "$CURRENT" "$WORKTREE_DIR/index.html"
git -C "$WORKTREE_DIR" add index.html
git -C "$WORKTREE_DIR" commit -m "chore: regenerate diagram ($NODE_COUNT nodes, $EDGE_COUNT edges)" 2>/dev/null || { echo "interchart: no changes to deploy"; exit 0; }
git -C "$WORKTREE_DIR" push origin HEAD:gh-pages

echo "interchart: deployed ($NODE_COUNT nodes, $EDGE_COUNT edges)"
