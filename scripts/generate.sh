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
