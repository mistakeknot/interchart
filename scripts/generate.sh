#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PLUGIN_DIR="$(dirname "$SCRIPT_DIR")"
SYLVESTE_ROOT="${1:-$(cd "$PLUGIN_DIR/../.." && pwd)}"
OUTPUT="${2:-$SYLVESTE_ROOT/docs/diagrams/ecosystem.html}"

refuse() {
  echo "interchart: REFUSING TO WRITE — $1" >&2
  echo "  output left untouched: $OUTPUT" >&2
  exit 3
}

# --- Guard 1: the root must actually be the monorepo -------------------------
# A wrong SYLVESTE_ROOT is the failure that has hit this generator three times:
# fixed at the artefact level in d9e56df (2026-07-23), recurred in bb3725e
# (2026-07-24), and reproduced again on 2026-07-27.
#
# Passing interchart's own directory as the root produces two symptoms from one
# wrong argument: the scan sees only interchart (6 nodes / 4 edges instead of
# ~249 / ~325), and because OUTPUT defaults to
# "$SYLVESTE_ROOT/docs/diagrams/ecosystem.html" the write is redirected into
# interchart's own tracked docs/. The result is internally consistent and looks
# like an ordinary regeneration, which is why it kept surviving review.
#
# skills/interchart/SKILL.md asks the caller to determine the root and supply
# it, and ${CLAUDE_PLUGIN_ROOT} points at the plugin cache rather than the
# monorepo, so "resolve it yourself" is exactly the step that goes wrong. This
# check makes a wrong answer loud instead of plausible.
if [ ! -d "$SYLVESTE_ROOT/interverse" ] || [ ! -d "$SYLVESTE_ROOT/os" ]; then
  echo "interchart: '$SYLVESTE_ROOT' is not the Sylveste monorepo root" >&2
  echo "  expected both interverse/ and os/ directly beneath it" >&2
  echo "  pass it explicitly, e.g. bash scripts/generate.sh \"\$(cd ../.. && pwd)\"" >&2
  exit 2
fi

# Run scanner, capturing warnings separately so a missing input is a fact we can
# act on rather than a line that scrolls past.
SCAN_WARN="$(mktemp)"
trap 'rm -f "$SCAN_WARN"' EXIT
DATA=$(node "$SCRIPT_DIR/scan.js" "$SYLVESTE_ROOT" 2>"$SCAN_WARN")

# --- Guard 0: refuse a scan whose inputs were missing ------------------------
#
# The ratio guard below catches catastrophe, not shortfall. When scan.js looked
# for os/clavain (lowercase) it found nothing on Linux, silently dropped the hub
# and everything it contributes, and produced 219 nodes where the Mac produced
# 244. 219/244 is 0.90 — no ratio threshold you would actually set catches that,
# because you cannot distinguish "a smaller estate" from "a broken scanner" by
# counting the output.
#
# You can distinguish them by looking at the INPUTS. A missing directory is not
# a smaller estate; it is a question the scanner could not answer. So: any
# absence the scanner marks 'missing-input:' is fatal, and nothing is written.
# Absences with a documented fallback (Interforge -> external ref) stay warnings.
#
# Escape hatch for a genuinely smaller checkout (a cloud runner, a partial
# clone): INTERCHART_ALLOW_MISSING=1. It is deliberately not the default —
# silently tolerating absent inputs is the whole defect.
MISSING="$(grep -E '^missing-input:' "$SCAN_WARN" || true)"
if [ -n "$MISSING" ] && [ "${INTERCHART_ALLOW_MISSING:-0}" != "1" ]; then
  echo "interchart: REFUSING TO WRITE — the scan could not see all its inputs" >&2
  printf '%s\n' "$MISSING" | sed 's/^/  /' >&2
  echo "  A missing input yields a quietly smaller diagram, which no node-count" >&2
  echo "  threshold can distinguish from a genuinely smaller estate." >&2
  echo "  Fix the path, or set INTERCHART_ALLOW_MISSING=1 if this checkout is" >&2
  echo "  legitimately partial." >&2
  exit 4
fi
# Warnings that are not absences still belong on stderr.
[ -s "$SCAN_WARN" ] && cat "$SCAN_WARN" >&2

# Count nodes/edges
NODE_COUNT=$(echo "$DATA" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).stats.nodes))")
EDGE_COUNT=$(echo "$DATA" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).stats.edges))")

# --- Guard 2: refuse a collapsed scan ---------------------------------------
# Nothing in `git status` distinguishes a good regeneration from a failed one —
# both show as ' M'. The only signal available before the write is the scan's
# own scale against the artefact it is about to replace.
#
# THRESHOLD DERIVATION (re-derive before changing, do not tune by feel).
# Node counts for this artefact across its 12 commits, Feb–Jul 2026:
#   121, 121, 121, 121, 124, 188, 188, 188, 145, 244   (current scan: 249)
# The largest legitimate DECREASE in that series is 188 -> 145: -22.9%, on
# 2026-04-05, a real estate consolidation. The failure mode is 249 -> 6:
# -97.6%. A ratio of 0.5 sits ~2x above the worst real drop and ~2x below the
# observed failure, so it tolerates consolidation and still catches a collapse.
#
# Deliberately NOT tighter: 0.9 would have fired on the Apr 5 consolidation,
# and a guard that trips on legitimate change is one people learn to bypass.
# See docs/solutions/2026-07-25-unattended-work-needs-a-stopped-signal.md
# § "alarm thresholds have two failure modes".
COLLAPSE_RATIO="${INTERCHART_COLLAPSE_RATIO:-0.5}"

# Absolute floor, for when there is no prior artefact to compare against — or
# when the prior one is itself already poisoned. That is not hypothetical:
# data/scan.json carries 6 nodes in HEAD, so a cache-relative check would have
# compared 6 against 6 and passed. The smallest count ever recorded is 121 and
# the monorepo carries 60+ plugins, so anything under 20 has not found the
# estate at all.
MIN_NODES="${INTERCHART_MIN_NODES:-20}"

if [ "$NODE_COUNT" -lt "$MIN_NODES" ]; then
  refuse "scan found $NODE_COUNT nodes, below the absolute floor of $MIN_NODES.
  '$SYLVESTE_ROOT' does not look like a populated monorepo — a root-repo git
  worktree materialises almost none of the ~115 nested repos, which produces
  exactly this. See scripts/check-worktree-nested-repos.sh in the monorepo.
  Override with INTERCHART_MIN_NODES=<n> only if the shrink is real."
fi

OLD_NODES=""
if [ -f "$OUTPUT" ]; then
  OLD_NODES=$(grep -o '"nodes": *[0-9]*' "$OUTPUT" | head -1 | grep -o '[0-9]*' || true)
fi
if [ -n "$OLD_NODES" ] && [ "$OLD_NODES" -gt 0 ]; then
  if node -e "process.exit(($NODE_COUNT < $OLD_NODES * $COLLAPSE_RATIO) ? 0 : 1)"; then
    pct=$(node -e "console.log((100*(1-$NODE_COUNT/$OLD_NODES)).toFixed(1))")
    refuse "scan collapsed: $OLD_NODES nodes -> $NODE_COUNT (-${pct}%), past the
  ${COLLAPSE_RATIO} floor. The existing artefact is intact and was NOT replaced.
  If this shrink is real, re-run with INTERCHART_COLLAPSE_RATIO=0 to accept it."
  fi
fi

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

# Read template, replace placeholder, write output.
#
# The HTML is written only when its canonicalised content actually differs.
# Previously this was an unconditional write with a fresh "generated"
# timestamp, so *every* run dirtied the repo even when nothing had changed —
# the same churn the scan cache above was already guarded against. The guard
# existed for the cache and not for the artefact anyone looks at.
mkdir -p "$(dirname "$OUTPUT")"

TMP_OUT=$(mktemp)
trap 'rm -f "$TMP_OUT"' EXIT

node -e "
  const fs = require('fs');
  let data = '';
  process.stdin.on('data', c => data += c);
  process.stdin.on('end', () => {
    const tmpl = fs.readFileSync(process.argv[1], 'utf8');
    const out = tmpl.replace('/*DATA_PLACEHOLDER*/', data.trim());
    fs.writeFileSync(process.argv[2], out);
  });
" "$PLUGIN_DIR/templates/ecosystem.html" "$TMP_OUT" <<< "$DATA"

canonical_hash() {
  node -e "const fs=require('fs'),crypto=require('crypto');let t=fs.readFileSync(process.argv[1],'utf8');t=t.replace(/(\"generated\"\s*:\s*\")[^\"]+(\")/, '\$1__CANONICALIZED__\$2');process.stdout.write(crypto.createHash('sha256').update(t).digest('hex'));" "$1"
}

if [ -f "$OUTPUT" ] && [ "$(canonical_hash "$OUTPUT")" = "$(canonical_hash "$TMP_OUT")" ]; then
  echo "Unchanged: $OUTPUT ($NODE_COUNT nodes, $EDGE_COUNT edges)"
  exit 0
fi

cp -f "$TMP_OUT" "$OUTPUT"
echo "Generated: $OUTPUT ($NODE_COUNT nodes, $EDGE_COUNT edges)"
