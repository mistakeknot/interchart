#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PLUGIN_DIR="$(dirname "$SCRIPT_DIR")"
DEMARCH_ROOT="${1:-$(cd "$PLUGIN_DIR/../.." && pwd)}"
OUTPUT="${2:-$DEMARCH_ROOT/docs/diagrams/ecosystem.html}"

# Run scanner
DATA=$(node "$SCRIPT_DIR/scan.js" "$DEMARCH_ROOT")

# Count nodes/edges
NODE_COUNT=$(echo "$DATA" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).stats.nodes))")
EDGE_COUNT=$(echo "$DATA" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).stats.edges))")

# Refresh the checked-in scan cache alongside the generated HTML, but ignore
# timestamp-only churn so ad-hoc runs do not dirty the repo unnecessarily.
SCAN_CACHE="$PLUGIN_DIR/data/scan.json"
NEW_CANONICAL=$(printf '%s\n' "$DATA" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const j=JSON.parse(d); j.generated='__CANONICALIZED__'; process.stdout.write(JSON.stringify(j));})")
OLD_CANONICAL=""
if [ -f "$SCAN_CACHE" ]; then
  OLD_CANONICAL=$(node -e "const fs=require('fs'); const j=JSON.parse(fs.readFileSync(process.argv[1], 'utf8')); j.generated='__CANONICALIZED__'; process.stdout.write(JSON.stringify(j));" "$SCAN_CACHE")
fi
if [ "$NEW_CANONICAL" != "$OLD_CANONICAL" ]; then
  printf '%s\n' "$DATA" > "$SCAN_CACHE"
fi

# Read template, replace placeholder, write output
mkdir -p "$(dirname "$OUTPUT")"

node -e "
  const fs = require('fs');
  let data = '';
  process.stdin.on('data', c => data += c);
  process.stdin.on('end', () => {
    const tmpl = fs.readFileSync('$PLUGIN_DIR/templates/ecosystem.html', 'utf8');
    const out = tmpl.replace('/*DATA_PLACEHOLDER*/', data.trim());
    fs.writeFileSync('$OUTPUT', out);
  });
" <<< "$DATA"

echo "Generated: $OUTPUT ($NODE_COUNT nodes, $EDGE_COUNT edges)"
