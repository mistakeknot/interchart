#!/usr/bin/env bash
# Regenerate the ecosystem diagram from local repos and push to gh-pages.
# Designed to be called from a git post-push hook or cron.
set -euo pipefail

INTERVERSE_ROOT="${1:-/root/projects/Interverse}"
INTERCHART_DIR="$INTERVERSE_ROOT/plugins/interchart"

# Generate
DATA=$(node "$INTERCHART_DIR/scripts/scan.js" "$INTERVERSE_ROOT" 2>/dev/null)
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
CURRENT="$INTERVERSE_ROOT/docs/diagrams/ecosystem.html"
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

# Deploy to gh-pages
cd "$INTERCHART_DIR"
git checkout gh-pages 2>/dev/null
cp "$CURRENT" index.html
git add index.html
git commit -m "chore: regenerate diagram ($NODE_COUNT nodes, $EDGE_COUNT edges)" 2>/dev/null || true
git push origin gh-pages 2>/dev/null
git checkout main 2>/dev/null

echo "interchart: deployed ($NODE_COUNT nodes, $EDGE_COUNT edges)"
